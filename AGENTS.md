# Rates Project Agent Instructions

## Scope

This is an existing BrianHub production project at `/root/apps/rates`, display name `????`. It was split from GPS and owns rate/pricing workflows: truck on-carriage rates, rail rates, pricing anchors, prediction models, supplier quote observations, and market references.

Do not treat this as a new scaffold and do not merge it back into GPS. GPS should remain focused on device trajectories, ports, border crossings, HBT data ingestion, and timing analysis.

## Must Read First

Before development or deployment, read:

- `docs/README.md`
- `docs/PRD.md`
- `docs/DEPLOYMENT.md`
- `docs/CHANGELOG.md`
- `docs/HANDOFF.md` if it is later created
- `.engramory-memory/MEMORY.md`
- The memory note matching the task area

Read BrianHub shared rules when touching deployment, gateway, SSO, AI configuration, docs, or security:

- `/root/apps/portal/docs/BRIANHUB_DEVELOPMENT_STANDARD.md`
- `/root/apps/portal/docs/NEW_PROJECT_DOCUMENTATION_REQUIREMENTS.md`
- `/root/apps/portal/docs/BRIANHUB_GATEWAY_AND_SSO.md`

## Project Boundaries

- Production directory: `/root/apps/rates`.
- Public route: `/rates/`.
- Static frontend: `/root/apps/rates/web`.
- API script: `/root/apps/rates/scripts/rates_api.py`.
- API service: `rates-api-edge.service`.
- API listen address: `172.19.0.1:8025`.
- Schema: `/root/apps/rates/schema/RATES_SQLITE_SCHEMA.sql`.
- Local workspace convention: `C:\Users\12514\Documents\rates`.

## Safety Boundaries

- Do not read, print, copy, or commit real `.env`, `.env.production`, secrets, tokens, keys, cookies, or credentials.
- Do not casually read or modify `data/`, `backups/`, `logs/`, `runtime/`, `secrets/`, SQLite databases, or large raw logs.
- Do not delete or overwrite persistent data or imported pricing data.
- Do not modify global Codex config, Codex native memories, local sqlite memories, or install hooks.
- Do not put real supplier credentials, API keys, or internal tokens in docs, frontend, logs, test output, or memory.

## Engramory Rules

- `.engramory-memory/` is project-local and must stay out of git.
- `MEMORY.md` is a short index only. Keep it below 200 lines and 25 KB.
- Prefer updating an existing note over adding duplicates.
- Store durable reminders, boundaries, and traps. Do not duplicate detailed docs or raw quote data.
- Keep GPS memories and Rates memories separate.

## Verification Commands

Use the smallest checks relevant to the change:

```bash
python3 -m py_compile /root/apps/rates/scripts/rates_api.py
python3 /root/apps/rates/tools/test_rates_api.py
node /root/apps/rates/tools/test_rates_frontend.js
systemctl is-active rates-api-edge.service
curl -fsS http://172.19.0.1:8025/api/health
curl -fsS https://brianhub.net/rates/api/health
```

When verifying that GPS was not affected:

```bash
systemctl is-active gps-query-api-edge.service
curl -fsS https://brianhub.net/gps/api/health
```

## Deployment Reminder

After backend changes, sync the changed files, restart `rates-api-edge.service`, and verify internal plus public `/rates/api/health`. After frontend changes, preserve `web/data`, consider Service Worker cache behavior, and verify `/rates/` in a no-cache browser or with HTTP checks.
