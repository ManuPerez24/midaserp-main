import { useState } from "react";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventory } from "@/stores/inventory";
import { useSettings } from "@/stores/settings";
import { generateQrDataUrl } from "@/lib/qr";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productIds: string[];
}

export function LabelsDialog({ open, onOpenChange, productIds }: Props) {
  const products = useInventory((s) => s.products);
  const settings = useSettings((s) => s.settings);
  const [copies, setCopies] = useState("1");
  const [busy, setBusy] = useState(false);

  const items = products.filter((p) => productIds.includes(p.id));

  const generate = async (action: "download" | "print") => {
    if (items.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }
    setBusy(true);
    try {
      const n = Math.max(1, parseInt(copies, 10) || 1);
      const labelItems = await Promise.all(
        items.map(async (p) => ({
          product: p,
          qrDataUrl: await generateQrDataUrl(`SKU:${p.sku}|NP:${p.partNumber || ""}`),
          copies: n,
        })),
      );
      const [{ pdf }, { LabelsPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/labels-pdf"),
      ]);
      const blob = await pdf(
        <LabelsPdfDocument items={labelItems} companyName={settings.issuer.companyName} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (action === "download") {
        const a = document.createElement("a");
        a.href = url;
        a.download = `etiquetas-${items.length}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("PDF de etiquetas descargado");
      } else {
        const w = window.open(url);
        if (w) w.onload = () => w.print();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar etiquetas");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imprimir etiquetas</DialogTitle>
          <DialogDescription>
            Hoja A4 con 24 etiquetas (3×8). Se generarán {items.length}{" "}
            {items.length === 1 ? "etiqueta" : "productos distintos"} × {copies || 1} copia(s).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Copias por producto</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
            />
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Cada etiqueta incluye QR (SKU + Nº de parte), nombre, SKU y proveedor.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={() => generate("print")} disabled={busy}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={() => generate("download")} disabled={busy}>
            <Download className="mr-2 h-4 w-4" /> Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
