import { supabase } from '@/integrations/supabase/client';

export interface DollPriceHistory {
  id: string;
  machine_id: string;
  price: number;
  effective_date: string;
  created_at: string;
}

/**
 * Get the doll price for a specific machine on a specific date
 */
export async function getDollPriceForDate(machineId: string, date: string): Promise<number> {
  const { data, error } = await supabase
    .from('doll_price_history')
    .select('price')
    .eq('machine_id', machineId)
    .lte('effective_date', date)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  
  // If no price history found, fall back to machine's current doll_price
  if (!data) {
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('doll_price')
      .eq('id', machineId)
      .single();
    
    if (machineError) throw machineError;
    return machine.doll_price;
  }

  return data.price;
}

/**
 * Add a new doll price for a machine
 */
export async function addDollPrice(
  machineId: string, 
  price: number, 
  effectiveDate: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('doll_price_history')
    .insert([{
      machine_id: machineId,
      price,
      effective_date: effectiveDate,
      created_by: userId
    }]);

  if (error) throw error;
}

/**
 * Get all price history for a machine
 */
export async function getDollPriceHistory(machineId: string): Promise<DollPriceHistory[]> {
  const { data, error } = await supabase
    .from('doll_price_history')
    .select('*')
    .eq('machine_id', machineId)
    .order('effective_date', { ascending: false });

  if (error) throw error;
  return data || [];
}