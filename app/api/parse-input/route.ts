import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: "缺少文本输入" }, { status: 400 });
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

    // 🧠 构造 Prompt —— 专门用于解析用户输入
    const payload = {
      Model: "hunyuan-pro",
      Messages: [
        {
          Role: "system",
          Content: `你是一个专业的旅行信息解析助手。请从用户的自然语言输入中提取旅行相关信息，并严格按照以下JSON格式输出，不要输出任何解释性文字。

输出格式（必须严格遵守）：

{
  "destination": "string，目的地（如：日本 东京、北京、上海等），如果没有明确目的地则返回空字符串",
  "days": number，出行天数（如：5表示5天），如果没有明确天数则返回0,
  "budget": "string，预算（格式：金额 货币单位，如：10000 CNY、150000 JPY、5000 USD），如果没有明确预算则返回空字符串",
  "people": number，同行人数（如：2表示2个人），如果没有明确人数则返回0,
  "preferences": "string，旅行偏好（如：喜欢美食和动漫，带孩子、喜欢文化古迹等），如果没有明确偏好则返回空字符串"
}

注意：
1. 只输出JSON，不要输出任何其他文字或说明
2. 如果某项信息在输入中没有明确提及，请返回对应的默认值（空字符串或0）
3. 预算中的货币单位请标准化：人民币/元/RMB → CNY，日元 → JPY，美元/USD → USD，欧元/EUR → EUR
4. 天数如果是"X天"或"X日"，提取数字X
5. 人数如果是"带X人"、"X个人"、"和X人一起"等，提取数字X
6. 目的地提取时要包含完整信息，如"日本 东京"而不是只提取"日本"
7. 偏好要提取所有相关的描述，如"喜欢美食和动漫，带孩子"应完整提取`
        },
        {
          Role: "user",
          Content: `请解析以下用户输入，提取旅行信息：\n${text}`
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
      return NextResponse.json({ error: "AI解析返回格式错误", raw: content }, { status: 500 });
    }

    // 🔄 处理解析结果，转换为前端需要的格式
    const result: {
      destination?: string;
      startDate?: string;
      endDate?: string;
      budget?: string;
      people?: number;
      prefs?: string;
    } = {};

    // 目的地
    if (parsed.destination && parsed.destination.trim()) {
      result.destination = parsed.destination.trim();
    }

    // 天数 -> 日期
    if (parsed.days && parsed.days > 0 && parsed.days <= 30) {
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + parsed.days - 1);
      result.startDate = start.toISOString().split('T')[0];
      result.endDate = end.toISOString().split('T')[0];
    }

    // 预算
    if (parsed.budget && parsed.budget.trim()) {
      result.budget = parsed.budget.trim();
    }

    // 人数
    if (parsed.people && parsed.people > 0 && parsed.people <= 20) {
      result.people = parsed.people;
    }

    // 偏好
    if (parsed.preferences && parsed.preferences.trim()) {
      result.prefs = parsed.preferences.trim();
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("❌ 解析输入错误:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

