# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

本仓库是 MC 启动器/服务器的 monorepo，包含两个独立子项目：

- **`site/`** — MC 服务器介绍主站，PHP 单体应用
- **`api/`** — MC 启动器版本更新检查服务，Python + FastAPI

## `site/` — PHP 主站

PHP 8.1+ / MySQL 5.6+，零依赖、无构建步骤。宝塔面板部署。

### 关键入口

- `index.php` — 前端主题入口，根据 `Setting::get('current_theme')` 加载 `themes/{theme}/index.html`，并重写资源路径
- `install.php` — 安装向导（安装后自动锁定），生成 `config.php`
- `cron.php` — 定时任务，Minecraft 服务器状态查询（需每分钟执行一次）
- `config.php` — 运行时配置文件（由 install.php 生成），返回 `['db_host', 'db_port', 'db_name', 'db_user', 'db_pass', 'site_url', 'timezone']`

### 核心类（`core/`）

- `DB` — PDO 单例封装，静态方法：`conn()`, `query()`, `fetch()`, `fetchAll()`, `insert()`, `update()`, `delete()`, `paginate()`
- `Request` — 请求参数获取：`get()`, `post()`, `body()`（JSON body）, `file()`, `ip()`, `bearerToken()`, `validate()`, `page()`, `perPage()`
- `Response` — 统一 JSON 响应：`success()`, `error()`, `paginate()`
- `Auth` — Token 认证（Bearer Token / X-Admin-Token）：`attempt()`, `check()`, `requireLogin()`, `requireSuperAdmin()`
- `Setting` — 站点设置存取（基于 settings 表）
- `Upload` — 文件上传处理
- `MinecraftQuery` / `MinecraftBedrockQuery` — Java/Bedrock 协议服务器查询
- `Version` — 远程版本/更新检查
- `Migration` — 数据库迁移
- `ThemeMarket` — 主题市场远程拉取

### 路由约定

- 公开 API：`/api/{resource}.php` → 路由到 `/api/index.php`
- 后台 API：`/admin/api/{resource}.php` → 路由到 `/admin/api/index.php`
- 后台面板：`/admin/` → SPA (Vue 3 + Element Plus，CDN 加载，无构建)
- 前端：`/` → `index.php` → 加载当前主题的 `index.html`

### 鉴权角色

- `super_admin` — 超级管理员
- `content_admin` — 内容管理员
- API 路由通过 `Auth::requireLogin()` 或 `Auth::requireSuperAdmin()` 鉴权

### 主题系统

`themes/` 下每目录一个主题，含 `theme.json`（名称/作者/版本/缩略图）、`index.html`、`css/`、`js/`、`fonts/`。共享库在 `themes/shared/`。`themes/{name}/js/config.js` 是主题配置入口，定义 `window.THEME_CONFIG`。

### Nginx 安全规则（`nginx.conf.example`）

`config.php`、`core/`、`cache/` 目录禁止外部访问。API 路由走 `try_files`。上传文件缓存 7 天。

## `api/` — 版本更新 API 服务

Python 3.12+ / FastAPI / SQLite / uv 管理。

### 启动命令

```bash
cd api
uv sync                         # 安装依赖
uv run alembic upgrade head     # 初始化数据库
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 管理

```bash
uv run python -m admin.cli db-init           # 建表
uv run python -m admin.cli list-releases     # 列出发布
uv run python -m admin.cli create-release --version "1.3.0" --platform android --arch arm64 ...
uv run python -m admin.cli toggle-release 1 --inactive
uv run python -m admin.cli set-grayscale 1 --pct 50
```

Web 管理界面：`/admin`（密码在 `.env` 的 `ADMIN_PASSWORD` 中配置）。

### 核心 API

- `POST /api/v1/check-update` — 版本检查（核心 endpoint，APP 端调用）
- `GET /api/v1/health` — 健康检查

### 架构关键点

- `app/services/version_check.py` — 版本匹配 + 灰度哈希分流算法
- 单表 `releases`，NULL 维度值 = 通配所有
- 灰度使用 `sha256("grayscale:{release_id}:{device_id}") % 100 < grayscale_pct`
- API 响应约定见 `docs/api-contract.md`
