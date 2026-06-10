# 文章专题发布使用文档

这个项目已经支持用 Obsidian 写 Markdown 文章，并通过 Cloudflare Pages 自动发布。

## 日常写作流程

1. 用 Obsidian 打开项目目录，或只打开 `content/articles` 目录。
2. 新建一篇 Markdown，例如：

   ```text
   content/articles/2026-world-cup-travel-guide.md
   ```

3. 在文章顶部填写 frontmatter：

   ```md
   ---
   title: "2026 世界杯观赛旅行指南"
   slug: "2026-world-cup-travel-guide"
   summary: "签证、机票、住宿、城市路线和比赛日安排。"
   category: "专题"
   tags: ["World Cup", "Travel"]
   cover: "/articles/covers/travel-guide.webp"
   publishedAt: "2026-06-10"
   featured: true
   status: "published"
   ---
   ```

4. 在 frontmatter 下面写正文。
5. 保存后提交并推送到 GitHub。
6. Cloudflare Pages 会自动构建，文章会出现在：

   ```text
   /articles/
   /articles/你的-slug/
   /news/ 的专题 tab
   ```

## 字段说明

`title`：文章标题。

`slug`：文章网址，只用英文、数字和短横线。

`summary`：摘要，会出现在卡片、SEO 和文章头部。

`category`：分类，默认建议用“专题”。

`tags`：标签数组。

`cover`：封面图。可以用 `/articles/covers/xxx.webp`，也可以临时使用远程图片 URL。

`publishedAt`：发布日期，格式建议 `YYYY-MM-DD`。

`featured`：是否作为重点文章展示。

`status`：只有 `published` 会发布；`draft` 不会出现在页面里。

## 图片建议

把正式封面图放到：

```text
public/articles/covers/
```

然后在文章里这样引用：

```md
cover: "/articles/covers/travel-guide.webp"
```

## 本地预览

写完文章后运行：

```bash
npm run build
npm run dev
```

然后打开：

```text
http://localhost:3000/articles/
```

## Cloudflare Pages 设置

Cloudflare Pages 推荐设置：

```text
Build command: npm run build
Output directory: out
```

项目已经是 Next.js 静态导出模式，构建成功后可以直接发布到 Cloudflare Pages。

## Obsidian Git 自动发布

推荐安装 Obsidian Git 插件：

```text
Auto commit interval: 10 或 30 分钟
Auto push: 开启
Commit message: publish articles: {{date}}
```

如果想更稳，可以不开自动 push，写完后手动执行一次 push。这样 Cloudflare Pages 才会开始发布。
