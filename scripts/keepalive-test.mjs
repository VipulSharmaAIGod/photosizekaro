// Unit tests for src/lib/keepalive.ts (pure helpers). Run: node scripts/keepalive-test.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";

const src = fs.readFileSync(path.resolve("src/lib/keepalive.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ka-")), "keepalive.mjs");
fs.writeFileSync(tmp, js);
const k = await import(tmp);

const ist = (h, m) => Date.UTC(2026, 9, 2, 0, 0) + ((h * 60 + m - 330 + 1440) % 1440) * 60_000;
const t = k.parseTargets(k.DEFAULT_TARGETS);
assert.equal(t.length, 2);
assert.deepEqual(t.map((x) => [x.name, x.from, x.to]), [["biodatakaro", 600, 1320], ["photosizekaro", 1080, 1320]]);
assert.equal(k.istMinutes(ist(0, 0)), 0);
assert.equal(k.istMinutes(ist(21, 59)), 1319);
const names = (h, m) => k.dueTargets(t, ist(h, m)).map((x) => x.name).join(",");
assert.equal(names(9, 59), "");
assert.equal(names(10, 0), "biodatakaro");
assert.equal(names(17, 59), "biodatakaro");
assert.equal(names(18, 0), "biodatakaro,photosizekaro");
assert.equal(names(21, 59), "biodatakaro,photosizekaro");
assert.equal(names(22, 0), "");
assert.equal(names(3, 0), "");
// windows across midnight, all-day, garbage
const night = k.parseTargets("n=https://x.test/h@23:00-01:00");
assert.ok(k.inWindow(night[0], ist(23, 30)) && k.inWindow(night[0], ist(0, 30)) && !k.inWindow(night[0], ist(1, 0)));
const all = k.parseTargets("a=http://localhost:1/api/health@00:00-24:00");
assert.ok(k.inWindow(all[0], ist(0, 0)) && k.inWindow(all[0], ist(23, 59)));
assert.equal(k.parseTargets("bad, x=ftp://a@1:00-2:00, y=https://a.test@25:00-26:00, z=https://a.test@10:00-10:00").length, 0);
// enable rules
assert.equal(k.keepaliveEnabled({}), false);
assert.equal(k.keepaliveEnabled({ RENDER: "true" }), true);
assert.equal(k.keepaliveEnabled({ RENDER: "true", KEEPALIVE: "off" }), false);
assert.equal(k.keepaliveEnabled({ KEEPALIVE: "on" }), true);
assert.ok(k.INTERVAL_MS < 15 * 60_000);
console.log("keepalive unit tests: all passed");
