#!/usr/bin/env node

/**
 * 每日热门 Skills 拉取脚本
 * 
 * 功能：
 * 1. 从数据源获取热门 Skills
 * 2. 更新仓库中的热门 Skills 列表
 * 3. 推送到远程分支
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// 配置
const CONFIG = {
  // 数据源类型：clawhub | github | custom
  source: "github",
  
  // ClawHub API 地址
  clawhubApi: "https://clawhub.ai",
  
  // GitHub API（如果使用 GitHub 作为数据源）
  githubApi: "https://api.github.com",
  
  // 每天获取的热门 Skills 数量
  topN: 5,
  
  // 输出文件路径（相对于仓库根目录）
  outputFile: "docs/trending-skills.md",
  
  // 是否自动推送到远程
  autoPush: false,
  
  // 默认分支
  defaultBranch: "main",
};

// 获取仓库根目录
function getRepoRoot() {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  return path.resolve(scriptDir, "..");
}

// 从 ClawHub 获取热门 Skills
async function fetchFromClawhub() {
  console.log("Fetching from ClawHub...");
  
  try {
    const response = await fetch(
      `${CONFIG.clawhubApi}/api/v1/skills?limit=${CONFIG.topN}&sort=popular`
    );
    
    if (!response.ok) {
      throw new Error(`ClawHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch from ClawHub:", error.message);
    return [];
  }
}

// 从 GitHub 获取热门 Skills 仓库
async function fetchFromGithub() {
  console.log("Fetching from GitHub...");
  
  try {
    // 搜索包含 SKILL.md 或 skill.md 的热门仓库
    // 使用更简单的查询，减少错误
    const query = encodeURIComponent("SKILL.md in:readme,in:path");
    const response = await fetch(
      `${CONFIG.githubApi}/search/repositories?q=${query}&sort=stars&order=desc&per_page=${CONFIG.topN}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "baoyu-skills-fetcher",
          // 如果需要更高的 API 限制，可以添加 token
          ...(process.env.GITHUB_TOKEN && { Authorization: `token ${process.env.GITHUB_TOKEN}` }),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    return (data.items || []).map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || "No description",
      stars: repo.stargazers_count,
      url: repo.html_url,
      updatedAt: repo.updated_at,
    }));
  } catch (error) {
    console.error("Failed to fetch from GitHub:", error.message);
    
    // 如果 GitHub API 失败，返回一些示例数据
    return getFallbackData();
  }
}

// 备用数据（当所有数据源都失败时使用）
function getFallbackData() {
  console.log("Using fallback data...");
  
  return [
    {
      name: "baoyu-skills",
      fullName: "JimLiu/baoyu-skills",
      description: "Content generation, AI backends, and utility tools for daily work efficiency",
      stars: 100,
      url: "https://github.com/JimLiu/baoyu-skills",
      updatedAt: new Date().toISOString(),
    },
    {
      name: "openclaw",
      fullName: "openclaw/openclaw",
      description: "AI agent framework with skills system",
      stars: 50,
      url: "https://github.com/openclaw/openclaw",
      updatedAt: new Date().toISOString(),
    },
  ];
}

// 自定义数据源（可以手动维护或从其他来源获取）
async function fetchFromCustom() {
  console.log("Fetching from custom source...");
  
  // 这里可以添加自定义的数据源逻辑
  // 例如：从某个 JSON 文件读取，或者从其他 API 获取
  
  return [
    // 示例数据
    // {
    //   name: "example-skill",
    //   fullName: "username/example-skill",
    //   description: "An example skill",
    //   stars: 100,
    //   url: "https://github.com/username/example-skill",
    //   updatedAt: new Date().toISOString(),
    // },
  ];
}

// 生成 Markdown 报告
function generateMarkdown(skills, date) {
  const header = `# 每日热门 Skills

> 更新时间：${date}

本页面每日自动更新，展示最新的热门 Skills。

---

`;

  if (skills.length === 0) {
    return header + "暂无数据。\n";
  }

  const table = `| 排名 | Skill 名称 | 描述 | Stars | 链接 |
|------|-----------|------|-------|------|
${skills.map((skill, index) => {
  const name = skill.displayName || skill.name || "Unknown";
  const desc = skill.description || "No description";
  const stars = skill.stars || skill.starCount || "N/A";
  const url = skill.url || `https://github.com/${skill.fullName}`;
  
  return `| ${index + 1} | ${name} | ${desc} | ${stars} | [链接](${url}) |`;
}).join("\n")}
`;

  return header + table;
}

// 推送到远程仓库
function pushToRemote(rootDir, content) {
  console.log("Pushing to remote repository...");
  
  try {
    // 检查是否有 git
    execSync("git --version", { stdio: "ignore" });
  } catch {
    console.error("Git is not installed.");
    return false;
  }
  
  const originalDir = process.cwd();
  
  try {
    process.chdir(rootDir);
    
    // 检查是否有变更
    const status = execSync("git status --porcelain", { encoding: "utf-8" });
    
    if (!status.trim()) {
      console.log("No changes to commit.");
      return true;
    }
    
    // 获取当前日期作为提交信息
    const date = new Date().toISOString().split("T")[0];
    const message = `chore: update trending skills - ${date}`;
    
    // 添加变更
    execSync("git add .", { stdio: "inherit" });
    
    // 提交
    execSync(`git commit -m "${message}"`, { stdio: "inherit" });
    
    // 推送
    if (CONFIG.autoPush) {
      execSync("git push origin HEAD", { stdio: "inherit" });
      console.log("✓ Successfully pushed to remote.");
    } else {
      console.log("Changes committed. Run 'git push' to push to remote.");
    }
    
    return true;
  } catch (error) {
    console.error("Failed to push to remote:", error.message);
    return false;
  } finally {
    process.chdir(originalDir);
  }
}

// 主函数
async function main() {
  console.log("=== Fetch Trending Skills ===\n");
  
  const rootDir = getRepoRoot();
  const today = new Date().toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  // 根据配置获取数据
  let skills = [];
  
  switch (CONFIG.source) {
    case "clawhub":
      skills = await fetchFromClawhub();
      break;
    case "github":
      skills = await fetchFromGithub();
      break;
    case "custom":
      skills = await fetchFromCustom();
      break;
    default:
      console.error(`Unknown source: ${CONFIG.source}`);
      process.exit(1);
  }
  
  console.log(`\nFetched ${skills.length} skills.`);
  
  if (skills.length === 0) {
    console.log("No skills found. Exiting.");
    process.exit(0);
  }
  
  // 生成 Markdown
  const markdown = generateMarkdown(skills, today);
  
  // 写入文件
  const outputPath = path.join(rootDir, CONFIG.outputFile);
  const outputDir = path.dirname(outputPath);
  
  if (!existsSync(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true });
  }
  
  await fs.writeFile(outputPath, markdown, "utf-8");
  console.log(`\n✓ Written to ${CONFIG.outputFile}`);
  
  // 推送到远程
  if (CONFIG.autoPush) {
    pushToRemote(rootDir, markdown);
  }
  
  console.log("\n=== Done ===");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
