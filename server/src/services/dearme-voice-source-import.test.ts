import { describe, expect, it, vi } from "vitest";
import { importDearMeVoiceSource } from "./dearme-voice-source-import.js";

function fetchResponse(body: string, init: { ok?: boolean; status?: number; contentType?: string } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: {
      get: (name: string) => name.toLowerCase() === "content-type" ? (init.contentType ?? "text/html") : null,
    },
    text: async () => body,
  };
}

describe("importDearMeVoiceSource", () => {
  it("extracts readable public page text without live network", async () => {
    const fetch = vi.fn().mockResolvedValue(fetchResponse(`
      <html>
        <head><style>.hidden { display: none; }</style><script>window.track()</script></head>
        <body>
          <main>
            <h1>Writing notes</h1>
            <p>I write in direct practical notes that make the next customer move obvious.</p>
            <p>The sample should preserve phrasing without saving page chrome.</p>
          </main>
        </body>
      </html>
    `));

    const result = await importDearMeVoiceSource("https://example.com/writing", { fetch });

    expect(fetch).toHaveBeenCalledWith("https://example.com/writing", expect.objectContaining({
      redirect: "error",
    }));
    expect(result).toEqual(expect.objectContaining({
      ok: true,
      sourceUrl: "https://example.com/writing",
      extractedCharacterCount: expect.any(Number),
    }));
    expect(result.ok && result.body).toContain("direct practical notes");
    expect(result.ok && result.body).not.toContain("window.track");
  });

  it("rejects local and private hosts before fetching", async () => {
    const fetch = vi.fn();

    await expect(importDearMeVoiceSource("http://127.0.0.1:5173/profile", { fetch }))
      .resolves.toEqual({ ok: false, reason: "invalid_source_url" });
    await expect(importDearMeVoiceSource("https://localhost/profile", { fetch }))
      .resolves.toEqual({ ok: false, reason: "invalid_source_url" });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports short or unavailable sources with customer-safe reasons", async () => {
    const shortFetch = vi.fn().mockResolvedValue(fetchResponse("too short", { contentType: "text/plain" }));
    const unavailableFetch = vi.fn().mockResolvedValue(fetchResponse("", { ok: false, status: 404 }));

    await expect(importDearMeVoiceSource("https://example.com/short", { fetch: shortFetch }))
      .resolves.toEqual({ ok: false, reason: "source_too_short" });
    await expect(importDearMeVoiceSource("https://example.com/missing", { fetch: unavailableFetch }))
      .resolves.toEqual({ ok: false, reason: "source_unavailable", status: 404 });
  });
});
