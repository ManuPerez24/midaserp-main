import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { users } from "../server/db.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const KIND_LABEL: Record<string, string> = {
  info: "Información",
  success: "Éxito",
  warning: "Advertencia",
  error: "Error",
};

const KIND_COLOR: Record<string, string> = {
  info: "#0ea5e9",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

function renderHtml(kind: string, message: string, link?: string) {
  const color = KIND_COLOR[kind] ?? "#0ea5e9";
  const label = KIND_LABEL[kind] ?? "Notificación";
  const linkBlock = link
    ? `<p style="margin:24px 0 0;"><a href="${link}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;">Ver en MIDAS ERP</a></p>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
    <div style="background:${color};color:#fff;padding:18px 24px;font-size:14px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;">MIDAS ERP · ${label}</div>
    <div style="padding:28px 24px;color:#111;font-size:15px;line-height:1.55;">
      <p style="margin:0;">${escapeHtml(message)}</p>
      ${linkBlock}
    </div>
    <div style="padding:14px 24px;color:#888;font-size:12px;border-top:1px solid #eee;">Notificación automática · MIDAS ERP</div>
  </div>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const sendNotificationEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      kind: z.enum(["info", "success", "warning", "error"]),
      message: z.string().min(1).max(500),
      link: z.string().max(500).optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    if (!apiKey || !resendKey) {
      console.warn("[email] Missing keys, skipping notification email");
      return { sent: 0 };
    }

    const col = await users();
    const recipients = await col.find({}, { projection: { email: 1 } }).toArray();
    const emails = recipients.map((u) => u.email).filter(Boolean);
    if (emails.length === 0) return { sent: 0 };

    const subject = `[${KIND_LABEL[data.kind] ?? "Notificación"}] ${data.message.slice(0, 80)}`;
    const html = renderHtml(data.kind, data.message, data.link);

    let sent = 0;
    // Send individually to keep it simple and avoid leaking emails in "to" header
    await Promise.all(
      emails.map(async (to) => {
        try {
          const res = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "X-Connection-Api-Key": resendKey,
            },
            body: JSON.stringify({
              from: "MIDAS ERP <onboarding@resend.dev>",
              to: [to],
              subject,
              html,
            }),
          });
          if (res.ok) sent++;
          else console.warn("[email] failed", to, res.status, await res.text());
        } catch (err) {
          console.warn("[email] error", to, err);
        }
      }),
    );
    return { sent };
  });
