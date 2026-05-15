import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

import {
  createDearMeOgSvg,
  generateDearMeOgImage,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from "./generate-dearme-og-image.mjs";

test("DearMe OG SVG is customer-safe and branded", () => {
  const svg = createDearMeOgSvg();

  assert.match(svg, /DearMe/);
  assert.match(svg, /Turn conversations into done work/);
  const forbiddenCustomerTerms = [
    ["Paper", "clip"],
    ["Open", "Claw"],
    ["Sym", "phony"],
    ["Bed", "rock"],
    ["dm", "_sk_"],
    ["Clau", "de"],
    ["G", "PT"],
    ["Voy", "age"],
  ].map((parts) => parts.join(""));

  for (const forbidden of forbiddenCustomerTerms) {
    assert.doesNotMatch(svg, new RegExp(forbidden, "i"));
  }
});

test("DearMe OG image generator writes a 1200 by 630 PNG", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-og-"));
  const outputPath = join(dir, "og-image.png");

  try {
    await generateDearMeOgImage(outputPath);

    const metadata = await sharp(outputPath).metadata();
    const file = await stat(outputPath);
    const signature = await readFile(outputPath);

    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, OG_IMAGE_WIDTH);
    assert.equal(metadata.height, OG_IMAGE_HEIGHT);
    assert.equal(signature.subarray(1, 4).toString("ascii"), "PNG");
    assert.ok(file.size > 10_000);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
