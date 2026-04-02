import { NextRequest, NextResponse } from 'next/server';
import { getSuggestedSurveyByArea } from '@/lib/requests/survey-suggestion';

export async function GET(request: NextRequest) {
  const areaId = request.nextUrl.searchParams.get('area_id')?.trim();

  if (!areaId) {
    return NextResponse.json({ error: 'กรุณาระบุพื้นที่' }, { status: 400 });
  }

  try {
    const suggestion = await getSuggestedSurveyByArea(areaId);
    return NextResponse.json(suggestion);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ไม่สามารถคำนวณคิวสำรวจได้' },
      { status: 500 }
    );
  }
}
