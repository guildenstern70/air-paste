/*
 * AirPaste
 * Remote Copy & Paste Service
 * Copyright (c) 2026 Alessio Saltarin
 * ISC License
 */

import { DyeLog, LogLevel } from "@littlelite/dyelog";

// Shared logger instance for application-wide logging
export const logger = new DyeLog({
  timestamp: true,
  printlevel: true,
  level: LogLevel.TRACE,
});
