import { NextResponse } from 'next/server';
import { seedInitialPlanningData, fetchPlanTasks } from '@/lib/supabase/planning-services';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || 'f0e510da-9530-468f-bb09-59920070d55e';
  const force = searchParams.get('force') === 'true';

  try {
    const success = await seedInitialPlanningData(projectId, force);
    const tasks = await fetchPlanTasks(projectId);

    return NextResponse.json({
      success,
      projectId,
      taskCount: tasks.length,
      sampleTasks: tasks.slice(0, 5).map(t => ({ id: t.id, code: t.code, name: t.name })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
