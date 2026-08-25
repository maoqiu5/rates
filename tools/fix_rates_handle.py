from datetime import datetime
from pathlib import Path


path = Path("/root/apps/brianhub-gateway/Caddyfile")
content = path.read_text(encoding="utf-8")
old = """\troute /rates/* {
\t\turi strip_prefix /rates
\t\troot * /srv/rates/rates
\t\ttry_files {path} /index.html
\t\tfile_server
\t}
"""
new = """\thandle /rates/* {
\t\turi strip_prefix /rates
\t\troot * /srv/rates/rates
\t\ttry_files {path} /index.html
\t\tfile_server
\t}
"""
if old not in content:
    raise SystemExit("Expected /rates route block not found.")
backup = path.with_name(f"Caddyfile.backup-rates-handle-{datetime.now():%Y%m%d-%H%M%S}")
backup.write_text(content, encoding="utf-8")
path.write_text(content.replace(old, new, 1), encoding="utf-8")
print(backup)
