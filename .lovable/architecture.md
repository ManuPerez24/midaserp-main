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
- **`/proyectos`:** Módulo puente entre ventas y ejecución. Gestiona el ciclo de vida completo (Levantamiento -> Presupuesto -> Planeación -> Ejecución -> Completado) con disparadores automáticos de tareas, almacenamiento documental, vinculación de cotizaciones y Tarea Activa. Cuenta con un **Dashboard Inmersivo Dinámico** que dibuja el Cronograma (Gantt) a pantalla completa con soporte para manipulación directa interactiva (Drag & Move, Resize, Dependencias Interactivas SVG, Selección Múltiple con `Ctrl+Click` para mover/borrar en bloque, Filtros Inteligentes y Ruta Crítica). El **Kanban Nativo** y el **Gantt** comparten un motor unificado de **Modales Inmersivos a pantalla completa** (`gantt-task-modals.tsx`), divididos en dos columnas: detalles y evidencias a la izquierda, y un **Roadmap Multimedia (Línea de Tiempo)** a la derecha que audita cada cambio. Por sanidad de arquitectura, todos los modales se encuentran extraídos en rutas independientes.
- **`/ayuda`:** Centro de ayuda y base de conocimiento interactiva integrada en el sistema. Proporciona guías de inicio rápido, explicación de los paradigmas UX (Tarea Activa, Menú Radial, Paleta de Comandos), atajos de teclado y glosario.
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
   - Transcribe la cotización y empareja (Fuzzy Match) los productos extraídos con el catálogo de `useInventory`, permitiendo actualizar precios o crear nuevos productos masivamente. **Soporta re-análisis con instrucciones de corrección del usuario (Prompting en caliente)** en caso de que la IA cometa errores de formato.
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

---

## 10. Especificaciones Técnicas de Componentes Clave

### A. Modal Inmersivo de Edición de Tareas (`ProjectTaskEditModal`)
Ubicado en `src/routes/gantt-task-modals.tsx`. Este componente es una obra maestra de UI/UX diseñada para reemplazar los aburridos formularios de tareas por una experiencia de pantalla completa. Si alguna vez se necesita recrear, estas son sus directrices estructurales exactas:

#### 1. Dimensiones y Contenedor Principal
- **Layout:** Ocupa casi toda la pantalla usando clases Tailwind precisas: `w-[99vw] max-w-[1800px] h-[98vh] max-h-[98vh] flex flex-col p-0 overflow-hidden bg-background rounded-xl`.
- **Estructura Interna:** Un `DialogHeader` superior estático, un cuerpo central dinámico que toma todo el espacio restante (`flex-1`), y un `DialogFooter` inferior estático.

#### 2. Cabecera (Header)
- **Izquierda:** Título de la tarea flanqueado por un icono dinámico según el estado (`CheckCircle` esmeralda para Completado, `Clock` azul para En Progreso, `Clock` gris para Pendiente). 
- **Derecha:** Un `Badge` inamovible que muestra el estado actual de la tarea y refleja los mismos colores.

#### 3. Cuerpo: Diseño a Dos Columnas (Split Layout)
El contenedor central usa un grid que se divide en pantallas grandes: `grid grid-cols-1 lg:grid-cols-2`.

**Columna Izquierda (Formulario y Evidencias):**
Contenedor scrolleable (`overflow-y-auto`) que agrupa la información en tarjetas (`Card`).
1. **Top - Dos tarjetas paralelas (Detalles y Programación):**
   - *Detalles:* Título, Descripción, Responsable (usa un datalist `system-users-list` para autocompletar) y Fase/Grupo (usa un datalist `group-suggestions`).
   - *Programación:* Los campos de Fecha y Hora están divididos por compatibilidad cross-browser usando `<Input type="date">` y `<Input type="time">` lado a lado. Almacenan estados locales temporales antes de unirse en un formato ISO.
2. **Bottom - Tarjeta Ancha (Estado y Entrega):**
   - Cambia su color de fondo dinámicamente (`bg-emerald-50/30` o `bg-blue-50/30`) basándose en el estado seleccionado.
   - *Trigger Automático de Fechas:* Si el usuario cambia el Select a "Completado", el sistema inyecta la fecha y hora actuales en "Fecha/Hora de Fin" y dispara un Toast informativo. Si selecciona "En Progreso", auto-rellena la "Fecha/Hora de Inicio".
   - *Carga de Evidencias:* Un componente drag-and-drop (`<input type="file" multiple>`). Muestra un grid de miniaturas (`h-14 w-14`) de fotos subidas previamente y fotos nuevas, con un botón flotante de borrado (`Trash2`).

**Columna Derecha (Roadmap Histórico):**
Una tarjeta vertical (`Card min-h-[400px]`) que actúa como bitácora de auditoría.
- **Cabecera Sticky:** "Roadmap (Historial)" anclado arriba con fondo difuminado (`backdrop-blur-sm sticky top-0 z-20`).
- **Línea de Tiempo Central:** Una línea vertical asimétrica en móviles y perfectamente centrada en PC (`absolute left-5 xl:left-1/2 top-0 bottom-0 w-[3px]`).
- **Alternancia Visual (Zig-Zag):** Recorre el array `task.history` en reversa. Utiliza el índice `isEven` (`i % 2 === 0`) para alinear el contenido a la izquierda o derecha en pantallas `xl` (`xl:flex-row-reverse` vs `xl:flex-row`), creando un diseño de línea de tiempo hermoso.
- **Índices y Colores:** Dibuja un círculo numérico por cada paso. Asigna un color iterativo (`timelineColors = ["bg-orange-500", "bg-yellow-500", "bg-teal-500", ...]`) usando el módulo del índice (`i % timelineColors.length`).
- **Snapshots (Cápsulas de tiempo):** Si el historial guardó un `snapshot`, renderiza una caja con fondo secundario. Si hay comentarios, van en cursiva. Si hay fotos, dibuja las miniaturas en cuadrícula. Si la imagen se previsualiza, al hacer hover (`group-hover`) aparece un icono de descarga y al darle clic lanza la descarga real del archivo en otra pestaña.

#### 4. Footer y Lógica de Guardado (Save Engine)
- Botón de Borrar (Izquierda - Lanza un `AlertDialog` anidado por seguridad).
- Botón Cancelar y Botón Guardar.
- **Secuencia de Guardado (`handleSave`):**
  1. Bloquea la UI (`setSaving(true)`).
  2. Muestra un `toast.loading` si hay evidencias nuevas.
  3. Convierte todos los archivos locales a Base64 y los envía mediante la función de servidor nativa (`useServerFn(uploadProjectFiles)`).
  4. Recibe las URLs reales del servidor y las concatena a `uploadedUrls`.
  5. Crea una copia de `task.history`. Si el estado cambió, inyecta un nuevo paso de historia. Si se subieron fotos o se cambiaron los comentarios de entrega, inyecta otro paso con la metadata de la cápsula (`snapshot: { comments, photos, files }`).
  6. Compone el objeto Tarea final, busca su coincidencia en el array de tareas de `useProjects` y lo reemplaza inmutablemente.
  7. Llama a `updateProject()`, limpia los modales y devuelve el estado visual de éxito.

### B. Motor de Confirmación de Reprogramación Interactiva (Gantt)
Utilizado a través de los estados `confirmDrag` (Fases) y `confirmTaskDrag` (Tareas). Para otorgar un nivel de confianza empresarial, cualquier desplazamiento visual (`deltaMs > 60000` / 1 minuto) detiene el motor y exige confirmación.

#### Componente Visual: Caja de Desplazamiento (Delta Box)
Diseñado para ilustrar cognitivamente el impacto en el tiempo antes de modificar la base de datos.
- **UI Clases Base:** `border rounded-md p-3 bg-primary/10 border-primary/20 flex flex-col items-center justify-center py-4 text-center`
- **Comportamiento Lógico:**
  - Detecta la variable diferencial en milisegundos (`deltaMs = currentStartMs - initialStartMs`).
  - Transforma el formato humano `Math.round(deltaMs / 3600000)` para representarlo en **Horas**.
  - Si es mayor a cero, antepone el signo matemático de empuje `+`.
- **Distribución Dual (Para tareas únicas):** 
  - Coloca el *Delta Box* centrado y ancho en la parte superior.
  - Divide la parte inferior con un CSS Grid (`grid grid-cols-2 gap-4`), mostrando el "Inicio/Fin Original" a la izquierda (Fondo Gris `bg-muted/20`) y el "Nuevo Inicio/Fin" a la derecha (Fondo de acento `bg-primary/10`).

Este patrón debe replicarse si alguna vez se programa un sistema de manipulación del tiempo en calendarios, bitácoras CRM, o fechas de entrega de Cotizaciones.

### C. Motor de Exportación WYSIWYG (Gantt a PDF/PNG)
El Diagrama de Gantt incluye una función de captura de alta fidelidad que exporta exactamente lo que el usuario ve en pantalla (Filtros, Nivel de Zoom actual y Nodos expandidos).
- **Estrategia:** Renderizado del DOM a Canvas (`html2canvas`) y posteriormente inyección en un contenedor PDF (`jsPDF`) o descarga directa como imagen `image/png`.
- **Optimización (Lazy Loading):** Para evitar bloquear el hilo principal y aumentar el tamaño del bundle inicial, los módulos de captura se cargan dinámicamente:
  ```javascript
  const html2canvasModule = await import('html2canvas');
  const { jsPDF } = await import('jspdf');
  ```
- **Manejo de Zoom:** El usuario puede usar la herramienta de "Ajustar" pantalla, y la captura calculará el ancho real del `scroll-container` para renderizar el formato en orientación Apaisada (Landscape) u Horizontal según la relación de aspecto generada.