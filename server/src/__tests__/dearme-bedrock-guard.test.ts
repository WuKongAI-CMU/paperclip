import { describe, expect, it } from "vitest";

const { listBedrockGuardViolations } = await import("../../../scripts/check-dearme-bedrock-guard.mjs");

const forbiddenPackage = ["@aws-sdk/client", "bedrock"].join("-");

describe("DearMe Bedrock SDK guard", () => {
  it("flags forbidden package manifest entries", () => {
    const violations = listBedrockGuardViolations([{
      path: "server/package.json",
      contents: JSON.stringify({
        dependencies: {
          [forbiddenPackage]: "latest",
        },
      }),
    }]);

    expect(violations).toEqual([{
      file: "server/package.json",
      reason: `${forbiddenPackage} is not allowed in package manifests`,
    }]);
  });

  it("flags direct imports without blocking documentation text", () => {
    const violations = listBedrockGuardViolations([
      {
        path: "server/src/bedrock-client.ts",
        contents: `import { BedrockRuntimeClient } from "${forbiddenPackage}";`,
      },
      {
        path: "packages/plugins/dearme-openclaw/src/lockdown/skill-template.ts",
        contents: `Do not add ${forbiddenPackage} or similar packages.`,
      },
    ]);

    expect(violations).toEqual([{
      file: "server/src/bedrock-client.ts",
      reason: `${forbiddenPackage} imports are not allowed`,
    }]);
  });

  it("flags require and dynamic import usage", () => {
    const violations = listBedrockGuardViolations([
      {
        path: "server/src/require-client.cjs",
        contents: `const sdk = require("${forbiddenPackage}");`,
      },
      {
        path: "server/src/dynamic-client.mts",
        contents: `await import("${forbiddenPackage}");`,
      },
    ]);

    expect(violations).toHaveLength(2);
    expect(violations.map((violation) => violation.file)).toEqual([
      "server/src/require-client.cjs",
      "server/src/dynamic-client.mts",
    ]);
  });
});
