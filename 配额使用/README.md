# 🚀 Antigravity 配额监控工具

监控您的 Google Antigravity 账户的 Claude 和 Gemini 配额使用情况。

## 📋 功能特点

- ✅ 实时监控多个 Google 账户的配额
- ✅ 支持 Claude Sonnet 4.5、Opus 4.5 等模型
- ✅ 支持 Gemini 3 Pro 和 Gemini 3 Flash
- ✅ 显示配额剩余百分比
- ✅ 显示配额重置时间
- ✅ 美观的 Web 界面
- ✅ 自动刷新（每分钟）

## 🎯 两种使用方式

### 方式 1: 命令行工具（快速查看）

直接在终端中查看配额信息。

**使用方法:**
```bash
node antigravity-quota-checker.js
```

**输出示例:**
```
═══════════════════════════════════════════════════════
       🚀 Antigravity 配额监控工具
═══════════════════════════════════════════════════════

找到 2 个账户

1. user@gmail.com
   项目: my-project-id
   Claude 系列: 正常 [████████████████████] 100%, 重置于 5小时 30分钟
   Gemini 3 Pro: 正常 [██████████          ] 50%, 重置于 2小时 15分钟
   Gemini 3 Flash: 正常 [████████████████    ] 80%, 重置于 1小时 45分钟

═══════════════════════════════════════════════════════
总览
═══════════════════════════════════════════════════════
可用账户: 2
受限账户: 0
已禁用账户: 0
总计: 2
═══════════════════════════════════════════════════════
```

### 方式 2: Web 界面（推荐）

在浏览器中查看配额信息，支持自动刷新。

**使用方法:**

1. 启动服务器:
```bash
node antigravity-server.js
```

2. 打开浏览器访问:
```
http://localhost:3000
```

**Web 界面特点:**
- 📊 美观的仪表板
- 🔄 自动刷新（每分钟）
- 📱 响应式设计
- 🎨 彩色进度条
  - 绿色: 配额充足 (> 30%)
  - 橙色: 配额警告 (10-30%)
  - 红色: 配额严重不足 (≤ 10%)

## 📦 安装

### 前置要求

- Node.js 18+ (支持 ES Modules 和 fetch API)

### 安装步骤

1. 确保你已经安装了 `opencode-antigravity-auth` 插件
2. 确保你有 `antigravity-accounts.json` 文件

文件位置:
- **Windows**: `C:\Users\你的用户名\.config\opencode\antigravity-accounts.json`
- **Mac/Linux**: `~/.config/opencode/antigravity-accounts.json`

## 🚀 快速开始

### 方式 1: 使用批处理脚本（Windows - 最简单）

#### 命令行模式（快速查看）
双击 `check-quota.bat` 文件

#### Web 界面模式（推荐）
双击 `start-server.bat` 文件，然后在浏览器中访问显示的地址

### 方式 2: 使用命令行

#### 命令行模式

```bash
node antigravity-quota-checker.js
```

#### Web 模式

```bash
# 启动 Web 服务器（默认端口 8080）
node antigravity-server.js

# 或使用自定义端口
PORT=8081 node antigravity-server.js

# 使用 npm 脚本
npm start
```

然后在浏览器中访问 `http://localhost:8080`（或你设置的端口）

## 📊 配额说明

该工具监控三类配额:

1. **Claude 系列**
   - Claude Sonnet 4.5
   - Claude Sonnet 4.5 Thinking
   - Claude Opus 4.5 Thinking

2. **Gemini 3 Pro**
   - Gemini 3 Pro High
   - Gemini 3 Pro Low

3. **Gemini 3 Flash**
   - Gemini 3 Flash (各种 thinking 级别)

## 🔧 配置

工具会自动读取 `~/.config/opencode/antigravity-accounts.json` 文件。

如果你的配置文件在其他位置，可以修改脚本中的 `getDefaultAccountsPath()` 函数。

## ⚠️ 注意事项

1. **安全性**: 
   - 你的 `antigravity-accounts.json` 文件包含敏感的 OAuth refresh tokens
   - 请勿分享此文件
   - Web 服务器仅在本地运行（localhost）

2. **API 限制**:
   - 工具使用 Antigravity 的内部 API
   - 请勿过于频繁地刷新配额（建议间隔 >= 1分钟）

3. **权限**:
   - 需要有效的 Google OAuth 认证
   - 如果 refresh token 过期，需要重新运行 `opencode auth login`

## 🐛 故障排查

### 错误: 端口被占用或权限拒绝

**错误信息**: `Error: listen EACCES: permission denied` 或 `EADDRINUSE`

**解决方案**:
```bash
# 方案 1: 使用其他端口
PORT=8081 node antigravity-server.js

# 方案 2: 查找占用端口的程序（Windows）
netstat -ano | findstr :8080

# 方案 3: 以管理员身份运行
# 右键点击 start-server.bat -> 以管理员身份运行
```

### 错误: 无法读取账户文件

**原因**: 找不到 `antigravity-accounts.json` 文件

**解决方案**:
1. 确认文件路径是否正确
2. 确认你已经运行过 `opencode auth login`
3. 检查文件权限

### 错误: Token refresh failed

**原因**: OAuth refresh token 已过期或无效

**解决方案**:
```bash
# 重新登录
opencode auth login
```

### 错误: Permission denied (403)

**原因**: API 认证失败

**解决方案**:
1. 检查是否添加了正确的请求头
2. 确认 Google 账户有权限访问 Antigravity
3. 尝试重新登录

## 📝 NPM 脚本

```bash
# 启动 Web 服务器
npm start

# 运行命令行检查工具
npm run check
```

## 🎨 自定义

### 修改端口

编辑 `antigravity-server.js`:
```javascript
const PORT = 3000; // 改为你想要的端口
```

### 修改刷新间隔

编辑 `antigravity-server.js` 中的 HTML 部分:
```javascript
setInterval(loadData, 60000); // 60000ms = 1分钟
```

## 📄 许可证

MIT License

## 🙏 致谢

基于 [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) 项目的 API 规范。

## 📧 支持

如有问题，请检查:
1. Node.js 版本 >= 18
2. `antigravity-accounts.json` 文件存在且有效
3. Google OAuth tokens 未过期

---

**提示**: 首次使用建议先运行命令行工具测试，确认能正常获取配额后再使用 Web 界面。
