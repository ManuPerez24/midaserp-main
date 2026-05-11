# Arquitectura y Base de Conocimiento (Midas ERP)

Este documento sirve como la radiografía técnica oficial de **Midas ERP**. Su objetivo es proporcionar un contexto claro sobre cómo está construida la aplicación, qué hace cada módulo y cómo se gestiona el estado y las integraciones de IA.

---

## 1. Stack Tecnológico
- **Framework:** React con TanStack Start (Router & Server Functions).
- **Estado Global:** Zustand (Stores).
- **Estilos y UI:** Tailwind CSS, shadcn/ui, Radix UI, Lucide React (Iconos).
- **Drag & Drop:** `@dnd-kit/core` y `@dnd-kit/sortable`.
- **Visualización de Datos:** Recharts.
- **Generación de PDFs:** `@react-pdf/renderer`.

---

## 2. Paradigmas de UX (User Experience) Core

### A. La "Tarea Activa" (Modo Edición)
Es el núcleo de la agilidad del ERP. En lugar de buscar productos dentro de un formulario modal aburrido, el usuario "Activa" una Cotización, un Kit o un Proyecto (`stores/active-task.ts`). 
Esto ancla un banner (`ActiveTaskBadge`) en la cabecera del sistema. Mientras la tarea está activa, el usuario puede navegar libremente por el módulo de **Inventario**, donde cada producto mostrará un input de cantidad y un botón `+` para agregarlo instantáneamente a la tarea en curso. Al agregar a un **Proyecto**, el sistema deduce automáticamente las existencias del inventario real.

### B. Menú Radial Flotante
Para ahorrar movimientos del ratón en las tablas (Inventario, Cotizaciones, Clientes, Kits), al hacer clic izquierdo sobre el fondo de cualquier fila se despliega un **Menú Radial** (`RadialMenuOverlay`). Este menú presenta todas las acciones posibles (Editar, Eliminar, Historial, Imprimir) en un círculo interactivo alrededor del puntero.

### C. Paleta de Comandos (Cmd + K)
Un buscador y navegador global (`GlobalSearch` / `GlobalChat` connections) que se abre con `Ctrl+K` o `Cmd+K`. Permite buscar productos, clientes, cotizaciones o ejecutar acciones rápidas ("Crear nueva cotización") sin usar el ratón.

### D. Bloqueo Colaborativo en Tiempo Real
Para evitar colisiones cuando varios usuarios editan el mismo documento. Cuando un usuario "Activa" una cotización, el sistema emite un *Heartbeat* (`stores/locks.ts`) que bloquea el documento a nivel global. Los demás usuarios ven un indicador de "Solo lectura. En edición por [Usuario]".

### E. Explorador de Archivos (Gestión Documental)
Integrado inicialmente en el módulo de Proyectos. Es un gestor documental estilo escritorio (Windows/Mac) dentro del navegador, con un diseño "Mobile-First" que despliega Overlays táctiles en celulares. Los archivos se visualizan en una cuadrícula interactiva con filtrado, ordenamiento, cálculo de peso (KB/MB) y un visor a pantalla completa (soporta imágenes y PDFs nativamente mediante `<object>` e `<iframe>`). Las subidas se procesan vía *Server Functions* de Node.js (`util/projects.functions.ts`), guardando el archivo físicamente en el servidor local (`public/uploads/`) para mantener la base de datos MongoDB ultraligera.

---

## 3. Módulos y Rutas Principales

- **`/` (Dashboard):** Centro de control. Muestra KPIs, gráficos de ventas, y Widgets avanzados como el "Termómetro de Ventas" (IA para análisis de rechazos) y "Riesgo de Quiebre de Stock" (Algoritmo predictivo).
- **`/inventario`:** Catálogo maestro de productos. Soporta control de existencias, precios por volumen, historial de precios, escáner de códigos de barras/QR e impresión de etiquetas masivas.
- **`/cotizaciones`:** Motor de ventas. Creación de cotizaciones, gestión de estados (Pendiente, Aceptada, Rechazada), exportación a PDF (Logística y Cliente), generación de QR de autenticidad y pedidos a proveedores (Compras).
- **`/kits`:** Creador de agrupaciones de productos. Los kits son reutilizables y pueden "Inyectarse" directamente en una cotización activa.
- **`/clientes`:** Directorio CRM. Guarda contactos, visualiza estadísticas de ventas (Ficha 360°), recordatorios y adjunta archivos al expediente del cliente.
- **`/proyectos`:** Módulo puente entre ventas y ejecución. Gestiona levantamientos, almacenamiento documental, vinculación financiera de cotizaciones, Tarea Activa para consumo de inventario y un Kanban nativo. Cuenta con un **Dashboard Inmersivo Dinámico** que dibuja el Cronograma (Gantt) a pantalla completa usando *CSS Grid* puro para el posicionamiento temporal, barras de progreso de dos tonos y un motor nativo SVG para dibujar rutas de dependencia en "codo" (90°).
- **`/ajustes`:** Módulo exclusivo para Administradores. Controla el branding, perfil fiscal, IA, seguridad por PIN, respaldos locales y el **Motor de PDFs** (Creador visual Drag & Drop, selección de plantillas y visibilidad de columnas dinámicas).

---

## 4. Gestión del Estado Global y Persistencia

Midas ERP utiliza **Zustand** de forma extensiva. A diferencia de aplicaciones tradicionales que hacen llamadas API (Fetch/REST) constantemente, Midas carga el contexto en memoria al inicio de sesión y sincroniza los cambios en segundo plano (Optimistic UI).

### Sincronización Server/Client
Las tiendas (`stores/*.ts`) usan una función especial llamada `registerServerStore`. 
Cuando se realiza una mutación (ej. `addProduct`), el estado local se actualiza inmediatamente (UI súper rápida). Detrás de escena, un *debounce* agrupa los cambios y llama a la función del servidor `saveUserData` (`util/sync.functions.ts`), persistiendo todo en la base de datos (MongoDB).
*Nota de persistencia segura:* Es crítico que al actualizar objetos anidados en Zustand (como `settings.ai`), se haga un spread del objeto completo (`...settings.ai`) para evitar sobrescrituras destructivas a nivel subdocumento en MongoDB.

### Stores Principales:
- `useInventory`: Gestiona productos, histórico de precios y categorías.
- `useQuotes`: Gestiona el ciclo de vida de los presupuestos y sus líneas.
- `useClients`: Directorio CRM.
- `useKits`: Grupos de productos.
- `useProjects`: Administra el estado de los proyectos en ejecución, sus tareas, expedientes documentales, presupuesto sumado de cotizaciones vinculadas, y materiales consumidos.
- `useSettings`: Configuraciones globales de la empresa, UI y llaves de APIs.
- `useActiveTask`: Controla el estado del "Modo Edición" global.
- `useLocksStore`: Gestiona el sistema de candados colaborativos (Heartbeats).

---

## 5. Ecosistema de Inteligencia Artificial (Midas AI)

El ERP no depende de proveedores preconfigurados forzosos (se eliminó la dependencia de Lovable Gateway). Los usuarios configuran su propio proveedor (OpenAI o endpoints Custom como Groq/OpenRouter) directamente en los **Ajustes**.

### Funciones de IA (`util/*.functions.ts`)
1. **Asistente Midas AI (`GlobalChat`):** 
   - Una burbuja de chat flotante y global.
   - **Contexto:** Se le inyecta una versión reducida de toda la base de datos en memoria (Inventario, Clientes, Kits, Cotizaciones).
   - **Capacidad:** Puede responder preguntas sobre stock, precios, generar cálculos de ventas, y devolver enlaces interactivos a módulos específicos.
2. **Extracción por OCR (`analyzeSupplierQuote`):** 
   - Permite subir un PDF o Imagen de un proveedor.
   - Transcribe la cotización y empareja (Fuzzy Match) los productos extraídos con el catálogo de `useInventory`, permitiendo actualizar precios o crear nuevos productos masivamente.
3. **Termómetro de Ventas (`analyzeRejectionsWithAi`):**
   - Analiza las notas y motivos de rechazo de las cotizaciones perdidas. Extrae las palabras clave (ej. "Caro", "Competencia") y calcula un índice de salud del negocio (0 al 100).
4. **Cross-Selling (Sugerencias):**
   - Analiza las líneas de la cotización actual (`ActiveTask`) y sugiere productos complementarios (Accesorios, cables, etc.) basados en relaciones semánticas.

---

## 6. Lógicas Híbridas / Analítica Predictiva (`lib/smart-ai.ts`)

Además de llamadas puras a LLMs, el sistema cuenta con algoritmos matemáticos en tiempo real que se ejecutan en el cliente:
- **Predicción de Quiebre de Stock:** 
  Calcula la "Velocidad de Consumo" dividiendo la cantidad de productos vendidos en los últimos 90 días (de cotizaciones Aceptadas/Cerradas). Si el stock actual dividido por el consumo diario indica que el inventario se agotará en menos de 45 días, lanza una alerta preventiva en el Dashboard.

---

## 7. Estructura de Seguridad
- **Permisos Granulares:** Las vistas y acciones están protegidas por el componente `<PageGuard>` y el hook `useCan`.
- **Auditoría:** Cada acción importante (Crear producto, eliminar cotización) registra una traza inmutable usando `logAction` en `useAuditLog`.
- **PIN de Ajustes:** Una capa adicional de seguridad local para evitar alteraciones no deseadas en la configuración base, incluso si el usuario es administrador.

---

## 8. Identidad Visual y Estilos (UI/UX)

Midas ERP se centra en un diseño altamente profesional, rápido e intuitivo, combinando el minimalismo de las aplicaciones modernas con una identidad industrial/técnica.

### A. Sistema de Diseño
- **shadcn/ui & Tailwind CSS:** El sistema emplea una biblioteca de componentes base accesible (Radix UI) estilizada mediante clases utilitarias de Tailwind CSS.
- **Personalización Dinámica (Theming):** A través del módulo de Ajustes, el administrador puede definir el **Color Primario**, **Color de Acento** y cambiar el **Tema (Claro, Oscuro, Sistema)**. Estos ajustes modifican las variables CSS raíz (`--primary`, `--background`, etc.) en tiempo real gracias al componente `ThemeApplier`.

### B. Fondo Decorativo y Parallax 3D (`DecoBackground`)
La identidad única del ERP reside en su fondo dinámico (`src/components/deco-background.tsx`):
- **Temática de Automatización/Industrial:** Se dibuja proceduralmente mediante SVG un circuito impreso (PCB) animado con pistas de datos, microprocesadores (QFP), circuitos integrados, resistencias, bobinas y diodos LED que emiten pulsos de luz (`animate-pulse`).
- **Parallax Reactivo:** Elementos posicionados en distintas capas de profundidad (`depth`) que se desplazan sutilmente reaccionando al movimiento del cursor del ratón, creando una inmersión 3D.
- **Ajuste Fino:** El archivo expone un objeto `BG_CONFIG` para calibrar densidad de pistas, opacidades de componentes, escalas (`globalScale`), y profundidad de campo desenfocando capas traseras (`blobBlur`, `circuitBlur`).

### C. Patrones de Tablas y Listados
- **Jerarquía Tipográfica y Avatares:** Uso intensivo de fuentes monoespaciadas (`font-mono`) en datos técnicos (SKUs, Folios, Teléfonos) contrastando con fuentes sans-serif para nombres. Los listados de Clientes (CRM) y Kits emplean avatares generados por iniciales o iconos englobados para un diseño "Premium". Columnas de contacto consolidadas.
- **Semáforos Visuales:** Las tablas reemplazan texto plano por *Badges* y puntos de estado. Por ejemplo, en el Inventario, un punto rojo parpadeante alerta de quiebre de stock, mientras que el naranja avisa del stock mínimo. Los estados de cotización poseen paletas semánticas estrictas (Esmeralda = Aceptada, Ámbar = Pendiente, Rosa = Rechazada).
- **Microinteracciones y Limpieza:** Las tablas se mantienen extremadamente limpias ocultando botones redundantes en favor del Menú Radial. Además, las transiciones entre páginas de módulos emplean utilidades de Tailwind (`animate-in fade-in slide-in-from-bottom`) para suavizar la carga.

### D. Motor de Documentos (PDFs)
Las cotizaciones exportadas no son estáticas. Se construyen bajo un motor de renderizado basado en bloques. El usuario puede elegir plantillas (Moderno, Clásico, Minimalista), ocultar columnas dinámicamente (SKU, descuentos, fotos) y reordenar las secciones del documento (Cliente, Tabla, Totales, Notas) mediante un **Lienzo Drag & Drop** en la pantalla de Ajustes.

---

## 9. Patrones de Enrutamiento y Prevención de Errores (TanStack Router)

### Vistas Dinámicas Inmersivas vs Nuevas Rutas
Durante el desarrollo con TanStack Router y el servidor Vite (especialmente en entornos locales de Windows o web), la creación de nuevos archivos físicos de ruta (ej. `/proyectos/$id.tsx`) a menudo no dispara la auto-generación del árbol de rutas (`routeTree.gen.ts`) sin reiniciar el servidor. Esto provoca bloqueos de seguridad silenciosos al intentar usar `navigate()`, `window.location` o `<Link>`.

**Solución de Arquitectura Estable (Regla de Diseño):**
En lugar de crear nuevas rutas de URL para vistas fuertemente acopladas (como el Dashboard de Gantt de un proyecto), Midas ERP emplea el **Patrón de Vistas Dinámicas Inmersivas**. Consiste en desmontar la vista principal de la ruta mediante el estado de React y renderizar un componente a pantalla completa en su lugar (ej. `if (activeView === 'gantt') return <ProjectGanttView />`).

Esto garantiza:
1. Funcionamiento inmediato e infalible (cero dependencia de la regeneración del servidor).
2. Transiciones instantáneas sin recargas del navegador.
3. Una experiencia de usuario idéntica a la de navegar a una "página dedicada".