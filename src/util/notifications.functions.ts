import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const sendPushNotification = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      message: z.string(),
      telegramToken: z.string().optional().nullable(),
      telegramChatId: z.string().optional().nullable(),
      whatsappToken: z.string().optional().nullable(),
      whatsappPhone: z.string().optional().nullable(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const results = { telegram: false, whatsapp: false, errors: [] as string[] };

    // 1. Envío Inteligente por Telegram
    if (data.telegramToken && data.telegramChatId) {
      try {
        const url = `https://api.telegram.org/bot${data.telegramToken}/sendMessage`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: data.telegramChatId,
            text: data.message,
            parse_mode: "HTML",
          }),
        });

        if (response.ok) {
          results.telegram = true;
        } else {
          results.errors.push(`Telegram API Error: ${await response.text()}`);
        }
      } catch (error: any) {
        results.errors.push(`Telegram Network Error: ${error.message}`);
      }
    }

    // 2. Envío Empresarial por WhatsApp (Meta Cloud API)
    if (data.whatsappToken && data.whatsappPhone) {
      try {
        // Nota de Arquitectura: La API de Graph de Meta requiere el "Phone Number ID".
        // Por defecto usamos un placeholder, pero si es necesario puedes concatenarlo en el token
        // o extraerlo desde las variables de entorno en producción.
        const PHONE_NUMBER_ID = "TU_PHONE_NUMBER_ID";
        const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${data.whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: data.whatsappPhone.replace(/\+/g, ""), // Meta exige el número sin el '+'
            type: "text",
            text: { body: data.message },
          }),
        });

        if (response.ok) {
          results.whatsapp = true;
        } else {
          results.errors.push(`WhatsApp API Error: ${await response.text()}`);
        }
      } catch (error: any) {
        results.errors.push(`WhatsApp Network Error: ${error.message}`);
      }
    }

    return {
      success: results.telegram || results.whatsapp,
      results,
    };
  });