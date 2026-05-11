import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onScan: (code: string) => void;
}

export function BarcodeScannerDialog({ open, onOpenChange, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let interval: number;

    const start = async () => {
      try {
        if (!("BarcodeDetector" in window)) {
          setError("Tu navegador no soporta el escáner nativo. Usa Chrome en Android, macOS o Windows.");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          const detector = new (window as any).BarcodeDetector();
          
          interval = window.setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  onScan(barcodes[0].rawValue);
                  onOpenChange(false);
                }
              } catch (err) {
                console.error(err);
              }
            }
          }, 500);
        }
      } catch (err) {
        setError("No se pudo acceder a la cámara. Revisa los permisos de tu navegador.");
      }
    };

    start();

    return () => {
      if (interval) clearInterval(interval);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear código</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video rounded-md overflow-hidden bg-black flex items-center justify-center">
          {error ? (
            <p className="text-destructive text-sm text-center px-4">{error}</p>
          ) : (
            <>
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 border-2 border-primary/50 m-12 rounded-lg pointer-events-none" />
              <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Apunta la cámara al código de barras o QR de tu producto.
        </p>
      </DialogContent>
    </Dialog>
  );
}