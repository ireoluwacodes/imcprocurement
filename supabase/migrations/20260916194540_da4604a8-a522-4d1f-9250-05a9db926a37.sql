-- 1. Profiles: company + active flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. First administrator
INSERT INTO public.user_roles (user_id, role)
VALUES ('90adaa41-bd45-494a-8c96-f174797aa93e', 'admin')
ON CONFLICT DO NOTHING;

-- Never allow the last admin to be removed
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'admin' THEN
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'At least one administrator must remain';
    END IF;
  END IF;
  RETURN OLD;
END; $$;
REVOKE ALL ON FUNCTION public.prevent_last_admin_removal() FROM public, anon;

DROP TRIGGER IF EXISTS user_roles_keep_admin ON public.user_roles;
CREATE TRIGGER user_roles_keep_admin
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

-- 3. Project members
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY pm_read ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY pm_manage ON public.project_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- 4. Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL,
  form_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_form_idx ON public.comments (form_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_read ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY comments_insert ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY comments_delete ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- 5. Activity log (append only)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  summary text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON public.activity_log (entity_id);
GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_read ON public.activity_log FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_entity text := TG_ARGV[0];
  v_id uuid;
  v_summary text := '';
BEGIN
  IF TG_OP = 'INSERT' THEN v_action := 'created'; ELSE v_action := 'updated'; END IF;

  IF v_entity = 'approval' THEN
    v_id := NEW.form_id;
    IF TG_OP = 'UPDATE' AND NEW.decision IS DISTINCT FROM OLD.decision THEN
      v_action := 'decision';
      v_summary := NEW.role::text || ' → ' || NEW.decision::text;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF v_entity = 'comment' THEN
    v_id := NEW.form_id;
    v_action := 'commented';
  ELSIF v_entity = 'user_role' THEN
    v_id := COALESCE(NEW.user_id, OLD.user_id);
    v_action := CASE WHEN TG_OP = 'DELETE' THEN 'role_removed' ELSE 'role_added' END;
    v_summary := COALESCE(NEW.role, OLD.role)::text;
  ELSIF v_entity = 'project' THEN
    v_id := NEW.id;
    v_summary := NEW.name;
  ELSE
    v_id := NEW.id;
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      v_action := NEW.status::text;
    END IF;
  END IF;

  INSERT INTO public.activity_log (actor_id, action, entity_type, entity_id, summary)
  VALUES (auth.uid(), v_action, v_entity, v_id, v_summary);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.log_activity() FROM public, anon;

DROP TRIGGER IF EXISTS log_pr ON public.purchase_requests;
CREATE TRIGGER log_pr AFTER INSERT OR UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('purchase_request');
DROP TRIGGER IF EXISTS log_es ON public.equipment_substitutions;
CREATE TRIGGER log_es AFTER INSERT OR UPDATE ON public.equipment_substitutions
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('equipment_substitution');
DROP TRIGGER IF EXISTS log_mtf ON public.material_transfers;
CREATE TRIGGER log_mtf AFTER INSERT OR UPDATE ON public.material_transfers
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('material_transfer');
DROP TRIGGER IF EXISTS log_approval ON public.approvals;
CREATE TRIGGER log_approval AFTER UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('approval');
DROP TRIGGER IF EXISTS log_comment ON public.comments;
CREATE TRIGGER log_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('comment');
DROP TRIGGER IF EXISTS log_role ON public.user_roles;
CREATE TRIGGER log_role AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('user_role');
DROP TRIGGER IF EXISTS log_project ON public.projects;
CREATE TRIGGER log_project AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('project');

-- 6. Tighter write policies on the three forms
DROP POLICY IF EXISTS pr_update ON public.purchase_requests;
CREATE POLICY pr_update ON public.purchase_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = created_by AND status IN ('draft','revise'))
    OR (public.has_role(auth.uid(), 'procurement') AND status IN ('approved','completed'))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'procurement')
  );

DROP POLICY IF EXISTS pr_delete_own ON public.purchase_requests;
CREATE POLICY pr_delete_own ON public.purchase_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (auth.uid() = created_by AND status = 'draft'));

DROP POLICY IF EXISTS es_update ON public.equipment_substitutions;
CREATE POLICY es_update ON public.equipment_substitutions FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = created_by AND status IN ('draft','revise'))
  )
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

DROP POLICY IF EXISTS es_delete_own ON public.equipment_substitutions;
CREATE POLICY es_delete_own ON public.equipment_substitutions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (auth.uid() = created_by AND status = 'draft'));

DROP POLICY IF EXISTS mtf_update ON public.material_transfers;
CREATE POLICY mtf_update ON public.material_transfers FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = created_by AND status IN ('draft','revise'))
  )
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

DROP POLICY IF EXISTS mtf_delete_own ON public.material_transfers;
CREATE POLICY mtf_delete_own ON public.material_transfers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (auth.uid() = created_by AND status = 'draft'));

-- 7. Approvals: only the role holder decides, and only in order
DROP POLICY IF EXISTS approvals_write ON public.approvals;
CREATE POLICY approvals_insert ON public.approvals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY approvals_update ON public.approvals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), role))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), role));
CREATE POLICY approvals_delete ON public.approvals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.enforce_approval_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.decision IS DISTINCT FROM OLD.decision AND NEW.decision <> 'pending' THEN
    IF EXISTS (
      SELECT 1 FROM public.approvals a
      WHERE a.form_id = NEW.form_id
        AND a.step_order < NEW.step_order
        AND a.decision = 'pending'
    ) THEN
      RAISE EXCEPTION 'Earlier approval steps are still pending';
    END IF;
    NEW.assignee_id := auth.uid();
    NEW.decided_at := now();
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_approval_order() FROM public, anon;

DROP TRIGGER IF EXISTS approvals_in_order ON public.approvals;
CREATE TRIGGER approvals_in_order BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_approval_order();

-- 8. Projects: admins and project managers
DROP POLICY IF EXISTS projects_write ON public.projects;
CREATE POLICY projects_write ON public.projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'project_manager'));

-- 9. Profile creation keeps company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, company)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''),
    COALESCE(NEW.email,''),
    COALESCE(NEW.raw_user_meta_data->>'company',''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'superintendent')::app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon;