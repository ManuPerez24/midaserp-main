export const MATERIAL_CATEGORIES = [
  {
    name: "PLA (Ácido Poliláctico)",
    color: "bg-emerald-500",
    items: [
      { id: "PLA", name: "Básico" },
      { id: "PLA+", name: "Premium" },
      { id: "PLA Matte", name: "Matte" },
      { id: "PLA Silk", name: "Seda" },
      { id: "PLA HS", name: "Alta Vel." },
      { id: "PLA CF", name: "Fibra Carbono" },
      { id: "PLA Wood", name: "Madera" },
    ]
  },
  {
    name: "PETG",
    color: "bg-blue-500",
    items: [
      { id: "PETG", name: "Básico" },
      { id: "PETG HS", name: "Alta Vel." },
      { id: "PETG CF", name: "Fibra Carbono" },
    ]
  },
  {
    name: "ABS / ASA",
    color: "bg-rose-500",
    items: [
      { id: "ABS", name: "Básico" },
      { id: "ABS+", name: "Premium" },
      { id: "ASA", name: "Exteriores UV" },
    ]
  },
  {
    name: "Flexibles",
    color: "bg-amber-500",
    items: [
      { id: "TPU", name: "Básico" },
      { id: "TPU HS", name: "Alta Vel." },
    ]
  },
  {
    name: "Ingeniería / Especiales",
    color: "bg-purple-500",
    items: [
      { id: "PC", name: "Policarbonato" },
      { id: "Nylon", name: "Nylon (PA)" },
      { id: "PA-CF", name: "Nylon-CF" },
      { id: "HIPS", name: "HIPS" },
      { id: "PVA", name: "Soluble" },
    ]
  }
];

export const getSpoolColorHex = (color: string) => {
  const c = color.toLowerCase();
  
  // Efectos y Gradientes
  if (c.includes('arcoiris') || c.includes('rainbow') || c.includes('multicolor')) return 'linear-gradient(45deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7)';
  if (c.includes('camaleon') || c.includes('chameleon')) return 'linear-gradient(45deg, #a855f7, #3b82f6, #14b8a6)';
  if (c.includes('galaxia') || c.includes('galaxy')) return 'linear-gradient(45deg, #020617, #4c1d95, #1e3a8a)';
  if (c.includes('glow') || c.includes('luminiscente') || c.includes('fluorescente')) return '#d9f99d';
  if (c.includes('transparente') || c.includes('clear')) return 'transparent';
  if (c.includes('translucido') || c.includes('translucent')) return 'rgba(255, 255, 255, 0.4)';
  if (c.includes('marmol') || c.includes('marble')) return '#f3f4f6';
  
  // Metales
  if (c.includes('cobre') || c.includes('copper')) return '#b45309';
  if (c.includes('bronce') || c.includes('bronze')) return '#a16207';
  if (c.includes('oro') || c.includes('dorad') || c.includes('gold')) return '#eab308';
  if (c.includes('plata') || c.includes('silver')) return '#9ca3af';

  // Neutros / Básicos
  if (c.includes('blanc') || c.includes('white')) return '#ffffff';
  if (c.includes('negr') || c.includes('black')) return '#000000';
  if (c.includes('gris') || c.includes('grey') || c.includes('gray')) return '#6b7280';
  
  // Tonos Piel / Tierra
  if (c.includes('piel') || c.includes('flesh') || c.includes('nude') || c.includes('hueso') || c.includes('bone')) return '#fde68a';
  if (c.includes('madera claro') || c.includes('light wood')) return '#d97706';
  if (c.includes('madera oscuro') || c.includes('dark wood')) return '#713f12';
  if (c.includes('cafe') || c.includes('marr') || c.includes('madera') || c.includes('brown') || c.includes('wood')) return '#92400e';
  
  // Colores fríos
  if (c.includes('marino') || c.includes('navy')) return '#1e3a8a';
  if (c.includes('zafiro') || c.includes('sapphire')) return '#1d4ed8';
  if (c.includes('celeste') || c.includes('sky')) return '#38bdf8';
  if (c.includes('azul') || c.includes('blue')) return '#3b82f6';
  if (c.includes('cian') || c.includes('cyan') || c.includes('turquesa') || c.includes('turquoise')) return '#06b6d4';
  if (c.includes('teal')) return '#14b8a6';
  if (c.includes('menta') || c.includes('mint')) return '#34d399';
  if (c.includes('esmeralda') || c.includes('emerald')) return '#10b981';
  if (c.includes('lima') || c.includes('lime')) return '#84cc16';
  if (c.includes('oliva') || c.includes('olive')) return '#65a30d';
  if (c.includes('verd') || c.includes('green')) return '#22c55e';
  
  // Colores cálidos
  if (c.includes('mostaza') || c.includes('mustard')) return '#ca8a04';
  if (c.includes('amarill') || c.includes('yellow')) return '#facc15';
  if (c.includes('melocoton') || c.includes('peach')) return '#fdba74';
  if (c.includes('naranj') || c.includes('orange')) return '#f97316';
  if (c.includes('coral')) return '#fb7185';
  if (c.includes('vino') || c.includes('burgundy')) return '#831843';
  if (c.includes('rubi') || c.includes('ruby')) return '#be123c';
  if (c.includes('roj') || c.includes('red')) return '#ef4444';
  
  // Rosas y Morados
  if (c.includes('magenta')) return '#d946ef';
  if (c.includes('rosa') || c.includes('pink')) return '#f472b6';
  if (c.includes('lavanda') || c.includes('lavender')) return '#c084fc';
  if (c.includes('violeta') || c.includes('violet')) return '#8b5cf6';
  if (c.includes('morad') || c.includes('purpur') || c.includes('purple')) return '#a855f7';

  return 'transparent';
};

export const generateShortId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};