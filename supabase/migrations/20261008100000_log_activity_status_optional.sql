-- log_activity() read NEW.status directly, which errors ("record "new" has no field "status"")
-- on tables without a status column: connexes, inventory_items, inventory_movements.
-- Read it through jsonb so it is optional, and log deletes instead of reading NEW.
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
