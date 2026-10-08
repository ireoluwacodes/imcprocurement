-- Procurement sets the purchase status once a PR is submitted. PRs have no approval step,
-- so the old 'approved'/'completed' condition left only admins able to change it.
DROP POLICY pr_update ON public.purchase_requests;
CREATE POLICY pr_update ON public.purchase_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = created_by AND status IN ('draft','revise'))
    OR (public.has_role(auth.uid(), 'procurement') AND status IN ('submitted','in_review','approved','completed'))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'procurement')
  );
