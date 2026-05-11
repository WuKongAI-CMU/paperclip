import { SECRET_PROVIDERS, type SecretProvider } from "@paperclipai/shared";
import { getSecretProvider } from "../secrets/provider-registry.js";
import type { StoredSecretVersionMaterial } from "../secrets/types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isSecretProvider(value: string): value is SecretProvider {
  return SECRET_PROVIDERS.includes(value as SecretProvider);
}

export async function resolveDearMeChannelCredential(
  encryptedCredential: string,
  errorPrefix: string,
  allowedProviders: ReadonlyArray<SecretProvider> = ["local_encrypted"],
) {
  let envelope: unknown;
  try {
    envelope = JSON.parse(encryptedCredential);
  } catch {
    throw new Error(`${errorPrefix}-credential-envelope-invalid-json`);
  }

  const record = asRecord(envelope);
  const material = asRecord(record?.material);
  const providerId = record ? stringField(record, "provider") : null;
  if (!record || !providerId || !isSecretProvider(providerId) || !material) {
    throw new Error(`${errorPrefix}-credential-envelope-invalid`);
  }
  if (!allowedProviders.includes(providerId)) {
    throw new Error(`${errorPrefix}-credential-envelope-invalid`);
  }

  const provider = getSecretProvider(providerId);
  return provider.resolveVersion({
    material: material as StoredSecretVersionMaterial,
    externalRef:
      typeof record.externalRef === "string" && record.externalRef.trim().length > 0
        ? record.externalRef
        : null,
  });
}
