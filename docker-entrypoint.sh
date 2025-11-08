#!/bin/sh
set -e

# 将运行时环境变量注入到 Next.js 客户端代码
# Next.js standalone 模式需要特殊处理 NEXT_PUBLIC_* 变量

# 如果环境变量文件存在，加载它
if [ -f /app/.env.local ]; then
  export $(cat /app/.env.local | grep -v '^#' | xargs)
fi

# 注入 NEXT_PUBLIC_* 环境变量到 Next.js
# 注意：这需要在启动前完成
export NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-""}
export NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-""}
export NEXT_PUBLIC_AMAP_KEY=${NEXT_PUBLIC_AMAP_KEY:-""}

# 启动 Next.js 应用
exec node server.js

