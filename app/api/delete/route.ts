import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DELETE 行程
export async function POST(req: NextRequest) {
  try {
    const { supabaseUrl, supabaseAnon, id } = await req.json();

    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json({ error: '缺少 Supabase 配置信息' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: '缺少行程 ID' }, { status: 400 });
    }

    // ✅ 创建 Supabase 客户端
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      auth: {
        persistSession: false,
      },
    });

    // ✅ 获取当前登录用户
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: '未授权请求' }, { status: 401 });
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json({ error: '无法验证用户' }, { status: 401 });
    }

    // ✅ 删除对应用户的行程
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('删除失败:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('服务错误:', err);
    return NextResponse.json({ error: err.message || '内部服务器错误' }, { status: 500 });
  }
}
