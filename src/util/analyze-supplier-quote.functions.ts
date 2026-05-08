import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_AI_SYSTEM_PROMPT, DEFAULT_AI_USER_PROMPT } from "@/lib/ai-prompts";

const InputSchema = z.object({
  text: z.string().max(200_000).optional(),
  imageDataUrl: z.string().max(15_000_000).optional(), // base64 data URL
  supplierHint: z.string().max(200).optional(),
  provider: z.enum(["lovable", "openai", "custom"]).optional(),
  apiKey: z.string().max(500).optional(),
  model: z.string().max(200).optional(),
  baseUrl: z.string().url().max(500).optional(),
  systemPrompt: z.string().max(10_000).optional(),
  userPrompt: z.string().max(10_000).optional(),
});

const ItemSchema = z.object({
  partNumber: z.string().default(""),
  name: z.string().default(""),
  description: z.string().optional().default(""),
  price: z.number().nonnegative().default(0),
  currency: z.enum(["MXN", "USD"]).default("MXN"),
  unit: z.string().optional().default("PIEZA"),
  quantity: z.number().nonnegative().optional().default(1),
});

// --- INSTRUCCIONES DEL SISTEMA REFORZADAS ---
const SYSTEM = `Eres un experto en extracción de datos técnicos. 
Tu objetivo es transcribir cotizaciones con precisión quirúrgica.

REGLAS DE ORO:
1. FIDELIDAD TOTAL: No inventes números de parte ni precios. Si no es legible, no lo inventes.
2. NÚMEROS DE PARTE: 
   - Prioriza números de parte del fabricante (ej. ZSE20F-P-01-L).
   - Ignora el formato [NNNNNN] (6 dígitos entre corchetes) como número de parte; trátalo como SKU interno si es necesario, pero no lo pongas en 'partNumber' si hay uno mejor.
3. MONEDA: 
   - Detecta MXN si ves "IVA(8%)", "IVA(16%)", "M.N." o "Peso". 
   - Detecta USD si se especifica explícitamente. Por defecto usa MXN.
4. NORMALIZACIÓN: Unidades siempre en MAYÚSCULAS y singular (PIEZA, METRO, SERVICIO).`;

export const analyzeSupplierQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const provider = data.provider ?? "lovable";
    const userKey = data.apiKey?.trim();
    const apiKey = userKey || (provider === "lovable" ? process.env.LOVABLE_API_KEY : undefined);
    
    const systemPrompt = data.systemPrompt?.trim() || DEFAULT_AI_SYSTEM_PROMPT;
    const rawUserPrompt = data.userPrompt?.trim() || DEFAULT_AI_USER_PROMPT;
    const supplierHint = data.supplierHint?.trim();
    const userPrompt = supplierHint
      ? rawUserPrompt.replace(/{{supplierHint}}/g, ` del proveedor "${supplierHint}"`)
      : rawUserPrompt.replace(/{{supplierHint}}/g, "");

    if (!apiKey) {
      return {
        ok: false as const,
        error: provider === "lovable" 
          ? "LOVABLE_API_KEY no configurado." 
          : "Falta API Key.",
      };
    }

    const endpoint =
      provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : provider === "custom"
          ? (data.baseUrl?.replace(/\/+$/, "") || "") + "/chat/completions"
          : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const model = data.model?.trim() || (provider === "openai" ? "gpt-4o-mini" : "google/gemini-2.0-flash");

    if (!data.text && !data.imageDataUrl) {
      return { ok: false as const, error: "Proporciona texto o imagen" };
    }

    const userContent: Array<Record<string, unknown>> = [];

    if (data.text) {
      userContent.push({ type: "text", text: `Texto de la cotización:\n\n${data.text}` });
    }
    if (data.imageDataUrl) {
      userContent.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }

    const body = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        { role: "user", content: userContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_quote_items",
            description: "Guarda los productos extraídos de la cotización de forma estructurada",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      partNumber: { type: "string", description: "Número de parte del fabricante (ej: ZSE20-P-01)" },
                      name: { type: "string", description: "Nombre corto del producto" },
                      description: { type: "string", description: "Descripción completa" },
                      price: { type: "number", description: "Precio unitario sin impuestos" },
                      currency: { type: "string", enum: ["MXN", "USD"] },
                      unit: { type: "string", description: "PIEZA, METRO, etc." },
                      quantity: { type: "number" },
                    },
                    required: ["partNumber", "name", "price", "currency"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_quote_items" } },
    };

    // ... (resto de la lógica de fetch y manejo de respuesta se mantiene igual)
    let resp: Response;
    try {
      resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return { ok: false as const, error: "No se pudo conectar a la IA" };
    }

    if (!resp.ok) return { ok: false as const, error: `Error IA (${resp.status})` };

    const json = await resp.json();
    const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    
    if (!argsStr) return { ok: false as const, error: "La IA no devolvió datos estructurados" };

    try {
      const parsed = JSON.parse(argsStr);
      const items = (parsed.items ?? []).map((it: any) => ItemSchema.parse(it));
      return { ok: true as const, items };
    } catch (e) {
      return { ok: false as const, error: "Error al procesar los datos finales" };
    }
  });