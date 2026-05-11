import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Trash2, Minimize2, Maximize2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAi } from "@/util/chat.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuotes } from "@/stores/quotes";
import { useClients } from "@/stores/clients";
import { useInventory } from "@/stores/inventory";
import { useKits } from "@/stores/kits";
import { useSettings } from "@/stores/settings";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

function renderMessage(text: string) {
  // Convertimos los enlaces Markdown texto en componentes Link interactivos
  const linkParts = text.split(/(\[.*?\]\(.*?\))/g);
  return linkParts.map((part, i) => {
    const match = part.match(/\[(.*?)\]\((.*?)\)/);
    if (match) {
      return (
        <Link key={i} to={match[2] as any} className="text-primary hover:underline font-bold">
          {match[1]}
        </Link>
      );
    }
    // También renderizamos los textos en negrita **texto**
    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={i}>
        {boldParts.map((bp, j) => {
          const bMatch = bp.match(/\*\*(.*?)\*\*/);
          if (bMatch) return <strong key={j}>{bMatch[1]}</strong>;
          return <span key={j} className="whitespace-pre-wrap">{bp}</span>;
        })}
      </span>
    );
  });
}

export function GlobalChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>(() => {
    try {
      const saved = sessionStorage.getItem("midas_chat");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        role: "ai",
        text: "¡Hola! Soy Midas AI. Tengo acceso a tu inventario, clientes, kits y cotizaciones. ¿Qué necesitas saber hoy?",
      },
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quotes = useQuotes((s) => s.quotes);
  const clients = useClients((s) => s.clients);
  const products = useInventory((s) => s.products);
  const kits = useKits((s) => s.kits);
  const settings = useSettings((s) => s.settings);
  const chat = useServerFn(chatWithAi);

  useEffect(() => {
    sessionStorage.setItem("midas_chat", JSON.stringify(messages));
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isMinimized]);

  const clearChat = () => {
    setMessages([
      {
        role: "ai",
        text: "¡Hola! Soy Midas AI. Tengo acceso a tu inventario, clientes, kits y cotizaciones. ¿Qué necesitas saber hoy?",
      },
    ]);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    // Compilamos todo el conocimiento de la base de datos para la IA
    const dbContext = {
      cotizaciones: quotes.map((x) => ({
        id: x.id, folio: x.folio, estado: x.status, fecha: x.createdAt.slice(0, 10),
        cliente: clients.find((c) => c.id === x.clientId)?.receiver || "Desconocido",
        total: x.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0),
        productos: x.lines.map((l) => ({ nombre: l.name, cantidad: l.quantity })),
      })),
      clientes: clients.map(c => ({ id: c.id, nombre: c.receiver, empresa: c.company })),
      inventario: products.map(p => ({ id: p.id, nombre: p.name, sku: p.sku, precio: p.price, moneda: p.currency, stock: p.stock })),
      kits: kits.map(k => ({ id: k.id, nombre: k.name, items: k.items.length })),
    };

    try {
      const res = await chat({
        data: {
          prompt: q, context: JSON.stringify(dbContext),
          provider: settings.ai?.provider, apiKey: settings.ai?.apiKey, model: settings.ai?.model, baseUrl: settings.ai?.baseUrl,
        },
      });
      const ans = res.ok ? res.text : `⚠️ Error: ${res.error}`;
      setMessages((prev) => [...prev, { role: "ai", text: ans }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "ai", text: "⚠️ Error de conexión con la IA." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 animate-bounce hover:animate-none" onClick={() => { setIsOpen(true); setIsMinimized(false); }}>
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={cn("fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-50 shadow-2xl flex flex-col transition-all duration-300 border-primary/20", isMinimized ? "h-14 w-[300px]" : "h-[500px] w-[360px] sm:w-[400px]")}>
      <CardHeader className="py-3 px-4 border-b bg-primary text-primary-foreground rounded-t-xl shrink-0 cursor-pointer flex flex-row items-center justify-between space-y-0" onClick={() => setIsMinimized(!isMinimized)}>
        <CardTitle className="text-base flex items-center gap-2"><Bot className="h-5 w-5" /> Midas AI</CardTitle>
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          {!isMinimized && (<Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary/80" onClick={clearChat} title="Limpiar chat"><Trash2 className="h-4 w-4" /></Button>)}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary/80" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? "Maximizar" : "Minimizar"}>{isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary/80" onClick={() => setIsOpen(false)} title="Cerrar"><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      {!isMinimized && (
        <>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                  {renderMessage(m.text)}
                </div>
              </div>
            ))}
            {loading && (<div className="flex justify-start"><div className="bg-card border rounded-xl px-3 py-2 flex gap-1 items-center shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"></span><span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0.15s" }}></span><span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0.3s" }}></span></div></div>)}
          </CardContent>
          <div className="p-3 border-t bg-card shrink-0 rounded-b-xl">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pregúntale al asistente..." className="flex-1" disabled={loading} />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}