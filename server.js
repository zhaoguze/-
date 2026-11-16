/* 西北非遗 · 后端
 * - 静态托管本站（可选，也可继续用其它静态服务器）
 * - POST /api/chat   代理 DeepSeek（OpenAI 兼容，SSE 流式）
 * - GET  /api/health 健康检查
 * 零依赖，Node 18+ 直接运行：node server.js
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 4190;

/* 读取 .env（不覆盖已有环境变量） */
(function loadEnv() {
  const p = path.join(ROOT, ".env");
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, "utf8").split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
})();

const KEY = process.env.DEEPSEEK_API_KEY || "";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const API_BASE = process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com";
const DEMO = !KEY;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4", ".webm": "video/webm", ".ogv": "video/ogg",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".map": "application/json"
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-DeepSeek-Key, X-DeepSeek-Model");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

/* ---------- 演示回答（未配置 Key 时，保证前端可用） ---------- */
function demoStream(res, messages) {
  const last = (messages.filter(m => m.role === "user").pop() || {}).content || "";
  const text =
`（演示回答：后端尚未配置 DEEPSEEK_API_KEY）

你问的是「${String(last).slice(0, 40)}」。配置真实 Key 后，我会结合站内 67 项非遗资料作答。

当前可以这样启用：
1) 在项目根目录新建 .env 文件；
2) 写入一行 DEEPSEEK_API_KEY=sk-你的Key；
3) 重新运行 node server.js。

例如关于「秦腔」：秦腔是梆子腔的鼻祖之一，形成于明代中期，唱腔分欢音与苦音，苦音最能体现其苍凉风骨；表演讲究“吼”而不叫。它不是京剧，二者声腔体系、伴奏主弦（板胡 vs 京胡）和代表剧目都不同。`;

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Demo": "1"
  });
  let i = 0;
  const step = 4;
  const timer = setInterval(() => {
    if (i >= text.length) {
      res.write("data: [DONE]\n\n");
      res.end();
      clearInterval(timer);
      return;
    }
    const chunk = text.slice(i, i + step);
    i += step;
    res.write("data: " + JSON.stringify({ choices: [{ delta: { content: chunk } }] }) + "\n\n");
  }, 24);
  res.on("close", () => clearInterval(timer));
}

/* ---------- 真实 DeepSeek 流式代理（curl 转发，兼容系统代理） ---------- */
const { spawn } = require("child_process");
const CURL = process.env.CURL_BIN || (process.platform === "win32" ? "C:/Windows/System32/curl.exe" : "curl");

function proxyChat(req, res, messages, key, model) {
  const payload = JSON.stringify({ model: model || MODEL, messages, stream: true, temperature: 0.7 });

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });

  const child = spawn(CURL, [
    "-sS", "-N", "--max-time", "180",
    "-X", "POST", API_BASE + "/chat/completions",
    "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer " + (key || KEY),
    "-H", "Accept: text/event-stream",
    "--data-binary", "@-"
  ], { windowsHide: true });

  let decided = false, head = "", errBuf = "";

  child.stdout.on("data", d => {
    if (decided) { res.write(d); return; }
    head += d.toString("utf8");
    if (head.length < 8 && !head.includes("\n")) return;
    decided = true;
    if (/^\s*(data:|event:|:)/.test(head)) {
      res.write(head);
    } else {
      res.write("data: " + JSON.stringify({ error: "upstream", message: head.slice(0, 300) }) + "\n\n");
      res.end();
      try { child.kill(); } catch (e) {}
    }
  });

  child.stderr.on("data", d => { errBuf += d.toString("utf8"); });

  child.on("error", e => {
    if (!res.writableEnded) {
      res.write("data: " + JSON.stringify({ error: "curl", message: e.message }) + "\n\n");
      res.end();
    }
  });

  child.on("close", code => {
    if (!res.writableEnded) {
      if (!decided) {
        const msg = errBuf || (code ? "curl exit " + code : "上游无响应");
        res.write("data: " + JSON.stringify({ error: "upstream", message: msg.slice(0, 300) }) + "\n\n");
      }
      res.end();
    }
  });

  res.on("close", () => { if (!res.writableEnded) { try { child.kill(); } catch (e) {} } });

  child.stdin.write(payload);
  child.stdin.end();
}

function handleChat(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on("end", () => {
    let data = {};
    try { data = JSON.parse(body || "{}"); } catch (e) {}
    let messages = Array.isArray(data.messages) ? data.messages : [];
    messages = messages
      .filter(m => m && (m.role === "system" || m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

    if (!messages.length) return json(res, 400, { error: "empty", message: "messages 不能为空" });

    /* 访客自带 Key 优先；没带就用服务器 .env 里的 */
    const userKey = String(req.headers["x-deepseek-key"] || "").trim();
    const userModel = String(req.headers["x-deepseek-model"] || "").trim();
    const key = userKey || KEY;

    if (!key) return demoStream(res, messages);
    proxyChat(req, res, messages, key, userModel || MODEL);
  });
}

/* ---------- 校验访客自带的 Key 是否可用（不计费：只查模型列表） ---------- */
function handleVerify(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 1e5) req.destroy(); });
  req.on("end", () => {
    let d = {};
    try { d = JSON.parse(body || "{}"); } catch (e) {}
    const key = String((d && d.key) || req.headers["x-deepseek-key"] || "").trim();
    if (!key) return json(res, 400, { ok: false, message: "请先填写 API Key" });
    if (!/^sk-[A-Za-z0-9]{16,}$/.test(key)) return json(res, 400, { ok: false, message: "Key 格式不对，应以 sk- 开头" });

    const child = spawn(CURL, [
      "-sS", "--max-time", "20", "-o", "-", "-w", "\n%{http_code}",
      API_BASE + "/models",
      "-H", "Authorization: Bearer " + key
    ], { windowsHide: true });

    let out = "", err = "";
    child.stdout.on("data", x => { out += x; });
    child.stderr.on("data", x => { err += x; });
    child.on("error", e => json(res, 200, { ok: false, message: "无法连接校验服务：" + e.message }));
    child.on("close", () => {
      const i = out.lastIndexOf("\n");
      const code = parseInt(out.slice(i + 1), 10) || 0;
      if (code === 200) return json(res, 200, { ok: true, message: "Key 有效" });
      let msg = "校验失败（HTTP " + code + "）";
      if (code === 401) msg = "Key 无效或已被吊销";
      else if (code === 402) msg = "该 Key 余额不足";
      else if (code === 429) msg = "请求过于频繁，请稍后再试";
      else if (!code) msg = "网络不通：" + String(err).slice(0, 120);
      json(res, 200, { ok: false, message: msg });
    });
  });
}

/* ---------- HTTP 服务 ---------- */
const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const u = new URL(req.url, "http://localhost");
  const p = decodeURIComponent(u.pathname);

  if (p === "/api/health") {
    return json(res, 200, { ok: true, key: !!KEY, demo: DEMO, model: MODEL, port: PORT });
  }
  if (p === "/api/chat" && req.method === "POST") return handleChat(req, res);
  if (p === "/api/verify" && req.method === "POST") return handleVerify(req, res);

  let file = p === "/" ? "/index.html" : p;
  const fp = path.join(ROOT, file);
  if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }

  const type = MIME[path.extname(fp).toLowerCase()] || "application/octet-stream";

  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    /* 支持 Range，视频才能拖动进度条 / 边下边播 */
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
      if (m) {
        let start = m[1] ? parseInt(m[1], 10) : 0;
        let end = m[2] ? parseInt(m[2], 10) : st.size - 1;
        if (isNaN(start) || isNaN(end) || start > end || start >= st.size) {
          res.writeHead(416, { "Content-Range": "bytes */" + st.size });
          res.end();
          return;
        }
        end = Math.min(end, st.size - 1);
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Length": end - start + 1,
          "Content-Range": `bytes ${start}-${end}/${st.size}`,
          "Accept-Ranges": "bytes"
        });
        fs.createReadStream(fp, { start, end }).pipe(res);
        return;
      }
    }

    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": st.size,
      "Accept-Ranges": "bytes"
    });
    fs.createReadStream(fp).pipe(res);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[西北非遗] backend on http://127.0.0.1:${PORT}`);
  console.log(`[西北非遗] DeepSeek: ${DEMO ? "DEMO（未配置 DEEPSEEK_API_KEY）" : "LIVE · " + MODEL}`);
});
