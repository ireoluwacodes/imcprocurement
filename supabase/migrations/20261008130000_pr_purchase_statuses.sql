-- More purchase statuses for tracking a PR after it is ordered.
ALTER TABLE public.purchase_requests DROP CONSTRAINT purchase_requests_purchase_status_check;
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_purchase_status_check
  CHECK (purchase_status IN (
    'not_ordered', 'ordered', 'shipped', 'delayed', 'not_arrived', 'lost',
    'arrived', 'received', 'onsite', 'handed_to_install', 'request_closed'
  ));
