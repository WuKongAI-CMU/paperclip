export const DEARME_OWNER_PROOF_HANDOFF_RECEIPT_FILENAME = "launch-proof-handoff-receipt.txt";

export function downloadDearMeReceipt(receipt: string, filename: string) {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return;
  }

  const blob = new Blob([receipt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

export function downloadDearMeOwnerProofHandoffReceipt(receipt: string) {
  downloadDearMeReceipt(receipt, DEARME_OWNER_PROOF_HANDOFF_RECEIPT_FILENAME);
}
