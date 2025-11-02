'use client';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    AMap?: any;
  }
}

export default function AMapViewer({
  markers,
  showRoutes = false,
  dayMarkers,
}: {
  markers: { lng: number; lat: number; name?: string }[];
  showRoutes?: boolean;
  dayMarkers?: Array<{ lng: number; lat: number; name?: string }[]>; // 每天的地点数组
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const polylineRef = useRef<any[]>([]);
  const drivingRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  // ✅ 1️⃣ 加载高德地图 SDK 和路径规划插件
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_AMAP_KEY;
    if (!key || !ref.current) return;

    async function loadAMap() {
      if (window.AMap && window.AMap.plugin) {
        setReady(true);
        return;
      }

      const scriptId = 'amap-sdk';
      if (!document.getElementById(scriptId)) {
        const s = document.createElement('script');
        s.id = scriptId;
        s.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Driving,AMap.Walking,AMap.Transfer`;
        s.async = true;
        s.onload = () => {
          if (window.AMap && window.AMap.plugin) {
            // 加载路径规划插件
            window.AMap.plugin(['AMap.Driving', 'AMap.Walking'], () => {
              setReady(true);
            });
          } else {
            setReady(true);
          }
        };
        s.onerror = () => console.error('❌ 高德地图加载失败');
        document.body.appendChild(s);
      } else {
        // 已存在，但可能仍在加载中
        const check = setInterval(() => {
          if (window.AMap) {
            clearInterval(check);
            setReady(true);
          }
        }, 300);
      }
    }

    loadAMap();
  }, []);

  // ✅ 2️⃣ 初始化地图（只执行一次）
  useEffect(() => {
    if (!ready || !ref.current || !window.AMap) return;
    if (mapRef.current) return;

    mapRef.current = new window.AMap.Map(ref.current, {
      zoom: 10,
      center: [116.397428, 39.90923],
    });
  }, [ready]);

  // ✅ 3️⃣ 每次 markers 更新时绘制标点和路线
  useEffect(() => {
    if (!ready || !mapRef.current || !window.AMap) return;
    const map = mapRef.current;

    // 清除之前的标记和路线
    map.clearMap();
    polylineRef.current.forEach(p => {
      if (p) {
        try {
          map.remove(p);
        } catch (e) {
          // 忽略移除错误
        }
      }
    });
    polylineRef.current = [];
    
    if (!markers?.length) return;

    // 清除之前的infoWindow
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

    // 绘制标记点（不显示label，只在点击时显示）
    const markerObjs = markers.map((m) => {
      const marker = new window.AMap.Marker({
        position: [m.lng, m.lat],
        title: m.name || '',
        // 移除label，不再一直显示名称
      });

      // 添加点击事件
      marker.on('click', () => {
        // 创建信息窗体内容（使用转义防止XSS）
        const name = (m.name || '未知地点').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const lng = m.lng;
        const lat = m.lat;
        const encodedName = m.name ? encodeURIComponent(m.name) : `${lat},${lng}`;
        
        // 构建导航URL
        const navUrl = `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodedName}&src=web`;
        
        // 直接在HTML中使用onclick，这样更可靠
        const content = `
          <div style="padding: 12px; min-width: 200px;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #333;">
              ${name}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 12px;">
              坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
            <a 
              href="${navUrl}" 
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: block;
                width: 100%;
                padding: 8px 16px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                text-decoration: none;
                text-align: center;
              "
              onmouseover="this.style.background='#45a049'"
              onmouseout="this.style.background='#4CAF50'"
              onclick="return true;"
            >
              🗺️ 高德地图导航
            </a>
          </div>
        `;

        // 关闭之前的infoWindow
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }

        // 创建新的信息窗体
        infoWindowRef.current = new window.AMap.InfoWindow({
          content: content,
          offset: new window.AMap.Pixel(0, -30),
          closeWhenClickMap: true,
        });

        // 打开信息窗体
        infoWindowRef.current.open(map, marker.getPosition());
      });

      return marker;
    });

    map.add(markerObjs);

    // 自动缩放视野
    const bounds = new window.AMap.Bounds(
      [Math.min(...markers.map((m) => m.lng)), Math.min(...markers.map((m) => m.lat))],
      [Math.max(...markers.map((m) => m.lng)), Math.max(...markers.map((m) => m.lat))]
    );
    map.setBounds(bounds);
  }, [markers, ready, showRoutes, dayMarkers]);

  return (
    <div>
      <div
        ref={ref}
        style={{
          width: '100%',
          height: '400px',
          borderRadius: '12px',
          border: '1px solid #eee',
        }}
      />
    </div>
  );
}
