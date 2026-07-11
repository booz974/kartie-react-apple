import { supabase } from '@/lib/supabase';

export async function adminSoftDelete(
  tableName: string,
  itemId: number,
): Promise<void> {
  const { error } = await supabase.rpc('admin_soft_delete', {
    p_table_name: tableName,
    p_record_id: itemId,
  });

  if (error) throw error;
}
