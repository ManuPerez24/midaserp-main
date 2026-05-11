import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  prompt: z.string().max(10_000),
  context: z.string(),
  provider: z.enum(["openai", "custom"]).optional(),
  apiKey: z.string().max(500).optional(),
  model: z.string().max(200).optional(),
  baseUrl: z.string().url().max(500).optional(),
});

export const chatWithAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const provider = data.provider ?? "openai";
    const apiKey = data.apiKey?.trim();

    if (!apiKey) {
      return { ok: false as const, error: "Falta configurar la API Key de IA en los Ajustes." };
    }

    let customBase = data.baseUrl?.trim().replace(/\/+$/, "") || "";
    if (customBase.endsWith("/chat/completions")) {
      customBase = customBase.replace(/\/chat\/completions$/, "");
    }
    const endpoint =
      provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : customBase + "/chat/completions";

    const model = data.model?.trim() || "gpt-4o-mini";

    const systemPrompt = `Eres Midas AI, un asistente experto y analista de datos del sistema MIDAS ERP.
Se te proporcionará la base de datos actual en formato JSON (cotizaciones, clientes, inventario, kits).
Tu tarea es responder a la solicitud del usuario usando exclusivamente estos datos. 
Analiza la información, haz cálculos de sumas, promedios o recuentos si te lo piden, y presenta la respuesta de manera clara y profesional.

REGLA DE ENLACES OBLIGATORIA:
Siempre que menciones una Cotización, un Cliente, un Producto o un Kit, DEBES generar un enlace Markdown hacia el sistema para que el usuario pueda hacer clic. Usa las IDs o las rutas correctas:
- Cotizaciones: Folio (ej. COT-001)
- Clientes: Nombre del Cliente
- Productos: Nombre del Producto
- Kits: Nombre del Kit

DATOS DEL SISTEMA:
${data.context.slice(0, 100000)}`;

    const body = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: data.prompt }
      ],
    };

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return { ok: false as const, error: `Error HTTP: ${resp.status}` };
      const json = await resp.json();
      const text = json.choices?.[0]?.message?.content;
      if (!text) return { ok: false as const, error: "La IA no pudo generar una respuesta." };
      return { ok: true as const, text };
    } catch (e) {
      return { ok: false as const, error: "Falló la conexión con la API de IA." };
    }
  });

export const analyzeRejectionsWithAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    notes: z.array(z.string()),
    provider: z.enum(["openai", "custom"]).optional(),
    apiKey: z.string().max(500).optional(),
    model: z.string().max(200).optional(),
    baseUrl: z.string().url().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const provider = data.provider ?? "openai";
    const apiKey = data.apiKey?.trim();

    if (!apiKey) return { ok: false as const, error: "Falta configurar la API Key de IA en los Ajustes." };

    let customBase = data.baseUrl?.trim().replace(/\/+$/, "") || "";
    if (customBase.endsWith("/chat/completions")) {
      customBase = customBase.replace(/\/chat\/completions$/, "");
    }
    const endpoint =
      provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : customBase + "/chat/completions";

    const model = data.model?.trim() || "gpt-4o-mini";

    const body = {
      model,
      messages: [
        { role: "system", content: "Eres un experto analista de ventas. Analiza los siguientes motivos de rechazo de cotizaciones y extrae el sentimiento general y las palabras clave." },
        { role: "user", content: JSON.stringify(data.notes) }
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_rejection_analysis",
          parameters: {
            type: "object",
            properties: {
              avgScore: { type: "number", description: "Score de 0 a 100. 0 = quejas de precio/competencia (mal). 100 = pospuesto sin quejas (bien)." },
              topWords: { 
                type: "array", 
                items: { 
                  type: "object", 
                  properties: { 
                    text: { type: "string" }, 
                    value: { type: "number" } 
                  } 
                } 
              }
            },
            required: ["avgScore", "topWords"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "save_rejection_analysis" } }
    };

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return { ok: false as const, error: `Error HTTP: ${resp.status}` };
      const json = await resp.json();
      const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) return { ok: false as const, error: "La IA no devolvió datos estructurados" };
      return { ok: true as const, data: JSON.parse(argsStr) };
    } catch (e) {
      return { ok: false as const, error: "Falló la conexión con la API de IA." };
    }
  });

export const suggestCrossSellingWithAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    cart: z.array(z.object({ name: z.string() })),
    catalog: z.array(z.object({ id: z.string(), name: z.string(), category: z.string().optional() })),
    provider: z.enum(["openai", "custom"]).optional(),
    apiKey: z.string().max(500).optional(),
    model: z.string().max(200).optional(),
    baseUrl: z.string().url().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const provider = data.provider ?? "openai";
    const apiKey = data.apiKey?.trim();

    if (!apiKey) return { ok: false as const, error: "Falta configurar la API Key de IA en los Ajustes." };

    let customBase = data.baseUrl?.trim().replace(/\/+$/, "") || "";
    if (customBase.endsWith("/chat/completions")) {
      customBase = customBase.replace(/\/chat\/completions$/, "");
    }
    const endpoint =
      provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : customBase + "/chat/completions";

    const model = data.model?.trim() || "gpt-4o-mini";

    const body = {
      model,
      messages: [
        { role: "system", content: "Eres un experto en ventas cruzadas. El usuario tiene ciertos productos en su carrito. Revisa el catálogo disponible y sugiere hasta 5 IDs de productos que sean accesorios, complementos o relacionados lógicos para agregar a la venta. Devuelve SOLO los IDs del catálogo proporcionado que recomiendas." },
        { role: "user", content: `CARRITO:\n${JSON.stringify(data.cart)}\n\nCATÁLOGO:\n${JSON.stringify(data.catalog)}` }
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_cross_selling",
          parameters: {
            type: "object",
            properties: {
              recommendedIds: { 
                type: "array", 
                items: { type: "string" },
                description: "Array of product IDs from the catalog"
              }
            },
            required: ["recommendedIds"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "save_cross_selling" } }
    };

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return { ok: false as const, error: `Error HTTP: ${resp.status}` };
      const json = await resp.json();
      const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) return { ok: false as const, error: "La IA no devolvió datos estructurados" };
      return { ok: true as const, data: JSON.parse(argsStr) };
    } catch (e) {
      return { ok: false as const, error: "Falló la conexión con la API de IA." };
    }
  });