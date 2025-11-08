'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthBar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setUser(sess?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(){
    const email = prompt('请输入邮箱用于登录/注册 (Supabase magic link):');
    if(!email) return;
    
    try {
      const { data, error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          // 设置重定向 URL（指向当前页面）
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        }
      });
      
      if (error) {
        console.error('❌ 登录失败:', error);
        alert(`登录失败：${error.message}\n\n可能的原因：\n1. Supabase 邮件服务未配置\n2. 邮箱地址格式不正确\n3. 请检查 Supabase 项目设置`);
        return;
      }
      
      if (data) {
        alert('✅ 登录邮件已发送，请查收邮箱（包括垃圾邮件箱）。\n\n点击邮件中的链接即可完成登录。');
      }
    } catch (err: any) {
      console.error('❌ 登录异常:', err);
      alert(`登录异常：${err.message}`);
    }
  }
  async function signOut(){ await supabase.auth.signOut(); }

  return (
    <div className="row">
      {user ? <>
        <span className="small">已登录：{user.email}</span>
        <button className="btn" onClick={signOut}>退出</button>
      </> : <button className="btn" onClick={signIn}>登录 / 注册</button>}
    </div>
  );
}
