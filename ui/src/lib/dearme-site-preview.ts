import {
  dearMeFirstCyclePreviewResponseSchema,
  type DearMeFirstCyclePreviewResponse,
} from "@paperclipai/shared";

const DEARME_SITE_PREVIEW_STORAGE_PREFIX = "dearme:first-cycle-preview";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function buildDearMeSitePreviewPath(handle: string): string {
  return `/dearme/site-preview/${encodeURIComponent(handle)}`;
}

export function buildDearMeSitePreviewStorageKey(companyId: string, handle: string): string {
  return `${DEARME_SITE_PREVIEW_STORAGE_PREFIX}:${companyId}:${handle}`;
}

export function writeDearMeFirstCyclePreview(preview: DearMeFirstCyclePreviewResponse): void {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(
      buildDearMeSitePreviewStorageKey(preview.companyId, preview.sitePreview.handle),
      JSON.stringify(preview),
    );
  } catch {
    // Ignore storage failures; the preview page still renders when data is available in-memory.
  }
}

export function readDearMeFirstCyclePreview(
  companyId: string,
  handle: string,
): DearMeFirstCyclePreviewResponse | null {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(buildDearMeSitePreviewStorageKey(companyId, handle));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const result = dearMeFirstCyclePreviewResponseSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
