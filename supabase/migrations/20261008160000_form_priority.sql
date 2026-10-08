-- Every form carries a priority.
ALTER TABLE public.purchase_requests ADD COLUMN priority text NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('low','normal','high','urgent'));
ALTER TABLE public.equipment_substitutions ADD COLUMN priority text NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('low','normal','high','urgent'));
ALTER TABLE public.material_transfers ADD COLUMN priority text NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('low','normal','high','urgent'));
