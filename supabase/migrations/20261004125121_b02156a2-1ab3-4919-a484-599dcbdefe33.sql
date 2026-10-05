ALTER TABLE public.purchase_requests
  ADD COLUMN purchase_status text NOT NULL DEFAULT 'not_ordered'
  CHECK (purchase_status IN ('not_ordered','ordered','arrived'));