import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sha256, unlockAjustes } from "@/lib/security";

export function AjustesPinGate({
  pinHash,
  onUnlock,
}: {
  pinHash: string;
  onUnlock: () => void;
}) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const h = await sha256(pin);
    setLoading(false);
    if (h === pinHash) {
      unlockAjustes();
      onUnlock();
      toast.success("Acceso concedido");
    } else {
      toast.error("PIN incorrecto");
      setPin("");
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Ajustes protegidos</h2>
          <p className="text-xs text-muted-foreground">
            Introduce el PIN para acceder a los ajustes.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>PIN</Label>
          <Input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
        </div>
        <Button type="submit" className="w-full" disabled={!pin || loading}>
          Desbloquear
        </Button>
      </form>
    </div>
  );
}
