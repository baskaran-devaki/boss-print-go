// Run once from the project root: node scripts/install-razorpay-android.mjs
// Android source is local/untracked in this repository, so install without replacing it.
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function find(dir, name) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? find(join(dir, entry.name), name) : entry.name === name ? [join(dir, entry.name)] : []);
}
const activities = find(join(root, "android/app/src/main/java"), "MainActivity.java");
if (activities.length !== 1) throw new Error("Expected one MainActivity.java. No files changed. Send its path/content for a matching update.");
const mainPath = activities[0];
const main = readFileSync(mainPath, "utf8");
const appPackage = main.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
if (!appPackage || !/extends\s+BridgeActivity/.test(main)) throw new Error("Unsupported MainActivity layout. No files changed.");
const manifestPath = join(root, "android/app/src/main/AndroidManifest.xml");
const gradlePath = join(root, "android/app/build.gradle");
const manifest = readFileSync(manifestPath, "utf8");
const gradle = readFileSync(gradlePath, "utf8");
const rootGradle = readFileSync(join(root, "android/build.gradle"), "utf8");
const settings = readFileSync(join(root, "android/settings.gradle"), "utf8");
if (!/mavenCentral\s*\(/.test(rootGradle + settings + gradle)) throw new Error("mavenCentral() is missing. No files changed.");
if (!/dependencies\s*\{/.test(gradle) || !manifest.includes("</application>")) throw new Error("Unsupported Android configuration. No files changed.");
let nextMain = main;
if (!main.includes("registerPlugin(BossRazorpayPlugin.class)")) {
  if (/super\.onCreate\(([^)]*)\);/.test(main)) {
    nextMain = main.replace(/super\.onCreate\(([^)]*)\);/, "registerPlugin(BossRazorpayPlugin.class);\n        super.onCreate($1);");
  } else if (!/\bonCreate\s*\(/.test(main)) {
    nextMain = main.replace(/(extends\s+BridgeActivity\s*\{)/, "$1\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(BossRazorpayPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n");
  } else throw new Error("Could not safely register payment plugin. No files changed.");
}
if (!nextMain.includes("registerPlugin(BossRazorpayPlugin.class)")) throw new Error("Could not locate MainActivity class. No files changed.");
let nextManifest = manifest.includes("BossRazorpayActivity") ? manifest : manifest.replace("</application>", `    <activity android:name="${appPackage}.BossRazorpayActivity" android:exported="false" android:theme="@android:style/Theme.Material.Light.NoActionBar" android:configChanges="orientation|screenSize|keyboardHidden" />\n    </application>`);
if (!/android:scheme=["']upi["']/.test(nextManifest)) {
  const query = '<intent><action android:name="android.intent.action.VIEW" /><data android:scheme="upi" /></intent>';
  if (nextManifest.includes("</queries>")) nextManifest = nextManifest.replace("</queries>", query + "</queries>");
  else nextManifest = nextManifest.replace("</manifest>", "<queries>" + query + "</queries>\n</manifest>");
}
let nextGradle = gradle;
if (!/com\.razorpay:checkout:/.test(gradle)) nextGradle = gradle.replace(/dependencies\s*\{/, "dependencies {\n    implementation 'com.razorpay:checkout:1.6.40'");
const proguardPath = join(root, "android/app/proguard-rules.pro");
const proguard = existsSync(proguardPath) ? readFileSync(proguardPath, "utf8") : "";
const nextProguard = proguard.includes("BOSS Razorpay native checkout") ? proguard : proguard + `\n# BOSS Razorpay native checkout\n-keepclassmembers class * {\n    @android.webkit.JavascriptInterface <methods>;\n}\n-keepattributes JavascriptInterface\n-keepattributes *Annotation*\n-dontwarn com.razorpay.**\n-keep class com.razorpay.** { *; }\n-keep class ${appPackage}.BossRazorpayPlugin { *; }\n-keep class ${appPackage}.BossRazorpayActivity { *; }\n-optimizations !method/inlining/*\n-keepclasseswithmembers class * {\n    public void onPayment*(...);\n}\n`;
const files = [[mainPath, nextMain], [manifestPath, nextManifest], [gradlePath, nextGradle], [proguardPath, nextProguard]];
for (const name of ["BossRazorpayPlugin.java", "BossRazorpayActivity.java"]) {
  files.push([join(dirname(mainPath), name), readFileSync(join(root, "native/razorpay", name), "utf8").replaceAll("__APP_PACKAGE__", appPackage)]);
}
// Validate all inputs before the first write; keep originals for rollback.
for (const [path, content] of files) {
  if (existsSync(path) && readFileSync(path, "utf8") === content) continue;
  if (existsSync(path) && !existsSync(path + ".boss-razorpay.bak")) copyFileSync(path, path + ".boss-razorpay.bak");
  writeFileSync(path, content, "utf8");
}
console.log("Native Razorpay checkout installed. Run npx cap sync android, then rebuild/install the APK in Android Studio.");
