#!/usr/bin/env node

/**
 * Antigravity 配额监控工具
 * 使用方法: node antigravity-quota-checker.js
 */

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const CLOUD_CODE_BASE = "https://cloudcode-pa.googleapis.com";
const USER_AGENT = "antigravity/windows/amd64";
const FALLBACK_PROJECT_ID = "bamboo-precept-lgxtn";

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

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

function formatDuration(targetTime) {
  const delta = targetTime - Date.now();
  if (delta <= 0) return "现在";
  const totalSeconds = Math.round(delta / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  if (minutes > 0) return `${minutes}分钟 ${seconds}秒`;
  return `${seconds}秒`;
}

function getStatusColor(remaining) {
  if (remaining === null || remaining === undefined) return colors.gray;
  const percentage = remaining * 100;
  if (percentage <= 10) return colors.red;
  if (percentage <= 30) return colors.yellow;
  return colors.green;
}

function getStatusText(remaining) {
  if (remaining === null || remaining === undefined) return "未知";
  const percentage = Math.round(remaining * 100);
  if (percentage <= 0) return "已限制";
  return "正常";
}

function printGroup(label, entry) {
  if (!entry || entry.count === 0) {
    console.log(`   ${colors.gray}${label}: 无数据${colors.reset}`);
    return;
  }
  
  const remaining = typeof entry.remaining === "number" ? entry.remaining : null;
  const percentage = remaining !== null ? Math.round(remaining * 100) : null;
  const statusColor = getStatusColor(remaining);
  const status = getStatusText(remaining);
  
  const details = [];
  if (percentage !== null) {
    const bar = createProgressBar(percentage);
    details.push(`${bar} ${percentage}%`);
  }
  if (entry.resetTime) {
    const time = formatDuration(Date.parse(entry.resetTime));
    details.push(`重置于 ${time}`);
  }
  
  const suffix = details.length ? ` ${details.join(", ")}` : "";
  console.log(`   ${statusColor}${label}: ${status}${suffix}${colors.reset}`);
}

function createProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
}

async function run() {
  const accountsPath = getDefaultAccountsPath();
  
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}       🚀 Antigravity 配额监控工具${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`${colors.gray}配置文件: ${accountsPath}${colors.reset}\n`);

  let payload;
  try {
    payload = JSON.parse(readFileSync(accountsPath, "utf8"));
  } catch (error) {
    console.error(`${colors.red}错误: 无法读取账户文件${colors.reset}`);
    console.error(`${colors.gray}${error.message}${colors.reset}`);
    process.exit(1);
  }

  const accounts = payload.accounts || [];

  if (accounts.length === 0) {
    console.log(`${colors.yellow}警告: 没有找到账户${colors.reset}`);
    return;
  }

  console.log(`${colors.bright}找到 ${accounts.length} 个账户${colors.reset}\n`);

  let totalActive = 0;
  let totalLimited = 0;
  let totalDisabled = 0;

  for (let index = 0; index < accounts.length; index++) {
    const account = accounts[index];
    const label = account.email || `账户 ${index + 1}`;
    const disabled = account.enabled === false ? `${colors.gray} (已禁用)${colors.reset}` : "";
    
    console.log(`${colors.bright}${index + 1}. ${label}${disabled}${colors.reset}`);

    if (account.enabled === false) {
      totalDisabled++;
      console.log(`   ${colors.gray}状态: 已禁用${colors.reset}\n`);
      continue;
    }

    try {
      const accessToken = await refreshAccessToken(account.refreshToken);
      let projectId = await loadProjectId(accessToken);
      if (!projectId) {
        projectId = account.managedProjectId || account.projectId || FALLBACK_PROJECT_ID;
      }
      console.log(`   ${colors.gray}项目: ${projectId}${colors.reset}`);

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
        throw new Error(`API 错误 (${response.status}): ${text.trim().slice(0, 200)}`);
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

      // 检查是否有配额受限
      let hasLimitedQuota = false;
      for (const group of Object.values(groups)) {
        if (group.remaining !== undefined && group.remaining <= 0.1) {
          hasLimitedQuota = true;
          break;
        }
      }

      if (hasLimitedQuota) {
        totalLimited++;
      } else {
        totalActive++;
      }

      printGroup("Claude 系列", groups["claude"]);
      printGroup("Gemini 3 Pro", groups["gemini-pro"]);
      printGroup("Gemini 3 Flash", groups["gemini-flash"]);
      
      console.log();
    } catch (error) {
      console.log(`   ${colors.red}错误: ${error instanceof Error ? error.message : String(error)}${colors.reset}\n`);
    }
  }

  // 打印总结
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}总览${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}可用账户: ${totalActive}${colors.reset}`);
  console.log(`${colors.yellow}受限账户: ${totalLimited}${colors.reset}`);
  console.log(`${colors.gray}已禁用账户: ${totalDisabled}${colors.reset}`);
  console.log(`${colors.bright}总计: ${accounts.length}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  const now = new Date().toLocaleString('zh-CN');
  console.log(`${colors.gray}更新时间: ${now}${colors.reset}`);
}

run().catch((error) => {
  console.error(`${colors.red}程序错误:${colors.reset}`, error);
  process.exitCode = 1;
});
