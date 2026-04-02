import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function generateRequestNo(): Promise<string> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('service_requests')
    .select('request_no')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Cannot generate request number: ${error.message}`);
  }

  const current = data?.request_no;
  const currentNumber = current ? Number.parseInt(current.replace('REQ-', ''), 10) : 0;
  const nextNumber = Number.isNaN(currentNumber) ? 1 : currentNumber + 1;

  return `REQ-${String(nextNumber).padStart(5, '0')}`;
}
