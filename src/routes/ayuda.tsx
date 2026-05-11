import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  HelpCircle,
  LayoutDashboard,
  Package,
  Boxes,
  FileText,
  Tag,
  Users,
  Bell,
  Settings as SettingsIcon,
  ShieldCheck,
  Lock,
  Search,
  Keyboard,
  Cloud,
  BookOpen,
  MousePointerClick,
  HardHat,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageGuard } from "@/components/page-guard";
import { useSettings } from "@/stores/settings";

export const Route = createFileRoute("/ayuda")({
  head: () => {
    const siteName = useSettings.getState().settings.branding.siteName;
    return {
      meta: [
        { title: `Ayuda · ${siteName}` },
        { name: "description", content: `Guía completa del sistema ${siteName}: páginas, funciones, permisos y atajos.` },
      ],
    };
  },
  component: () => (
    <PageGuard>
      <HelpPage />
    </PageGuard>
  ),
});

interface Feature {
  title: string;
  desc: string;
  permission?: string;
}

interface Section {
  id: string;
  title: string;
  icon: typeof HelpCircle;
  summary: string;
  features: Feature[];
  tips?: string[];
}

const getSections = (siteName: string): Section[] => [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    summary:
      `El centro de control de tu ERP ${siteName}. Ofrece un vistazo instantáneo al estado de tu negocio y te permite acceder a las acciones más comunes con un solo clic.`,
    features: [
      { title: "Resumen del negocio", desc: "Métricas principales como ventas del mes (calculando el total de cotizaciones aceptadas/cerradas), tasa de cierre y ticket promedio." },
      { title: "Accesos rápidos", desc: "Botones en la parte superior para saltar directamente a la creación de productos o cotizaciones." },
      { title: "Gráficas de rendimiento", desc: "Visualiza la tendencia de cotizaciones mes a mes y la distribución de estados (Pendiente, Aceptada, etc.)." },
      { title: "Top Clientes y Productos", desc: "Descubre rápidamente cuáles son los productos estrella y los clientes con mayor volumen de cotizaciones." },
    ],
  },
  {
    id: "inventario",
    title: "Inventario",
    icon: Package,
    summary: "Tu catálogo maestro. Aquí administras todo lo que vendes o compras, sus precios, imágenes y existencias conceptuales.",
    features: [
      { title: "Alta y edición de productos", desc: "Crea productos con nombre, SKU (se auto-genera si lo dejas vacío), número de parte, descripción, precio, moneda y unidad. Sube imágenes de hasta 1MB.", permission: "inventario:create / edit" },
      { title: "Menú Radial (Acciones rápidas)", desc: "Haz clic en cualquier parte de la fila de un producto para desplegar un menú con todas las opciones disponibles (Ver, Editar, Imprimir etiqueta, etc.)." },
      { title: "Uso de la Tarea Activa (+)", desc: "Si tienes una cotización o kit activo, verás un botón '+' junto a cada producto para añadirlo instantáneamente a tu documento sin salir del inventario." },
      { title: "Impresión de Etiquetas", desc: "Selecciona varios productos usando las casillas de la izquierda y haz clic en 'Etiquetas' para generar un PDF listo para imprimir con códigos QR y SKUs." },
      { title: "Histórico de precios", desc: "El sistema guarda automáticamente un registro de los cambios de precio de cada producto, mostrándote la variación en porcentaje y valor." },
      { title: "Carga masiva y limpieza", desc: "Puedes cargar productos de prueba o limpiar catálogos si tienes los permisos adecuados.", permission: "inventario:bulk" },
    ],
    tips: [
      "Presiona la tecla 'n' en tu teclado para abrir instantáneamente la ventana de nuevo producto.",
      "Usa el botón 'Analizar cot. IA' para poblar el inventario leyendo PDFs de tus proveedores automáticamente.",
    ],
  },
  {
    id: "kits",
    title: "Kits",
    icon: Boxes,
    summary: "Colecciones predefinidas de productos. Ideales para paquetes que siempre vendes juntos (por ejemplo, 'Kit de Instalación Básica').",
    features: [
      { title: "Creación de Kits", desc: "Define un nombre y una descripción. Un kit no contiene precio propio, sino que suma los precios de los productos que lo componen.", permission: "kits:create" },
      { title: "Activar un Kit (Edición)", desc: "Haz clic en 'Activar / editar' para poner el kit como 'Tarea Activa'. Luego, ve al Inventario y usa el botón '+' para llenarlo de productos.", permission: "kits:edit" },
      { title: "Inyectar a Cotización", desc: "Si estás armando una cotización (es tu Tarea Activa), ve a la pantalla de Kits y usa 'Inyectar a cotización activa'. Todos los productos se sumarán con un clic." },
      { title: "Cantidades editables", desc: "Dentro de los detalles del kit, puedes ajustar cuántas unidades de cada producto lo conforman." },
    ],
    tips: [
      "Usa kits para ahorrar tiempo. En lugar de buscar 10 productos de instalación uno por uno, agrupalos y usa 'Inyectar' una sola vez."
    ],
  },
  {
    id: "cotizaciones",
    title: "Cotizaciones",
    icon: FileText,
    summary: "El motor de ventas. Crea, edita, aplica descuentos, imprime PDFs profesionales y haz seguimiento.",
    features: [
      { title: "Creación ágil", desc: "Elige un cliente y el sistema asignará el siguiente folio disponible automáticamente.", permission: "cotizaciones:create" },
      { title: "Modo Edición (Activar)", desc: "Al activar una cotización, se muestra un banner superior. Ahora navega por Inventario o Kits y añade todo lo que necesites.", permission: "cotizaciones:edit" },
      { title: "Edición de contenido", desc: "Abre la opción 'Editar contenido' para ajustar precios, agregar descuentos por línea, o escribir líneas manuales (sin inventario)." },
      { title: "Descuentos y vigencia", desc: "Aplica un descuento global porcentual. Establece una fecha de vigencia; el sistema la marcará como 'VENCIDA' si expira." },
      { title: "Exportación a PDF", desc: "Genera el PDF formal para el cliente, o un 'PDF de logística' (sin precios) útil para los instaladores o el almacén." },
      { title: "Compras por Proveedor", desc: "Haz clic en 'Compras por proveedor'. El sistema agrupará las líneas de la cotización por proveedor y te dejará descargar un PDF de pedido para enviarle a cada uno." },
      { title: "Plantillas", desc: "Guarda combinaciones de líneas como Plantilla. Podrás aplicarla en el futuro a cualquier cotización nueva con 2 clics." },
      { title: "Enlace público y QR", desc: "Comparte el enlace web con el cliente. El PDF incluye un QR que, al escanearse, lleva a esta versión online para comprobar su autenticidad." },
    ],
  },
  {
    id: "cotizaciones-proveedores",
    title: "Cotizaciones de proveedores",
    icon: Tag,
    summary: "Automatiza el ingreso de productos leyendo los PDFs o imágenes que te envían tus proveedores usando Inteligencia Artificial.",
    features: [
      { title: "Extracción inteligente", desc: "Sube un archivo; la IA leerá la tabla, extraerá los números de parte, descripciones y precios unitarios automáticamente." },
      { title: "Match con inventario", desc: "El sistema cruzará la información extraída con tu inventario actual. Te dirá si el producto es 'Nuevo' o si hubo 'Cambio de precio'." },
      { title: "Corrección por Prompt", desc: "Si la IA se equivocó (ej. tomó el precio con IVA), puedes escribirle una instrucción y presionar 'Re-analizar'. Lo corregirá." },
      { title: "Retomar pendientes", desc: "Si aplicaste solo la mitad de los productos, la cotización quedará 'Parcial'. Puedes retomarla otro día para aplicar el resto." },
    ],
  },
  {
    id: "proyectos",
    title: "Proyectos",
    icon: HardHat,
    summary: "Gestiona desde el levantamiento de requerimientos hasta la ejecución y entrega final de los proyectos.",
    features: [
      { title: "Levantamientos", desc: "Toma notas, requerimientos técnicos y adjunta fotos de alta calidad desde el sitio de trabajo." },
      { title: "Vinculación de Cotizaciones", desc: "Conecta las cotizaciones aprobadas para calcular tu presupuesto base y visualizar la rentabilidad." },
      { title: "Consumo de Materiales", desc: "Usa la 'Tarea Activa' para retirar material del inventario gradualmente y cargarlo al costo del proyecto." },
    ],
  },
  {
    id: "clientes",
    title: "Clientes",
    icon: Users,
    summary: "Directorio de empresas y receptores para tus cotizaciones.",
    features: [
      { title: "Gestión de datos", desc: "Guarda la razón social (empresa), nombre del receptor, correo, teléfono y dirección.", permission: "clientes:create / edit" },
      { title: "Ficha 360° (Dashboard)", desc: "Al visualizar un cliente, verás su historial completo: total gastado, ticket promedio, tasa de cierre y sus productos top." },
      { title: "Mapa interactivo", desc: "Si ingresas una dirección, aparecerá un botón rápido para abrir la ubicación directamente en Google Maps." },
      { title: "Vinculación", desc: "Desde la ficha del cliente, puedes ver de inmediato todas sus cotizaciones e imprimir sus PDFs." },
    ],
  },
  {
    id: "recordatorios",
    title: "Recordatorios",
    icon: Bell,
    summary: "Pequeño CRM o lista de tareas para hacer seguimiento a tus clientes.",
    features: [
      { title: "Relación con cliente", desc: "Vincula un recordatorio a un cliente específico para saber a quién debes llamar o visitar.", permission: "recordatorios:create" },
      { title: "Gestión de vencimientos", desc: "Asigna una fecha límite. El sistema resaltará en rojo si está vencido o en naranja si es próximo." },
      { title: "Marcado rápido", desc: "Usa el check para dar por terminada la tarea. Quedará tachada en el historial.", permission: "recordatorios:edit" },
    ],
  },
  {
    id: "ajustes",
    title: "Ajustes",
    icon: SettingsIcon,
    summary: "Configuración y personalización del comportamiento y estética de todo el sistema. Solo accesible para Administradores.",
    features: [
      { title: "Branding (Marca)", desc: "Cambia el nombre, colores (primario y acento), logo y tema (claro/oscuro) de la aplicación." },
      { title: "Perfil fiscal", desc: "Los datos de tu empresa (RFC, dirección, IVA) que aparecerán en la cabecera de todas las cotizaciones." },
      { title: "Apariencia del PDF", desc: "Personaliza los colores del PDF, filas intercaladas (Zebra), tamaño A4 o Carta, y términos y condiciones." },
      { title: "Copias de seguridad", desc: "Exporta TODA la base de datos a un archivo JSON o restáurala. Ideal para llevar tus datos a otro equipo." },
      { title: "Limpieza inteligente", desc: "Botón que purga categorías, unidades y proveedores que ya no uses en ningún lado, manteniendo la base de datos limpia." },
      { title: "Personalización de Menú", desc: "Arrastra y suelta para reordenar los ítems del menú lateral izquierdo, o apaga los que no utilices." },
    ],
  },
  {
    id: "usuarios",
    title: "Usuarios y permisos",
    icon: ShieldCheck,
    summary: "Gestión de accesos y seguridad del sistema.",
    features: [
      { title: "Alta de usuarios", desc: "Crea cuentas con email y contraseña para tus colaboradores." },
      { title: "Roles y Permisos Granulares", desc: "A los usuarios normales puedes apagarles permisos como 'Borrar cotizaciones', 'Ver ajustes' o 'Crear productos'." },
      { title: "Reseteo de contraseña", desc: "Como admin, puedes cambiar la contraseña de cualquiera de los usuarios si la olvidan." },
    ],
    tips: [
      "Si un usuario no tiene permiso de página, no aparece en el menú lateral.",
    ],
  },
];

const getGlobalTopics = (siteName: string): Section[] => [
  {
    id: "guia-inicio",
    title: "Guía de Inicio Rápido",
    icon: BookOpen,
    summary: "Si eres nuevo, sigue estos pasos para crear tu primera cotización en menos de 2 minutos.",
    features: [
      { title: "Paso 1", desc: "Ve a la sección 'Clientes' y da de alta a tu primer prospecto o empresa." },
      { title: "Paso 2", desc: "Ve a 'Inventario' y crea un par de productos (o carga los 200 de prueba desde el Dashboard si aún no lo haces)." },
      { title: "Paso 3", desc: "Ve a 'Cotizaciones' y pulsa 'Nueva cotización'. Selecciona al cliente y presiona 'Crear y activar'." },
      { title: "Paso 4", desc: "¡La cotización ya está activa (mira el banner superior)! Ahora ve a Inventario, busca los productos y pulsa el botón '+' en cada uno para agregarlos." },
      { title: "Paso 5", desc: "Vuelve a 'Cotizaciones', busca la que creaste, ábrela y presiona 'Descargar PDF'. ¡Terminaste!" },
    ],
  },
  {
    id: "tareas",
    title: "La Tarea Activa (Modo Edición)",
    icon: FileText,
    summary:
      "El concepto más importante del sistema para hacer tu trabajo súper veloz.",
    features: [
      { title: "¿Qué es?", desc: "En lugar de buscar productos en un menú desplegable aburrido, al 'Activar' una cotización se bloquea en la parte superior. Ahora puedes navegar por todo el Inventario real usando filtros avanzados para sumar productos." },
      { title: "La píldora indicadora", desc: "Siempre sabrás qué estás editando viendo el botón en la cabecera (dice 'Cargando: COT-XXX' o 'Editando kit: XYZ')." },
      { title: "Cómo salir", desc: "Para dejar de editar, presiona la 'X' en la píldora superior o usa la opción 'Cerrar modo edición'." },
    ],
  },
  {
    id: "bloqueo",
    title: "Bloqueo y edición simultánea",
    icon: Lock,
    summary:
      "Mecanismo de seguridad colaborativo para evitar que dos personas sobreescriban la misma cotización.",
    features: [
      { title: "Protección en tiempo real", desc: "Al momento de que 'Activas' una cotización, el sistema le pone un candado a tu nombre a nivel global." },
      { title: "Qué ven los demás", desc: "Tus compañeros verán un letrero indicando 'Solo lectura. En edición por [Tu Nombre]'. No podrán agregarle productos ni borrarla hasta que termines." },
      { title: "Desbloqueo automático", desc: "El candado se libera instantáneamente si cierras sesión, cambias de tarea activa, o dejas de usar la aplicación por 5 minutos." },
    ],
  },
  {
    id: "navegacion",
    title: "Navegación y Menú Radial",
    icon: MousePointerClick,
    summary: `${siteName} está diseñado para ser ultra rápido y evitarte viajes con el ratón.`,
    features: [
      { title: "El Menú Radial", desc: "En cualquier tabla (Inventario, Cotizaciones, etc.), hacer clic izquierdo sobre el fondo de una fila despliega un círculo con todas las acciones posibles justo donde está tu ratón." },
      { title: "Clicks inteligentes", desc: "Para cerrar el menú radial, solo haz clic en cualquier zona vacía fuera del círculo." },
    ],
  },
  {
    id: "sync",
    title: "Sincronización en la nube",
    icon: Cloud,
    summary: "Todos los datos (productos, kits, cotizaciones, clientes, recordatorios) viven en la nube.",
    features: [
      { title: "Datos compartidos", desc: "Inventario, kits, cotizaciones, clientes y recordatorios son comunes a la organización." },
      { title: "Datos personales", desc: "Tarea activa, preferencias de UI y permisos son por usuario." },
      { title: "Auto-guardado", desc: "Cada cambio se persiste automáticamente con un debounce corto." },
    ],
  },
  {
    id: "atajos",
    title: "Atajos de teclado",
    icon: Keyboard,
    summary: "Acciones rápidas con teclado en toda la aplicación.",
    features: [
      { title: "N", desc: "Nuevo elemento en la página actual (producto, cotización, kit, cliente o recordatorio)." },
      { title: "/ o Ctrl+K", desc: "Abre la Paleta de Comandos interactiva para buscar y navegar rápidamente a cualquier parte." },
    ],
  },
  {
    id: "busqueda",
    title: "Paleta de Comandos (Búsqueda Global)",
    icon: Search,
    summary: "Navega rápidamente y encuentra cualquier producto, cotización, cliente o kit sin usar el ratón.",
    features: [
      { title: "Acceso rápido", desc: "Presiona la combinación de teclas Ctrl + K (o Cmd + K en Mac) desde cualquier parte del sistema, o haz clic en el icono de lupa en la barra superior." },
      { title: "Navegación veloz", desc: "Usa las flechas arriba (↑) y abajo (↓) del teclado para moverte por las opciones. Presiona Enter para entrar." },
      { title: "Comandos de navegación", desc: "Escribe 'Dashboard', 'Inventario', 'Cotizaciones' o 'Ajustes' para saltar instantáneamente a ese módulo." },
      { title: "Buscar Cotizaciones", desc: "Escribe el número de folio (ej. 'COT-001') o el nombre de un cliente para acceder a sus cotizaciones." },
      { title: "Buscar Inventario", desc: "Escribe el nombre, SKU o número de parte de cualquier producto para encontrarlo." },
      { title: "Buscar Clientes", desc: "Escribe el nombre, empresa o correo para localizar la ficha de un cliente." },
      { title: "Buscar Kits", desc: "Escribe el nombre de tu paquete prearmado para usarlo de inmediato." },
    ],
    tips: [
      "¡Acostúmbrate a presionar Ctrl + K! Te ahorrará muchísimos clics en tu día a día.",
      "No necesitas escribir la palabra completa, con las primeras letras el sistema encontrará los resultados más relevantes."
    ],
  },
];

function HelpPage() {
  const [query, setQuery] = useState("");
  const settings = useSettings((s) => s.settings);
  const siteName = settings.branding.siteName;

  const SECTIONS = useMemo(() => getSections(siteName), [siteName]);
  const GLOBAL_TOPICS = useMemo(() => getGlobalTopics(siteName), [siteName]);

  const filterSection = (s: Section): Section | null => {
    const q = query.toLowerCase().trim();
    if (!q) return s;
    const match = (txt: string) => txt.toLowerCase().includes(q);
    if (match(s.title) || match(s.summary)) return s;
    const features = s.features.filter((f) => match(f.title) || match(f.desc) || (f.permission && match(f.permission)));
    if (features.length === 0) return null;
    return { ...s, features };
  };

  const pages = useMemo(() => SECTIONS.map(filterSection).filter(Boolean) as Section[], [query, SECTIONS]);
  const topics = useMemo(() => GLOBAL_TOPICS.map(filterSection).filter(Boolean) as Section[], [query, GLOBAL_TOPICS]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <HelpCircle className="h-6 w-6 text-primary" /> Centro de ayuda
          </h1>
          <p className="text-sm text-muted-foreground">
            Guía completa del sistema {siteName}. Catálogo por páginas y funciones.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en la ayuda..."
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Páginas del sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin coincidencias.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {pages.map((s) => (
                <SectionItem key={s.id} section={s} />
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Temas globales</CardTitle>
        </CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin coincidencias.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {topics.map((s) => (
                <SectionItem key={s.id} section={s} />
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Glosario rápido</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Term name="SKU" desc="Identificador único de producto en tu inventario." />
          <Term name="Folio" desc="Número correlativo de cotización (configurable en Ajustes)." />
          <Term name="Tarea activa" desc="Cotización o kit en modo edición; recibe los productos que agregues desde Inventario." />
          <Term name="Kit" desc="Paquete reutilizable de productos con cantidades, para cotizar conjuntos rápidos." />
          <Term name="Bloqueo" desc="Reserva temporal de un recurso para edición exclusiva por un usuario." />
          <Term name="PDF logística" desc="PDF de cotización sin precios, ideal para almacén o entrega." />
          <Term name="Permiso de página" desc="Permite ver el ítem en el menú lateral y abrir la página por URL." />
          <Term name="Heartbeat" desc="Renovación automática del bloqueo mientras editas." />
        </CardContent>
      </Card>
    </div>
  );
}

function SectionItem({ section }: { section: Section }) {
  const Icon = section.icon;
  return (
    <AccordionItem value={section.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2 text-left">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-medium">{section.title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{section.summary}</p>
        <ul className="space-y-2">
          {section.features.map((f) => (
            <li key={f.title} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm">{f.title}</span>
                {f.permission && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {f.permission}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
            </li>
          ))}
        </ul>
        {section.tips && section.tips.length > 0 && (
          <div className="rounded-md border border-dashed bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tips
            </div>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {section.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function Term({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-sm font-semibold">{name}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
