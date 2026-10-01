import type { IncomingMessage, ServerResponse } from "node:http";
import routes from "../src/server/handler";

/**
 * Single Vercel Serverless Function that serves every PINTAS endpoint.
 * /_api/<route> is rewritten to /api/index?route=<route> (vercel.json) and dispatched to
 * src/endpoints/<route>_<METHOD>.ts, whose handle() uses web-standard Request/Response.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const host = String(req.headers.host ?? "localhost");
  const url = new URL(req.url ?? "/", `https://${host}`);
  // Route comes from the rewrite query (?route=...), or from the path when called directly.
  const route = (url.searchParams.get("route") ?? url.pathname.replace(/^\/api\/?/, ""))
    .replace(/^\/+|\/+$/g, "");
  url.searchParams.delete("route");
  url.pathname = `/_api/${route}`;
  const method = (req.method ?? "GET").toUpperCase();
  const handle = (routes as Record<string, any>)[`${route}:${method}`];
  if (!handle) {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ json: { error: `Endpoint tidak ditemukan: ${method} ${route}` } }));
    return;
  }

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v !== undefined) headers.set(k, String(v));
  }
  let body: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    body = Buffer.concat(chunks);
  }
  
  const request = new Request(url.toString(), { 
    method, 
    headers, 
    body: body && body.length ? new Uint8Array(body) : undefined 
  });

  let response: Response;
  try {
    response = await handle(request);
  } catch (error) {
    console.error("Unhandled endpoint error", route, error);
    response = new Response(JSON.stringify({ json: { error: "Terjadi kesalahan pada server" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });
  const cookies = (response.headers as any).getSetCookie?.() as string[] | undefined;
  if (cookies && cookies.length) res.setHeader("set-cookie", cookies);
  else {
    const single = response.headers.get("set-cookie");
    if (single) res.setHeader("set-cookie", single);
  }
  const out = Buffer.from(await response.arrayBuffer());
  res.end(out);
}

export const config = { api: { bodyParser: false } };