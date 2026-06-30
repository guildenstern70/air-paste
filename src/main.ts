/*
 * AirPaste
 * Remote Copy & Paste Service
 * Copyright (c) 2026 Alessio Saltarin
 * ISC License
 */

import { join } from "@std/path";
import { VERSION } from "./version.ts";
import { logger } from "./logger.ts";
import { checkConnection } from "./db.ts";
import { AirPasteRouter } from "./router.ts";

const staticDir = join(import.meta.dirname || "", "../static");

logger.info("Welcome to AirPaste v." + VERSION);

export const handler = new AirPasteRouter(staticDir).handle;

if (import.meta.main) {
  await checkConnection();
  Deno.serve(handler);
}
