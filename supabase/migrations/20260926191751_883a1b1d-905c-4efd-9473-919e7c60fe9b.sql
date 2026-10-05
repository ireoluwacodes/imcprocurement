CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  serial_number text,
  category text NOT NULL DEFAULT 'Material',
  unit text NOT NULL DEFAULT 'ea',
  starting_qty numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX inventory_items_serial_uniq ON public.inventory_items (serial_number) WHERE serial_number IS NOT NULL AND serial_number <> '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_read ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY inv_write ON public.inventory_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'project_manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'project_manager'));
CREATE TRIGGER inv_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('added','used','adjusted')),
  quantity numeric NOT NULL,
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY invm_read ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY invm_insert ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'project_manager')
    OR (movement_type = 'used' AND (has_role(auth.uid(),'superintendent') OR has_role(auth.uid(),'installation')))));

CREATE TRIGGER inv_log AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER invm_log AFTER INSERT ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.log_activity();