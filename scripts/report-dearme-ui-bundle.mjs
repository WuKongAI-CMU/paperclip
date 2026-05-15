import { gzipSync } from "node:zlib";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(import.meta.dirname, "..");
const distDir = path.join(rootDir, "ui", "dist");
const indexPath = path.join(distDir, "index.html");
const targetKb = Number(process.env.DEARME_UI_INITIAL_GZIP_KB ?? 200);

function fail(message) {
  console.error(`DearMe UI bundle audit failed: ${message}`);
  process.exit(1);
}

function sizeKb(bytes) {
  return bytes / 1024;
}

function formatKb(bytes) {
  return `${sizeKb(bytes).toFixed(1)} kB`;
}

if (!existsSync(indexPath)) {
  fail(`missing ${path.relative(rootDir, indexPath)}; run the UI build first`);
}

const html = readFileSync(indexPath, "utf8");
const assetRefs = Array.from(html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g), (match) => match[1])
  .filter((assetPath) => assetPath.startsWith("/assets/") || assetPath.startsWith("assets/"))
  .map((assetPath) => assetPath.replace(/^\//, ""));

const uniqueAssetRefs = [...new Set(assetRefs)];
if (uniqueAssetRefs.length === 0) {
  fail("index.html does not reference any JS or CSS entry assets");
}

const assets = uniqueAssetRefs.map((assetPath) => {
  const absolutePath = path.join(distDir, assetPath);
  if (!existsSync(absolutePath)) {
    fail(`referenced asset is missing: ${assetPath}`);
  }
  const source = readFileSync(absolutePath);
  const gzipBytes = gzipSync(source, { level: 9 }).byteLength;
  return {
    path: assetPath,
    rawBytes: statSync(absolutePath).size,
    gzipBytes,
  };
});

const totalGzipBytes = assets.reduce((sum, asset) => sum + asset.gzipBytes, 0);
const targetBytes = targetKb * 1024;
const status = totalGzipBytes <= targetBytes ? "PASS" : "FAIL";

console.log(
  `DearMe UI initial bundle gzip: ${formatKb(totalGzipBytes)} / ${targetKb.toFixed(0)} kB target (${status})`
);
for (const asset of assets) {
  console.log(`  ${asset.path}: ${formatKb(asset.gzipBytes)} gzip (${formatKb(asset.rawBytes)} raw)`);
}

if (totalGzipBytes > targetBytes) {
  fail(`initial entry assets exceed ${targetKb.toFixed(0)} kB gzip`);
}
