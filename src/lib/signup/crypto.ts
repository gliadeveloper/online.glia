import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const SCRYPT_PREFIX = "scrypt:";
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${SCRYPT_PREFIX}${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(stored: string | null | undefined, input: string) {
  if (!stored) return false;

  if (!stored.startsWith(SCRYPT_PREFIX)) {
    return stored === input;
  }

  const payload = stored.slice(SCRYPT_PREFIX.length);
  const [salt, hash] = payload.split(":");
  if (!salt || !hash) return false;

  const derived = (await scryptAsync(input, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;

  return timingSafeEqual(expected, derived);
}

export function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashVerificationCode(code: string) {
  const derived = (await scryptAsync(code, "signup-verify", 32)) as Buffer;
  return derived.toString("hex");
}

export async function verifyVerificationCode(stored: string | null | undefined, code: string) {
  if (!stored) return false;
  const derived = (await scryptAsync(code, "signup-verify", 32)) as Buffer;
  const expected = Buffer.from(stored, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
