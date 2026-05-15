#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT_PATH = resolve(REPO_ROOT, "ui/public/og-image.png");

export function createDearMeOgSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" viewBox="0 0 ${OG_IMAGE_WIDTH} ${OG_IMAGE_HEIGHT}">
  <rect width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" fill="#f8f5ee"/>
  <path d="M0 0h1200v630H0z" fill="#f8f5ee"/>
  <path d="M718 96c122 20 224 96 302 208 48 69 81 147 98 234H82c18-93 58-176 119-247 68-80 154-134 257-162 82-22 168-33 260-33z" fill="#e8f0ea"/>
  <path d="M1200 278c-108 22-197 68-268 137-72 70-118 142-138 215h406V278z" fill="#d8e7e1"/>
  <path d="M0 376c109-6 205 15 288 64 79 47 137 110 175 190H0V376z" fill="#eaded0"/>
  <g transform="translate(96 96)">
    <rect x="0" y="0" width="156" height="156" rx="32" fill="#143d36"/>
    <path d="M47 54c0-14 11-25 25-25h13c14 0 25 11 25 25v48c0 14-11 25-25 25H72c-14 0-25-11-25-25V54z" fill="#f8f5ee"/>
    <path d="M47 59l31 29 32-29" fill="none" stroke="#143d36" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="96" y="322" fill="#143d36" font-family="Inter, Arial, sans-serif" font-size="94" font-weight="800" letter-spacing="0">DearMe</text>
  <text x="101" y="394" fill="#3f514d" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="600" letter-spacing="0">Turn conversations into done work.</text>
  <g transform="translate(96 455)">
    <rect x="0" y="0" width="284" height="58" rx="29" fill="#143d36"/>
    <text x="32" y="39" fill="#f8f5ee" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="0">Private by default</text>
  </g>
  <g transform="translate(404 455)">
    <rect x="0" y="0" width="246" height="58" rx="29" fill="#ffffff" stroke="#c8d7cf" stroke-width="2"/>
    <text x="32" y="39" fill="#143d36" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="0">Built for follow-through</text>
  </g>
  <text x="96" y="572" fill="#62716d" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="0">dearme.app</text>
</svg>`;
}

export async function generateDearMeOgImage(outputPath = DEFAULT_OUTPUT_PATH) {
  const output = resolve(outputPath);
  await mkdir(dirname(output), { recursive: true });
  await sharp(Buffer.from(createDearMeOgSvg()))
    .png({ compressionLevel: 9, palette: false })
    .toFile(output);
  return output;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const outputPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_OUTPUT_PATH;
  await generateDearMeOgImage(outputPath);
  console.log(`Generated ${outputPath}`);
}
