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

Deno.test("returns script.js on /js/script.js", async () => {
  const res = await handler(new Request("http://localhost/js/script.js"));
  assertEquals(
    res.headers.get("content-type"),
    "application/javascript; charset=utf-8",
  );
  const body = await res.text();
  assertEquals(body.includes("AirPaste"), true);
});

Deno.test("REST API: Create, Get, and Update Paste", async () => {
  // 1. Create a paste
  const createRes = await handler(
    new Request("http://localhost/api/paste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Testing 1 2 3 from Deno tests" }),
    }),
  );
  assertEquals(createRes.status, 200);
  const createData = await createRes.json();
  const code = createData.code;
  assertEquals(typeof code, "string");
  assertEquals(code.length, 6);

  // 2. Retrieve the paste via API
  const getRes = await handler(
    new Request(`http://localhost/api/paste/${code}`),
  );
  assertEquals(getRes.status, 200);
  const getData = await getRes.json();
  assertEquals(getData.content, "Testing 1 2 3 from Deno tests");

  // 3. Update the paste
  const updateRes = await handler(
    new Request(`http://localhost/api/paste/${code}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Updated content from Deno tests" }),
    }),
  );
  assertEquals(updateRes.status, 200);

  // 4. Retrieve again to check update
  const getRes2 = await handler(
    new Request(`http://localhost/api/paste/${code}`),
  );
  assertEquals(getRes2.status, 200);
  const getData2 = await getRes2.json();
  assertEquals(getData2.content, "Updated content from Deno tests");

  // 5. Test magic link routing /:code
  const magicLinkRes = await handler(new Request(`http://localhost/${code}`));
  assertEquals(magicLinkRes.status, 200);
  assertEquals(
    magicLinkRes.headers.get("content-type"),
    "text/html; charset=utf-8",
  );
  const html = await magicLinkRes.text();
  assertEquals(html.includes("Updated content from Deno tests"), true);
  assertEquals(html.includes(code), true);
});

Deno.test("REST API: Retrieve non-existing paste returns 404", async () => {
  const res = await handler(new Request("http://localhost/api/paste/999999"));
  assertEquals(res.status, 404);
});

Deno.test("Magic link: Redirects to home on non-existing code", async () => {
  const res = await handler(new Request("http://localhost/999999"));
  assertEquals(res.status, 302);
  assertEquals(res.headers.get("location")?.includes("/?error=notfound"), true);
});
