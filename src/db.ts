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

/**
 * Parses cookies from the request headers.
 */
export function parseCookies(headers: Headers): Record<string, string> {
  const cookieHeader = headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length === 2) {
      cookies[parts[0].trim()] = parts[1].trim();
    }
  });
  return cookies;
}

/**
 * Retrieves client IP address from request headers and hashes it using SHA-256 for privacy.
 */
export async function getClientIp(req: Request): Promise<string> {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown-ip";
  if (ip === "unknown-ip") return ip;

  try {
    const msgUint8 = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (_e) {
    return ip;
  }
}

/**
 * Records a usage of the application.
 * If cookie airpaste_uid is present, uses it.
 * Otherwise, generates a new one (for page loads) or falls back to IP address (for API).
 * Returns the userId and whether it was a newly generated cookie UID.
 */
export async function recordUsage(
  req: Request,
): Promise<{ userId: string; isNewCookie: boolean }> {
  try {
    const cookies = parseCookies(req.headers);
    let userId = cookies["airpaste_uid"];
    let isNewCookie = false;

    if (!userId) {
      const url = new URL(req.url);
      const isApi = url.pathname.startsWith("/api/");
      if (isApi) {
        const hashedIp = await getClientIp(req);
        userId = `ip:${hashedIp}`;
      } else {
        userId = crypto.randomUUID();
        isNewCookie = true;
      }
    }

    // Add to unique users set and increment total usage
    await redis.sadd("stats:unique_users", userId);
    await redis.incr("stats:total_usages");

    return { userId, isNewCookie };
  } catch (error) {
    logger.error(`Error recording usage: ${error}`);
    return { userId: "unknown", isNewCookie: false };
  }
}

export interface AppStats {
  uniqueUsers: number;
  totalUsages: number;
}

/**
 * Retrieves application usage stats.
 */
export async function getStats(): Promise<AppStats> {
  try {
    const uniqueUsers = await redis.scard("stats:unique_users");
    const totalUsagesVal = await redis.get<string | number>(
      "stats:total_usages",
    );
    const totalUsages = totalUsagesVal ? Number(totalUsagesVal) : 0;
    return { uniqueUsers, totalUsages };
  } catch (error) {
    logger.error(`Error getting stats: ${error}`);
    return { uniqueUsers: 0, totalUsages: 0 };
  }
}
