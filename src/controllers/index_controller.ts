/*
 * AirPaste
 * Remote Copy & Paste Service
 * Copyright (c) 2026 Alessio Saltarin
 * ISC License
 */

import { Eta } from "@eta-dev/eta";
import { join } from "@std/path";
import { VERSION } from "../version.ts";

// Dynamically resolve template directory relative to this controller file
const templateDir = join(import.meta.dirname || "", "../../static/template");

// Initialize the Eta engine
const eta = new Eta({
  views: templateDir,
  cache: false, // Ensure templates are re-read from disk in development
});

export async function serveIndex(_req: Request): Promise<Response> {
  try {
    const html = await eta.renderAsync("index", {
      title: "AirPaste — Instant Text Sharing",
      version: VERSION,
      initialValue: "", // For future KV persistence value
    });

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("Template rendering failed:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
