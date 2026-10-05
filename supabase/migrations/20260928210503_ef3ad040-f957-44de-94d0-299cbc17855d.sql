CREATE TABLE public.connexes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connexes TO authenticated;
GRANT ALL ON public.connexes TO service_role;
ALTER TABLE public.connexes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in can view connexes" ON public.connexes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage connexes" ON public.connexes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'project_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'project_manager'));
ALTER TABLE public.inventory_items ADD COLUMN connex_id uuid REFERENCES public.connexes(id) ON DELETE SET NULL;
CREATE TRIGGER log_connex_activity AFTER INSERT OR UPDATE OR DELETE ON public.connexes FOR EACH ROW EXECUTE FUNCTION public.log_activity('connex');