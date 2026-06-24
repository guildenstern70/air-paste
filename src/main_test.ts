/*
 * AirPaste
 * Remote Copy & Paste Service
 * Copyright (c) 2026 Alessio Saltarin
 * ISC License
 */

import { assertEquals } from "@std/assert";
import { handler } from "./main.ts";

Deno.test("returns html on /", async () => {
  const res = await handler(new Request("http://localhost/"));
  assertEquals(res.headers.get("content-type"), "text/html; charset=utf-8");
  const body = await res.text();
  assertEquals(body.includes("AirPaste"), true);
});

Deno.test("returns style.css on /css/style.css", async () => {
  const res = await handler(new Request("http://localhost/css/style.css"));
  assertEquals(res.headers.get("content-type"), "text/css; charset=utf-8");
  const body = await res.text();
  assertEquals(body.includes("AirPaste CSS Stylesheet"), true);
});
