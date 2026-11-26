import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 32;
const PREFIX = "s1";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH);
  return `${PREFIX}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [prefix, saltText, keyText] = stored.split("$");
  if (prefix !== PREFIX || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltText, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
