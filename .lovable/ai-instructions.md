# Reglas de Trabajo y Memoria del Asistente (Midas ERP)

Este documento contiene las reglas fundamentales (System Prompt) que el Asistente de IA DEBE seguir en CADA interacción al trabajar en el proyecto Midas ERP.

## 1. Memoria Permanente (Fuentes de Verdad)
Las dos fuentes principales de verdad y "memoria a largo plazo" del asistente son:
- `plan.md`: Contiene la hoja de ruta, los pasos actuales y el historial de progreso.
- `architecture.md`: Contiene la radiografía del sistema, módulos, estado global (Zustand) y convenciones de UI/UX.
El asistente debe considerar siempre el contexto de estos archivos antes de escribir o modificar código.

## 2. Actualización Continua y Obligatoria
- **Regla de Oro (Al confirmar):** Cada vez que el usuario confirme que una tarea o paso está funcionando, el asistente DEBE generar de forma proactiva un `diff` para actualizar **ambos** archivos: `plan.md` (marcando progreso) y `architecture.md` (agregando la nueva lógica, componentes o módulos creados).
- **Sincronización Total:** El `architecture.md` no solo se actualiza al final de grandes fases, sino de forma continua paso a paso actuando como bitácora viva.

## 3. Calidad y Estilo de Código
- Respetar estrictamente los paradigmas UX de Midas ERP: *Menú Radial*, *Paleta de Comandos* y *Tarea Activa*.
- Prevenir errores comunes de React (Ej. Asegurar siempre devolver un único elemento padre en JSX `<>...</>`).
- Revisar meticulosamente las importaciones (imports) y los tipados de TypeScript antes de entregar el código.
- Las funciones de servidor (Node.js) deben usar validación `.inputValidator` con `zod` siempre que sea posible.

## 4. Estructura de Archivos del Proyecto (File Tree)
Para mantener la memoria espacial del código, esta es la disposición de los directorios clave:
```text
src/
 ├── components/
 │    ├── ui/                   # Componentes atómicos de shadcn/ui (Button, Card, Dialog, Switch, Popover, etc.).
 │    ├── page-guard.tsx        # HOC que valida la sesión activa vía auth.ts y protege las rutas privadas.
 │    ├── isometric-farm-view.tsx # Componente encargado del Layout Isométrico 3D de la granja y sus controladores.
 │    ├── farm-modals.tsx       # Set de Modales CRUD (Crear/Editar Máquinas, Bobinas y Calculadora de Secado) para limpiar la vista principal.
 │    └── deco-background.tsx   # Motor procedural SVG/CSS para el fondo PCB/Industrial animado con efecto parallax y desenfoque (BG_CONFIG).
 ├── lib/
 │    ├── date-helpers.ts       # Funciones auxiliares de fechas (countDaysInInterval) para excluir fines de semana (L-V) en cálculos de ETA.
 │    ├── farm-utils.ts         # Catálogos de materiales, colores y herramientas de la granja.
 │    └── smart-ai.ts           # Lógica LLM del cliente, prompts para OCR de proveedores, termómetro de ventas y cruce semántico.
 ├── routes/
 │    ├── __root.tsx            # Enrutador principal de TanStack. Contiene el Workspace Switcher (Midas ERP vs 3D) y la barra lateral (Sidebar).
 │    ├── index.tsx             # Dashboard Home: KPIs globales, widget de predicción de quiebre de stock y termómetro de ventas.
 │    ├── inventario.tsx        # (Y rutas CRM/Ventas): Tablas con Menú Radial, control de existencias, CRUD y Tarea Activa.
 │    ├── proyectos.tsx         # Dashboard de ciclo de vida de proyectos, vinculación de cotizaciones y visor de archivos (Mobile-First).
 │    ├── gantt-task-modals.tsx # Modales inmersivos (ProjectTaskEditModal) de pantalla completa, drag & drop de evidencias y Roadmap visual (Timeline).
 │    ├── impresion-3d.tsx      # Dashboard de la granja: Control de máquinas, cambio de filamentos y visor de Planta Isométrica 3D nativa (IsometricFarmView).
 │    ├── ordenes-3d.tsx        # Control de producción, registro de mermas fotográfico, catálogo de razones de fallo y multiplicador de camas.
 │    ├── estadisticas-3d.tsx   # Motor predictivo (calculateHealth), gráficos Recharts de mermas por material, podio de eficiencia por operario.
 │    ├── boveda-3d.tsx         # Gestor documental CAD, historial de revisiones (Changelog) y visor WebGL en tiempo real (StlViewer) retrocompatible.
 │    └── ajustes.tsx           # Configuración global, motor de PDFs visual, llaves de API (OpenRouter, Resend) protegidos por PIN local.
 ├── stores/
 │    ├── auth.ts               # Estado Zustand para persistencia del usuario actual y login.
 │    ├── 3d-farm.ts            # Estado useFarm3D: Arreglos de impresoras, órdenes, spools, presets, turnos y configuración workWeekMode.
 │    ├── cad-vault.ts          # Estado useCadVault: Proyectos tridimensionales y árbol de versiones de archivos (evita saturar DB principal).
 │    ├── settings.ts           # Configuración empresarial y LLM parameters.
 │    ├── active-task.ts        # Control del "Modo Edición" global para inyectar inventario en cotizaciones/proyectos.
 │    └── locks.ts              # Sistema de semáforos (Heartbeats) para bloquear edición concurrente.
 └── util/
      ├── projects.functions.ts      # (Server) uploadProjectFiles: Recibe Base64 y escribe archivos físicos reales al servidor de TanStack.
      ├── notifications.functions.ts # (Server) sendPushNotification: API nativa de WhatsApp Cloud y Telegram Bot.
      └── sync.functions.ts          # (Server) saveUserData: Debounce para persistir el Optimistic UI en la BD de MongoDB Atlas.
public/
 └── uploads/                   # Carpeta raíz pública donde viven los STLs, G-Codes y fotos de evidencias/mermas físicas.
.lovable/
 ├── plan.md                    # Roadmap, tareas activas, iteraciones y log histórico de cambios.
 ├── architecture.md            # Reglas de diseño (UI/UX), UX Core (Menú Radial), y explicación de enrutamiento y estado.
 └── ai-instructions.md         # Tú estás aquí. Árbol de archivos y reglas de comportamiento del asistente.
/                               # Raíz
 ├── ideas-midas-3d.md          # 30+ Ideas de escalabilidad IoT, hardware y flujos de manufactura.
 └── deploy.md                  # Instrucciones de infraestructura, variables de entorno y despliegue en Vercel.
```

## Instrucción de Activación
Cuando el usuario mencione "ai-instructions", "lee las instrucciones", "recuerda las reglas" o **simplemente confirme que un código funcionó**, el asistente DEBE **obligatoriamente**:
1. Confirmar la recepción.
2. Proveer los diffs para actualizar `plan.md` y reanalizar el sistema para actualizar `architecture.md` con los últimos cambios.
3. Indicar el siguiente paso a programar.