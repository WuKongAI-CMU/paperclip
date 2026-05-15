import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  buildDearMeErrorPageHtml,
  createDearMeHtmlErrorMiddleware,
} from "../app.js";
import { errorHandler } from "../middleware/error-handler.js";

describe("DearMe error pages", () => {
  it("injects the static React error route before the app boots", () => {
    const html = buildDearMeErrorPageHtml(
      "<html><head></head><body><div id=\"root\"></div></body></html>",
      "/500",
    );

    expect(html).toContain("window.history.replaceState");
    expect(html).toContain("\"/500\"");
    expect(html).toContain("<div id=\"root\"></div>");
  });

  it("serves the DearMe 500 shell for browser errors outside the API", async () => {
    const app = express();
    app.get("/broken-page", () => {
      throw new Error("boom");
    });
    app.use(createDearMeHtmlErrorMiddleware((_req, res) => {
      res
        .status(500)
        .type("html")
        .send(buildDearMeErrorPageHtml("<html><head></head><body>DearMe shell</body></html>", "/500"));
    }));
    app.use(errorHandler);

    const res = await request(app)
      .get("/broken-page")
      .set("Accept", "text/html")
      .expect(500);

    expect(res.text).toContain("DearMe shell");
    expect(res.text).toContain("\"/500\"");
  });

  it("keeps API errors on JSON responses", async () => {
    const app = express();
    app.get("/api/broken", () => {
      throw new Error("boom");
    });
    app.use(createDearMeHtmlErrorMiddleware((_req, res) => {
      res.status(500).type("html").send("should not render");
    }));
    app.use(errorHandler);

    const res = await request(app)
      .get("/api/broken")
      .set("Accept", "text/html")
      .expect(500);

    expect(res.body).toEqual({ error: "Internal server error" });
    expect(res.text).not.toContain("should not render");
  });
});
