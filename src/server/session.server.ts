import { useSession } from "@tanstack/react-start/server";

export interface SessionData {
  userId?: string;
  email?: string;
  name?: string;
  picture?: string;
  oauthState?: string;
}

export function getSessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET not configured");
  return {
    password,
    name: "midas-session",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    cookie: {
      httpOnly: true,
      // En localhost (http) usamos sameSite: "lax" sin secure.
      // En producción (https) usamos sameSite: "none" + secure para iframes.
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
      path: "/",
    },
  };
}

export async function getAppSession() {
  return useSession<SessionData>(getSessionConfig());
}
