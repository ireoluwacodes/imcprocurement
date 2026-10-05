CREATE TYPE public.app_role AS ENUM ('admin','superintendent','executive','project_manager','trade_partner','installation','procurement');
CREATE TYPE public.form_status AS ENUM ('draft','submitted','in_review','approved','rejected','revise','completed');
CREATE TYPE public.approval_decision AS ENUM ('pending','approved','approved_as_noted','revise_resubmit','rejected');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles_read" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''),
    COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superintendent') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  costpoint_code TEXT,
  client TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_read" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_write" ON public.projects FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE,
  vendor TEXT,
  requester_name TEXT,
  requester_phone TEXT,
  vendor_contact_name TEXT,
  vendor_contact_phone TEXT,
  vendor_contact_email TEXT,
  approver_id UUID REFERENCES auth.users(id),
  ship_to TEXT,
  ship_method TEXT,
  ship_via TEXT,
  work_order TEXT,
  module TEXT,
  costpoint_code TEXT,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  reason_other TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  po_date DATE,
  po_number TEXT,
  buyer TEXT,
  status public.form_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_requests TO authenticated;
GRANT ALL ON public.purchase_requests TO service_role;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_read" ON public.purchase_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "pr_insert" ON public.purchase_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "pr_update" ON public.purchase_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pr_delete_own" ON public.purchase_requests FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER pr_updated BEFORE UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.equipment_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  es_number TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  specified_item TEXT,
  from_equipment TEXT,
  from_location TEXT,
  on_equipment TEXT,
  on_location TEXT,
  reason TEXT,
  certified BOOLEAN NOT NULL DEFAULT false,
  requester_signature TEXT,
  requester_signed_at DATE,
  review_decision public.approval_decision NOT NULL DEFAULT 'pending',
  review_comments TEXT,
  approver_signature TEXT,
  approver_signed_at DATE,
  status public.form_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_substitutions TO authenticated;
GRANT ALL ON public.equipment_substitutions TO service_role;
ALTER TABLE public.equipment_substitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "es_read" ON public.equipment_substitutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "es_insert" ON public.equipment_substitutions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "es_update" ON public.equipment_substitutions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "es_delete_own" ON public.equipment_substitutions FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER es_updated BEFORE UPDATE ON public.equipment_substitutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.material_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mtf_number TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transfer_type TEXT,
  to_order_number TEXT,
  vendor_name TEXT,
  factory_po_number TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  remarks TEXT,
  transferred_by_name TEXT,
  transferred_by_signature TEXT,
  transferred_by_date DATE,
  transferred_by_contact TEXT,
  received_by_name TEXT,
  received_by_signature TEXT,
  received_by_date DATE,
  received_by_contact TEXT,
  vehicle TEXT,
  driver TEXT,
  related_pr_id UUID REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  status public.form_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_transfers TO authenticated;
GRANT ALL ON public.material_transfers TO service_role;
ALTER TABLE public.material_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mtf_read" ON public.material_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "mtf_insert" ON public.material_transfers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "mtf_update" ON public.material_transfers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mtf_delete_own" ON public.material_transfers FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER mtf_updated BEFORE UPDATE ON public.material_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL,
  form_id UUID NOT NULL,
  step_order INT NOT NULL DEFAULT 1,
  role public.app_role NOT NULL,
  assignee_id UUID REFERENCES auth.users(id),
  decision public.approval_decision NOT NULL DEFAULT 'pending',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_read" ON public.approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "approvals_write" ON public.approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL,
  form_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  content_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attachments TO authenticated;
GRANT ALL ON public.attachments TO service_role;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_read" ON public.attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "att_insert" ON public.attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "att_delete" ON public.attachments FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(),'admin'));

INSERT INTO public.projects (name, number, costpoint_code, client, location, status) VALUES
 ('Cedar Ridge Data Center','PRJ-10241','CP-10241-001','Northline Digital','Ashburn, VA','active'),
 ('Halcyon Point Expansion','PRJ-10388','CP-10388-004','Meridian Power','Council Bluffs, IA','active'),
 ('Bluefield Substation Retrofit','PRJ-10455','CP-10455-002','Bluefield Energy','Odessa, TX','active');