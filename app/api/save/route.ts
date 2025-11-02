import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ 解析前端请求
    const { supabaseUrl, supabaseAnon, title, payload } = await req.json();

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

    // 3️⃣ 创建 Supabase 客户端
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

    // 5️⃣ Upsert 插入/更新
    const { data, error } = await supabase
      .from('itineraries')
      .upsert(
        [{ user_id: userId, title, payload }],
        { onConflict: 'user_id,title' } // 依赖数据库唯一约束
      )
      .select();

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ 行程保存成功:', data);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('❌ /api/save 错误:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
