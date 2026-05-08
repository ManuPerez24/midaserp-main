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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageGuard } from "@/components/page-guard";

export const Route = createFileRoute("/ayuda")({
  head: () => ({
    meta: [
      { title: "Ayuda · MIDAS ERP" },
      { name: "description", content: "Guía completa del sistema MIDAS ERP: páginas, funciones, permisos y atajos." },
    ],
  }),
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

const SECTIONS: Section[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    summary:
      "Vista inicial con métricas clave: cotizaciones recientes, ventas, kits más usados y accesos rápidos.",
    features: [
      { title: "Resumen del negocio", desc: "Totales por moneda, cotizaciones por estado y actividad reciente." },
      { title: "Accesos rápidos", desc: "Botones para crear cotización, kit o registrar producto sin navegar entre páginas." },
    ],
  },
  {
    id: "inventario",
    title: "Inventario",
    icon: Package,
    summary: "Catálogo central de productos con SKU, número de parte, precio, moneda, proveedor y categorías.",
    features: [
      { title: "Crear / editar / eliminar productos", desc: "Alta individual con SKU único, descripción y multi-moneda.", permission: "inventario:create / edit / delete" },
      { title: "Carga masiva", desc: "Importar productos desde CSV o pegando filas.", permission: "inventario:bulk" },
      { title: "Análisis con IA", desc: "Analiza una cotización de proveedor para extraer productos automáticamente.", permission: "inventario:analyze" },
      { title: "Etiquetas e historial", desc: "Genera etiquetas imprimibles y revisa el historial de cambios por producto." },
      { title: "Filtros", desc: "Filtra por categoría (multi), proveedor y moneda. Búsqueda por SKU/nombre/PN." },
      { title: "Agregar a tarea activa", desc: "Si tienes una cotización o kit activo, suma productos con un clic indicando cantidad." },
    ],
    tips: [
      "Usa la tecla N para abrir el formulario de nuevo producto rápidamente.",
      "Las categorías se autocompletan con las que ya existen en otros productos.",
    ],
  },
  {
    id: "kits",
    title: "Kits",
    icon: Boxes,
    summary: "Paquetes reutilizables de productos para cotizar combinaciones frecuentes con un clic.",
    features: [
      { title: "Crear kit", desc: "Define nombre, descripción y arma su lista de productos.", permission: "kits:create" },
      { title: "Activar kit", desc: "Pone el kit en modo edición; al pulsar productos en Inventario se añaden al kit.", permission: "kits:edit" },
      { title: "Inyectar a cotización", desc: "Con una cotización activa, inserta todos los productos del kit en sus cantidades." },
      { title: "Eliminar / edición masiva", desc: "Borra kits o quita ítems individuales desde el detalle.", permission: "kits:delete" },
      { title: "Bloqueo colaborativo", desc: "Mientras un usuario edita un kit, el resto lo ve en solo lectura con aviso del propietario." },
    ],
  },
  {
    id: "cotizaciones",
    title: "Cotizaciones",
    icon: FileText,
    summary: "Gestor completo de cotizaciones con folios automáticos, plantillas, PDF y enlace público.",
    features: [
      { title: "Crear cotización", desc: "Selecciona cliente; el folio se asigna automáticamente desde Ajustes.", permission: "cotizaciones:create" },
      { title: "Editar líneas", desc: "Activa la cotización para añadir productos desde Inventario o inyectar kits.", permission: "cotizaciones:edit" },
      { title: "Modificar metadatos", desc: "Cambia cliente, vigencia, descuentos por línea o globales, notas y comentarios." },
      { title: "Plantillas", desc: "Guarda combinaciones de líneas como plantilla y aplícalas a nuevas cotizaciones." },
      { title: "Cambio de estado", desc: "Borrador, Enviada, Aceptada, Rechazada, Cerrada. Cada cambio queda en la línea de tiempo.", permission: "cotizaciones:status" },
      { title: "PDF de cliente y logística", desc: "Descarga PDF normal (con precios) o de logística (sin precios) listo para almacén." },
      { title: "PDFs de compras por proveedor", desc: "Genera un PDF separado por cada proveedor con los productos a comprar." },
      { title: "Enlace público + QR", desc: "Comparte un link público con el cliente. El PDF incluye QR para verificación." },
      { title: "Eliminar", desc: "Borra cotizaciones (con confirmación). Acción auditada.", permission: "cotizaciones:delete" },
      { title: "Bloqueo colaborativo", desc: "Solo un usuario puede editar a la vez; los demás ven la cotización en solo lectura con aviso." },
    ],
  },
  {
    id: "cotizaciones-proveedores",
    title: "Cotizaciones de proveedores",
    icon: Tag,
    summary: "Sube cotizaciones de proveedores y extrae productos con IA para alimentar el inventario.",
    features: [
      { title: "Subir PDF / imagen", desc: "Adjunta el documento del proveedor; la IA extrae SKU, descripción y precio." },
      { title: "Revisar y confirmar", desc: "Edita los productos detectados antes de importarlos al inventario." },
      { title: "Historial", desc: "Conserva la lista de archivos analizados para consulta posterior." },
    ],
  },
  {
    id: "clientes",
    title: "Clientes",
    icon: Users,
    summary: "Directorio de clientes con datos fiscales y recordatorios asociados.",
    features: [
      { title: "Alta / edición", desc: "Razón social o persona, RFC, dirección, teléfono y notas.", permission: "clientes:create / edit" },
      { title: "Recordatorios por cliente", desc: "Crea, completa o elimina recordatorios desde la ficha del cliente." },
      { title: "Historial de cotizaciones", desc: "Ve todas las cotizaciones asociadas a un cliente desde su detalle." },
      { title: "Eliminar", desc: "Borra clientes (con confirmación).", permission: "clientes:delete" },
    ],
  },
  {
    id: "recordatorios",
    title: "Recordatorios",
    icon: Bell,
    summary: "Tareas pendientes con fecha, prioridad y vínculo opcional a un cliente.",
    features: [
      { title: "Crear recordatorio", desc: "Título, fecha, prioridad y cliente opcional.", permission: "recordatorios:create" },
      { title: "Marcar completado", desc: "Tilda el checkbox para cerrarlo; aparece tachado.", permission: "recordatorios:complete" },
      { title: "Eliminar", desc: "Borra recordatorios obsoletos.", permission: "recordatorios:delete" },
    ],
  },
  {
    id: "ajustes",
    title: "Ajustes",
    icon: SettingsIcon,
    summary: "Configuración global: marca, emisor fiscal, PDF, folios, monedas, menú lateral.",
    features: [
      { title: "Branding", desc: "Nombre, color primario, color de acento, modo claro/oscuro, fondo decorativo." },
      { title: "Datos del emisor", desc: "Razón social, RFC, dirección, IVA, logo (usado en PDFs)." },
      { title: "Personalización del PDF", desc: "Color de cabecera, zebrado, footer, tamaño de página, mostrar QR, términos de pago." },
      { title: "Folio de cotizaciones", desc: "Prefijo, número siguiente y padding (ceros a la izquierda)." },
      { title: "Listas maestras", desc: "Unidades, categorías y proveedores reutilizables en inventario." },
      { title: "Menú lateral", desc: "Reordena, oculta o renombra los ítems de navegación. Restaurar a valores por defecto disponible." },
    ],
  },
  {
    id: "usuarios",
    title: "Usuarios y permisos",
    icon: ShieldCheck,
    summary: "Gestión de cuentas, contraseñas y permisos granulares por página y acción.",
    features: [
      { title: "Crear usuario", desc: "Email, nombre, contraseña inicial y rol (admin o no)." },
      { title: "Editor de permisos", desc: "Activa o desactiva permisos individuales por usuario (página, crear, editar, eliminar, etc.)." },
      { title: "Cambiar contraseña", desc: "Tanto admin (de cualquier usuario) como cada usuario para sí mismo." },
      { title: "Eliminar usuario", desc: "Solo admin. La sesión del usuario eliminado se invalida." },
      { title: "Inicio con Google", desc: "Si está configurado, permite login con cuenta Google vinculada al email." },
    ],
    tips: [
      "Los administradores ven todos los permisos automáticamente concedidos.",
      "Si un usuario no tiene permiso de página, no aparece en el menú lateral.",
    ],
  },
];

const GLOBAL_TOPICS: Section[] = [
  {
    id: "bloqueo",
    title: "Bloqueo y edición simultánea",
    icon: Lock,
    summary:
      "Cotizaciones y kits son compartidos entre todos los usuarios; solo uno puede editar a la vez.",
    features: [
      { title: "Adquirir bloqueo", desc: "Al activar Editar líneas de una cotización o Activar un kit, el sistema reserva el recurso." },
      { title: "Solo lectura para los demás", desc: "Los otros usuarios ven un banner ámbar con el nombre de quien edita y los controles deshabilitados." },
      { title: "Heartbeat automático", desc: "Mientras editas, el bloqueo se renueva cada minuto." },
      { title: "Liberación", desc: "Al pulsar Cerrar modo edición, al cerrar sesión, o automáticamente tras 5 min de inactividad." },
      { title: "Forzar desbloqueo (admin)", desc: "Los administradores pueden liberar el bloqueo de otro usuario desde el banner." },
    ],
  },
  {
    id: "tareas",
    title: "Tarea activa (cotización o kit)",
    icon: FileText,
    summary:
      "Una sola cotización o kit puede estar 'activo' a la vez. Define a dónde se añaden los productos del Inventario.",
    features: [
      { title: "Indicador en el header", desc: "Una píldora arriba muestra cuál es la tarea activa con enlace para volver." },
      { title: "Cambiar de tarea", desc: "Activar otra cotización o kit pide confirmación y libera la anterior." },
      { title: "Persistencia", desc: "La tarea activa se guarda en la nube por usuario y se restaura al iniciar sesión." },
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
      { title: "/ o Ctrl+K", desc: "Abrir búsqueda global." },
    ],
  },
  {
    id: "busqueda",
    title: "Búsqueda global",
    icon: Search,
    summary: "Encuentra cualquier producto, cotización, cliente o kit desde cualquier pantalla.",
    features: [
      { title: "Acceso", desc: "Icono de búsqueda en el header o atajo Ctrl+K." },
      { title: "Resultados agrupados", desc: "Por tipo de entidad. Pulsa Enter para abrir el primero." },
    ],
  },
];

function HelpPage() {
  const [query, setQuery] = useState("");

  const filterSection = (s: Section): Section | null => {
    const q = query.toLowerCase().trim();
    if (!q) return s;
    const match = (txt: string) => txt.toLowerCase().includes(q);
    if (match(s.title) || match(s.summary)) return s;
    const features = s.features.filter((f) => match(f.title) || match(f.desc) || (f.permission && match(f.permission)));
    if (features.length === 0) return null;
    return { ...s, features };
  };

  const pages = useMemo(() => SECTIONS.map(filterSection).filter(Boolean) as Section[], [query]);
  const topics = useMemo(() => GLOBAL_TOPICS.map(filterSection).filter(Boolean) as Section[], [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <HelpCircle className="h-6 w-6 text-primary" /> Centro de ayuda
          </h1>
          <p className="text-sm text-muted-foreground">
            Guía completa del sistema MIDAS ERP. Catálogo por páginas y funciones.
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
