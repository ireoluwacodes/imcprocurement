CREATE OR REPLACE FUNCTION public.can_see_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _project_id IS NULL
    OR public.has_role(_user_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.project_members WHERE user_id = _user_id AND project_id = _project_id)
$$;

DROP POLICY pr_read ON public.purchase_requests;
CREATE POLICY pr_read ON public.purchase_requests FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.can_see_project(auth.uid(), project_id));
DROP POLICY es_read ON public.equipment_substitutions;
CREATE POLICY es_read ON public.equipment_substitutions FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.can_see_project(auth.uid(), project_id));
DROP POLICY mtf_read ON public.material_transfers;
CREATE POLICY mtf_read ON public.material_transfers FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.can_see_project(auth.uid(), project_id));

DROP POLICY inv_read ON public.inventory_items;
CREATE POLICY inv_read ON public.inventory_items FOR SELECT TO authenticated
  USING (public.can_see_project(auth.uid(), project_id));
DROP POLICY invm_read ON public.inventory_movements;
CREATE POLICY invm_read ON public.inventory_movements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = item_id AND public.can_see_project(auth.uid(), i.project_id)));
DROP POLICY "Signed-in can view connexes" ON public.connexes;
CREATE POLICY "Members view connexes" ON public.connexes FOR SELECT TO authenticated
  USING (public.can_see_project(auth.uid(), project_id));

DROP POLICY pm_manage ON public.project_members;
CREATE POLICY pm_manage ON public.project_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));