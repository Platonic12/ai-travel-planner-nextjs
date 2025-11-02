'use client';
import { useEffect, useState } from 'react';
import AMapViewer from './AMap';

type Plan = {
  title: string;
  currency: string;
  total_budget_estimate: number;
  days: Array<{
    date: string;
    city: string;
    activities: Array<{
      time: string;
      name: string;
      type: string;
      desc?: string;
      lat?: number;
      lng?: number;
      cost_estimate?: number;
      restaurant?: string;
      tips?: string;
    }>;
    hotel?: {
      name: string;
      address?: string;
      lat?: number;
      lng?: number;
      price_per_night?: number;
    };
    meals?: Array<{
      name: string;
      address?: string;
      lat?: number;
      lng?: number;
      price_estimate?: number;
    }>;
    transport?: string;
    daily_cost_estimate?: number;
  }>;
};

export default function ItineraryView({ plan }: { plan: Plan | null }) {
  const [markers, setMarkers] = useState<Array<{ lng: number; lat: number; name?: string }>>([]);
  const [dayMarkers, setDayMarkers] = useState<Array<Array<{ lng: number; lat: number; name?: string }>>>([]);
  const [showRoutes, setShowRoutes] = useState(true);

  // 🗺️ 自动收集所有活动、餐饮、酒店坐标到地图，并按天分组
  useEffect(() => {
    if (!plan) return;
    const ms: Array<{ lng: number; lat: number; name?: string }> = [];
    const dayWiseMarkers: Array<Array<{ lng: number; lat: number; name?: string }>> = [];

    plan.days?.forEach((d) => {
      const dayPoints: Array<{ lng: number; lat: number; name?: string }> = [];

      // 按时间顺序收集当天地点：活动 -> 酒店 -> 餐饮
      d.activities?.forEach((a) => {
        if (a.lat && a.lng && a.lat !== 0 && a.lng !== 0) {
          const point = { lng: a.lng, lat: a.lat, name: `${a.name} (${a.time})` };
          ms.push(point);
          dayPoints.push(point);
        }
      });
      
      // 酒店通常作为当天的参考点
      if (d.hotel?.lat && d.hotel?.lng && d.hotel.lat !== 0 && d.hotel.lng !== 0) {
        const point = { lng: d.hotel.lng, lat: d.hotel.lat, name: `🏨 ${d.hotel.name}` };
        ms.push(point);
        // 如果还没有地点，添加酒店；如果有地点，酒店作为中间参考点
        if (dayPoints.length > 0) {
          dayPoints.push(point);
        } else {
          dayPoints.unshift(point);
        }
      }

      d.meals?.forEach((m) => {
        if (m.lat && m.lng && m.lat !== 0 && m.lng !== 0) {
          const point = { lng: m.lng, lat: m.lat, name: `🍽 ${m.name}` };
          ms.push(point);
          dayPoints.push(point);
        }
      });

      if (dayPoints.length > 0) {
        dayWiseMarkers.push(dayPoints);
      }
    });
    
    setMarkers(ms);
    setDayMarkers(dayWiseMarkers);
  }, [plan]);

  if (!plan) return null;

  return (
    <div className="card">
      <h2>{plan.title}</h2>
      <div className="small">
        💰 预计总预算：{plan.total_budget_estimate} {plan.currency}
      </div>

      {/* ✅ 高德地图展示所有点 */}
      <div style={{ marginBottom: '12px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', fontSize: '14px', color: '#0369a1' }}>
        💡 <strong>使用提示：</strong>点击地图上的标记点可查看详情，点击"高德地图导航"按钮可在高德地图网页版中查看路线和导航
      </div>
      <AMapViewer markers={markers} showRoutes={false} dayMarkers={dayMarkers} />

      {plan.days?.map((d, i) => (
        <div key={i} className="card" style={{ marginTop: '1em' }}>
          <h3>
            {d.date?.includes('第') ? d.date : `第${i + 1}天`} · {d.city}
          </h3>

          {/* 🚗 交通 */}
          {d.transport && (
            <div className="small" style={{ marginBottom: '4px' }}>
              🚗 交通方式：{d.transport}
            </div>
          )}

          {/* 📍 活动列表 */}
          <ul style={{ marginLeft: '1em' }}>
            {d.activities?.map((a, j) => (
              <li key={j} style={{ marginBottom: '6px' }}>
                <span className="badge">{a.time}</span>{' '}
                <strong>{a.name}</strong>{' '}
                <span className="small">
                  ({a.type}
                  {a.cost_estimate ? ` · 约$${a.cost_estimate}` : ''})
                </span>
                {a.desc && (
                  <div className="small" style={{ marginLeft: '1.5em' }}>
                    📍 {a.desc}
                  </div>
                )}
                {a.restaurant && (
                  <div className="small" style={{ marginLeft: '1.5em' }}>
                    🍽 推荐餐厅：{a.restaurant}
                  </div>
                )}
                {a.tips && (
                  <div className="small" style={{ marginLeft: '1.5em', color: '#888' }}>
                    💡 小贴士：{a.tips}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* 🏨 酒店信息 */}
          {d.hotel && (
            <div style={{ marginTop: '8px' }}>
              🏨 住宿：{d.hotel.name}{' '}
              <span className="small">
                {d.hotel.price_per_night ? `· 约$${d.hotel.price_per_night}/晚` : ''}
              </span>
              {d.hotel.address && (
                <div className="small" style={{ marginLeft: '1.5em' }}>
                  📍 地址：{d.hotel.address}
                </div>
              )}
            </div>
          )}

          {/* 🍱 餐饮信息 */}
          {d.meals && d.meals.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              🍱 餐饮：
              {d.meals.map((m, k) => (
                <div key={k} className="small" style={{ marginLeft: '1.5em' }}>
                  {m.name}
                  {m.price_estimate ? ` · 约$${m.price_estimate}` : ''}
                  {m.address ? ` · ${m.address}` : ''}
                </div>
              ))}
            </div>
          )}

          {/* 💰 每日花费 */}
          {typeof d.daily_cost_estimate === 'number' && (
            <div className="small" style={{ marginTop: '6px' }}>
              💰 当日花费估计：${d.daily_cost_estimate}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
