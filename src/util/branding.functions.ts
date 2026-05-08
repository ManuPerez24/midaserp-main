import { createServerFn } from "@tanstack/react-start";
import { userData } from "../server/db.server";

export const getPublicBranding = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const col = await userData();
    const docs = await col
      .find({ userId: "__shared__", store: { $in: ["midas:v1:settings", "midas:v1:inventory"] } })
      .toArray();
    const settings = docs.find((d) => d.store === "midas:v1:settings")?.data?.settings;
    const inventory = docs.find((d) => d.store === "midas:v1:inventory")?.data;
    const products: any[] = inventory?.products ?? [];
    const partNumbers = products
      .map((p) => String(p?.partNumber ?? "").trim())
      .filter(Boolean)
      .slice(0, 40);
    return {
      siteName: settings?.branding?.siteName ?? "MIDAS ERP",
      siteTagline: settings?.branding?.siteTagline ?? null,
      logoDataUrl: settings?.issuer?.logoDataUrl ?? null,
      partNumbers,
    };
  } catch {
    return { siteName: "MIDAS ERP", siteTagline: null, logoDataUrl: null, partNumbers: [] };
  }
});
