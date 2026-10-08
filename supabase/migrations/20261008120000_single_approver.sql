-- Substitutions and transfers go to one named approver instead of the five-role chain.
ALTER TABLE public.equipment_substitutions ADD COLUMN approver_id uuid REFERENCES auth.users(id);
ALTER TABLE public.material_transfers ADD COLUMN approver_id uuid REFERENCES auth.users(id);
ALTER TABLE public.approvals ALTER COLUMN role DROP NOT NULL;

-- The assigned approver decides (admins still can). Older role-based steps keep working.
DROP POLICY approvals_update ON public.approvals;
CREATE POLICY approvals_update ON public.approvals FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR assignee_id = auth.uid()
    OR (assignee_id IS NULL AND public.has_role(auth.uid(), role))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR assignee_id = auth.uid()
    OR (assignee_id IS NULL AND public.has_role(auth.uid(), role))
  );

-- The approver can open the form even when they are not on the project.
DROP POLICY es_read ON public.equipment_substitutions;
CREATE POLICY es_read ON public.equipment_substitutions FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = approver_id OR public.can_see_project(auth.uid(), project_id));
DROP POLICY mtf_read ON public.material_transfers;
CREATE POLICY mtf_read ON public.material_transfers FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = approver_id OR public.can_see_project(auth.uid(), project_id));

-- A decision sets the form's status here, not in the browser: form update policies only let
-- the creator or an admin write a submitted form, so an approver's status change was dropped.
CREATE OR REPLACE FUNCTION public.apply_approval_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.form_status;
BEGIN
  IF NEW.decision = OLD.decision OR NEW.decision = 'pending' THEN
    RETURN NEW;
  END IF;

  v_status := CASE
    WHEN NEW.decision = 'rejected' THEN 'rejected'
    WHEN NEW.decision = 'revise_resubmit' THEN 'revise'
    WHEN EXISTS (SELECT 1 FROM public.approvals WHERE form_id = NEW.form_id AND decision = 'pending') THEN 'in_review'
    ELSE 'approved'
  END;

  IF NEW.form_type = 'equipment_substitution' THEN
    UPDATE public.equipment_substitutions SET status = v_status WHERE id = NEW.form_id;
  ELSIF NEW.form_type = 'material_transfer' THEN
    UPDATE public.material_transfers SET status = v_status WHERE id = NEW.form_id;
  ELSIF NEW.form_type = 'purchase_request' THEN
    UPDATE public.purchase_requests SET status = v_status WHERE id = NEW.form_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.apply_approval_decision() FROM public, anon, authenticated;

CREATE TRIGGER approvals_apply_decision AFTER UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.apply_approval_decision();

-- Decision summaries used the step's role, which is empty for a named approver.
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
      v_summary := COALESCE(NEW.role::text || ' → ', '') || NEW.decision::text;
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
  ELSIF TG_OP = 'DELETE' THEN
    v_id := OLD.id;
    v_action := 'deleted';
  ELSE
    v_id := NEW.id;
    IF TG_OP = 'UPDATE' AND to_jsonb(NEW)->'status' IS DISTINCT FROM to_jsonb(OLD)->'status' THEN
      v_action := to_jsonb(NEW)->>'status';
    END IF;
  END IF;

  INSERT INTO public.activity_log (actor_id, action, entity_type, entity_id, summary)
  VALUES (auth.uid(), v_action, v_entity, v_id, v_summary);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
