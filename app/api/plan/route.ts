import { NextResponse } from "next/server";
import crypto from "crypto";

const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY as string;
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID;
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY;

// 使用大模型判断是否为真正的POI（景点/餐厅/住宿）
async function isRealPOI(name: string, type: 'activity' | 'hotel' | 'meal'): Promise<boolean> {
  if (!name || !name.trim()) return false;

  // 明确排除非POI的动作描述（所有类型都适用）
  const actionKeywords = ['入住', '退房', '抵达', '到达', '出发', '离开', '返程', '返回', '回家', '回到家乡', '返回家乡', '收拾', '准备返程', '准备回家'];
  if (actionKeywords.some(kw => name.includes(kw))) {
    console.log(`  ⏭️ 明确排除动作描述: ${name}`);
    return false;
  }

  // 酒店和餐饮通常都有明确名称，默认认为是POI
  if (type === 'hotel' || type === 'meal') {
    // 对于酒店和餐饮，有名称就认为是POI（通常AI生成的都有具体名称）
    // 除非是明显的动作描述（已在上面排除）
    return true;
  }

  // 对于景点（activity）：更宽松的判断
  if (type === 'activity') {
    // 如果名称包含明显的地点特征词，直接认为是POI
    const locationKeywords = ['园', '林', '寺', '庙', '山', '湖', '海', '馆', '宫', '塔', '桥', '街', '公园', '景区', '博物馆', '美术馆', '遗址', '陵', '苑', '院', '亭', '阁', '楼', '台', '堤', '门', '洞', '窟', '谷', '峰', '广场', '中心'];
    if (locationKeywords.some(kw => name.includes(kw))) {
      console.log(`  ✅ 景点包含地点特征词，直接认为是POI: ${name}`);
      return true;
    }
    
    // 如果名称很短且是动作描述（如"用餐"、"散步"），不是POI
    if (name.length <= 4 && ['用餐', '散步', '休息', '购物', '自由活动'].includes(name)) {
      return false;
    }
    
    // 其他情况，有具体名称的景点默认也认为是POI（让AI进一步判断可能会误判）
    // 但为了更准确，还是使用AI判断
  }

  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
    console.warn("⚠️ Missing Tencent credentials, using fallback logic");
    // 降级方案：简单判断是否有明确的地名特征
    const hasLocationFeatures = /(园|林|寺|庙|山|湖|海|馆|宫|塔|桥|街|公园|景区|博物馆|美术馆|遗址|餐厅|酒店|饭店|宾馆|茶室|咖啡|广场|遗址|陵|苑|院|亭|阁|楼|台|堤|门|洞|窟|谷|峰)/;
    const isAction = /^(入住|退房|抵达|到达|出发|离开|返程|返回|回家|用餐|早餐|午餐|晚餐|散步|休息|购物|准备)/;
    // 如果有地点特征且不是动作描述，认为是POI
    return hasLocationFeatures.test(name) && !isAction.test(name);
  }

  try {
    const endpoint = "hunyuan.tencentcloudapi.com";
    const service = "hunyuan";
    const region = "ap-guangzhou";
    const action = "ChatCompletions";
    const version = "2023-09-01";

    const typeName = type === 'activity' ? '景点' : type === 'hotel' ? '住宿' : '餐厅';
    
    const payload = {
      Model: "hunyuan-pro",
      Messages: [
        {
          Role: "system",
          Content: `你是一个地点识别助手。请判断给定的名称是否为真实的地点POI（Point of Interest，兴趣点）。

真实POI的特征：
1. 有明确的具体名称，可以在地图上找到（如"故宫"、"天安门广场"、"狮子林"、"拙政园"、"全聚德餐厅"、"希尔顿酒店"）
2. 是可以在地图上标出的具体地理位置
3. 通常是景点、餐厅、酒店、博物馆、公园等有固定位置的地点

非POI的特征（这些不应该查询坐标）：
1. 只是动作描述，没有具体地点名称（如"入住酒店"、"退房"、"抵达机场"、"返回家乡"）
2. 是一般性活动，不是具体地点（如"用餐"、"散步"、"休息"、"购物"、"自由活动"、"准备返程"）
3. 是抽象概念或状态描述，无法在地图上定位

重要原则：
- 如果有具体的地点名称（如"XX公园"、"XX博物馆"、"XX园"、"XX林"、"XX寺"、"XX餐厅"、"XX酒店"、"XX茶室"、"XX馆"），通常是POI
- 如果只是动作或状态（如"抵达"、"入住"、"用餐"、"散步"、"返回"），不是POI
- 对于景点类型（activity）：只要是具体的景点名称就应该认为是POI（如"狮子林"、"拙政园"、"博物馆"等），除非明显是动作描述
- 对于餐厅（meal）：有具体名称的餐厅、茶室、咖啡厅等都是POI

请只回答 true 或 false，不要输出任何其他文字或解释。`
        },
        {
          Role: "user",
          Content: `请判断"${name}"（${typeName}）是否为真实的地点POI？只回答 true 或 false。`
        }
      ]
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const payloadStr = JSON.stringify(payload);
    const hashedRequestPayload = crypto.createHash("sha256").update(payloadStr).digest("hex");

    const canonicalRequest = [
      "POST",
      "/",
      "",
      "content-type:application/json; charset=utf-8\nhost:" + endpoint + "\n",
      "content-type;host",
      hashedRequestPayload
    ].join("\n");

    const hashedCanonicalRequest = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

    const kDate = crypto.createHmac("sha256", "TC3" + TENCENT_SECRET_KEY).update(date).digest();
    const kService = crypto.createHmac("sha256", kDate).update(service).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("tc3_request").digest();
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authorization = `TC3-HMAC-SHA256 Credential=${TENCENT_SECRET_ID}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;

    const response = await fetch(`https://${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Content-Type": "application/json; charset=utf-8",
        "Host": endpoint,
        "X-TC-Action": action,
        "X-TC-Version": version,
        "X-TC-Region": region,
        "X-TC-Timestamp": timestamp.toString()
      },
      body: payloadStr
    });

    const data = await response.json();

    if (data.Response?.Error) {
      console.error("❌ POI判断API调用失败:", data.Response.Error);
      return false;
    }

    const content = data.Response?.Choices?.[0]?.Message?.Content || "false";
    const result = content.trim().toLowerCase();
    
    // 解析返回结果
    if (result.includes('true') || result === '是' || result === 'yes') {
      return true;
    }
    return false;
  } catch (err) {
    console.error(`❌ POI判断失败 for ${name}:`, err);
    // 失败时保守处理，返回false
    return false;
  }
}

// 调用高德地图POI搜索API获取坐标（适合景点名称）
async function searchPOI(keywords: string, city?: string): Promise<{ lat: number; lng: number } | null> {
  if (!AMAP_WEB_KEY) {
    console.warn("⚠️ Missing AMAP_WEB_KEY, skipping POI search");
    return null;
  }

  try {
    if (!keywords) return null;

    // 跳过明显不是地点名称的查询
    const skipKeywords = ['准备返程', '返程', '离开', '收拾', '准备', '演出', '演出观看'];
    if (skipKeywords.some(keyword => keywords.includes(keyword))) {
      console.log(`⏭️ 跳过非地点查询: ${keywords}`);
      return null;
    }

    // 清理关键词：移除"演出"等后缀
    let cleanKeywords = keywords;
    const removeSuffixes = ['演出', '观看', '参观', '游览', '夜游'];
    for (const suffix of removeSuffixes) {
      if (cleanKeywords.includes(suffix) && cleanKeywords.length > suffix.length) {
        cleanKeywords = cleanKeywords.replace(suffix, '').trim();
      }
    }

    let url = `https://restapi.amap.com/v3/place/text?key=${AMAP_WEB_KEY}&keywords=${encodeURIComponent(cleanKeywords)}`;
    if (city) {
      url += `&city=${encodeURIComponent(city)}`;
    }

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status === '1' && data.pois && data.pois.length > 0) {
      const poi = data.pois[0];
      const [lng, lat] = poi.location.split(',').map(Number);
      console.log(`✅ POI搜索成功: ${keywords} -> ${cleanKeywords} -> (${lat}, ${lng})`);
      return { lat, lng };
    } else {
      console.warn(`⚠️ POI搜索失败: ${keywords}, 返回状态: ${data.status}, 信息: ${data.info || '未知错误'}`);
    }
  } catch (err) {
    console.error(`❌ POI search failed for ${keywords}:`, err);
  }
  return null;
}

// 调用高德地图地理编码API获取坐标（适合地址）
async function geocodeLocation(name: string, address?: string): Promise<{ lat: number; lng: number } | null> {
  if (!AMAP_WEB_KEY) {
    console.warn("⚠️ Missing AMAP_WEB_KEY, skipping geocoding");
    return null;
  }

  try {
    const query = address || name;
    if (!query) return null;

    // 跳过明显不是地点名称的查询
    const skipKeywords = ['准备返程', '返程', '离开', '收拾', '准备'];
    if (skipKeywords.some(keyword => query.includes(keyword))) {
      console.log(`⏭️ 跳过非地点查询: ${query}`);
      return null;
    }

    const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_WEB_KEY}&address=${encodeURIComponent(query)}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status === '1' && data.geocodes?.length > 0) {
      const geo = data.geocodes[0];
      const [lng, lat] = geo.location.split(',').map(Number);
      console.log(`✅ 地理编码成功: ${query} -> (${lat}, ${lng})`);
      return { lat, lng };
    } else {
      console.warn(`⚠️ 地理编码失败: ${query}, 返回状态: ${data.status}, 信息: ${data.info || '未知错误'}`);
    }
  } catch (err) {
    console.error(`❌ Geocoding failed for ${name}:`, err);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { destination, days, startDate, endDate, budget, preferences } = body;
    
    // 如果提供了开始和结束日期，计算天数；否则使用直接提供的days
    let calculatedDays = days;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 包含起始日和结束日
    }
    
    if (!calculatedDays || calculatedDays <= 0) {
      throw new Error("缺少有效的出行天数信息（需要提供 days 或 startDate + endDate）");
    }

    const secretId = process.env.TENCENT_SECRET_ID!;
    const secretKey = process.env.TENCENT_SECRET_KEY!;
    const endpoint = "hunyuan.tencentcloudapi.com";
    const service = "hunyuan";
    const region = "ap-guangzhou";
    const action = "ChatCompletions";
    const version = "2023-09-01";

    if (!secretId || !secretKey) {
      throw new Error("Missing Tencent SecretId or SecretKey in environment variables.");
    }

    // 🧠 构造 Prompt —— 包含地理坐标、交通、餐饮、住宿、描述
    const payload = {
      Model: "hunyuan-pro",
      Messages: [
        {
          Role: "system",
          Content: `
你是一位专业的智能旅行规划助手，负责根据用户的输入生成完整的出行计划。
请严格按照以下JSON结构输出结果，不要输出任何解释性文字或自然语言说明。

输出格式要求（务必严格遵守）：

{
  "title": "string，行程标题，如'北京三日游'",
  "currency": "string，货币单位（如CNY或JPY）",
  "total_budget_estimate": number，总预算,
  "days": [
    {
      "date": "string，日期或天数（如'第1天'）",
      "city": "string，城市名",
      "transport": "string，交通方式（如高铁/地铁/自驾/飞机）",
      "daily_cost_estimate": number，当天预估花费,
      "activities": [
        {
          "time": "string（上午/下午/晚上）",
          "name": "string，活动或景点名称",
          "type": "string（文化/自然/娱乐/购物等）",
          "desc": "string，对活动的简要描述",
          "restaurant": "string，推荐餐厅（如有）",
          "tips": "string，活动小贴士（如有）",
          "lat": number，经度，请始终填0（坐标将由系统自动查询）,
          "lng": number，纬度，请始终填0（坐标将由系统自动查询）,
          "cost_estimate": number，单项花费
        }
      ],
      "hotel": {
        "name": "string，酒店名称",
        "address": "string，酒店地址",
        "lat": number，经度，请始终填0（坐标将由系统自动查询）,
        "lng": number，纬度，请始终填0（坐标将由系统自动查询）,
        "price_per_night": number，单晚价格
      },
      "meals": [
        {
          "name": "string，餐厅名称",
          "address": "string，餐厅地址",
          "lat": number，经度，请始终填0（坐标将由系统自动查询）,
          "lng": number，纬度，请始终填0（坐标将由系统自动查询）,
          "price_estimate": number，人均消费"
        }
      ]
    }
  ]
}

注意：
1. 不要包含"解释""说明""注释"等自然语言。
2. 输出必须是可被JSON.parse解析的严格JSON。
3. 所有 lat/lng 坐标请始终填 0，系统会自动根据地点名称和地址查询真实坐标。
4. 请务必提供准确的地点名称和地址信息，以便系统能够正确查询坐标。
5. 每天至少包含上午、下午、晚上三个活动。
6. 总体花费与预算应匹配。
`
        },
        {
          Role: "user",
          Content: `请为以下旅行需求生成行程：
目的地：${destination}
出行天数：${calculatedDays}天
${startDate && endDate ? `出行日期：${startDate} 至 ${endDate}` : ''}
预算：${budget}元
偏好：${preferences?.join("、") || "无"}
请输出符合上述格式的JSON。`
        }
      ]
    };

    // 🕒 TC3-HMAC-SHA256签名逻辑
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const payloadStr = JSON.stringify(payload);
    const hashedRequestPayload = crypto.createHash("sha256").update(payloadStr).digest("hex");

    const canonicalRequest = [
      "POST",
      "/",
      "",
      "content-type:application/json; charset=utf-8\nhost:" + endpoint + "\n",
      "content-type;host",
      hashedRequestPayload
    ].join("\n");

    const hashedCanonicalRequest = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

    const kDate = crypto.createHmac("sha256", "TC3" + secretKey).update(date).digest();
    const kService = crypto.createHmac("sha256", kDate).update(service).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("tc3_request").digest();
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;

    // 🚀 调用腾讯混元 API
    const response = await fetch(`https://${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Content-Type": "application/json; charset=utf-8",
        "Host": endpoint,
        "X-TC-Action": action,
        "X-TC-Version": version,
        "X-TC-Region": region,
        "X-TC-Timestamp": timestamp.toString()
      },
      body: payloadStr
    });

    const data = await response.json();

    if (data.Response?.Error) {
      console.error("❌ 混元API调用失败:", data.Response.Error);
      return NextResponse.json({ error: data.Response.Error }, { status: 500 });
    }

    // ✅ 提取模型输出的 JSON
    const content = data.Response?.Choices?.[0]?.Message?.Content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("⚠️ 模型返回的JSON解析失败，原文:", content);
      parsed = { title: "AI生成行程", raw_text: content };
    }

    // 🗺️ 使用高德地图API获取所有地点的真实坐标
    if (parsed.days && Array.isArray(parsed.days)) {
      console.log("📍 开始查询地点坐标...");
      
      for (const day of parsed.days) {
        // 查询活动坐标
        if (day.activities && Array.isArray(day.activities)) {
          for (const activity of day.activities) {
            if (activity.name) {
              // 使用AI判断是否为真正的POI（景点）
              console.log(`🤔 判断是否为POI: ${activity.name}`);
              const isPOI = await isRealPOI(activity.name, 'activity');
              console.log(`  结果: ${isPOI ? '✅ 是POI' : '❌ 非POI'}`);
              
              if (!isPOI) {
                console.log(`⏭️ 跳过非POI活动: ${activity.name}`);
                activity.lat = 0;
                activity.lng = 0;
                continue;
              }
              
              console.log(`🔍 查询景点: ${activity.name} (城市: ${day.city || '未知'})`);
              // 优先使用POI搜索（更适合景点名称），如果没有结果再尝试地理编码
              let coords = await searchPOI(activity.name, day.city);
              
              // 如果POI搜索失败，尝试使用城市+名称的地理编码
              if (!coords && day.city) {
                const queryName = `${day.city} ${activity.name}`;
                console.log(`  尝试地理编码: ${queryName}`);
                coords = await geocodeLocation(queryName);
              }
              
              if (coords) {
                activity.lat = coords.lat;
                activity.lng = coords.lng;
                console.log(`✅ 更新坐标: ${activity.name} -> (${coords.lat}, ${coords.lng})`);
              } else {
                console.warn(`❌ 未能查询到坐标: ${activity.name}，所有查询方法都失败`);
                activity.lat = 0;
                activity.lng = 0;
              }
              // 添加小延迟避免API限流
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }

        // 查询酒店坐标
        if (day.hotel && day.hotel.name) {
          // 使用AI判断是否为真正的POI（酒店通常都有名称，但验证一下）
          const isPOI = await isRealPOI(day.hotel.name, 'hotel');
          
          if (isPOI) {
            // 结合城市名称、酒店名称和地址提高查询准确性
            let hotelQuery = '';
            if (day.city) hotelQuery += `${day.city} `;
            hotelQuery += day.hotel.name;
            if (day.hotel.address) hotelQuery += ` ${day.hotel.address}`;
            
            console.log(`🔍 查询酒店: ${day.hotel.name} (城市: ${day.city || '未知'})`);
            const coords = await geocodeLocation(hotelQuery);
            if (coords) {
              day.hotel.lat = coords.lat;
              day.hotel.lng = coords.lng;
              console.log(`✅ 更新酒店坐标: ${day.hotel.name} -> (${coords.lat}, ${coords.lng})`);
            } else {
              console.warn(`❌ 未能查询到酒店坐标: ${day.hotel.name}`);
              day.hotel.lat = 0;
              day.hotel.lng = 0;
            }
          } else {
            console.log(`⏭️ 跳过非POI酒店: ${day.hotel.name}`);
            day.hotel.lat = 0;
            day.hotel.lng = 0;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 查询餐饮坐标
        if (day.meals && Array.isArray(day.meals)) {
          for (const meal of day.meals) {
            if (meal.name) {
              // 使用AI判断是否为真正的POI（餐厅）
              console.log(`🤔 判断餐饮是否为POI: ${meal.name}`);
              const isPOI = await isRealPOI(meal.name, 'meal');
              console.log(`  结果: ${isPOI ? '✅ 是POI' : '❌ 非POI'}`);
              
              if (!isPOI) {
                console.log(`⏭️ 跳过非POI餐饮: ${meal.name}`);
                meal.lat = 0;
                meal.lng = 0;
                continue;
              }
              
              console.log(`🔍 查询餐厅: ${meal.name} (城市: ${day.city || '未知'})`);
              // 结合城市名称、餐厅名称和地址提高查询准确性
              let mealQuery = '';
              if (day.city) mealQuery += `${day.city} `;
              mealQuery += meal.name;
              if (meal.address) mealQuery += ` ${meal.address}`;
              
              // 优先使用POI搜索（更适合餐厅名称）
              let coords = await searchPOI(mealQuery, day.city);
              
              // 如果POI搜索失败，尝试地理编码
              if (!coords) {
                console.log(`  尝试地理编码: ${mealQuery}`);
                coords = await geocodeLocation(mealQuery);
              }
              
              if (coords) {
                meal.lat = coords.lat;
                meal.lng = coords.lng;
                console.log(`✅ 更新餐厅坐标: ${meal.name} -> (${coords.lat}, ${coords.lng})`);
              } else {
                console.warn(`❌ 未能查询到餐厅坐标: ${meal.name}`);
                meal.lat = 0;
                meal.lng = 0;
              }
              // 添加小延迟避免API限流
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
      }
      console.log("✅ 坐标查询完成");
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("❌ 行程生成错误:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
