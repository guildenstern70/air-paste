/*
 * AirPaste
 * Remote Copy & Paste Service
 * Copyright (c) 2026 Alessio Saltarin
 * ISC License
 */

import { Redis } from "@upstash/redis";
import { logger } from "./logger.ts";

const url = Deno.env.get("UPSTASH_DB_URL");
const token = Deno.env.get("UPSTASH_REDIS_TOKEN");

if (!url || !token) {
  logger.error(
    "Missing database configuration! Ensure UPSTASH_DB_URL and UPSTASH_REDIS_TOKEN are set in your environment or .env file."
  );
}

// Initialize Upstash Redis client
// Note: If url or token are missing, the client will fail when operations are attempted,
// but we handle checks and warnings gracefully.
export const redis = new Redis({
  url: url || "",
  token: token || "",
});

/**
 * Verifies the connection to the Upstash Redis database by sending a PING command.
 * Logs success or error messages.
 * @returns {Promise<boolean>} True if connection is successful, false otherwise.
 */
export async function checkConnection(): Promise<boolean> {
  if (!url || !token) {
    logger.error("Database connection verification skipped: missing credentials.");
    return false;
  }

  try {
    logger.info("Verifying connection to Upstash Redis...");
    const reply = await redis.ping();
    if (reply === "PONG") {
      logger.info("Successfully connected to Upstash Redis database.");
      return true;
    } else {
      logger.error(`Unexpected ping response from Upstash: ${reply}`);
      return false;
    }
  } catch (error) {
    logger.error(`Failed to connect to Upstash Redis: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}
