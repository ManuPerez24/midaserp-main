export async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SESSION_KEY = "midas:ajustes:unlocked";

export function isAjustesUnlocked(): boolean {
  if (typeof sessionStorage === "undefined") return true;
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function unlockAjustes() {
  sessionStorage.setItem(SESSION_KEY, "1");
}

export function lockAjustes() {
  sessionStorage.removeItem(SESSION_KEY);
}
