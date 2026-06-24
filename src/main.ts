/*
 * AirPaste
 * Remote Copy & Paste Service
 * Copyright (c) 2026 Alessio Saltarin
 * ISC License
 */

import { join } from "@std/path";
import { serveIndex } from "./controllers/index_controller.ts";
import { VERSION } from "./version.ts";
import { logger } from "./logger.ts";
import { checkConnection } from "./db.ts";

const staticDir = join(import.meta.dirname || "", "../static");

logger.info("Welcome to AirPaste v." + VERSION);

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/api") {
    return Response.json({
      message: "Hello, world!",
      time: new Date().toISOString(),
    });
  }

  if (url.pathname === "/css/style.css") {
    try {
      const cssPath = join(staticDir, "css/style.css");
      const css = await Deno.readTextFile(cssPath);
      return new Response(css, {
        headers: { "content-type": "text/css; charset=utf-8" },
      });
    } catch (e) {
      console.error("Failed to read style.css:", e);
      return new Response("CSS not found", { status: 404 });
    }
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    return await serveIndex(req);
  }

  return new Response("Not Found", { status: 404 });
}

if (import.meta.main) {
  await checkConnection();
  Deno.serve(handler);
}
