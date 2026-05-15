import { eq } from "drizzle-orm";
import {
  dearmeEmailSuppress,
  type Db,
  type DearMeEmailSuppress,
  type DearMeEmailSuppressReason,
} from "@paperclipai/db";

export interface DearMeEmailSuppressRepository {
  find(email: string): Promise<DearMeEmailSuppress | null>;
  upsert(email: string, reason: DearMeEmailSuppressReason, now: Date): Promise<void>;
  delete(email: string): Promise<void>;
}

export interface DearMeEmailSuppressOptions {
  now?: () => Date;
  repository?: DearMeEmailSuppressRepository;
}

export interface DearMeEmailSuppressService {
  isSuppressed(email: string): Promise<boolean>;
  suppress(email: string, reason: DearMeEmailSuppressReason): Promise<void>;
  unsuppress(email: string): Promise<void>;
}

export function normalizeDearMeSuppressEmail(email: string) {
  return email.trim().toLowerCase();
}

function dbRepository(db: Db): DearMeEmailSuppressRepository {
  return {
    async find(email) {
      const [row] = await db
        .select()
        .from(dearmeEmailSuppress)
        .where(eq(dearmeEmailSuppress.email, email))
        .limit(1);
      return row ?? null;
    },
    async upsert(email, reason, now) {
      await db
        .insert(dearmeEmailSuppress)
        .values({ email, reason, createdAt: now })
        .onConflictDoUpdate({
          target: dearmeEmailSuppress.email,
          set: { reason, createdAt: now },
        });
    },
    async delete(email) {
      await db.delete(dearmeEmailSuppress).where(eq(dearmeEmailSuppress.email, email));
    },
  };
}

export function dearMeEmailSuppressService(
  db: Db,
  options: DearMeEmailSuppressOptions = {},
): DearMeEmailSuppressService {
  const repository = options.repository ?? dbRepository(db);
  const now = options.now ?? (() => new Date());

  return {
    async isSuppressed(email) {
      const normalizedEmail = normalizeDearMeSuppressEmail(email);
      if (!normalizedEmail) return false;
      return Boolean(await repository.find(normalizedEmail));
    },
    async suppress(email, reason) {
      const normalizedEmail = normalizeDearMeSuppressEmail(email);
      if (!normalizedEmail) return;
      await repository.upsert(normalizedEmail, reason, now());
    },
    async unsuppress(email) {
      const normalizedEmail = normalizeDearMeSuppressEmail(email);
      if (!normalizedEmail) return;
      await repository.delete(normalizedEmail);
    },
  };
}
