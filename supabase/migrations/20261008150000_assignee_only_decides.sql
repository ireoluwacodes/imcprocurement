-- Only the assigned approver decides an assigned step; admins no longer decide on their behalf.
-- Older role-routed steps (no assignee) keep the role holder or an admin.
DROP POLICY approvals_update ON public.approvals;
CREATE POLICY approvals_update ON public.approvals FOR UPDATE TO authenticated
  USING (
    CASE WHEN assignee_id IS NOT NULL THEN assignee_id = auth.uid()
    ELSE public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), role) END
  )
  WITH CHECK (
    CASE WHEN assignee_id IS NOT NULL THEN assignee_id = auth.uid()
    ELSE public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), role) END
  );
