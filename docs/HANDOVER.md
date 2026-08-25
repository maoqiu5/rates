# 境外运价 rates 交接说明

> 更新时间：2026-08-25
> 接手原则：VPS `/root/apps/rates` 为生产事实；本地 `D:\codex\rates` 为开发源码。

## 1. 项目一句话

从 GPS 拆出的独立境外运价工作台，提供卡车运价、铁路运价和市场参考查询。

## 2. 当前状态

- 线上：`https://brianhub.net/rates/`
- API：`/rates/api/*`
- VPS 目录：`/root/apps/rates`
- 本地目录：`D:\codex\rates`（2026-08-25 从 Documents 迁移）
- 技术栈：Python API + 静态前端 + SQLite
- VPS 有 git，remote 为 `github`（`https://github.com/maoqiu5/rates.git`）
- API 服务：`rates-api-edge.service`，监听 `172.19.0.1:8025`
- ✅ 已完成 2026-08-25 双向合并：
  - 本地已同步 VPS 较新前端：`web/index.html`、`web/sw.js`、`tools/test_rates_frontend.js`
  - 本地已同步 VPS 较新说明/记忆：`AGENTS.md`、`.gitignore`、`.engramory-memory/project-data-boundary.md`、`.engramory-memory/project-operations.md`
  - VPS 已部署本地较新 API：`scripts/rates_api.py`
  - `web/data` 两边哈希一致
- 本地仍有 VPS 没有的工具脚本（fix_rates_*、publish/restore、offline geocode、start_local_rates 等），属本地维护工具，未同步到生产
- 本地 JS 测试：cost calculator ✅、rail prediction ✅、rates frontend ✅（已与 VPS 前端同步）

## 3. 核心模块

- 卡车运价：地址、站点组、还箱站
- 铁路运价：口岸、目的站、站编、箱型、运输类型
- 市场参考：供应商和市场信号
- 预测只用于无直接报价组合，需人工复核

## 4. 关键文件

- API：`scripts/rates_api.py`
- 前端：`web/`
- Schema：`schema/RATES_SQLITE_SCHEMA.sql`
- 文档：`docs/README.md`、`docs/PRD.md`、`docs/DEPLOYMENT.md`

## 5. 部署

```bash
cd /root/apps/rates
# 上传本地源码，初始化数据库，更新 systemd 服务
systemctl restart rates-api-edge.service
```

验证：

```bash
curl -fsS http://172.19.0.1:8025/api/health
curl -fsS https://brianhub.net/rates/api/health
```

## 6. 安全

- 不读取/输出数据库内容、内部数据
- 不修改 GPS 的 `/gps` 路由和 `gps-query-api-edge.service`
- 不生成正式客户报价单

## 7. 新对话接续

```text
这是 rates 项目对话。
请先读 D:\codex\HANDOVER_INDEX.md 和 D:\codex\rates\docs\HANDOVER.md，
再查看 VPS /root/apps/rates 状态，然后开始工作。
```
