import { RequestForm } from '@/components/request-form';
import { Area, Assignee } from '@/lib/requests/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CreateRequestPage() {
  const supabase = createServerSupabaseClient();

  const [{ data: areas, error: areasError }, { data: assignees, error: assigneesError }] =
    await Promise.all([
      supabase.from('areas').select('id,code,name').order('code', { ascending: true }),
      supabase
        .from('assignees')
        .select('id,code,name,is_active')
        .eq('is_active', true)
        .order('code', { ascending: true })
    ]);

  if (areasError || assigneesError) {
    throw new Error(areasError?.message ?? assigneesError?.message);
  }

  console.info('[requests/new] data source debug', {
    areasCount: (areas ?? []).length,
    assigneesCount: (assignees ?? []).length,
    assignees: (assignees ?? []).map((assignee) => ({
      id: assignee.id,
      code: assignee.code,
      name: assignee.name
    }))
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h2 className="text-2xl font-semibold">สร้างคำร้องใหม่</h2>
      <p className="text-sm text-slate-500">เลือกประเภทคำร้อง และกรอกข้อมูลลูกค้าให้ครบถ้วน</p>
      <RequestForm areas={(areas ?? []) as Area[]} assignees={(assignees ?? []) as Assignee[]} />
    </div>
  );
}
