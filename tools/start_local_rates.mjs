import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const cwd = "C:\\Users\\12514\\Documents\\rates";
const python = "C:\\Users\\12514\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

mkdirSync(`${cwd}\\data\\local`, { recursive: true });

function start(args) {
  const child = spawn(python, args, {
    cwd,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}

const apiPid = start([
  "scripts\\rates_api.py",
  "--host",
  "127.0.0.1",
  "--port",
  "8025",
  "--db-path",
  "data\\local\\rates.db",
  "--schema-path",
  "schema\\RATES_SQLITE_SCHEMA.sql",
]);

const webPid = start(["-m", "http.server", "8026", "--bind", "127.0.0.1", "--directory", "web"]);

console.log(JSON.stringify({ apiPid, webPid }));
