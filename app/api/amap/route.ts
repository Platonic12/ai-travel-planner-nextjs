// app/api/amap/route.ts
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY!;
  const sk = process.env.AMAP_SECURITY_KEY!;
  const path = '/maps';
  const query = `v=2.0&key=${key}`;
  const raw = `${path}?${query}${sk}`;
  const sig = crypto.createHash('md5').update(raw).digest('hex');
  return NextResponse.json({ sig });
}
