// Integration test for the analytics beacon (/api/t) and /api/health against a RUNNING server whose
// stdout is written to LOG. Usage: BASE=http://localhost:3100 LOG=/tmp/bk-server.log node scripts/analytics-test.mjs
import fs from "node:fs";
import { randomBytes } from "node:crypto";

const BASE = process.env.BASE || "http://localhost:3100";
const LOG = process.env.LOG || "/tmp/bk-server.log";
const UA_M = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36";
const UA_D = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
let fails = 0;
const ok = (c, m) => {
  console.log(`${c ? "ok  " : "FAIL"} - ${m}`);
  if (!c) fails++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const logSize = () => fs.statSync(LOG).size;
const linesSince = (pos) =>
  fs.readFileSync(LOG).subarray(pos).toString("utf8").split("\n").filter((l) => l.startsWith("ANALYTICS ")).map((l) => JSON.parse(l.slice(10)));
const beacon = (body, ua = UA_M, extra = {}) =>
  fetch(BASE + "/api/t", { method: "POST", headers: { "content-type": "text/plain", "user-agent": ua, "x-forwarded-for": "203.0.113.7", ...extra }, body: typeof body === "string" ? body : JSON.stringify(body) });

const tag = "/__atest-" + randomBytes(3).toString("hex");

// health
let pos = logSize();
const h = await fetch(BASE + "/api/health", { headers: { "user-agent": UA_M } });
ok(h.status === 200 && (await h.text()) === "ok", "/api/health → 200 ok");
ok((await fetch(BASE + "/api/health", { method: "HEAD" })).status === 200, "/api/health HEAD → 200");
await sleep(300);
ok(linesSince(pos).length === 0, "health check writes no ANALYTICS line");

// pageview
pos = logSize();
const r1 = await beacon({ e: "pageview", p: tag + "?secret=1#x", r: "https://www.google.com/search?q=biodata", u: "whatsapp" });
ok(r1.status === 204, "beacon answers 204");
await beacon({ e: "pageview", p: tag + "/2", r: BASE + "/somewhere" }); // internal referrer
await beacon({ e: "pageview", p: tag + "/3" }, UA_D); // other device → other visitor
await beacon({ e: "pageview", p: tag + "/bot" }, "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");
await beacon({ e: "pageview", p: tag + "/curl" }, "curl/8.5.0");
await beacon({ e: "not_an_event", p: tag + "/bad" });
await beacon("{not json");
await beacon(JSON.stringify({ e: "pageview", p: tag + "/big", pad: "x".repeat(5000) }));
await beacon({ e: "pageview", p: tag + "/props", x: { tpl: "royal", nested: { a: 1 }, "bad key": 1, n: 3.14159, long: "y".repeat(200) } });
await beacon({ e: "pageview", p: tag + "/pf" }, UA_M, { "sec-purpose": "prefetch;prerender" });
await sleep(400);
const L = linesSince(pos).filter((l) => l.p?.startsWith(tag));
const by = (suffix) => L.find((l) => l.p === tag + suffix);
const a = by("");
ok(!!a, "pageview logged");
ok(a && a.p === tag, "query string and hash stripped from path");
ok(a && a.ref === "google.com" && a.utm === "whatsapp" && a.dev === "m", "referrer host, utm_source and device captured");
ok(a && /^[a-f0-9]{16}$/.test(a.vid) && a.v === 1 && a.src === "c" && /^\d{4}-\d{2}-\d{2}$/.test(a.d) && a.i, "line has v, vid (16 hex), IST date, id");
ok(by("/2") && by("/2").ref === undefined, "own-site referrer dropped");
ok(by("/2") && by("/2").vid === a.vid, "same IP+UA same day → same visitor id");
ok(by("/3") && by("/3").vid !== a.vid && by("/3").dev === "d", "different UA → different visitor id");
ok(!by("/bot") && !by("/curl"), "bots / curl ignored");
ok(!L.some((l) => l.p?.endsWith("/bad")), "unknown event ignored");
ok(!by("/big"), "oversized body ignored");
ok(!by("/pf"), "prefetch/prerender requests ignored");
const pr = by("/props");
ok(pr && pr.x && pr.x.tpl === "royal" && pr.x.n === 3.14 && !("nested" in pr.x) && !("bad key" in pr.x) && pr.x.long.length === 60, "props sanitised (scalars only, safe keys, clipped)");
const raw = fs.readFileSync(LOG).subarray(pos).toString("utf8");
ok(!raw.includes("203.0.113.7") && !raw.includes("Pixel 8"), "no IP or user agent written to the log");

console.log(fails ? `\nANALYTICS TEST FAILED (${fails})` : "\nANALYTICS TEST PASSED");
process.exit(fails ? 1 : 0);
