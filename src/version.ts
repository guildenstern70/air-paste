/*
 * AirPaste
 * Remote Copy & Paste Service
 * Copyright (c) 2026 Alessio Saltarin
 * ISC License
 */

import denoConfig from "../deno.json" with { type: "json" };

const configuredVersion = denoConfig.version;

if (typeof configuredVersion !== "string" || configuredVersion.trim() === "") {
  throw new Error("Missing or invalid 'version' in deno.json");
}

export const VERSION = configuredVersion;
