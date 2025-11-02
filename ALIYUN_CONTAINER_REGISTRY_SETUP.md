# 阿里云容器镜像服务配置指南

本文档详细介绍如何配置阿里云容器镜像服务（ACR），用于存储 Docker 镜像并通过 GitHub Actions 自动推送。

## 📋 前置条件

1. 拥有阿里云账号（如果没有，访问 https://www.aliyun.com/ 注册）
2. 已实名认证的阿里云账号

## 🚀 配置步骤

### 第一步：开通容器镜像服务

1. **登录阿里云控制台**
   - 访问：https://ecs.console.aliyun.com/
   - 使用阿里云账号登录

2. **开通容器镜像服务**
   - 在控制台搜索"容器镜像服务"或访问：https://cr.console.aliyun.com/
   - 首次使用需要开通服务，点击"开通服务"
   - 选择个人版（免费）或企业版（按需选择）

### 第二步：创建命名空间（Namespace）

1. **进入镜像仓库管理**
   - 在容器镜像服务控制台，点击左侧菜单"镜像仓库"
   - 或访问：https://cr.console.aliyun.com/cn-hangzhou/instances

2. **创建命名空间**
   - 点击"命名空间"标签页
   - 点击"创建命名空间"按钮
   - 填写命名空间名称（例如：`ai-travel-planner` 或你的用户名）
   - 选择地域（推荐：`华东1（杭州）`，对应 `cn-hangzhou`）
   - 设置访问类型：**私有**（推荐）或**公开**
   - 点击"确定"创建

   > 📌 **重要**：记住你的命名空间名称，后续配置 GitHub Actions 时需要用到

### 第三步：创建镜像仓库（可选）

如果需要手动推送镜像，可以创建镜像仓库：

1. **创建镜像仓库**
   - 在命名空间下，点击"创建镜像仓库"
   - 仓库名称：`ai-travel-planner`
   - 选择命名空间：选择刚创建的命名空间
   - 仓库类型：**私有**
   - 仓库简介：可选
   - 点击"下一步"，使用默认设置，点击"创建镜像仓库"

   > 💡 **注意**：如果只通过 GitHub Actions 自动推送，可以跳过这一步

### 第四步：获取访问凭证（Username 和 Password）

1. **进入访问凭证页面**
   - 在容器镜像服务控制台，点击左侧菜单"访问凭证"
   - 或访问：https://cr.console.aliyun.com/cn-hangzhou/instance/credentials

2. **设置登录密码**
   - 如果没有设置密码，点击"设置密码"
   - 设置一个强密码（用于 Docker 登录）
   - 保存密码（后续配置 GitHub Secrets 时需要）

3. **获取用户名**
   - 在访问凭证页面，可以看到你的**登录地址**
   - 格式通常是：`registry.cn-hangzhou.aliyuncs.com`
   - 用户名通常就是你的阿里云账号邮箱或 RAM 子账号名称
   - 如果使用 RAM 子账号，格式为：`子账号名称@主账号别名`

### 第五步：配置 GitHub Secrets

1. **进入 GitHub 仓库设置**
   - 访问：https://github.com/Platonic12/ai-travel-planner-nextjs
   - 点击顶部菜单 "Settings"
   - 左侧菜单选择 "Secrets and variables" → "Actions"

2. **添加三个 Secrets**

   #### Secret 1: `ALIYUN_USERNAME`
   - 点击 "New repository secret"
   - Name: `ALIYUN_USERNAME`
   - Secret: 你的阿里云账号邮箱（或 RAM 子账号名称）
   - 点击 "Add secret"

   #### Secret 2: `ALIYUN_PASSWORD`
   - 点击 "New repository secret"
   - Name: `ALIYUN_PASSWORD`
   - Secret: 你在容器镜像服务中设置的登录密码
   - 点击 "Add secret"

   #### Secret 3: `ALIYUN_NAMESPACE`
   - 点击 "New repository secret"
   - Name: `ALIYUN_NAMESPACE`
   - Secret: 你创建的命名空间名称（例如：`ai-travel-planner`）
   - 点击 "Add secret"

   > ⚠️ **安全提示**：这些 Secrets 将用于 GitHub Actions 自动推送镜像，请确保密码足够安全。

### 第六步：验证配置

#### 方式一：通过 GitHub Actions 自动构建（推荐）

1. **触发 GitHub Actions**
   - 推送代码到 GitHub 或创建 Pull Request
   - 进入仓库的 "Actions" 标签页
   - 查看构建状态

2. **检查构建日志**
   - 如果构建成功，镜像会自动推送到阿里云
   - 在容器镜像服务控制台的"镜像仓库"中可以看到推送的镜像

#### 方式二：手动推送测试

如果 GitHub Actions 未配置成功，可以手动测试：

```bash
# 1. 登录阿里云容器镜像服务
docker login --username=YOUR_USERNAME registry.cn-hangzhou.aliyuncs.com
# 输入密码（你设置的登录密码）

# 2. 构建本地镜像
docker build -t ai-travel-planner:latest .

# 3. 标记镜像
docker tag ai-travel-planner:latest registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/ai-travel-planner:latest

# 4. 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/ai-travel-planner:latest
```

## 📝 配置信息汇总

完成配置后，请记录以下信息：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **登录地址** | `registry.cn-hangzhou.aliyuncs.com` | 默认地址（根据你选择的地域） |
| **用户名** | `your_email@example.com` | 阿里云账号邮箱或 RAM 子账号 |
| **密码** | `********` | 在访问凭证中设置的密码 |
| **命名空间** | `ai-travel-planner` | 你创建的命名空间名称 |
| **镜像地址** | `registry.cn-hangzhou.aliyuncs.com/ai-travel-planner/ai-travel-planner:latest` | 完整的镜像地址 |

## 🔍 不同地域的登录地址

根据你选择的阿里云地域，登录地址可能不同：

| 地域 | 登录地址 |
|------|---------|
| 华东1（杭州） | `registry.cn-hangzhou.aliyuncs.com` |
| 华东2（上海） | `registry.cn-shanghai.aliyuncs.com` |
| 华北2（北京） | `registry.cn-beijing.aliyuncs.com` |
| 华南1（深圳） | `registry.cn-shenzhen.aliyuncs.com` |

> 💡 **提示**：如果使用其他地域，需要修改 `.github/workflows/docker-build.yml` 中的 `REGISTRY` 环境变量。

## ⚠️ 常见问题

### 1. 登录失败：401 Unauthorized
- **原因**：用户名或密码错误
- **解决**：检查访问凭证页面，确认用户名和密码正确

### 2. 推送失败：denied: requested access to the resource is denied
- **原因**：命名空间不存在或没有权限
- **解决**：确认命名空间名称正确，检查是否有推送权限

### 3. GitHub Actions 构建失败
- **检查点**：
  1. GitHub Secrets 是否配置正确
  2. 命名空间名称是否正确
  3. 登录地址是否与地域匹配

### 4. 找不到镜像仓库
- **原因**：镜像仓库可能还未创建
- **解决**：GitHub Actions 会自动创建，或手动在控制台创建

## 📚 参考文档

- [阿里云容器镜像服务官方文档](https://help.aliyun.com/product/60716.html)
- [Docker 登录阿里云镜像仓库](https://help.aliyun.com/document_detail/60750.html)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

## 🎯 下一步

配置完成后：

1. ✅ 更新 `README.md` 中的 `YOUR_NAMESPACE` 为实际命名空间
2. ✅ 验证 GitHub Actions 是否成功构建和推送镜像
3. ✅ 在 README 中添加实际的 Docker 镜像拉取地址

---

**配置完成后，你的 Docker 镜像地址格式为：**

```
registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/ai-travel-planner:latest
```

将此地址更新到 `README.md` 中。
