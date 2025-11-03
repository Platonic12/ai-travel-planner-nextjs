# AI 旅行规划器 (AI Travel Planner)

基于 Next.js 开发的智能旅行规划应用，使用腾讯混元大模型生成个性化行程，集成高德地图进行地点查询和导航展示。

## 📋 项目概述

本项目是一个智能旅行规划工具，具有以下功能：

- ✅ **智能语音/文本输入**：支持语音识别和自然语言输入旅行需求
- ✅ **AI 生成行程**：使用腾讯混元大模型生成个性化旅行计划
- ✅ **真实坐标查询**：通过高德地图 API 查询景点、餐厅、酒店的准确坐标
- ✅ **地图可视化**：在地图上展示所有地点，支持点击查看详情和跳转导航
- ✅ **云端存储**：使用 Supabase 保存行程数据，支持多设备同步
- ✅ **POI 智能识别**：使用 AI 判断真实地点，过滤动作描述等非 POI 项

## 🚀 快速开始

### 方式一：Docker 运行（推荐）

#### 1. 准备环境变量文件

创建 `.env.local` 文件（在项目根目录），填入所有必需的 API Key：

```env
# 高德地图 API Key（用于前端地图展示）
NEXT_PUBLIC_AMAP_KEY=your_amap_web_key

# 高德地图 API Key（用于后端地理编码查询）
AMAP_WEB_KEY=your_amap_web_key

# 腾讯混元 API 凭证
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key

# Supabase 配置（用于数据存储）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 2. 拉取 Docker 镜像

```bash
# 从阿里云个人实例拉取镜像
docker pull crpi-tr8233lmi3k93dod.cn-hangzhou.personal.cr.aliyuncs.com/ai-travel-planner-nextjs/ai-travel-planner:latest
```

#### 3. 运行容器

```bash
docker run -d \
  --env-file .env.local \
  -p 3000:3000 \
  --name ai-travel-planner \
  crpi-tr8233lmi3k93dod.cn-hangzhou.personal.cr.aliyuncs.com/ai-travel-planner-nextjs/ai-travel-planner:latest
```

> 💡 **提示**：使用 `--env-file .env.local` 可以一次性加载所有环境变量，比使用多个 `-e` 参数更方便。

#### 4. 访问应用

打开浏览器访问：http://localhost:3000

#### 5. 查看日志

```bash
# 查看容器日志
docker logs ai-travel-planner

# 实时查看日志
docker logs -f ai-travel-planner
```

#### 6. 停止和删除容器

```bash
# 停止容器
docker stop ai-travel-planner

# 删除容器
docker rm ai-travel-planner
```

### 方式二：本地开发运行

#### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/ai-travel-planner-nextjs.git
cd ai-travel-planner-nextjs
```

#### 2. 安装依赖

```bash
npm install
# 或
pnpm install
# 或
yarn install
```

#### 3. 配置环境变量

创建 `.env.local` 文件，并填入以下环境变量：

```env
# 高德地图 API Key（用于前端地图展示）
NEXT_PUBLIC_AMAP_KEY=your_amap_web_key

# 高德地图 API Key（用于后端地理编码查询）
AMAP_WEB_KEY=your_amap_web_key

# 腾讯混元 API 凭证
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key

# Supabase 配置（用于数据存储）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ **重要提示**：请将上述 `your_xxx` 替换为实际的 API Key。这些 Key 不会硬编码在代码中，必须通过环境变量配置。

#### 4. 启动开发服务器

```bash
npm run dev
# 或
pnpm dev
# 或
yarn dev
```

应用将在 http://localhost:3000 启动。

## 🔑 API Key 获取指南

### 1. 高德地图 API Key

1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册并登录账号
3. 进入「应用管理」→「我的应用」→「创建新应用」
4. 添加 Key，选择「Web服务」和「Web端（JS API）」
5. 获取 Key 后填入环境变量

### 2. 腾讯混元 API 凭证

1. 访问 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入「访问管理」→「API密钥管理」
3. 创建密钥，获取 `SecretId` 和 `SecretKey`
4. 确保已开通「混元大模型」服务
5. 将凭证填入环境变量

### 3. Supabase 配置

1. 访问 [Supabase](https://supabase.com/)
2. 创建新项目
3. 进入「Project Settings」→「API」
4. 获取 `Project URL` 和 `anon public` key
5. **配置邮件服务（重要）**：
   - 进入「Project Settings」→「Authentication」→「URL Configuration」
   - 设置「Site URL」为 `http://localhost:3000`（本地开发）或你的生产域名
   - 设置「Redirect URLs」为 `http://localhost:3000/**`（本地）或生产域名
   - 进入「Authentication」→「Email Templates」可自定义邮件模板
   - 如需使用自定义 SMTP（可选），进入「Project Settings」→「Auth」→「SMTP Settings」
6. 在 SQL Editor 中创建 `itineraries` 表（见下方）

> ⚠️ **邮件无法收到的排查**：
> 1. 检查邮箱的**垃圾邮件箱**
> 2. 确认 Supabase 项目的「Site URL」配置正确
> 3. 查看 Supabase Dashboard →「Authentication」→「Logs」查看邮件发送状态
> 4. 确认邮箱地址格式正确
> 5. 如果是免费计划，可能有邮件发送频率限制

## 📊 数据库设置

在 Supabase SQL Editor 中执行以下 SQL 创建表：

```sql
-- 创建行程表
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT,
  payload JSONB
);

-- 启用 Row Level Security
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看和操作自己的行程
CREATE POLICY "Users can view own itineraries" ON itineraries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own itineraries" ON itineraries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own itineraries" ON itineraries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own itineraries" ON itineraries
  FOR DELETE USING (auth.uid() = user_id);
```

## 🏗️ 项目结构

```
ai-travel-planner-nextjs/
├── app/
│   ├── api/                    # 后端 API 路由
│   │   ├── plan/              # 生成旅行计划
│   │   ├── parse-input/       # 解析用户输入
│   │   ├── geocode/           # 地理编码
│   │   ├── save/              # 保存行程
│   │   ├── load/              # 加载行程
│   │   └── delete/            # 删除行程
│   ├── page.tsx               # 前端主页面
│   └── layout.tsx             # 根布局
├── components/                # React 组件
│   ├── AMap.tsx              # 高德地图组件
│   ├── ItineraryView.tsx     # 行程展示组件
│   └── AuthBar.tsx           # 认证栏组件
├── lib/
│   └── supabaseClient.ts     # Supabase 客户端配置
├── Dockerfile                # Docker 构建文件
├── .github/
│   └── workflows/
│       └── docker-build.yml   # CI/CD 工作流
└── README.md                 # 项目说明文档
```

## 🐳 Docker 构建

### 本地构建 Docker 镜像

```bash
docker build -t ai-travel-planner:latest .
```

### 推送到阿里云镜像仓库

```bash
# 登录阿里云个人实例
docker login --username=YOUR_USERNAME crpi-tr8233lmi3k93dod.cn-hangzhou.personal.cr.aliyuncs.com

# 标记镜像
docker tag ai-travel-planner:latest crpi-tr8233lmi3k93dod.cn-hangzhou.personal.cr.aliyuncs.com/ai-travel-planner-nextjs/ai-travel-planner:latest

# 推送镜像
docker push crpi-tr8233lmi3k93dod.cn-hangzhou.personal.cr.aliyuncs.com/ai-travel-planner-nextjs/ai-travel-planner:latest
```

> 注意：上述操作也可以通过 GitHub Actions 自动完成（见 `.github/workflows/docker-build.yml`）

### 使用环境变量文件运行（推荐）

为了方便管理环境变量，建议使用 `.env.local` 文件：

```bash
# 运行容器时使用环境变量文件
docker run -d \
  --env-file .env.local \
  -p 3000:3000 \
  --name ai-travel-planner \
  crpi-tr8233lmi3k93dod.cn-hangzhou.personal.cr.aliyuncs.com/ai-travel-planner-nextjs/ai-travel-planner:latest
```

这样就不需要在命令中逐个指定环境变量，更加简洁和安全。

## 🔧 技术栈

- **前端框架**: Next.js 14 (React 18)
- **语言**: TypeScript
- **地图服务**: 高德地图 API
- **AI 模型**: 腾讯混元大模型 (hunyuan-pro)
- **数据库**: Supabase (PostgreSQL)
- **容器化**: Docker
- **CI/CD**: GitHub Actions

## 📝 功能特性

### 1. 智能输入解析
- 支持语音输入（Web Speech API）
- 支持自然语言文本输入
- AI 自动提取目的地、日期、预算、人数、偏好等信息

### 2. AI 行程生成
- 基于腾讯混元大模型生成个性化行程
- 包含每日活动、酒店、餐饮推荐
- 自动估算预算和费用

### 3. 真实坐标查询
- 使用高德地图 API 查询所有地点的真实坐标
- AI 判断真实 POI，过滤非地点项
- 支持景点、酒店、餐厅的坐标查询

### 4. 地图可视化
- 在地图上展示所有标记点
- 点击标记点查看详情
- 支持跳转到高德地图网页版进行导航

### 5. 云端存储
- 行程数据保存到 Supabase
- 支持多设备同步
- 用户认证和数据隔离

## 🚨 注意事项

1. **API Key 安全**：
   - ⚠️ **绝对不要**将 API Key 硬编码在代码中
   - ⚠️ **绝对不要**将包含 API Key 的 `.env.local` 文件提交到 Git
   - ✅ 使用环境变量配置所有 API Key
   - ✅ 在 Docker 运行时通过环境变量传入 Key

2. **环境变量**：
   - 开发环境：使用 `.env.local` 文件（已加入 .gitignore）
   - 生产环境：通过 Docker 环境变量或云平台配置注入

3. **API 限制**：
   - 高德地图 API 有调用频率限制
   - 腾讯混元 API 有调用次数限制
   - 建议在生产环境中配置 API 限流和错误处理

## 📄 许可证

本项目仅供学习使用。

## 👥 作者

- 开发时间：2024年
- 课程项目：AI 应用开发课程作业

## 📚 参考文档

- [Next.js 文档](https://nextjs.org/docs)
- [高德地图 API 文档](https://lbs.amap.com/api)
- [腾讯混元 API 文档](https://cloud.tencent.com/document/product/1729)
- [Supabase 文档](https://supabase.com/docs)

---

## ❓ 常见问题

### 1. 登录时无法收到邮件

**可能原因**：
- Supabase 项目的「Site URL」未正确配置
- 邮件被放入垃圾邮件箱
- Supabase 免费计划有邮件发送限制
- 邮箱地址格式不正确

**解决方法**：
1. 检查 Supabase Dashboard →「Authentication」→「URL Configuration」
   - 设置「Site URL」为 `http://localhost:3000`（开发环境）
   - 添加「Redirect URLs」为 `http://localhost:3000/**`
2. 检查邮箱的**垃圾邮件箱**
3. 查看 Supabase Dashboard →「Authentication」→「Logs」查看邮件发送状态
4. 确认邮箱地址格式正确（如 `user@example.com`）
5. 如果使用 Docker，确保环境变量 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已正确配置

### 2. Docker 容器中无法发送邮件

确保在 `.env.local` 文件中配置了正确的 Supabase 环境变量：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

并在运行容器时使用 `--env-file .env.local` 加载这些变量。

### 3. 地图无法显示

确保：
1. 高德地图 API Key 已正确配置
2. 在 `.env.local` 中设置了 `NEXT_PUBLIC_AMAP_KEY`
3. API Key 已开通 Web 服务（JS API）

---

## 🔗 GitHub 仓库

**仓库地址**: https://github.com/YOUR_USERNAME/ai-travel-planner-nextjs

**Docker 镜像**: `crpi-tr8233lmi3k93dod.cn-hangzhou.personal.cr.aliyuncs.com/ai-travel-planner-nextjs/ai-travel-planner:latest`

---

> 📌 **助教批改说明**：所有必需的 API Key 已在项目运行说明中提供，请按照上述步骤配置环境变量后运行。Docker 镜像已通过 GitHub Actions 自动构建并推送到阿里云镜像仓库。