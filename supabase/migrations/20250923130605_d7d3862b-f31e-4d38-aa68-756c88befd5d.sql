-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'accountant');

-- Create profiles table (extends auth.users with role and business info)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'accountant',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create machines table
CREATE TABLE public.machines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  coin_price DECIMAL(10,2) NOT NULL,
  doll_price DECIMAL(10,2) NOT NULL,
  electricity_cost DECIMAL(10,2) NOT NULL,
  vat_percentage DECIMAL(5,2) NOT NULL,
  profit_share_percentage DECIMAL(5,2) NOT NULL,
  maintenance_percentage DECIMAL(5,2) NOT NULL,
  duration TEXT NOT NULL CHECK (duration IN ('half_month', 'full_month')),
  location TEXT NOT NULL,
  installation_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create machine_reports table for daily inputs
CREATE TABLE public.machine_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  coin_count INTEGER NOT NULL DEFAULT 0,
  prize_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(machine_id, report_date)
);

-- Create pay_to_clowee table for calculation results
CREATE TABLE public.pay_to_clowee (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_coins INTEGER NOT NULL DEFAULT 0,
  total_prizes INTEGER NOT NULL DEFAULT 0,
  total_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  prize_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  electricity_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  maintenance_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  profit_share_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_payable DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_to_clowee_id UUID NOT NULL REFERENCES public.pay_to_clowee(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  company_logo_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_to_clowee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can view and edit (Super Admin, Admin, Accountant all have same access)
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view machines" ON public.machines
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage machine reports" ON public.machine_reports
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage pay to clowee" ON public.pay_to_clowee
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (true);

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'accountant'
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machine_reports_updated_at
  BEFORE UPDATE ON public.machine_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pay_to_clowee_updated_at
  BEFORE UPDATE ON public.pay_to_clowee
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();