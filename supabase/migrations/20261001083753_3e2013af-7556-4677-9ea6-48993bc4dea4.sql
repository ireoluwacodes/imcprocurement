ALTER TABLE public.inventory_items ADD COLUMN photo_path text;
ALTER TABLE public.profiles ADD COLUMN job_role text;

CREATE TABLE public.job_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_roles TO authenticated;
GRANT ALL ON public.job_roles TO service_role;
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in can view job roles" ON public.job_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage job roles" ON public.job_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.job_roles (name) VALUES ('Project Manager'),('Project Engineer'),('QA'),('Superintendent'),('Senior Superintendent'),('Project Executive'),('Director');

CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Signed-in view inventory photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'inventory-photos');
CREATE POLICY "Managers upload inventory photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inventory-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'project_manager')));
CREATE POLICY "Managers delete inventory photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inventory-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'project_manager')));