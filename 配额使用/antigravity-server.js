/**
 * Antigravity 配额监控 - HTTP 服务器
 * 提供 Web API 来查询配额信息，绕过 CORS 限制
 * 
 * 使用方法:
 * 1. npm install
 * 2. node antigravity-server.js
 * 3. 打开浏览器访问 http://localhost:3000
 */

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createServer } from "http";

const CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const CLOUD_CODE_BASE = "https://cloudcode-pa.googleapis.com";
const USER_AGENT = "antigravity/windows/amd64";
const FALLBACK_PROJECT_ID = "bamboo-precept-lgxtn";
const PORT = process.env.PORT || 8080;

function getDefaultAccountsPath() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
    return join(appData, "opencode", "antigravity-accounts.json");
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdgConfig, "opencode", "antigravity-accounts.json");
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token refresh failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const payload = await response.json();
  return payload.access_token;
}

async function loadProjectId(accessToken) {
  const body = { metadata: { ideType: "ANTIGRAVITY" } };
  const response = await fetch(`${CLOUD_CODE_BASE}/v1internal:loadCodeAssist`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
      "Client-Metadata": JSON.stringify({
        ideType: "IDE_UNSPECIFIED",
        platform: "PLATFORM_UNSPECIFIED",
        pluginType: "GEMINI"
      }),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return "";
  }

  const payload = await response.json();
  if (typeof payload.cloudaicompanionProject === "string") {
    return payload.cloudaicompanionProject;
  }
  if (payload.cloudaicompanionProject && typeof payload.cloudaicompanionProject.id === "string") {
    return payload.cloudaicompanionProject.id;
  }
  return "";
}

function classifyGroup(modelName) {
  const lower = modelName.toLowerCase();
  if (lower.includes("claude")) return "claude";
  if (!lower.includes("gemini-3")) return null;
  if (lower.includes("flash")) return "gemini-flash";
  return "gemini-pro";
}

function updateGroup(groups, group, remainingFraction, resetTime) {
  const entry = groups[group] || { count: 0 };
  entry.count += 1;
  if (typeof remainingFraction === "number") {
    if (entry.remaining === undefined) {
      entry.remaining = remainingFraction;
    } else {
      entry.remaining = Math.min(entry.remaining, remainingFraction);
    }
  }
  if (resetTime) {
    const timestamp = Date.parse(resetTime);
    if (Number.isFinite(timestamp)) {
      if (!entry.resetTime) {
        entry.resetTime = resetTime;
      } else {
        const existing = Date.parse(entry.resetTime);
        if (!Number.isFinite(existing) || timestamp < existing) {
          entry.resetTime = resetTime;
        }
      }
    }
  }
  groups[group] = entry;
}

async function getQuotaData() {
  const accountsPath = getDefaultAccountsPath();
  const payload = JSON.parse(readFileSync(accountsPath, "utf8"));
  const accounts = payload.accounts || [];

  const results = [];

  for (let index = 0; index < accounts.length; index++) {
    const account = accounts[index];
    const accountData = {
      index: index + 1,
      email: account.email || `Account ${index + 1}`,
      enabled: account.enabled !== false,
      projectId: null,
      quotas: {},
      error: null,
    };

    if (account.enabled === false) {
      results.push(accountData);
      continue;
    }

    try {
      const accessToken = await refreshAccessToken(account.refreshToken);
      let projectId = await loadProjectId(accessToken);
      if (!projectId) {
        projectId = account.managedProjectId || account.projectId || FALLBACK_PROJECT_ID;
      }
      accountData.projectId = projectId;

      const body = projectId ? { project: projectId } : {};
      const response = await fetch(
        `${CLOUD_CODE_BASE}/v1internal:fetchAvailableModels`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
            "Client-Metadata": JSON.stringify({
              ideType: "IDE_UNSPECIFIED",
              platform: "PLATFORM_UNSPECIFIED",
              pluginType: "GEMINI"
            }),
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`API error (${response.status}): ${text.trim().slice(0, 200)}`);
      }

      const data = await response.json();
      const groups = {};
      const models = data.models || {};

      for (const [modelName, info] of Object.entries(models)) {
        const group = classifyGroup(modelName);
        if (!group) continue;
        if (!info || !info.quotaInfo) continue;
        const remaining = info.quotaInfo.remainingFraction ?? 0;
        updateGroup(groups, group, remaining, info.quotaInfo.resetTime);
      }

      accountData.quotas = groups;
    } catch (error) {
      accountData.error = error instanceof Error ? error.message : String(error);
    }

    results.push(accountData);
  }

  return results;
}

const htmlPage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Antigravity 配额监控</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .refresh-btn {
            padding: 12px 24px;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin: 20px auto;
            display: block;
        }
        .refresh-btn:hover { background: #f0f0f0; }
        .summary {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .summary-item { text-align: center; }
        .summary-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }
        .summary-label {
            font-size: 0.9em;
            color: #666;
            text-transform: uppercase;
        }
        .accounts { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .account {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .account.disabled { opacity: 0.6; }
        .account-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }
        .account-email { font-weight: 600; color: #333; }
        .status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 600;
        }
        .status-ok { background: #e7f7ef; color: #2d8659; }
        .status-disabled { background: #fee; color: #c33; }
        .quota-item { margin-bottom: 15px; }
        .quota-label {
            font-size: 0.85em;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .quota-bar-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .quota-bar {
            flex: 1;
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        }
        .quota-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 0.5s ease;
        }
        .quota-fill.ok { background: linear-gradient(90deg, #48bb78, #38a169); }
        .quota-fill.warning { background: linear-gradient(90deg, #ed8936, #dd6b20); }
        .quota-fill.critical { background: linear-gradient(90deg, #f56565, #e53e3e); }
        .quota-text {
            min-width: 80px;
            text-align: right;
            font-weight: 600;
            font-size: 0.9em;
        }
        .reset-time {
            font-size: 0.8em;
            color: #888;
            margin-top: 5px;
        }
        .loading {
            text-align: center;
            color: white;
            font-size: 1.2em;
            padding: 40px;
        }
        .timestamp {
            text-align: center;
            color: white;
            margin-top: 20px;
            opacity: 0.8;
        }
        .error {
            background: #fee;
            color: #c33;
            padding: 10px;
            border-radius: 8px;
            margin-top: 10px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Antigravity 配额监控</h1>
            <p>实时监控 Google Antigravity 账户的 Claude & Gemini 配额</p>
        </div>
        
        <button class="refresh-btn" onclick="loadData()">🔄 刷新配额</button>
        
        <div id="loading" class="loading">正在加载配额数据...</div>
        <div id="content" style="display: none;">
            <div class="summary">
                <div class="summary-item">
                    <div class="summary-value" id="totalAccounts">0</div>
                    <div class="summary-label">账户总数</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" id="activeAccounts">0</div>
                    <div class="summary-label">可用账户</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value" id="limitedAccounts">0</div>
                    <div class="summary-label">受限账户</div>
                </div>
            </div>
            
            <div id="accounts" class="accounts"></div>
            
            <div class="timestamp" id="timestamp"></div>
        </div>
    </div>

    <script>
        function formatDuration(targetTime) {
            const delta = targetTime - Date.now();
            if (delta <= 0) return "现在";
            const totalSeconds = Math.round(delta / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            if (hours > 0) return hours + "小时 " + minutes + "分钟";
            return minutes + "分钟";
        }

        function getQuotaClass(remaining) {
            if (remaining === null || remaining === undefined) return 'ok';
            const percentage = remaining * 100;
            if (percentage <= 10) return 'critical';
            if (percentage <= 30) return 'warning';
            return 'ok';
        }

        function renderQuota(label, quota) {
            if (!quota || quota.count === 0) return '';
            
            const remaining = typeof quota.remaining === 'number' ? quota.remaining : null;
            const percentage = remaining !== null ? Math.round(remaining * 100) : 0;
            const quotaClass = getQuotaClass(remaining);
            const resetText = quota.resetTime 
                ? '重置于 ' + formatDuration(Date.parse(quota.resetTime))
                : '';

            return \`
                <div class="quota-item">
                    <div class="quota-label">\${label}</div>
                    <div class="quota-bar-wrapper">
                        <div class="quota-bar">
                            <div class="quota-fill \${quotaClass}" style="width: \${percentage}%"></div>
                        </div>
                        <div class="quota-text">\${percentage}%</div>
                    </div>
                    \${resetText ? '<div class="reset-time">' + resetText + '</div>' : ''}
                </div>
            \`;
        }

        async function loadData() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('content').style.display = 'none';

            try {
                const response = await fetch('/api/quota');
                const data = await response.json();

                let totalActive = 0;
                let totalLimited = 0;

                const accountsHtml = data.map(account => {
                    if (account.enabled) {
                        const hasLimited = Object.values(account.quotas).some(q => 
                            q.remaining !== undefined && q.remaining <= 0.1
                        );
                        if (hasLimited) totalLimited++;
                        else totalActive++;
                    }

                    return \`
                        <div class="account \${!account.enabled ? 'disabled' : ''}">
                            <div class="account-header">
                                <div class="account-email">\${account.email}</div>
                                <div class="status \${account.enabled ? 'status-ok' : 'status-disabled'}">
                                    \${account.enabled ? '已启用' : '已禁用'}
                                </div>
                            </div>
                            \${account.projectId ? '<div style="font-size: 0.8em; color: #888; margin-bottom: 10px;">项目: ' + account.projectId + '</div>' : ''}
                            \${renderQuota('Claude 系列', account.quotas.claude)}
                            \${renderQuota('Gemini 3 Pro', account.quotas['gemini-pro'])}
                            \${renderQuota('Gemini 3 Flash', account.quotas['gemini-flash'])}
                            \${account.error ? '<div class="error">' + account.error + '</div>' : ''}
                        </div>
                    \`;
                }).join('');

                document.getElementById('totalAccounts').textContent = data.length;
                document.getElementById('activeAccounts').textContent = totalActive;
                document.getElementById('limitedAccounts').textContent = totalLimited;
                document.getElementById('accounts').innerHTML = accountsHtml;
                document.getElementById('timestamp').textContent = '最后更新: ' + new Date().toLocaleString('zh-CN');

                document.getElementById('loading').style.display = 'none';
                document.getElementById('content').style.display = 'block';
            } catch (error) {
                document.getElementById('loading').innerHTML = '<div style="color: #fee;">加载失败: ' + error.message + '</div>';
            }
        }

        loadData();
        setInterval(loadData, 60000); // 每分钟自动刷新
    </script>
</body>
</html>
`;

const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage);
    return;
  }

  if (req.url === '/api/quota') {
    try {
      const data = await getQuotaData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Antigravity 配额监控服务器已启动`);
  console.log(`\n请在浏览器中访问: http://localhost:${PORT}`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});

server.on('error', (err) => {
  if (err.code === 'EACCES') {
    console.error(`\n❌ 错误: 端口 ${PORT} 权限被拒绝`);
    console.error(`\n请尝试以下解决方案:`);
    console.error(`  1. 使用其他端口: PORT=8081 node antigravity-server.js`);
    console.error(`  2. 以管理员身份运行`);
    console.error(`  3. 检查防火墙设置\n`);
  } else if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ 错误: 端口 ${PORT} 已被占用`);
    console.error(`\n请尝试以下解决方案:`);
    console.error(`  1. 使用其他端口: PORT=8081 node antigravity-server.js`);
    console.error(`  2. 关闭占用该端口的程序\n`);
  } else {
    console.error(`\n❌ 服务器错误:`, err);
  }
  process.exit(1);
});
