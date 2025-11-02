import { NextRequest, NextResponse } from 'next/server';

const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY as string; // 使用 Web 服务 key
const AMAP_SECURITY_KEY = process.env.AMAP_SECURITY_KEY as string; // 可选

export async function POST(req: NextRequest) {
  try {
    const { name, address } = await req.json();

    if (!AMAP_WEB_KEY) {
      return NextResponse.json({ ok: false, error: 'Missing AMAP_WEB_KEY' }, { status: 500 });
    }
    if (!name && !address) {
      return NextResponse.json({ ok: false, error: 'Missing name or address' }, { status: 400 });
    }

    // 构造查询
    const query = address || name;

    // 地理编码 API URL
    const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_WEB_KEY}&address=${encodeURIComponent(
      query
    )}`;

    // 发起请求
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== '1' || !data.geocodes?.length) {
      return NextResponse.json({
        ok: false,
        name,
        address,
        error: data.info || 'Geocode not found',
      });
    }

    const geo = data.geocodes[0];
    const [lng, lat] = geo.location.split(',').map(Number);

    // 返回结果
    return NextResponse.json({
      ok: true,
      name,
      formatted_address: geo.formatted_address,
      province: geo.province,
      city: geo.city,
      lat,
      lng,
      source: 'amap_web_service',
    });
  } catch (err: any) {
    console.error('❌ Geocode Error:', err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
