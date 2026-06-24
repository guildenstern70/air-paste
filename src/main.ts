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
import { checkConnection, getPaste, savePaste } from "./db.ts";

const staticDir = join(import.meta.dirname || "", "../static");

logger.info("Welcome to AirPaste v." + VERSION);

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/api") {
    return Response.json({
      message: "Air-Paste v." + VERSION + " API",
      isAlive: true,
      time: new Date().toISOString(),
    });
  }

  // API: Save new paste
  if (url.pathname === "/api/paste" && req.method === "POST") {
    try {
      const { content } = await req.json();
      if (typeof content !== "string" || !content.trim()) {
        return Response.json({ error: "Content must be a non-empty string" }, {
          status: 400,
        });
      }
      const code = await savePaste(content);
      return Response.json({ code });
    } catch (_e) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  // API: Get or update specific paste
  const apiMatch = url.pathname.match(/^\/api\/paste\/(\d{6})$/);
  if (apiMatch) {
    const code = apiMatch[1];
    if (req.method === "GET") {
      const paste = await getPaste(code);
      if (!paste) {
        return Response.json({ error: "Paste not found or expired" }, {
          status: 404,
        });
      }
      return Response.json(paste);
    }
    if (req.method === "POST") {
      try {
        const { content } = await req.json();
        if (typeof content !== "string" || !content.trim()) {
          return Response.json(
            { error: "Content must be a non-empty string" },
            { status: 400 },
          );
        }
        const savedCode = await savePaste(content, code);
        return Response.json({ code: savedCode });
      } catch (_e) {
        return Response.json({ error: "Invalid request body" }, {
          status: 400,
        });
      }
    }
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

  if (url.pathname === "/js/script.js") {
    try {
      const jsPath = join(staticDir, "js/script.js");
      const js = await Deno.readTextFile(jsPath);
      return new Response(js, {
        headers: { "content-type": "application/javascript; charset=utf-8" },
      });
    } catch (e) {
      console.error("Failed to read script.js:", e);
      return new Response("JS not found", { status: 404 });
    }
  }

  if (url.pathname.startsWith("/img/")) {
    try {
      const imgPath = join(staticDir, url.pathname);
      const imgBytes = await Deno.readFile(imgPath);
      let contentType = "image/png";
      if (url.pathname.endsWith(".jpg") || url.pathname.endsWith(".jpeg")) {
        contentType = "image/jpeg";
      } else if (url.pathname.endsWith(".svg")) {
        contentType = "image/svg+xml";
      } else if (url.pathname.endsWith(".gif")) {
        contentType = "image/gif";
      } else if (url.pathname.endsWith(".webp")) {
        contentType = "image/webp";
      }
      return new Response(imgBytes, {
        headers: { "content-type": contentType },
      });
    } catch (e) {
      console.error("Failed to read image:", e);
      return new Response("Image not found", { status: 404 });
    }
  }

  // Magic Link: Direct retrieval via /:code
  const codeMatch = url.pathname.match(/^\/(\d{6})$/);
  if (codeMatch) {
    const code = codeMatch[1];
    const paste = await getPaste(code);
    if (paste) {
      return await serveIndex(req, code, paste.content, paste.updatedAt);
    } else {
      // Redirect to home with error
      return Response.redirect(url.origin + "/?error=notfound", 302);
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
