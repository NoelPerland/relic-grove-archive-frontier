import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT || 8080);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".json": "application/json"
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const target = urlPath === "/" ? "/index.html" : urlPath;
  const file = path.normalize(path.join(root, target));
  if (!file.startsWith(root)) return res.writeHead(403).end("Forbidden");
  fs.readFile(file, (error, data) => {
    if (error && path.extname(file)) return res.writeHead(404).end("Not found");
    if (error) return fs.readFile(path.join(root, "index.html"), (e, d) => e ? res.writeHead(500).end("Build missing") : res.writeHead(200, { "Content-Type": types[".html"] }).end(d));
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, "0.0.0.0", () => console.log(`Relic Grove running on ${port}`));
