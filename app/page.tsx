'use client';

import { useState } from 'react';
import AuthBar from '@/components/AuthBar';
import { supabase } from '@/lib/supabaseClient';
import ItineraryView from '@/components/ItineraryView';

export default function Page() {
  // 计算当天日期和三天后的日期（使用惰性初始化）
  const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const getThreeDaysLater = () => {
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    return threeDaysLater.toISOString().split('T')[0];
  };

  const [destination, setDestination] = useState('日本 东京');
  const [startDate, setStartDate] = useState(() => getToday());
  const [endDate, setEndDate] = useState(() => getThreeDaysLater());
  const [budget, setBudget] = useState('10000 CNY');
  const [people, setPeople] = useState(2);
  const [prefs, setPrefs] = useState('美食、动漫、亲子');
  const [recognizing, setRecognizing] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [showCloudList, setShowCloudList] = useState(false);
  const [cloudPlans, setCloudPlans] = useState<any[]>([]);
  const [previewPlan, setPreviewPlan] = useState<any>(null);
  const [parsing, setParsing] = useState(false);

  // 📝 使用AI解析自然语言输入，提取旅行信息
  async function parseTravelInput(text: string): Promise<{
    destination?: string;
    startDate?: string;
    endDate?: string;
    budget?: string;
    people?: number;
    prefs?: string;
    updated: boolean;
  }> {
    const defaultResult = {
      destination: destination,
      startDate: startDate,
      endDate: endDate,
      budget: budget,
      people: people,
      prefs: prefs,
      updated: false
    };

    if (!text || text.trim().length === 0) return defaultResult;

    try {
      const res = await fetch('/api/parse-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      });

      const data = await res.json();
      
      if (!res.ok || !data.ok || !data.data) {
        console.warn('AI解析失败，返回默认值:', data.error || '未知错误');
        return defaultResult;
      }

      const parsed = data.data;
      const result = { ...defaultResult, updated: false };

      // 只更新解析出的字段，保留原有值作为默认值
      if (parsed.destination) {
        result.destination = parsed.destination;
        result.updated = true;
      }
      if (parsed.startDate && parsed.endDate) {
        result.startDate = parsed.startDate;
        result.endDate = parsed.endDate;
        result.updated = true;
      }
      if (parsed.budget) {
        result.budget = parsed.budget;
        result.updated = true;
      }
      if (parsed.people) {
        result.people = parsed.people;
        result.updated = true;
      }
      if (parsed.prefs) {
        result.prefs = parsed.prefs;
        result.updated = true;
      }

      return result;
    } catch (err) {
      console.error('解析输入时出错:', err);
      return defaultResult;
    }
  }

  // 🎤 语音识别
  // ✅ 在组件顶层定义一个全局变量以便多次复用
  let rec: any = null;

  function toggleVoice() {
    // 如果当前没有语音识别对象，则初始化
    if (!rec) {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SR) {
        alert('当前浏览器不支持语音识别，请手动输入。');
        return;
      }

      rec = new SR();
      rec.lang = 'zh-CN';
      rec.continuous = true;       // ✅ 持续监听，不会自动停止
      rec.interimResults = true;   // ✅ 实时输出结果
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        console.log('🎤 开始语音识别...');
        setRecognizing(true);
      };

      rec.onresult = async (e: any) => {
        // 将所有结果拼接为一句完整的文本
        const text = Array.from(e.results)
          .map((r: any) => r[0].transcript)
          .join('');
        
        // 只在识别结束时处理（避免中间结果频繁触发）
        if (e.results && e.results.length > 0) {
          const lastResult = e.results[e.results.length - 1];
          if (lastResult.isFinal) {
            // 识别完成，处理解析结果
            await handleParsedInput(text);
          }
        }
      };

      rec.onerror = (e: any) => {
        console.warn('❌ 语音识别错误:', e);
        stopVoice(); // 确保资源释放
      };

      rec.onend = () => {
        console.log('🛑 语音识别结束');
        stopVoice(); // 自动释放资源
      };
    }

    // ✅ 点击按钮时切换状态
    if (recognizing) {
      stopVoice();
    } else {
      try {
        rec.start();
      } catch (e) {
        console.warn('启动失败:', e);
        stopVoice();
      }
    }
  }

  // 📝 处理解析后的输入并更新所有字段
  async function handleParsedInput(text: string) {
    if (!text || text.trim().length === 0) {
      return;
    }

    setParsing(true);
    try {
      const parsed = await parseTravelInput(text);
      
      if (parsed.updated) {
        if (parsed.destination) setDestination(parsed.destination);
        if (parsed.startDate) setStartDate(parsed.startDate);
        if (parsed.endDate) setEndDate(parsed.endDate);
        if (parsed.budget) setBudget(parsed.budget);
        if (parsed.people) setPeople(parsed.people);
        if (parsed.prefs) setPrefs(parsed.prefs);
      } else {
        // 如果没有解析出结构化信息，只填充到偏好
        setPrefs(text);
      }
    } catch (err) {
      console.error('解析失败:', err);
      // 如果解析失败，至少填充到偏好
      setPrefs(text);
    } finally {
      setParsing(false);
    }
  }

  // ✅ 完整释放麦克风资源
  function stopVoice() {
    if (!rec) return;
    try {
      rec.stop();   // 正常停止识别
      rec.abort();  // 强制关闭会话（Chrome特有）
    } catch (e) {
      console.warn('停止识别异常:', e);
    }

    // ✅ 彻底释放麦克风音轨
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(() => { });

    setRecognizing(false);
  }


  // ✈️ 生成行程
  async function generate() {
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, startDate, endDate, budget, people, prefs })
      });
      const data = await res.json();
      if (!res.ok) { alert('生成失败：' + (data.error || '未知错误')); }
      else setPlan(data);
    } finally {
      setLoading(false);
    }
  }

  // ☁️ 保存行程
  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert('请先登录再保存');
        return;
      }

      const token = session.access_token;
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          title: plan?.title || `${destination}行程`,
          payload: plan,
        }),
      });

      const j = await res.json();
      if (!res.ok) alert('保存失败：' + (j.error || '未知错误'));
      else alert('✅ 保存成功！');
    } finally {
      setSaving(false);
    }
  }

  // 🌩️ 加载云端行程列表
  async function loadFromCloud() {
    if (loadingCloud) return;
    setLoadingCloud(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert('请先登录再加载');
        return;
      }

      const token = session.access_token;

      const res = await fetch('/api/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        }),
      });

      const j = await res.json();
      if (!res.ok) {
        alert('加载失败：' + (j.error || '未知错误'));
      } else {
        setCloudPlans(j.data);
        setShowCloudList(true);
      }
    } finally {
      setLoadingCloud(false);
    }
  }

  // 🗑️ 删除云端行程
  async function deletePlan(item: any) {
    if (!confirm(`确定要删除「${item.title}」吗？`)) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return alert('未登录');

    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        id: item.id
      }),
    });

    const j = await res.json();
    if (!res.ok) alert('删除失败：' + (j.error || '未知错误'));
    else {
      alert('🗑️ 已删除');
      setCloudPlans(cloudPlans.filter(p => p.id !== item.id));
      if (previewPlan?.id === item.id) setPreviewPlan(null);
    }
  }

  // ✅ 加载所选行程
  function confirmLoadPlan() {
    if (!previewPlan) return;
    if (confirm(`是否加载「${previewPlan.title}」到主界面？`)) {
      setPlan(previewPlan.payload);
      setShowCloudList(false);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>AI 行程规划器</h1>
        <AuthBar />
      </div>

      <div className="card">
        <div style={{ marginBottom: '12px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', fontSize: '14px', color: '#0369a1' }}>
          💡 <strong>智能输入提示：</strong>您可以通过语音或文字一次性输入完整信息，例如：
          <br />"我想去日本，5天，预算1万元，喜欢美食和动漫，带孩子"
          <br />系统会自动识别并填充所有字段！
        </div>

        <div className="grid">
          <div>
            <label>目的地</label>
            <input className="input" value={destination} onChange={e => setDestination(e.target.value)} placeholder="如：日本 东京/大阪" />
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>开始日期</label>
              <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>结束日期</label>
              <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label>预算</label>
            <input className="input" value={budget} onChange={e => setBudget(e.target.value)} placeholder="如：10000 CNY / 150000 JPY" />
          </div>
          <div>
            <label>同行人数</label>
            <input className="input" type="number" min={1} value={people} onChange={e => setPeople(parseInt(e.target.value || '1', 10))} />
          </div>
        </div>

        <label style={{ marginTop: 12, display: 'block' }}>
          旅行偏好（支持语音/文字智能输入）
        </label>
        <div className="row" style={{ gap: 8 }}>
          <textarea 
            className="input" 
            rows={3} 
            value={prefs} 
            onChange={e => setPrefs(e.target.value)} 
            placeholder="如：喜欢美食和动漫，带孩子……或者输入完整信息：&quot;我想去日本，5天，预算1万元，喜欢美食和动漫，带孩子&quot;" 
            style={{ flex: 1 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className={"btn " + (recognizing ? 'danger' : 'primary')}
              onClick={toggleVoice}
              style={{ whiteSpace: 'nowrap' }}
            >
              {recognizing ? '🟥 停止' : '🎤 语音'}
            </button>
            <button
              className="btn"
              onClick={() => handleParsedInput(prefs)}
              disabled={parsing || !prefs.trim()}
              style={{ whiteSpace: 'nowrap' }}
            >
              {parsing ? '解析中...' : '📝 解析'}
            </button>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={generate} disabled={loading}>{loading ? '生成中…' : '生成行程与预算'}</button>
          <button className="btn" onClick={save} disabled={!plan}>保存到云端</button>
          <button className="btn" onClick={loadFromCloud}>{loadingCloud ? '加载中…' : '☁️ 从云端加载'}</button>
        </div>
        <div className="small">隐私说明：偏好与行程仅在你明确保存时写入云端。</div>
      </div>

      <ItineraryView plan={plan} />

      {showCloudList && (
        <div className="cloud-modal">
          <div className="cloud-card">
            <h3>☁️ 我的云端行程</h3>

            <div style={{ display: 'flex', gap: '12px' }}>
              {/* 左侧：行程列表 */}
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                flex: 1,
                maxHeight: '300px',
                overflowY: 'auto',
                borderRight: '1px solid #eee'
              }}>
                {cloudPlans.length === 0 && <li>暂无保存的行程</li>}
                {cloudPlans.map((item, i) => (
                  <li
                    key={i}
                    onClick={() => setPreviewPlan(item)}
                    className="cloud-item"
                    style={{
                      background: previewPlan?.id === item.id ? '#f1f5f9' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{item.title}</strong>
                        <br />
                        <span className="small">{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <button
                        className="btn small"
                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px 6px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlan(item);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 右侧：预览 */}
              <div style={{ flex: 2, paddingLeft: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {previewPlan ? (
                  <>
                    <h4 style={{ marginBottom: '8px' }}>📋 {previewPlan.title}</h4>
                    <ItineraryView plan={previewPlan.payload} />
                    <button
                      className="btn primary"
                      onClick={confirmLoadPlan}
                      style={{ marginTop: '8px' }}
                    >
                      ✅ 加载到主界面
                    </button>
                  </>
                ) : (
                  <p className="small">点击左侧行程以预览详情。</p>
                )}
              </div>
            </div>

            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <button className="btn" onClick={() => setShowCloudList(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
