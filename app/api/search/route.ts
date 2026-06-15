import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'company';

  if (q.length < 2) return NextResponse.json([]);

  try {
    if (type === 'company') {
      const result = await query(`
        SELECT employer_name_clean as name, employer_slug as slug, total_filings as count
        FROM company_stats
        WHERE employer_name_clean ILIKE $1
        ORDER BY total_filings DESC
        LIMIT 8
      `, [`%${q.toUpperCase()}%`]);
      return NextResponse.json(result.rows);
    }

    if (type === 'job') {
      const result = await query(`
        SELECT job_title_clean as name, job_title_slug as slug, total_filings as count
        FROM job_stats
        WHERE job_title_clean ILIKE $1
        AND LENGTH(job_title_clean) > 3
        ORDER BY total_filings DESC
        LIMIT 8
      `, [`%${q.toUpperCase()}%`]);
      return NextResponse.json(result.rows);
    }

    if (type === 'city') {
      const result = await query(`
        SELECT worksite_city || ', ' || worksite_state as name, worksite_city_slug as slug, total_filings as count
        FROM city_stats
        WHERE worksite_city ILIKE $1
        ORDER BY total_filings DESC
        LIMIT 8
      `, [`%${q}%`]);
      return NextResponse.json(result.rows);
    }

    return NextResponse.json([]);
  } catch (e) {
    console.error('search route error:', e);
    return NextResponse.json({ error: 'Search is temporarily unavailable.' }, { status: 500 });
  }
}
