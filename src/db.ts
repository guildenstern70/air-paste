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
    "Missing database configuration! Ensure UPSTASH_DB_URL and UPSTASH_REDIS_TOKEN are set in your environment or .env file.",
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
    logger.error(
      "Database connection verification skipped: missing credentials.",
    );
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
    logger.error(
      `Failed to connect to Upstash Redis: ${
        error instanceof Error ? error.message : error
      }`,
    );
    return false;
  }
}

export interface Paste {
  content: string;
  updatedAt: number;
}

/**
 * Generates a random 6-digit numeric code.
 */
function generate6DigitCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

/**
 * Saves a paste content with a 6-digit code.
 * If code is not provided, it generates a unique one.
 * Stores in Redis with a 24-hour TTL.
 */
export async function savePaste(
  content: string,
  code?: string,
): Promise<string> {
  let targetCode = code;

  if (!targetCode) {
    let attempts = 0;
    while (attempts < 10) {
      const candidate = generate6DigitCode();
      const exists = await redis.exists(`paste:${candidate}`);
      if (!exists) {
        targetCode = candidate;
        break;
      }
      attempts++;
    }

    if (!targetCode) {
      throw new Error(
        "Failed to generate a unique paste code after 10 attempts.",
      );
    }
  }

  const pasteData: Paste = {
    content,
    updatedAt: Date.now(),
  };

  // Save paste with 24 hours expiration (86400 seconds)
  await redis.set(`paste:${targetCode}`, JSON.stringify(pasteData), {
    ex: 86400,
  });
  logger.info(`Paste saved/updated under code: ${targetCode}`);
  return targetCode;
}

/**
 * Retrieves a paste by its code.
 */
export async function getPaste(code: string): Promise<Paste | null> {
  try {
    const rawData = await redis.get<string | object>(`paste:${code}`);
    if (!rawData) {
      return null;
    }

    if (typeof rawData === "object") {
      return rawData as Paste;
    }

    return JSON.parse(rawData) as Paste;
  } catch (error) {
    logger.error(
      `Error retrieving paste ${code}: ${
        error instanceof Error ? error.message : error
      }`,
    );
    return null;
  }
}
