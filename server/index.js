import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 3001);
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || "http://127.0.0.1:8000";

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return null;
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : null;
}

async function forward(pathname, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  const response = await fetch(`${ML_ENGINE_URL}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.detail || "Upstream request failed");
    error.statusCode = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    return json(res, 400, { error: "Missing request URL" });
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, await forward("/health"));
    }

    if (req.method === "GET" && url.pathname === "/api/history") {
      const limit = url.searchParams.get("limit") || "8";
      return json(res, 200, await forward(`/history?limit=${encodeURIComponent(limit)}`));
    }

    if (req.method === "POST" && url.pathname === "/api/predict") {
      const body = await readBody(req);
      return json(
        res,
        200,
        await forward("/predict", {
          method: "POST",
          body: JSON.stringify(body || {}),
        }),
      );
    }

    if (req.method === "POST" && url.pathname === "/api/simulate") {
      const body = await readBody(req);
      return json(
        res,
        200,
        await forward("/simulate", {
          method: "POST",
          body: JSON.stringify(body || {}),
        }),
      );
    }

    if (req.method === "POST" && url.pathname === "/api/refine") {
      const body = await readBody(req);
      return json(
        res,
        200,
        await forward("/refine", {
          method: "POST",
          body: JSON.stringify(body || {}),
        }),
      );
    }

    if (req.method === "GET" && url.pathname === "/") {
      return json(res, 200, {
        service: "HeartRisk+ server",
        routes: ["/api/health", "/api/predict", "/api/refine", "/api/simulate", "/api/history"],
      });
    }

    return json(res, 404, { error: "Route not found" });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      error: "Server request failed",
      detail: error.name === "AbortError" ? "The service took too long to answer." : error.payload?.detail || error.message,
    });
  }
});

server.listen(PORT, () => {
  console.log(`HeartRisk+ server listening on http://localhost:${PORT}`);
  console.log(`Proxying ML requests to ${ML_ENGINE_URL}`);
});
