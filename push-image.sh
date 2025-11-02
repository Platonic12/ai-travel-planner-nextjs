#!/bin/bash

# 阿里云容器镜像服务手动推送脚本
# 使用前请先配置以下变量

# ==================== 配置区域 ====================
# 请替换以下变量为你的实际配置

# 阿里云容器镜像服务登录地址（根据你选择的地域）
REGISTRY="registry.cn-hangzhou.aliyuncs.com"

# 你的阿里云账号邮箱或RAM子账号名称
USERNAME="your_email@example.com"

# 你的登录密码（在访问凭证中设置的密码）
PASSWORD="your_password"

# 你创建的命名空间名称
NAMESPACE="ai-travel-planner"

# 镜像名称
IMAGE_NAME="ai-travel-planner"

# ==================== 执行区域 ====================

echo "🚀 开始推送 Docker 镜像到阿里云容器镜像服务..."
echo ""

# 1. 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装或不在 PATH 中"
    echo "请先安装 Docker: https://www.docker.com/get-started"
    exit 1
fi

echo "✅ Docker 已安装: $(docker --version)"
echo ""

# 2. 登录阿里云容器镜像服务
echo "📝 步骤 1: 登录阿里云容器镜像服务..."
echo "登录地址: $REGISTRY"
echo "用户名: $USERNAME"
echo ""

echo "请输入你的阿里云登录密码:"
read -s PASSWORD

docker login --username="$USERNAME" "$REGISTRY"
if [ $? -ne 0 ]; then
    echo "❌ 登录失败，请检查用户名和密码"
    exit 1
fi

echo "✅ 登录成功"
echo ""

# 3. 构建镜像（如果还未构建）
echo "📝 步骤 2: 构建 Docker 镜像..."
if ! docker images | grep -q "^ai-travel-planner.*latest"; then
    echo "正在构建镜像..."
    docker build -t "$IMAGE_NAME:latest" .
    if [ $? -ne 0 ]; then
        echo "❌ 构建失败"
        exit 1
    fi
    echo "✅ 构建成功"
else
    echo "✅ 镜像已存在，跳过构建"
fi
echo ""

# 4. 标记镜像
echo "📝 步骤 3: 标记镜像..."
FULL_IMAGE_NAME="$REGISTRY/$NAMESPACE/$IMAGE_NAME:latest"
docker tag "$IMAGE_NAME:latest" "$FULL_IMAGE_NAME"
if [ $? -ne 0 ]; then
    echo "❌ 标记失败"
    exit 1
fi
echo "✅ 镜像已标记为: $FULL_IMAGE_NAME"
echo ""

# 5. 推送镜像
echo "📝 步骤 4: 推送镜像到阿里云..."
docker push "$FULL_IMAGE_NAME"
if [ $? -ne 0 ]; then
    echo "❌ 推送失败"
    exit 1
fi

echo ""
echo "✅ 推送成功！"
echo ""
echo "📦 镜像地址: $FULL_IMAGE_NAME"
echo ""
echo "可以使用以下命令拉取镜像:"
echo "docker pull $FULL_IMAGE_NAME"
echo ""
echo "可以使用以下命令运行容器:"
echo "docker run -d -p 3000:3000 \\"
echo "  -e AMAP_WEB_KEY=your_key \\"
echo "  -e TENCENT_SECRET_ID=your_id \\"
echo "  -e TENCENT_SECRET_KEY=your_key \\"
echo "  -e NEXT_PUBLIC_AMAP_KEY=your_key \\"
echo "  -e NEXT_PUBLIC_SUPABASE_URL=your_url \\"
echo "  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \\"
echo "  --name ai-travel-planner \\"
echo "  $FULL_IMAGE_NAME"
echo ""

