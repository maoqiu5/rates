from datetime import datetime
from pathlib import Path


path = Path("/root/apps/brianhub-gateway/Caddyfile")
content = path.read_text(encoding="utf-8")
old = "\t\troot * /srv/rates\n\t\ttry_files {path} /index.html"
new = "\t\troot * /srv/rates/rates\n\t\ttry_files {path} /index.html"
if old not in content:
    raise SystemExit("Expected /srv/rates root line not found.")
backup = path.with_name(f"Caddyfile.backup-rates-root-{datetime.now():%Y%m%d-%H%M%S}")
backup.write_text(content, encoding="utf-8")
path.write_text(content.replace(old, new, 1), encoding="utf-8")
print(backup)
