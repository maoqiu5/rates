# 部署说明：境外运价

## 生产路径

- VPS 应用目录：`/root/apps/rates`
- 静态目录：`/root/apps/rates/web`
- Caddy 访问路径：`/rates/`
- API 服务：`rates-api-edge.service`
- API 监听：`172.19.0.1:8025`

## 部署步骤

1. 上传本地 `C:\Users\12514\Documents\rates` 到 VPS `/root/apps/rates`。
2. 如需数据库，按 `schema/RATES_SQLITE_SCHEMA.sql` 初始化 `/root/apps/rates/data/rates/rates.db`。
3. 创建或更新 systemd 服务 `rates-api-edge.service`。
4. 在 BrianHub gateway Caddyfile 增加 `/rates/*` 静态和 `/rates/api/*` 代理。
5. 在门户项目配置中增加 `rates` 项目卡片和文档入口。
6. 重载 API 服务、Caddy gateway 和门户。

## 验证

```bash
curl -fsS http://172.19.0.1:8025/api/health
curl -fsS https://brianhub.net/rates/api/health
systemctl is-active rates-api-edge.service
systemctl is-active gps-query-api-edge.service
```

## 回滚

- 移除 Caddy `/rates` 路由并 reload。
- 停止 `rates-api-edge.service`。
- 门户配置回退到部署前版本。
- 不触碰 GPS 的 `/gps` 路由和 `gps-query-api-edge.service`。
