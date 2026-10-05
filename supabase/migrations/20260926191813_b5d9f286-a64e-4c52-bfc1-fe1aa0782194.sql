DROP TRIGGER IF EXISTS inv_log ON public.inventory_items;
DROP TRIGGER IF EXISTS invm_log ON public.inventory_movements;
CREATE TRIGGER inv_log AFTER INSERT OR UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.log_activity('inventory_item');
CREATE TRIGGER invm_log AFTER INSERT ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.log_activity('inventory_movement');