from datetime import datetime
from pathlib import Path


path = Path("/root/apps/brianhub-gateway/Caddyfile")
content = path.read_text(encoding="utf-8")

api_old = """\thandle /rates/api/* {
\t\tforward_auth portal_frontend:3000 {
\t\t\turi /auth/check
\t\t}
\t\turi strip_prefix /rates
\t\treverse_proxy 172.19.0.1:8025
\t}
"""
api_new = """\thandle /rates/api/* {
\t\turi strip_prefix /rates
\t\treverse_proxy 172.19.0.1:8025
\t}
"""
page_old = """\troute /rates/* {
\t\tforward_auth portal_frontend:3000 {
\t\t\turi /auth/check?redirect=1
\t\t}
\t\turi strip_prefix /rates
\t\troot * /srv/rates
\t\ttry_files {path} /index.html
\t\tfile_server
\t}
"""
page_new = """\troute /rates/* {
\t\turi strip_prefix /rates
\t\troot * /srv/rates
\t\ttry_files {path} /index.html
\t\tfile_server
\t}
"""

if api_old not in content or page_old not in content:
    raise SystemExit("Expected authenticated /rates blocks were not found; Caddyfile was not changed.")

backup = path.with_name(f"Caddyfile.backup-rates-public-{datetime.now():%Y%m%d-%H%M%S}")
backup.write_text(content, encoding="utf-8")
path.write_text(content.replace(api_old, api_new, 1).replace(page_old, page_new, 1), encoding="utf-8")
print(backup)
