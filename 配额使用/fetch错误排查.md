# fetch failed 错误排查指南

## 可能的原因

### 1. Node.js 版本过低
`fetch` API 是 Node.js 18+ 才支持的新特性。

**检查方法：**
```bash
node --version
```

**解决方案：**
- 如果版本 < 18.0.0，需要升级 Node.js
- 下载最新 LTS 版本：https://nodejs.org/

---

### 2. 网络连接问题

**可能原因：**
- 无法连接到 Google API
- 防火墙阻止
- 代理设置问题
- DNS 解析失败

**检查方法：**
运行诊断工具：
```
双击: debug-quota.bat
```

**手动测试网络：**
```bash
# 测试 Google API
ping oauth2.googleapis.com
ping cloudcode-pa.googleapis.com
```

---

### 3. 需要配置代理

如果你在公司网络或使用代理，需要设置环境变量。

**解决方案：**

创建文件 `set-proxy.bat`:
```batch
@echo off
set HTTP_PROXY=http://your-proxy:port
set HTTPS_PROXY=http://your-proxy:port
node antigravity-quota-checker.js
pause
```

或者在命令提示符中运行：
```bash
set HTTP_PROXY=http://your-proxy:port
set HTTPS_PROXY=http://your-proxy:port
node antigravity-quota-checker.js
```

---

### 4. SSL/TLS 证书问题

**临时解决方案（仅用于测试）：**
```bash
set NODE_TLS_REJECT_UNAUTHORIZED=0
node antigravity-quota-checker.js
```

⚠️ **警告：** 这会禁用 SSL 验证，仅用于诊断问题，不建议长期使用。

---

### 5. OAuth Token 过期

**错误信息可能包含：**
- "invalid_grant"
- "Token refresh failed"

**解决方案：**
重新登录：
```bash
opencode auth login
```

---

## 快速诊断步骤

### 步骤 1：运行诊断工具
```
双击: debug-quota.bat
```

### 步骤 2：查看输出

#### 如果看到：
```
[ERROR] fetch not available
```
→ 升级 Node.js 到 18+ 版本

#### 如果看到：
```
[WARNING] Cannot reach google.com
```
→ 检查网络连接

#### 如果看到：
```
Token refresh failed
```
→ 运行 `opencode auth login` 重新登录

#### 如果看到：
```
ECONNREFUSED
```
→ 检查防火墙或代理设置

---

## 详细错误信息

运行时请查看完整错误信息，通常会包含：

```
fetch failed
    at ...
    Error: connect ECONNREFUSED
    或
    Error: getaddrinfo ENOTFOUND
    或
    Error: certificate has expired
```

根据具体错误信息对症下药。

---

## 常见解决方案汇总

### 解决方案 1：升级 Node.js
```
1. 卸载旧版本 Node.js
2. 下载最新 LTS: https://nodejs.org/
3. 安装并重启电脑
4. 验证: node --version
```

### 解决方案 2：检查网络
```
1. 确认能访问 Google
2. 检查防火墙设置
3. 尝试关闭 VPN
4. 检查代理设置
```

### 解决方案 3：重新登录
```
opencode auth login
```

### 解决方案 4：手动测试 API
创建测试文件 `test-fetch.js`:
```javascript
async function test() {
  try {
    const response = await fetch('https://www.google.com');
    console.log('[OK] fetch works!');
    console.log('Status:', response.status);
  } catch (error) {
    console.error('[ERROR]', error.message);
  }
}
test();
```

运行：
```bash
node test-fetch.js
```

---

## 如果以上都不行

### 使用旧版 Node.js 兼容方案

安装 node-fetch 库：
```bash
cd F:\AI编程\配额使用
npm install node-fetch@3
```

然后修改 JS 文件开头，添加：
```javascript
import fetch from 'node-fetch';
```

---

## 需要更多帮助？

1. 运行 `debug-quota.bat`
2. 截图完整错误信息
3. 告诉我：
   - Node.js 版本
   - 网络测试结果
   - 完整错误信息

---

**文件位置**: F:\AI编程\配额使用
**诊断工具**: debug-quota.bat
**创建时间**: 2026-01-28
