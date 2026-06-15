import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const count = await query(`SELECT COUNT(*) as n FROM ai_summaries`);
  const sample = await query(
    `SELECT page_key FROM ai_summaries WHERE page_key LIKE 'company:%' LIMIT 3`
  );
  return NextResponse.json({
    total: count.rows[0].n,
    samples: sample.rows.map((r: { page_key: string }) => r.page_key),
  });
}
