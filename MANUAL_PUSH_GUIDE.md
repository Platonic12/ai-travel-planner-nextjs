# 手动推送 Docker 镜像到阿里云指南

本文档介绍如何手动构建并推送 Docker 镜像到阿里云容器镜像服务。

## 📋 前置条件

1. ✅ 已安装 Docker Desktop 或 Docker Engine
   - 下载地址：https://www.docker.com/get-started
   - 验证安装：`docker --version`

2. ✅ 已配置阿里云容器镜像服务
   - 已创建命名空间
   - 已获取登录凭证（用户名和密码）
   - 参考：`ALIYUN_CONTAINER_REGISTRY_SETUP.md`

3. ✅ 已准备好以下信息：
   - 阿里云登录用户名（通常是邮箱）
   - 阿里云登录密码（在访问凭证中设置的）
   - 命名空间名称（例如：`ai-travel-planner`）
   - 登录地址（例如：`registry.cn-hangzhou.aliyuncs.com`）

## 🚀 方法一：使用脚本推送（推荐）

### 1. 编辑推送脚本

编辑 `push-image.sh` 文件，配置以下变量：

```bash
# 阿里云容器镜像服务登录地址
REGISTRY="registry.cn-hangzhou.aliyuncs.com"

# 你的阿里云账号邮箱
USERNAME="your_email@example.com"

# 命名空间名称
NAMESPACE="ai-travel-planner"
```

### 2. 运行脚本

```bash
# 添加执行权限
chmod +x push-image.sh

# 运行脚本
./push-image.sh
```

脚本会自动执行以下步骤：
1. 检查 Docker 是否安装
2. 登录阿里云容器镜像服务
3. 构建 Docker 镜像（如果还未构建）
4. 标记镜像
5. 推送镜像

## 🔧 方法二：手动执行命令

### 步骤 1: 登录阿里云容器镜像服务

```bash
# 登录（根据你的地域选择登录地址）
docker login --username=YOUR_USERNAME registry.cn-hangzhou.aliyuncs.com

# 或者使用其他地域的地址
# 华东2（上海）: registry.cn-shanghai.aliyuncs.com
# 华北2（北京）: registry.cn-beijing.aliyuncs.com
# 华南1（深圳）: registry.cn-shenzhen.aliyuncs.com
```

输入密码后，显示 "Login Succeeded" 表示登录成功。

### 步骤 2: 构建 Docker 镜像

在项目根目录执行：

```bash
docker build -t ai-travel-planner:latest .
```

构建过程可能需要几分钟，请耐心等待。构建成功后，会显示：

```
Successfully built <image-id>
Successfully tagged ai-travel-planner:latest
```

### 步骤 3: 标记镜像

使用阿里云容器镜像服务的完整地址标记镜像：

```bash
# 替换 YOUR_NAMESPACE 为你的命名空间名称
docker tag ai-travel-planner:latest \
  registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/ai-travel-planner:latest
```

例如：
```bash
docker tag ai-travel-planner:latest \
  registry.cn-hangzhou.aliyuncs.com/ai-travel-planner/ai-travel-planner:latest
```

### 步骤 4: 推送镜像

```bash
# 推送镜像到阿里云
docker push registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/ai-travel-planner:latest
```

推送成功后，会显示：

```
The push refers to repository [registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/ai-travel-planner]
latest: digest: sha256:xxxxx size: xxxxx
```

## ✅ 验证推送结果

### 方式一：在阿里云控制台查看

1. 访问：https://cr.console.aliyun.com/
2. 进入你的命名空间
3. 在镜像仓库列表中找到 `ai-travel-planner`
4. 查看镜像标签和推送时间

### 方式二：使用命令行验证

```bash
# 查看本地镜像
docker images | grep ai-travel-planner

# 测试拉取镜像（可选）
docker pull registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/ai-travel-planner:latest
```

## 📝 完整命令示例

以下是一个完整的示例（请替换为你的实际信息）：

```bash
# 1. 登录
docker login --username=your_email@example.com registry.cn-hangzhou.aliyuncs.com

# 2. 构建镜像
docker build -t ai-travel-planner:latest .

# 3. 标记镜像
docker tag ai-travel-planner:latest \
  registry.cn-hangzhou.aliyuncs.com/ai-travel-planner/ai-travel-planner:latest

# 4. 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/ai-travel-planner/ai-travel-planner:latest
```

## 🐛 常见问题

### 1. Docker 未安装或命令未找到

**错误**：
```
docker: command not found
```

**解决**：
- macOS: 下载 Docker Desktop for Mac
- Linux: 安装 Docker Engine
- Windows: 下载 Docker Desktop for Windows

### 2. 登录失败：401 Unauthorized

**错误**：
```
Error response from daemon: Get https://registry.cn-hangzhou.aliyuncs.com/v2/: unauthorized: authentication required
```

**解决**：
- 检查用户名是否正确（通常是阿里云账号邮箱）
- 检查密码是否正确（在访问凭证中设置的密码）
- 确认登录地址与命名空间所在地域匹配

### 3. 推送失败：denied: requested access to the resource is denied

**错误**：
```
denied: requested access to the resource is denied
```

**解决**：
- 确认命名空间名称正确
- 检查是否有推送权限
- 确认镜像标签格式正确：`registry.cn-hangzhou.aliyuncs.com/命名空间/镜像名:标签`

### 4. 构建失败：Cannot connect to Docker daemon

**错误**：
```
Cannot connect to the Docker daemon
```

**解决**：
- macOS/Windows: 确保 Docker Desktop 正在运行
- Linux: 确保 Docker 服务正在运行：`sudo systemctl start docker`
- 检查 Docker 权限：可能需要使用 `sudo`

### 5. 构建失败：网络问题

**错误**：
```
Failed to fetch ... network timeout
```

**解决**：
- 检查网络连接
- 配置 Docker 代理（如果需要）
- 使用国内镜像源加速构建

## 📦 使用推送的镜像

推送成功后，可以使用以下命令运行容器：

```bash
docker run -d \
  -p 3000:3000 \
  -e AMAP_WEB_KEY=your_amap_key \
  -e TENCENT_SECRET_ID=your_tencent_secret_id \
  -e TENCENT_SECRET_KEY=your_tencent_secret_key \
  -e NEXT_PUBLIC_AMAP_KEY=your_amap_key \
  -e NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key \
  --name ai-travel-planner \
  registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/ai-travel-planner:latest
```

访问：http://localhost:3000

## 🔗 相关文档

- [阿里云容器镜像服务配置指南](./ALIYUN_CONTAINER_REGISTRY_SETUP.md)
- [Docker 官方文档](https://docs.docker.com/)
- [阿里云容器镜像服务文档](https://help.aliyun.com/product/60716.html)

---

**提示**：推送成功后，可以在 GitHub Actions 中配置自动推送，这样每次代码提交都会自动构建和推送镜像。
