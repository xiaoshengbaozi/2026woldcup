# 2026 世界杯预测市场终端

2026 年 FIFA 世界杯赛程仪表盘 + 实时预测市场数据终端，数据源为 Polymarket。

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-ff0099)
![Three.js](https://img.shields.io/badge/Three.js-0.184-black?logo=three.js)

---

## 架构总览

本应用包含两个一体化的界面：

| 界面 | 路由 | 用途 |
| --- | --- | --- |
| **赛程仪表盘** | `/` | 世界杯日历、分组积分榜、比赛卡片、倒计时横幅 |
| **预测市场终端** | `/data` | Polymarket 实时赔率可视化（3D 地球、排名榜、时间线、滚动条） |

两者共享同一套设计语言——暗黑奢华、玻璃质感、霓虹点缀——基于 Next.js 14 App Router、TailwindCSS 和 Framer Motion 构建。

### 赛程仪表盘（`/`）

- 赛事倒计时与进度追踪
- 12 个小组 × 4 支球队的分组积分榜
- 赛程浏览（筛选、统计、场馆信息）
- 单场比赛详情页（`/matches/[slug]/`）
- ICS 日历订阅（webcal / 下载）
- 响应式移动端导航

### 预测市场终端（`/data`）

一个 Bloomberg 风格的四模块实时夺冠赔率终端：

| 模块 | 渲染方式 | 说明 |
| --- | --- | --- |
| **3D 地球** | Three.js / WebGL | 可交互地球，国家队概率热力图 + 能量流向线 |
| **排名流动** | DOM + Framer Motion | 弹簧物理动画的实时排行榜 |
| **赔率时间线** | Canvas 2D | 多线时序图，样条插值 + 事件标记 |
| **实时滚动条** | DOM + rAF | 持续横向滚动的市场数据条，支持变速滚动 |

## 后端服务

预测终端依赖 `backend/` 下的 Bun / Node.js 服务：

- **Polymarket CLOB** WebSocket 数据接入
- **差值引擎** — 计算 1 分钟 / 5 分钟 / 1 小时 / 24 小时概率变化
- **事件检测器** — 阈值穿越、成交量激增、价格冲击
- **WebSocket 推送** — 每 3 秒向客户端推送差异数据
- **REST 降级** — `GET /api/snapshot`、`/api/history/:code`、`/api/health`

完整部署文档见 [`backend/DEPLOYMENT.md`](backend/DEPLOYMENT.md)。

## 快速开始

**环境要求：** Node.js ≥ 20，npm ≥ 10。

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev -- -p 3000
```

打开 [http://localhost:3000](http://localhost:3000)。

### 启动预测终端（接入实时数据）

```bash
# 终端 1 — 启动后端
cd backend
npm install
cp .env.example .env    # 填入 POLYMARKET_API_KEY
bun run build
bun dist/index.js       # 监听 :3001

# 终端 2 — 启动前端
npm run dev -- -p 3000
```

然后访问 [http://localhost:3000/data](http://localhost:3000/data)。

如果没有 Polymarket API Key，终端仍会以模拟数据渲染。

## 路由

| 路由 | 说明 |
| --- | --- |
| `/` | 首页 — 横幅、赛事进度、分组积分榜 |
| `/matches/` | 完整赛程（搜索、筛选、统计） |
| `/matches/[slug]/` | 单场比赛详情（阵容、赔率、交锋记录、新闻） |
| `/data` | 预测市场终端（Polymarket 实时数据） |

## 技术栈

### 前端

| 库 | 用途 |
| --- | --- |
| [Next.js 14](https://nextjs.org/) | App Router，静态导出 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [TailwindCSS](https://tailwindcss.com/) | 样式，自定义设计令牌 |
| [Framer Motion](https://www.framer.com/motion/) | 弹簧动画、布局过渡 |
| [Three.js](https://threejs.org/) | 预测地图上的 3D 地球渲染 |
| [Zustand](https://zustand.docs.pmnd.rs/) | 状态管理（7 个切片） |
| [lucide-react](https://lucide.dev/) | 图标 |

### 后端

| 库 | 用途 |
| --- | --- |
| [Bun](https://bun.sh/) / Node.js | 运行时 |
| [ws](https://github.com/websockets/ws) | WebSocket 服务 |
| Polymarket CLOB API | 实时订单簿数据 |

## 项目结构

```
.
├── app/                    # Next.js App Router 页面与布局
│   ├── data/               # 预测终端路由 (/data)
│   ├── matches/[slug]/     # 比赛详情页
│   └── globals.css         # Tailwind + 自定义 CSS 令牌
├── components/             # React 组件
│   ├── market-dashboard/   # 预测终端外壳
│   ├── market-map/         # 3D 地球与概率地图
│   ├── market-ranking/     # 动画排名榜
│   ├── market-timeline/    # Canvas 2D 赔率时间线
│   ├── market-ticker/      # 实时滚动条
│   ├── match-detail/       # 比赛详情子组件
│   └── *.tsx               # 共享 UI（导航、卡片、积分榜、横幅）
├── lib/                    # Hooks、工具函数、类型
│   ├── store/              # Zustand 状态（7 个切片）
│   ├── use-live-market-data.ts  # WebSocket 客户端（带自动重连）
│   ├── world-cup-2026.ts   # 48 支球队名单与国旗数据
│   └── calendar.ts         # ICS 解析器与赛程工具
├── types/                  # 共享 TypeScript 类型定义
├── backend/                # 后端服务（详见 backend/DEPLOYMENT.md）
│   └── src/                # Polymarket 客户端、差值引擎、WS 服务
├── docs/                   # 设计规格文档
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── VISUALIZATION_SYSTEM_DESIGN.md
│   ├── MODULE_A_PROBABILITY_MAP_DESIGN.md
│   ├── MODULE_B_RANKING_FLOW_DESIGN.md
│   ├── MODULE_C_TIMELINE_DESIGN.md
│   └── MODULE_D_TICKER_DESIGN.md
└── public/                 # 静态资源（日历、字体、图片）
```

## 构建与部署

### 前端（Cloudflare Pages）

仓库在推送到 `Beta` 分支时自动部署到 Cloudflare Pages（[workflow](.github/workflows/deploy.yml)）。

```bash
npm run build    # 输出到 out/
```

### 后端（VPS）

```bash
cd backend
npm install --production
bun run build
bun dist/index.js
```

systemd 服务、Nginx 反向代理、更新脚本详见 [`backend/DEPLOYMENT.md`](backend/DEPLOYMENT.md)。

### 环境变量

预测终端（`/data`）需在 Cloudflare Pages 或 `.env.local` 中设置：

```bash
NEXT_PUBLIC_MARKET_API_URL=https://api.your-domain.com
NEXT_PUBLIC_MARKET_WS_URL=wss://api.your-domain.com
```

后端服务配置：

```bash
PORT=3001
POLYMARKET_API_KEY=pk_your_key_here
```

## 设计系统

整体 UI 遵循**暗黑奢华终端**美学：

- 背景：`#0A0A0F`（深邃虚空）
- 卡片：玻璃质感，`backdrop-blur`，`rounded-3xl+`
- 强调色：霓虹青柠 `#D8FF3E`（volt）、橙色 `#FF9A1F`（flare）
- 字体：`Inter Tight` 可变字体
- 氛围光：内容区背后固定位置的径向模糊光晕
- 所有动画采用弹簧物理（Framer Motion）

完整 UI 设计规则见 [`AGENTS.md`](AGENTS.md)。

## 设计文档索引

| 文档 | 内容 |
| --- | --- |
| [`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md) | 系统架构与集成规范 |
| [`VISUALIZATION_SYSTEM_DESIGN.md`](VISUALIZATION_SYSTEM_DESIGN.md) | 设计理念、色彩系统、模块总览 |
| [`MODULE_A_PROBABILITY_MAP_DESIGN.md`](MODULE_A_PROBABILITY_MAP_DESIGN.md) | 3D 地球深入设计：三重表达系统、粒子、能量流 |
| [`MODULE_B_RANKING_FLOW_DESIGN.md`](MODULE_B_RANKING_FLOW_DESIGN.md) | 排名榜深入设计：弹簧动画、挤压机制、振动反馈 |
| [`MODULE_C_TIMELINE_DESIGN.md`](MODULE_C_TIMELINE_DESIGN.md) | 时间线深入设计：样条渲染、加速度可视化、十字准线 |
| [`MODULE_D_TICKER_DESIGN.md`](MODULE_D_TICKER_DESIGN.md) | 滚动条深入设计：变速滚动、情绪系统、超车动画 |
| [`DEVELOPMENT_HANDBOOK.md`](DEVELOPMENT_HANDBOOK.md) | 开发环境搭建、Store 脚手架、类型定义、注意事项 |
| [`DEV_PLAN.md`](DEV_PLAN.md) | 开发路线图与进度分析 |
| [`backend/DEPLOYMENT.md`](backend/DEPLOYMENT.md) | 后端部署指南 |
| [`HANDOFF.md`](HANDOFF.md) | 项目交接备忘与当前技术栈参考 |

## 开源协议

MIT © 2026
