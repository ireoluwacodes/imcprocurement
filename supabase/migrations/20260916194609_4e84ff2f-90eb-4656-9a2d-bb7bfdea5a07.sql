REVOKE EXECUTE ON FUNCTION public.log_activity() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_approval_order() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_removal() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;