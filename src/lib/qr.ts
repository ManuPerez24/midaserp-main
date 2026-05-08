import QRCode from "qrcode";

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 256,
    errorCorrectionLevel: "M",
  });
}

export function quoteVerifyUrl(quoteId: string): string {
  if (typeof window === "undefined") return `/cotizaciones/${quoteId}`;
  return `${window.location.origin}/cotizaciones/${quoteId}`;
}
