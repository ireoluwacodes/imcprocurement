-- Private buckets the storage policies and app read from (served via signed URLs).
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('form-attachments', 'form-attachments', false),
  ('inventory-photos', 'inventory-photos', false)
ON CONFLICT (id) DO NOTHING;
