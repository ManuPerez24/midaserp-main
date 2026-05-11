import type { Quote, Product, Client } from "@/lib/types";

const STOP_WORDS = new Set(["de","la","el","en","y","a","los","que","por","para","con","las","un","una","o","no","del","al","se","es","lo","como","más","pero","sus","le","ya","porque","muy","sin","sobre","este","también","me","hasta","hay","donde","quien","desde","todo","nos","durante","todos","uno","les","ni","contra","otros","ese","eso","ante","ellos","esto","mí","antes","algunos","qué","unos","yo","otro","otras","otra","él","tanto","esa","estos","mucho","quienes","nada","muchos","cual","poco","ella","estar","estas","algunas","algo","nosotros","mi","mis","tú","te","ti","tu","tus","ellas","nosotras","vosotros","vosotras","os","mío","mía","míos","mías","tuyo","tuya","tuyos","tuyas","suyo","suya","suyos","suyas","nuestro","nuestra","nuestros","nuestras","vuestro","vuestra","vuestros","vuestras","esos","esas"]);

export function extractRejectionReasons(quotes: Quote[]) {
  const rejected = quotes.filter((q) => q.status === "Rechazada");
  let totalScore = 0;
  let reasonsCount = 0;
  const wordFreq: Record<string, number> = {};

  const negativeWords = ["caro", "precio", "competencia", "tarde", "tiempo", "demora", "mal", "peor", "lento", "descuento", "alto", "costoso", "presupuesto"];
  const neutralWords = ["proyecto", "cancelado", "pausado", "pospuesto", "standby", "pausa"];

  rejected.forEach((q) => {
    const match = q.notes?.match(/Motivo de rechazo:\s*(.+)/i);
    if (match && match[1]) {
      const reason = match[1].toLowerCase();
      reasonsCount++;
      let score = 50; // default neutral
      
      const words = reason.split(/\W+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
      words.forEach(w => {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
        if (negativeWords.includes(w)) score -= 20;
        if (neutralWords.includes(w)) score += 10;
      });
      totalScore += Math.max(0, Math.min(100, score));
    }
  });

  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([text, value]) => ({ text, value }));

  const avgScore = reasonsCount > 0 ? totalScore / reasonsCount : null;
  return { avgScore, topWords, reasonsCount };
}

export function getCrossSellingSuggestions(lines: any[], products: Product[]): Product[] {
  if (lines.length === 0) return [];
  const cartKeywords = new Set<string>();
  lines.forEach(l => {
    l.name.toLowerCase().split(/\W+/).forEach((w: string) => {
      if (w.length > 3) cartKeywords.add(w);
    });
  });

  const cartProductIds = new Set(lines.map(l => l.productId));

  const scoredProducts = products.map(p => {
    let score = 0;
    const nameLower = p.name.toLowerCase();
    const catLower = (p.categories?.join(" ") || p.category || "").toLowerCase();
    
    if (cartKeywords.has("sensor") && (nameLower.includes("cable") || nameLower.includes("conector") || nameLower.includes("soporte"))) score += 15;
    if ((cartKeywords.has("camara") || cartKeywords.has("cámara")) && (nameLower.includes("dvr") || nameLower.includes("disco") || nameLower.includes("fuente") || nameLower.includes("balun") || nameLower.includes("cable"))) score += 15;
    if (cartKeywords.has("motor") && (nameLower.includes("contactor") || nameLower.includes("relevador") || nameLower.includes("guardamotor") || nameLower.includes("variador"))) score += 15;
    if ((cartKeywords.has("panel") || cartKeywords.has("solar")) && (nameLower.includes("inversor") || nameLower.includes("bateria") || nameLower.includes("batería") || nameLower.includes("conector") || nameLower.includes("estructura"))) score += 15;

    lines.forEach(l => {
       const cartProd = products.find(cp => cp.id === l.productId);
       if (cartProd && cartProd.category && catLower.includes(cartProd.category.toLowerCase())) {
         score += 2;
       }
    });

    return { product: p, score };
  });

  return scoredProducts
    .filter(sp => sp.score >= 5 && !cartProductIds.has(sp.product.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(sp => sp.product);
}

export function getStockOutPredictions(quotes: Quote[], products: Product[]) {
  // Consideramos las cotizaciones de los últimos 90 días para sacar un promedio de consumo diario
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  const validQuotes = quotes.filter((q) => 
    (q.status === "Aceptada" || q.status === "Cerrada") && 
    new Date(q.createdAt) >= ninetyDaysAgo
  );

  const consumedMap: Record<string, number> = {};
  
  validQuotes.forEach((q) => {
    q.lines.forEach((l) => {
      consumedMap[l.productId] = (consumedMap[l.productId] || 0) + l.quantity;
    });
  });

  const predictions: Array<{ product: Product, daysLeft: number, dailyConsumption: number }> = [];

  products.forEach((p) => {
    if (p.stock !== undefined) {
      const consumedIn90Days = consumedMap[p.id] || 0;
      if (consumedIn90Days > 0) {
        const dailyConsumption = consumedIn90Days / 90;
        const daysLeft = p.stock / dailyConsumption;
        
        // Solo alertamos si se agotará en 45 días o menos, o si ya se agotó
        if (daysLeft <= 45 || p.stock <= 0) {
          predictions.push({ product: p, daysLeft: p.stock <= 0 ? 0 : Math.round(daysLeft), dailyConsumption: Number(dailyConsumption.toFixed(2)) });
        }
      } else if (p.stock <= 0 && p.minStock !== undefined && p.minStock > 0) {
          // Si no tiene historial de ventas pero el stock está en 0 y tiene un mínimo configurado, alertamos
          predictions.push({ product: p, daysLeft: 0, dailyConsumption: 0 });
      }
    }
  });

  return predictions.sort((a, b) => a.daysLeft - b.daysLeft);
}