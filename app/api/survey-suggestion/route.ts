import { NextRequest, NextResponse } from 'next/server';
import { getSuggestedSurveyByArea } from '@/lib/requests/survey-suggestion';

export async function GET(request: NextRequest) {
  const areaCode = request.nextUrl.searchParams.get('area_code')?.trim();

  if (!areaCode) {
    return NextResponse.json({ error: 'กรุณาระบุรหัสพื้นที่ (area_code)' }, { status: 400 });
  }

  try {
    const { result, debug } = await getSuggestedSurveyByArea(areaCode);

    console.info('[survey-suggestion] request debug', {
      input_area_code: debug.input_area_code,
      area_exists: debug.area_exists,
      total_schedule_rows: debug.total_schedule_rows,
      active_schedule_rows: debug.active_schedule_rows,
      schedule_areas: debug.schedule_areas
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ไม่สามารถคำนวณคิวสำรวจได้' },
      { status: 500 }
    );
  }
}
