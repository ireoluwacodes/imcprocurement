DROP POLICY "pr_delete_own" ON public.purchase_requests;

CREATE POLICY "pr_delete_own" ON public.purchase_requests
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = created_by);