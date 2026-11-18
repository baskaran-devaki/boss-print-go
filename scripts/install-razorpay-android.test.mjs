import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
function fixture(main) {
  const dir = mkdtempSync(join(tmpdir(), "boss-native-test-"));
  for (const path of ["scripts", "native", "android/app/src/main/java/com/example", "android/app/src/main"]) mkdirSync(join(dir, path), { recursive: true });
  cpSync(resolve("native/razorpay"), join(dir, "native/razorpay"), { recursive: true });
  cpSync(resolve("scripts/install-razorpay-android.mjs"), join(dir, "scripts/install-razorpay-android.mjs"));
  writeFileSync(join(dir, "android/app/src/main/java/com/example/MainActivity.java"), main);
  writeFileSync(join(dir, "android/app/src/main/AndroidManifest.xml"), '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application></application></manifest>');
  writeFileSync(join(dir, "android/app/build.gradle"), "dependencies { implementation project(':capacitor-android') }");
  writeFileSync(join(dir, "android/build.gradle"), "repositories { mavenCentral() }");
  writeFileSync(join(dir, "android/settings.gradle"), "");
  return dir;
}
for (const main of ["package com.example;\npublic class MainActivity extends BridgeActivity {}", "package com.example;\npublic class MainActivity extends BridgeActivity { public void onCreate(Bundle state) { super.onCreate(state); } }"]) {
  test("installs into existing Android Java project without replacing its content and is idempotent", () => {
    const dir = fixture(main);
    try {
      const script = join(dir, "scripts/install-razorpay-android.mjs");
      execFileSync(process.execPath, [script]);
      const path = join(dir, "android/app/src/main/java/com/example/MainActivity.java");
      const first = readFileSync(path, "utf8");
      assert.match(first, /registerPlugin\(BossRazorpayPlugin.class\)/);
      assert.equal(readFileSync(path + ".boss-razorpay.bak", "utf8"), main);
      execFileSync(process.execPath, [script]);
      assert.equal(readFileSync(path, "utf8"), first);
      assert.equal((readFileSync(join(dir, "android/app/build.gradle"), "utf8").match(/com.razorpay:checkout/g) ?? []).length, 1);
      assert.match(readFileSync(join(dir, "android/app/src/main/java/com/example/BossRazorpayActivity.java"), "utf8"), /package com.example;/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
test("stops before mutation for an unsupported activity", () => {
  const main = "package com.example; public class MainActivity extends SomethingElse {}";
  const dir = fixture(main);
  try {
    assert.throws(() => execFileSync(process.execPath, [join(dir, "scripts/install-razorpay-android.mjs")], { stdio: "pipe" }));
    assert.equal(readFileSync(join(dir, "android/app/src/main/java/com/example/MainActivity.java"), "utf8"), main);
    assert.equal(readFileSync(join(dir, "android/app/build.gradle"), "utf8"), "dependencies { implementation project(':capacitor-android') }");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
