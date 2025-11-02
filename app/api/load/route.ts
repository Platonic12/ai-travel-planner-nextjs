import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ 解析前端请求
    const { supabaseUrl, supabaseAnon } = await req.json();

    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json(
        { error: 'Missing Supabase environment variables' },
        { status: 400 }
      );
    }

    // 2️⃣ 获取登录 token
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Missing Authorization token. Please log in first.' },
        { status: 401 }
      );
    }

    // 3️⃣ 创建 Supabase 客户端（带用户身份）
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 4️⃣ 获取当前登录用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Failed to identify user from token' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 5️⃣ 查询 itineraries 表中属于该用户的记录
    const { data, error } = await supabase
      .from('itineraries')
      .select('id, title, payload, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase select error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ 加载到 ${data?.length || 0} 条行程`);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('❌ /api/load 错误:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
