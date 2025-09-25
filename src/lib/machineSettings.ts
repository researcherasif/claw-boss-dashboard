import { supabase } from '@/integrations/supabase/client';

export interface MachineSettingHistory {
  id: string;
  machine_id: string;
  field_name: string;
  field_value: string;
  effective_date: string;
  created_at: string;
}

export interface MachineSettings {
  coin_price: number;
  doll_price: number;
  electricity_cost: number;
  vat_percentage: number;
  maintenance_percentage: number;
  profit_share_percentage: number;
  duration: string;
}

/**
 * Get machine settings for a specific date
 */
export async function getMachineSettingsForDate(machineId: string, date: string): Promise<MachineSettings> {
  const fields = ['coin_price', 'doll_price', 'electricity_cost', 'vat_percentage', 'maintenance_percentage', 'profit_share_percentage', 'duration'];
  const settings: any = {};

  for (const field of fields) {
    const { data, error } = await supabase
      .from('machine_settings_history')
      .select('field_value')
      .eq('machine_id', machineId)
      .eq('field_name', field)
      .lte('effective_date', date)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      settings[field] = field === 'duration' ? data.field_value : parseFloat(data.field_value);
    } else {
      // Fallback to machine's current value
      const { data: machine, error: machineError } = await supabase
        .from('machines')
        .select(field)
        .eq('id', machineId)
        .single();
      
      if (machineError) throw machineError;
      settings[field] = machine[field];
    }
  }

  return settings;
}

/**
 * Add a new setting value for a machine
 */
export async function addMachineSetting(
  machineId: string,
  fieldName: string,
  fieldValue: string,
  effectiveDate: string,
  userId: string
): Promise<void> {
  // Start transaction
  const { error: historyError } = await supabase
    .from('machine_settings_history')
    .insert([{
      machine_id: machineId,
      field_name: fieldName,
      field_value: fieldValue,
      effective_date: effectiveDate,
      created_by: userId
    }]);

  if (historyError) throw historyError;

  // Also update the machines table with the new value
  const updateData: any = {};
  if (fieldName === 'duration') {
    updateData[fieldName] = fieldValue;
  } else {
    updateData[fieldName] = parseFloat(fieldValue);
  }

  const { error: machineError } = await supabase
    .from('machines')
    .update(updateData)
    .eq('id', machineId);

  if (machineError) throw machineError;
}

/**
 * Get setting history for a specific field
 */
export async function getSettingHistory(machineId: string, fieldName: string): Promise<MachineSettingHistory[]> {
  const { data, error } = await supabase
    .from('machine_settings_history')
    .select('*')
    .eq('machine_id', machineId)
    .eq('field_name', fieldName)
    .order('effective_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all settings history for a machine
 */
export async function getAllSettingsHistory(machineId: string): Promise<MachineSettingHistory[]> {
  const { data, error } = await supabase
    .from('machine_settings_history')
    .select('*')
    .eq('machine_id', machineId)
    .order('effective_date', { ascending: false });

  if (error) throw error;
  return data || [];
}