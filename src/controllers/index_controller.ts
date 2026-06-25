/*
 * AirPaste
 * Remote Copy & Paste Service
 * Copyright (c) 2026 Alessio Saltarin
 * ISC License
 */

import { Eta } from "@eta-dev/eta";
import { join } from "@std/path";
import { VERSION } from "../version.ts";
import { getStats, recordUsage } from "../db.ts";

// Dynamically resolve template directory relative to this controller file
const templateDir = join(import.meta.dirname || "", "../../static/template");

// Initialize the Eta engine
const eta = new Eta({
  views: templateDir,
  cache: false, // Ensure templates are re-read from disk in development
});

export async function serveIndex(
  req: Request,
  code?: string,
  initialValue = "",
  updatedAt = 0,
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const canonicalUrl = code ? `${origin}/${code}` : `${origin}/`;
    const ogImage = `${origin}/img/Screenshot.png`;

    const title = code
      ? `AirPaste — Snippet ${code} — Retrieve shared snippet`
      : "AirPaste — Share text and code snippets instantly";

    const metaDescription = code
      ? "Retrieve your shared text or code snippet on AirPaste using the 6-digit sync code."
      : "AirPaste is a free, lightweight, and ephemeral remote clipboard manager. Share text and code snippets instantly between devices using a 6-digit code or magic link.";

    const robots = code ? "noindex, nofollow" : "index, follow";

    // Record the usage and get the updated stats
    const { userId, isNewCookie } = await recordUsage(req);
    const stats = await getStats();
    const statsStr = `${stats.uniqueUsers}/${stats.totalUsages}`;

    const html = await eta.renderAsync("index", {
      title,
      metaDescription,
      robots,
      canonicalUrl,
      ogImage,
      version: VERSION,
      stats: statsStr,
      code: code || "",
      initialValue: initialValue,
      updatedAt: updatedAt,
    });

    const headers = new Headers({
      "content-type": "text/html; charset=utf-8",
    });

    if (isNewCookie) {
      headers.set(
        "Set-Cookie",
        `airpaste_uid=${userId}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`,
      );
    }

    return new Response(html, {
      headers,
    });
  } catch (e) {
    console.error("Template rendering failed:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
