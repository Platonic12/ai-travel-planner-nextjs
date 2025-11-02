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
    await supabase.auth.signInWithOtp({ email });
    alert('登录邮件已发送，请查收邮箱。');
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
