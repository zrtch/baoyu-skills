# 每日热门 Skills 拉取任务

自动化获取每日热门 Skills 并推送到远程仓库。

## 功能

- 🔄 每日自动获取 5 个热门 Skills
- 📊 生成 Markdown 报告
- 🚀 自动推送到远程分支
- 🤖 支持 GitHub Actions 自动化

## 数据源

目前支持三种数据源：

### 1. ClawHub（默认）

从 ClawHub API 获取热门 Skills。

```javascript
// 在 fetch-trending-skills.mjs 中配置
source: "clawhub"
```

### 2. GitHub

从 GitHub 搜索热门 Skills 仓库。

```javascript
source: "github"
```

### 3. 自定义

手动维护或其他数据源。

```javascript
source: "custom"
```

## 使用方法

### 自动执行（GitHub Actions）

1. 确保 `.github/workflows/fetch-trending-skills.yml` 文件存在
2. 每天 UTC 00:00（北京时间 08:00）自动执行
3. 也可以在 GitHub Actions 页面手动触发

### 手动执行

```bash
# 在仓库根目录执行
node scripts/fetch-trending-skills.mjs
```

### 本地定时任务（Cron）

在服务器或本地机器上设置 cron：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天早上 8 点执行）
0 8 * * * cd /path/to/baoyu-skills && node scripts/fetch-trending-skills.mjs >> /tmp/fetch-skills.log 2>&1
```

## 配置

编辑 `scripts/fetch-trending-skills.mjs` 中的 CONFIG 对象：

```javascript
const CONFIG = {
  // 数据源类型
  source: "clawhub", // clawhub | github | custom
  
  // 每天获取的数量
  topN: 5,
  
  // 输出文件路径
  outputFile: "docs/trending-skills.md",
  
  // 是否自动推送
  autoPush: true,
};
```

## 输出示例

生成的 `docs/trending-skills.md` 文件：

```markdown
# 每日热门 Skills

> 更新时间：2026/03/25 08:00

| 排名 | Skill 名称 | 描述 | Stars | 链接 |
|------|-----------|------|-------|------|
| 1 | example-skill | An example skill | 100 | [链接](...) |
| 2 | ... | ... | ... | ... |
```

## 权限要求

### GitHub Actions

确保仓库设置中启用了 "Read and write permissions"：

1. 进入仓库 Settings → Actions → General
2. 在 "Workflow permissions" 中选择 "Read and write permissions"
3. 保存

### 本地执行

确保有 Git 提交和推送权限：

```bash
# 配置 Git 凭据（如果需要）
git config --global credential.helper store
```

## 故障排查

### 没有数据

- 检查数据源是否可访问
- 查看 API 是否需要认证
- 尝试不同的数据源

### 推送失败

- 检查 Git 权限
- 确认远程分支配置
- 查看 GitHub Actions 日志

## 扩展

### 添加新的数据源

在 `fetch-trending-skills.mjs` 中添加新的 fetch 函数：

```javascript
async function fetchFromMySource() {
  // 实现你的逻辑
  return skills;
}
```

### 自定义输出格式

修改 `generateMarkdown` 函数来改变输出格式。

### 添加通知

在推送后添加飞书或邮件通知。
