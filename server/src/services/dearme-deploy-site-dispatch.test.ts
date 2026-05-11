import { describe, expect, it } from "vitest";
import { createDearMeDeploySiteDispatch } from "./dearme-deploy-site-dispatch.js";

const dispatchContext = {
  companyId: "company-1",
  userId: "user-1",
  issueId: "issue-1",
  channel: "dearme-cloud",
  openclawRunId: "run-1",
  approvalId: "approval-1",
  idempotencyKey: "deploy_site:approval-1:payload-hash",
  originalPayload: {
    handle: "peter-studio",
    artifactRef: "document:portfolio-update:r2",
    customDomain: null,
    target: "preview",
  },
};

describe("createDearMeDeploySiteDispatch", () => {
  it("returns a stable private preview deployment receipt for approved site handoffs", async () => {
    const dispatch = createDearMeDeploySiteDispatch({
      siteBaseUrl: "https://dearme.example.test/",
    });

    const first = await dispatch({
      toolName: "deploy_site",
      encryptedCredential: "",
      payload: {
        handle: "peter-studio",
        artifactRef: "document:portfolio-update:r2",
        customDomain: null,
        target: "preview",
      },
      dispatchContext,
    });
    const replay = await dispatch({
      toolName: "deploy_site",
      encryptedCredential: "",
      payload: {
        handle: "peter-studio",
        artifactRef: "document:portfolio-update:r2",
        target: "preview",
      },
      dispatchContext,
    });

    expect(first).toEqual({
      kind: "delivered",
      externalId: expect.stringMatching(/^dearme_preview_[a-f0-9]{16}$/),
      externalUrl: expect.stringMatching(
        /^https:\/\/dearme\.example\.test\/peter-studio\?preview=dearme_preview_[a-f0-9]{16}$/,
      ),
      paid: false,
      paidUsd: undefined,
    });
    expect(replay).toEqual(first);
    expect(JSON.stringify(first).toLowerCase()).not.toContain("openclaw");
  });

  it("fails closed for malformed payloads before claiming a deploy receipt", async () => {
    const dispatch = createDearMeDeploySiteDispatch();

    await expect(dispatch({
      toolName: "deploy_site",
      encryptedCredential: "",
      payload: {
        handle: "Peter Studio",
        artifactRef: "document:portfolio-update:r2",
        target: "preview",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "deploy-site-handle-invalid",
    });
    await expect(dispatch({
      toolName: "deploy_site",
      encryptedCredential: "",
      payload: {
        handle: "peter-studio",
        artifactRef: "",
        target: "preview",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "deploy-site-payload-missing-artifact-ref",
    });
    await expect(dispatch({
      toolName: "deploy_site",
      encryptedCredential: "",
      payload: {
        handle: "peter-studio",
        artifactRef: "document:portfolio-update:r2",
        customDomain: "peter.example.com",
        target: "preview",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "deploy-site-custom-domain-unsupported",
    });
  });

  it("does not claim production deploys until the real host path is enabled", async () => {
    const dispatch = createDearMeDeploySiteDispatch();
    await expect(dispatch({
      toolName: "deploy_site",
      encryptedCredential: "",
      payload: {
        handle: "peter-studio",
        artifactRef: "document:portfolio-update:r2",
        customDomain: null,
        target: "production",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "deploy-site-production-host-unconfigured",
    });
  });

  it("can be explicitly configured for production receipts", async () => {
    const dispatch = createDearMeDeploySiteDispatch({
      siteBaseUrl: "https://dearme.example.test",
      allowProduction: true,
    });

    await expect(dispatch({
      toolName: "deploy_site",
      encryptedCredential: "",
      payload: {
        handle: "peter-studio",
        artifactRef: "document:portfolio-update:r2",
        target: "production",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "delivered",
      externalId: expect.stringMatching(/^dearme_production_[a-f0-9]{16}$/),
      externalUrl: expect.stringMatching(
        /^https:\/\/dearme\.example\.test\/peter-studio$/,
      ),
      paid: false,
      paidUsd: undefined,
    });
  });

  it("rejects accidental binding mismatches", async () => {
    const dispatch = createDearMeDeploySiteDispatch();
    await expect(dispatch({
      toolName: "send_email",
      encryptedCredential: "",
      payload: {
        handle: "peter-studio",
        artifactRef: "document:portfolio-update:r2",
        target: "preview",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "deploy-site-dispatch-binding-mismatch:send_email",
    });
  });
});
