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

Deno.test("SEO: Homepage returns correct SEO metadata", async () => {
  const res = await handler(new Request("http://localhost/"));
  assertEquals(res.headers.get("content-type"), "text/html; charset=utf-8");
  const html = await res.text();

  // Assert Title
  assertEquals(
    html.includes(
      "<title>AirPaste — Share text and code snippets instantly</title>",
    ),
    true,
  );

  // Assert Description
  assertEquals(
    html.includes(
      '<meta name="description" content="AirPaste is a free, lightweight, and ephemeral remote clipboard manager. Share text and code snippets instantly between devices using a 6-digit code or magic link.">',
    ),
    true,
  );

  // Assert Robots
  assertEquals(
    html.includes('<meta name="robots" content="index, follow">'),
    true,
  );

  // Assert Canonical
  assertEquals(
    html.includes('<link rel="canonical" href="http://localhost/">'),
    true,
  );

  // Assert Open Graph / Twitter Tags
  assertEquals(
    html.includes(
      '<meta property="og:title" content="AirPaste — Share text and code snippets instantly">',
    ),
    true,
  );
  assertEquals(
    html.includes('<meta property="og:url" content="http://localhost/">'),
    true,
  );
  assertEquals(
    html.includes(
      '<meta property="og:image" content="http://localhost/img/Screenshot.png">',
    ),
    true,
  );
  assertEquals(
    html.includes('<meta name="twitter:card" content="summary_large_image">'),
    true,
  );
});

Deno.test("SEO: Magic link paste page returns privacy-focused robots tags", async () => {
  // First, create a paste to get a valid code
  const createRes = await handler(
    new Request("http://localhost/api/paste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "SEO Privacy Test Snippet" }),
    }),
  );
  assertEquals(createRes.status, 200);
  const { code } = await createRes.json();

  // Access the magic link page
  const res = await handler(new Request(`http://localhost/${code}`));
  assertEquals(res.status, 200);
  const html = await res.text();

  // Assert Page Title for Paste
  assertEquals(
    html.includes(
      `<title>AirPaste — Snippet ${code} — Retrieve shared snippet</title>`,
    ),
    true,
  );

  // Assert Robots is noindex, nofollow
  assertEquals(
    html.includes('<meta name="robots" content="noindex, nofollow">'),
    true,
  );

  // Assert Canonical is specific to paste code
  assertEquals(
    html.includes(`<link rel="canonical" href="http://localhost/${code}">`),
    true,
  );
});

Deno.test("SEO: Static image serving delivers assets", async () => {
  const res = await handler(new Request("http://localhost/img/Screenshot.png"));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "image/png");
  const bytes = await res.arrayBuffer();
  assertEquals(bytes.byteLength > 0, true);
});

Deno.test("Stats tracking: records page views and cookies", async () => {
  // 1. Visit with a brand new cookie-less request
  const req1 = new Request("http://localhost/");
  const res1 = await handler(req1);
  assertEquals(res1.status, 200);

  const setCookie = res1.headers.get("set-cookie");
  assertEquals(typeof setCookie, "string");
  assertEquals(setCookie?.includes("airpaste_uid="), true);

  const cookieMatch = setCookie?.match(/airpaste_uid=([^;]+)/);
  const cookieVal = cookieMatch ? cookieMatch[1] : "";
  assertEquals(cookieVal.length > 0, true);

  const html1 = await res1.text();
  const statsMatch1 = html1.match(/AirPaste v\.\d+\.\d+\.\d+ \(([^)]+)\)/);
  let u1 = 0, t1 = 0;
  if (statsMatch1) {
    [u1, t1] = statsMatch1[1].split("/").map(Number);
  }

  // 2. Visit again with the same cookie
  const req2 = new Request("http://localhost/", {
    headers: { "cookie": `airpaste_uid=${cookieVal}` },
  });
  const res2 = await handler(req2);
  assertEquals(res2.status, 200);

  // Should NOT set a new cookie since they already have one
  assertEquals(res2.headers.get("set-cookie"), null);

  const html2 = await res2.text();
  const statsMatch2 = html2.match(/AirPaste v\.\d+\.\d+\.\d+ \(([^)]+)\)/);
  let u2 = 0, t2 = 0;
  if (statsMatch2) {
    [u2, t2] = statsMatch2[1].split("/").map(Number);
  }

  // Total usages should increment by exactly 1 between visit 1 and visit 2
  assertEquals(t2, t1 + 1);
  // Unique users count should not increase between visit 1 and visit 2
  assertEquals(u2, u1);
});
