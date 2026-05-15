# Plan de Innovación y Estructura (Midas ERP)

*Nota: El plan original de estabilización de UI (Iteraciones C, B, A) fue descartado a favor de acelerar las innovaciones de UX/IA.*

## Fases de Innovación y Documentación (Completadas):
1. **[Completado]** Paleta de Comandos interactiva (`Cmd+K`).
2. **[Completado]** Inteligencia Artificial: Asistente "Midas AI" global y flotante.
3. **[Completado]** Extracción de datos por OCR automático (Configurado para Groq/OpenRouter).
4. **[Completado]** Analítica predictiva (Predicción de quiebre de stock calculando velocidad de consumo en el Dashboard).
5. **[Completado]** Radiografía y Documentación del Sistema (`architecture.md`).
6. **[Completado]** Pulido Visual de Tablas Restantes (UI/UX - Clientes y Kits).
7. **[Completado]** Fase 4: Motor de PDFs Avanzado (Plantillas, ocultar columnas, y Creador Visual Drag-and-Drop).
8. **[Completado]** Fase de Documentación: Módulo de Ayuda (`/ayuda`) integrado interactivo con buscador, guías de uso, atajos de teclado y glosario del ERP.

---

## Siguientes Pasos: Fase 5 - Módulo de Proyectos (Gantt, Kanban y Levantamiento)
**Objetivo:** Crear un puente entre las ventas (Cotizaciones) y la ejecución, gestionando levantamientos, tareas y consumo de inventario.

*   **[Completado] Paso 1: Store y Listado.** Crear `useProjects` (Zustand) y la vista principal `/proyectos` con la tabla y tarjetas de proyectos.
*   **[Completado] Paso 2: Pantalla de Levantamiento y Explorador.** Formulario dinámico, notas técnicas y un Explorador de Archivos responsivo (Mobile-first) con vista previa interactiva, cálculo de peso, filtros, y almacenamiento local en Node.js (`public/uploads/`).
*   **[Completado] Paso 3: Vinculación con Cotizaciones.** Interfaz dentro del proyecto para buscar y enlazar cotizaciones existentes de `useQuotes` leyendo directamente sus partidas, incluyendo sumatoria dinámica con impuestos.
*   **[Completado] Paso 4: Tarea Activa y Consumo.** Integrar el proyecto al banner de "Tarea Activa" para descontar material del inventario gradualmente y sumarlo al costo del proyecto.
*   **[Completado] Paso 5: Gantt y Kanban.** Tablero Kanban interactivo y una **Página de Cronograma (Gantt) dedicada** a pantalla completa (`/proyectos/$id`) con repogramación rápida y línea de "Hoy".
*   **[Completado] Paso 5.1: Gantt Avanzado (CSS Grid & SVG).** Creación in-situ, auto-enfoque a "Hoy", barras con progreso bi-tono (70/30%), Avatares de recursos circulares, y conexión de tareas interdependientes mediante vectores SVG en ángulo de 90°.
*   **[Completado] Paso 5.2: Refactorización de Arquitectura.** Extracción de todos los modales pesados (Gantt, Materiales, Cotizaciones, Archivos, Tareas y Formulario) a componentes independientes en `src/components/projects/` para mejorar la mantenibilidad y aligerar la vista principal.
*   **[Completado] Paso 5.3: Zoom & Precisión Temporal en Gantt.** Conversión del grid a un motor de coordenadas absolutas en milisegundos. Ahora soporta `Ctrl + Scroll` para hacer zoom continuo, revelando detalles desde "Semanas" hasta "Minutos", y los inputs soportan horarios completos (`datetime-local`).
*   **[Completado] Paso 5.4: Mejoras UX Gantt.** Se solucionó la responsividad del modal de tareas que causaba pérdida de contenido por restricciones de cuadrícula y se extendió el lienzo del Gantt a ±1 mes de margen para mejor visualización.
*   **[Completado] Paso 5.5: Minimapa y Formato de Hora.** Se integró un scrollbar visual/minimapa interactivo para navegar por líneas de tiempo extensas de forma instantánea, y un selector `12h/24h` para la configuración de las etiquetas de horas.
*   **[Completado] Paso 5.6: Pulido Visual del Minimapa.** Se rediseñó el scrollbar dinámico para que parezca una barra de navegación profesional, con bordes redondeados, efecto de cristal (backdrop blur), tiradores indicadores y sombras de acento.
*   **[Completado] Paso 5.7: Limpieza de UI Gantt.** Ocultamiento del scrollbar nativo clásico del navegador en el lienzo del Gantt para cederle todo el protagonismo al nuevo minimapa y limpiar la interfaz.
*   **[Completado] Paso 5.8: Sincronización en Tiempo Real.** Se actualizó la inyección de propiedades en la página principal para que los modales (Gantt, Tareas, etc.) reciban el objeto "en vivo" desde Zustand en lugar de un Snapshot estático, solucionando la falta de reactividad visual al guardar cambios.
*   **[Completado] Paso 5.9: Responsividad de Títulos de Tareas.** Se reescribió la columna izquierda del Gantt para escalar correctamente en móviles (`w-32` a `w-72`), activando un máximo de 2 líneas de texto (`line-clamp-2`) para que los títulos ya no se vean cortados horizontal ni verticalmente.
*   **[Completado] Paso 5.10: Soporte Multi-Navegador para Inputs de Fecha.** Se reemplazó el campo nativo `datetime-local` (propenso a fallar en modales emergentes) dividiéndolo en `<Input type="date">` y `<Input type="time">` de lado a lado.
*   **[Completado] Paso 5.11: Custom DateTime Picker y Cero Pérdidas de Scroll.** Se refactorizaron los modales de creación/edición de tareas usando el patrón `flex flex-col overflow-hidden` asegurando que el Header y el Footer siempre sean visibles sin importar el tamaño de la pantalla. Además se creó un componente `DateTimePicker` estético y unificado que no depende del navegador para lucir bien.
*   **[Completado] Paso 5.12: Finalización de Tareas con Evidencia.** En la vista de edición de tareas del Gantt, ahora se puede cambiar el estado a "Completado". Al hacerlo, se registra automáticamente la hora exacta, y se habilita un panel de entrega para dejar comentarios y subir múltiples fotos como evidencia (que se visualizan en galería y se guardan localmente).
*   **[Completado] Paso 5.13: Evidencias Fotográficas en Servidor.** Se modificó la carga de fotos en la entrega de tareas del Gantt. En lugar de usar Base64 local, ahora utiliza la *Server Function* de TanStack Start para subir físicamente los archivos a `/public/uploads` optimizando el tamaño en la base de datos de MongoDB.
*   **[Completado] Paso 5.14: Rediseño Premium del Modal de Tareas.** Se aplicó un rediseño completo a la edición de tareas: agrupación visual en tarjetas ("Programación" y "Evidencia"), coloreado dinámico según el estado seleccionado (Azul para "En Progreso", Verde para "Completado"), la evidencia ahora está disponible también para tareas "En Progreso", y el formato de 12 horas se estableció por defecto en el sistema.
*   **[Completado] Paso 5.15: Auto-Zoom Inteligente y Layout en PC.** El diagrama de Gantt ahora calcula su contenedor y ajusta automáticamente su escala de zoom (`fit-to-screen`) para encajar perfectamente todas las tareas al abrirse (con un margen de respiro de 3 días). Además, se reestructuró CSS Grid en los modales de tareas para aprovechar el ancho total en monitores de PC colocando la "Programación" y los "Detalles" en columnas paralelas.
*   **[Completado] Paso 5.16: Ajuste a Pantalla Manual.** Se externalizó la lógica de auto-zoom a la función `handleFitToScreen` activable mediante un botón en la cabecera. Además se introdujo la variable `fitMarginDays` de fácil configuración en el código para decidir cuántos días de margen tener al enmarcar las tareas.
*   **[Completado] Paso 5.17: Zoom al Cursor e Historial por Tarea.** Se modificó el algoritmo de zoom (`Ctrl + Scroll`) para usar la posición relativa del ratón (`clientX`), permitiendo enfocar los márgenes o cualquier evento en ambos sentidos sin perder el centro de la pantalla. Además se dotó a las tareas de una línea de tiempo (History) que audita todas sus modificaciones (creación, cambio de estado, reprogramación, carga de evidencias) tanto en el Gantt como en el Kanban.
*   **[Completado] Paso 5.18: Roadmap Fotográfico (Auditoría Técnica).** Se evolucionó el panel de historial a una bitácora completa: cada vez que un técnico sube fotos o edita los comentarios de una tarea, se toma una "fotografía del estado" y se inyecta permanentemente en la línea de tiempo. Ahora es posible ver gráficamente la hora y día exacto en que se dejó un reporte junto con las miniaturas previas.
*   **[Completado] Paso 5.19: Agrupación en Fases (Gantt Bracket).** Se añadió el campo "Fase o Grupo" al modelo de Tareas. El motor de renderizado del Gantt ahora procesa y aplana (`flatten`) las tareas ordenándolas bajo sus respectivos grupos. Se dibuja una barra envolvente (Bracket) en el nivel superior que indica la fecha de inicio y fin real de toda la fase completa.
*   **[Completado] Paso 5.20: Corrección Motor Conectores.** Se aplicó un hotfix al cálculo de coordenadas de los conectores SVG de dependencias, garantizando que el punto de salida (`pX`, `pY`) mapee el índice aplanado hacia las tareas correctas, solucionando un bug de desplazamiento originado por la adición de los Brackets de Fases.
*   **[Completado] Paso 5.21: Interactividad y Funcionalidad Avanzada en Brackets.** Se integró colapsar/expandir fases, progreso interactivo dibujado dinámicamente (`completed/total`), Drag & Drop para reprogramación masiva con su propio evento de historial, y codificación cromática generada mediante función hash de nombres.
*   **[Completado] Paso 5.22: Ciclo de Vida y Estados de Proyecto.** Implementación del selector de fases interactivo (Levantamiento, Presupuesto, Planeación, Ejecución, Completado, Cancelado) directamente en las tarjetas de proyectos y el registro de estas transiciones en el Log de Auditoría.
*   **[Completado] Paso 5.23: Autogeneración de Tareas de Compra.** Al cambiar un proyecto a la fase "Planeación", el sistema detecta los proveedores de las cotizaciones vinculadas y autogenera tareas agrupadas en "Compras y encargos de material", definiendo la fecha de entrega recomendada en +3 días a las 12:00 PM con un desglose descriptivo extraído en tiempo real.
*   **[Completado] Paso 5.24: Manipulación Avanzada de Tareas en Gantt.** Soporte de "Drag to Move" (arrastrar para reprogramar) y "Drag to Resize" (arrastrar desde los bordes para cambiar duración) en tareas individuales, junto con modales de confirmación con comparativa pre/post fechas. Adición de sombreado de "Fines de Semana" para el contexto no laborable en el lienzo.
*   **[Completado] Paso 5.25: Drag & Drop de Dependencias Interactivas.** Implementación de conectores visuales en los bordes de las tareas para dibujar y crear dependencias entre ellas ("A -> B"). Se incluyó validación topológica recursiva para prevenir dependencias circulares y auto-referencias destructivas.
*   **[Completado] Paso 5.26: Eliminación Visual de Dependencias.** Se añadió un botón interactivo en el centro de las flechas de dependencia al pasar el ratón por encima (hover), permitiendo desvincular tareas de manera gráfica y registrando la acción en el historial.
*   **[Completado] Paso 5.27: Fragmentación del Motor Gantt.** Refactorización profunda de `project-gantt-view.tsx` extrayendo la lógica de creación, edición y visores de fotos hacia un archivo modular independiente (`gantt-task-modals.tsx`), reduciendo drásticamente la complejidad del componente principal.
*   **[Completado] Paso 5.28: Unificación de Kanban y Gantt.** El tablero Kanban (`project-tasks-modal.tsx`) ahora utiliza los mismos modales avanzados del Gantt, dotándolo de capacidades de dependencias, evidencias fotográficas, historial y selección de fases.
*   **[Completado] Paso 5.29: Corrección de Importaciones.** Resolución del problema de rutas con `gantt-task-modals.tsx` asegurando su importación cruzada correcta.
*   **[Completado] Paso 5.30: Gestión Completa de Tareas.** Adición de la capacidad de eliminar tareas directamente desde el modal de edición del diagrama de Gantt.
*   **[Completado] Paso 5.31: Roadmap Multimedia.** Reintegración de la lógica de almacenamiento y renderizado de archivos adjuntos y evidencias fotográficas dentro de la línea de tiempo interactiva (Roadmap).
*   **[Completado] Paso 5.32: Modal Inmersivo.** Rediseño completo del modal de Tareas para que ocupe toda la pantalla, dividiendo en dos columnas de igual tamaño: a la izquierda la edición de detalles y a la derecha una línea del tiempo (Roadmap) vertical estética a pantalla completa.
*   **[En Progreso] Paso 5.33: Mejoras Avanzadas en Gantt.** 
    *   **[Completado] Paso 5.33.1:** Filtros Inteligentes (Responsable, Estado, Fase).
    *   **[Completado] Paso 5.33.2:** Personalización (Colores dinámicos por usuario) y botón para resaltar la Ruta Crítica.
    *   **[Completado] Paso 5.33.3:** Selección múltiple interactiva (`Ctrl + Click`) para desplazamiento masivo de tareas en el tiempo con Modal de Confirmación previo, y borrado en bloque.
*   **[Completado] Paso 5.34: Documentación Maestra.** Creación de la especificación técnica profunda y detallada del Modal Inmersivo de Edición de Tareas en `architecture.md` para garantizar su preservación a largo plazo.
*   **[Completado] Paso 5.35: Estandarización de Modales de Confirmación.** Documentación en la arquitectura y despliegue del componente "Caja de Desplazamiento Temporal" en todas las interfaces de arrastre y redimensionamiento del Gantt (Fases, Tarea Única, y Bloque Masivo).
*   **[Completado] Paso 5.36: Exportación de Gantt (WYSIWYG).** Implementación de motor de exportación dual (Alta Resolución PNG y PDF dinámico) usando captura del DOM con `html2canvas` y `jsPDF` cargados de manera diferida (Lazy Loading) para optimizar el rendimiento.

---

## Siguientes Pasos: Fase 6 - Módulo de Granja 3D y Producción (Midas 3D)
**Objetivo:** Crear un ecosistema dedicado ("Workspace") para la administración de impresoras 3D y el control estadístico predictivo de piezas de manufactura.

*   **[Completado] Paso 6.1: Workspace Switcher.** Implementar un "Switch" global (menú desplegable interactivo en la cabecera del menú lateral) para alternar entre "Midas ERP" y "Midas 3D" con guardado persistente en Zustand. Incluye motor de redirección inteligente que auto-navega a la página inicial del Workspace activo o sincroniza el estado al acceder vía URL directa.
*   **[Completado] Paso 6.2: Fleet Management (Impresoras).** 
    *   **[Completado] Paso 6.2.1:** Creación del Store (`useFarm3D`) con persistencia en el servidor para almacenar la flota de impresoras y las órdenes de producción.
    *   **[Completado] Paso 6.2.2:** Creación de la interfaz del Dashboard de Impresoras (`/impresion-3d.tsx`) con un grid de tarjetas y cambio rápido de estados.
*   **[Completado] Paso 6.3: Órdenes de Producción e Interfaz de Operario.** Módulo visual con tarjetas interactivas que cumplen el Paso 6.3 y el Paso 6.5 (Registro ágil de Piezas Buenas/Mermas mediante botoneras rápidas).
*   **[Completado] Paso 6.4: Dashboard Analítico 3D.** Algoritmos de salud predictiva: cálculo de velocidad (pzs/día), estimación de término inteligente (ETA date), cálculo de mermas y estatus semántico (Adelantado, Atrasado, Estancado).
    *   **[Completado]** Gráfico Burn-down Predictivo: Integración de un gráfico compuesto avanzado (Recharts) en las tarjetas de órdenes activas con opción de Modal a pantalla completa. Traza dinámicamente métricas diarias, Meta Ideal, Velocidad Requerida, Velocidad de Recuperación (deuda técnica diaria) y sombreado inteligente de fines de semana (Zebra striping).
*   **[Completado] Paso 6.5: Inventario de Bobinas (Filamento).** Implementado el registro exhaustivo de bobinas con pesos, incluyendo catálogos avanzados (HS, CF, Silk, PC, etc.). El sistema ahora descuenta en gramos el material usado tras reportar cada pieza terminada.
    *   **[Completado] Paso 6.5.1:** Soporte de Tara (Peso del carrete vacío) en bobinas, permitiendo cruzar el peso real bruto de una báscula física contra el sistema, y adición de métricas de material globales en las estadísticas.
    *   **[Completado] Paso 6.5.2:** Adición de botones de Presets Comerciales (eSun, Bambu, Sunlu) para auto-rellenar los formularios de bobinas y acelerar la carga en almacén.
    *   **[Completado] Paso 6.5.3:** Implementación de historial de Presets Recientes. Cada nueva bobina se guarda en la base de datos como un atajo de carga rápida, limitado visualmente a 6 elementos con opción de expansión.
    *   **[Completado] Paso 6.5.4:** Rediseño total del selector de materiales en creación de bobinas. Se eliminó el dropdown clásico y se implementó un `<Popover>` con una cuadrícula interactiva clasificada por color y familia química.
    *   **[Completado] Paso 6.5.5:** Trazabilidad única de Bobinas (Idea 19 adaptada). Las bobinas generan un código aleatorio de 5 dígitos (Ej. A1B2C). Al cambiar el filamento de una máquina, este código se puede teclear para autoseleccionarla. Además, una bobina cargada en una máquina se bloquea visualmente para evitar ser usada por otra simultáneamente.
*   **[Completado] Paso 6.8: Modularización de Impresión 3D.** Refactorización profunda de `impresion-3d.tsx` para extraer `IsometricFarmView`, utilidades y todos los formularios (`farm-modals.tsx`) a componentes independientes, reduciendo drásticamente la carga del componente principal.
*   **[Completado] Paso 6.7: Switch de Horario Laboral.** Integración de filtro global persistente en el dashboard para alternar el cálculo de productividades (Piezas/día, ETAs) excluyendo opcionalmente sábados y domingos.
*   **[Completado] Paso 6.6: Sub-tareas en Proyectos.** Adición de sub-tareas interactivas (Checklists) al modal Inmersivo del Gantt con barras de progreso seguras en el tablero Kanban.

---
## Siguientes Pasos: Fase 7 - Personalización e Interfaz (Skins & Atajos)
*   **[Completado] Paso 7.1: Sistema de Temas Avanzados.** Implementación de skins UI complejas (Ciberpunk y Neumórfico) mediante inyección de variables `oklch` de CSS y manipulación de sombras neumórficas reactivas. Modificación del motor de temas principal para soportar múltiples instancias de apariencia global.
*   **[Completado] Paso 7.2: Atajos de Teclado Profesionales.** Panel visual de ayuda y *listeners* de eventos `keydown` en React para navegación hiper-rápida (Cmd+K, Alt+N, Alt+M, etc.), cerrando la fase de usabilidad.
*   **[Completado] Paso 7.3: Sincronización Manual a la Nube.** Integración de un botón global y comando en la Paleta (Cmd+K) para forzar la sincronización de todos los datos locales hacia MongoDB sin esperar el ciclo de guardado en segundo plano.

---
## Documentación Anexa
*   Se ha generado el archivo `/ideas-midas-3d.md` con 30 ideas conceptuales de IoT, Manufactura e Integración de Hardware para futuras iteraciones del ecosistema Midas 3D.

---
## Siguientes Pasos: Fase 8 - Midas 3D (Manufactura Avanzada)
**Objetivo:** Implementar las ideas top seleccionadas para llevar la granja 3D al nivel industrial.

*   **[Completado]** Gráfica de Rendimiento por Marca de Filamento (Idea 11). Implementado en el Dashboard Analítico cruzando los registros de producción y mermas por cada material (PLA, PETG, etc.) con soporte para el filtro temporal global.
*   **[Completado]** Catálogo de Fallos en Mermas (Idea 12). El botón rápido fue sustituido por un formulario estandarizado de reporte de Scrap.
*   **[Completado]** Dashboard de Eficiencia de Operario (Idea 13). Implementado un selector de "Turno" (Operador Activo) que inyecta una firma de autor en cada registro (bueno o fallo). Adición de un Podio de Ranking que calcula el porcentaje de efectividad de cada empleado en el Dashboard Analítico.
*   **[Completado]** Calculador de Longitud vs Peso (Idea 18). Integración de una herramienta conversora (Metros a Gramos) con diccionario de densidades por material en la creación/edición de órdenes.
*   **[Completado]** Alerta de Bobina Incompatible (Idea 20). Prevención de errores humanos al impedir asignar una orden que requiere un material específico (ej. TPU) a una impresora que tiene cargado un material distinto (ej. PLA).
*   **[Completado]** Etapas de Post-Procesado en Órdenes (Idea 22).
*   **[Completado]** Filtro Modo "Noche" / Night Shift (Idea 26). Inclusión de botón de filtro inteligente que aísla visualmente las órdenes cuyas piezas toman más de 8 horas, ideal para dejarlas imprimiendo durante la noche y maximizar la eficiencia de la granja.
*   **[Completado]** Notificaciones Push WhatsApp/Telegram (Idea 27).
*   **[Descartado]** Modo "Tablet Kiosko" (Idea 28). Desactivado a petición del usuario.
*   **[Completado]** Recompensas Gamificadas (Idea 29). Sistema de insignias en Dashboard de Estadísticas.
*   **[Completado]** Historial Fotográfico de Mermas (Idea 30). Integración con la cámara del dispositivo móvil e inyección física de archivos al servidor (`/public/uploads`) al reportar un fallo en la máquina.
*   **[Completado]** Filtros Avanzados de Vistas 3D (Idea 31). Inclusión de motor de filtros multicriterio (por fechas, por estados activos/inactivos y disponibilidad de materiales) aplicados tanto al control de órdenes como al de impresoras y bobinas.
*   **[Completado]** Ciclo de Secado de Materiales / Smart Weather (Idea 28). Calculadora dinámica de tiempos de secado de filamento interconectada mediante geolocalización a la API satelital Open-Meteo para ajustar inteligentemente las horas de deshidratación según la humedad ambiental.
*   **[En Progreso]** Automatización de Secado en Inventario (Evolución Idea 28). Implementación de indicador visual (icono) en el inventario de bobinas para materiales higroscópicos, con Tooltip interactivo de instrucciones de secado, y consulta automática del clima cada 12 horas guardando la ubicación en base de datos.
*   **[Completado]** Sincronización Server-Side Farm3D (Hotfix). Se eliminó el middleware `persist` de `useFarm3D` y `useCadVault` que estaba causando sobrescrituras destructivas en MongoDB (Race Condition) al abrir navegadores nuevos. Ahora la flota y el inventario de bobinas son estables en la nube.

## Siguientes Pasos: Fase 9 - Escalabilidad de Manufactura 3D
*   **[Completado]** Bóveda de Archivos CAD y G-Code (Idea 24 & 32). Gestor completo con visor WebGL.
*   **[En Progreso]** Evolución de la Bóveda CAD a "Explorador de Archivos". Implementación de jerarquía de carpetas (`CadFolder`), vista de lista detallada, selección múltiple y menús contextuales para mover y organizar modelos 3D y G-Codes dentro de cada proyecto.
*   **[Completado]** Layout Isométrico 3D de la Granja (Idea 9). Mapa 3D interactivo con zoom, paneo, gizmos de rotación y acomodo (Drag & Drop), soporte de muros, puertas y visualización de impresoras en estantes multinivel.
*   **[Completado]** Órdenes Multi-Parte y Multi-Instancia (Idea 11). Integración del multiplicador "Piezas por Cama" para registrar camas enteras simultáneamente descontando el material proporcional, y campo "Grupo de Ensamble" para vincular piezas de un mismo proyecto (Padre-Hijo).
*   **[Completado]** Motor de Rotación 3D del Layout. Soporte para orientar impresoras y elementos arquitectónicos en 4 direcciones (0°, 90°, 180°, 270°) mediante menú de control contextual y un botón circular in-situ en el Gizmo de movimiento respetando la iluminación proyectada original.
*   **[Completado]** Modo Constructor Isométrico. Rediseño del sistema de decoración para permitir dibujar paredes de un solo bloque continuo (Punto A al Punto B) con previsualización fantasma (Ghost Preview) y alineación perfecta a la cuadrícula, eliminando segmentación y optimizando el rendimiento web.
*   **[Completado]** Sistema Anticolisiones Drag & Drop 3D. Durante el arrastre de impresoras o elementos decorativos, el resto de la granja se vuelve semi-transparente y permeable al ratón, garantizando un posicionamiento preciso y libre de bloqueos geométricos.
*   **[Descartado]** Integración Hardware Raise3D Pro3 (Idea 15). Cancelado debido a la política de ecosistema cerrado y bloqueo corporativo de APIs (Tokens Enterprise).
*   **[En Progreso]** Slicer Integrado / G-Code Parser (Idea 8). Implementación de lector nativo de archivos `.gcode` para extraer tiempo estimado (ETA), consumo de gramos y material, sustituyendo la dependencia a APIs externas y estableciendo la base del Gemelo Digital Predictivo.
*   **[Completado] Sinergia CAD-Granja:** Vinculación directa de Proyectos de la Bóveda CAD hacia las Órdenes de Producción (Midas 3D). Implementación de un Combobox (Buscador Inteligente) que auto-rellena datos, y un modal de "Archivos de Fabricación" inyectado en el Dashboard del operador con previsualización WebGL in-situ.
*   **[Completado] Lista de Materiales (BOM) en Órdenes:** Integración del campo "Material Predeterminado" en los proyectos CAD. Al vincularlos a una orden de producción, el material se auto-rellena. Además, los "Accesorios" vinculados desde la Librería se muestran segregados como una "Lista de Materiales (BOM)" en el panel del operador.
*   **[Completado] Archivo Asignado a Impresora:** Selector de "Archivo/Modelo" directamente en la tarjeta de la impresora para elegir el G-Code o STL específico del proyecto. Bloqueo estricto del material en el selector de bobinas cuando la orden requiere uno en específico.
*   **[Completado] Selector de Bobinas Inteligente:** Implementación de reglas estrictas en la selección de bobinas por impresora. El selector filtra por material predeterminado del CAD, bloquea bobinas asignadas a otras máquinas e informa gráficamente los gramos restantes y el ShortID para una trazabilidad perfecta.
*   **[Completado] Exclusión de Accesorios en Producción:** Bloqueo de la contabilización de piezas cuando la impresora tiene asignado un archivo tipo "Accesorio Vinculado", dado que estos no son indispensables para completar la meta del proyecto. Se incluye un botón especial para "Registrar Accesorio" que descuenta el material de la bobina sin alterar la meta de la orden padre.
*   **[Completado] Metadatos de Producción en Bóveda CAD:** Ampliar el modelo de archivos en la Bóveda CAD para incluir "Peso en gramos (Material Requerido)" y "Tiempo Estimado". Al subir una nueva versión de un archivo, los campos se autocompletan con los valores de la versión anterior heredando las propiedades, y se muestran de forma estética bajo el nombre de los archivos en el explorador.

## Backlog / En Espera:

### Fase 3: Notificaciones e Integraciones Externas (Pausado indefinidamente)
**Objetivo:** Conectar el sistema hacia afuera para mejorar la comunicación.
- **Notificaciones por WhatsApp:** Añadir una opción rápida para enviar la URL pública del PDF de la cotización directamente al WhatsApp del cliente con un mensaje predefinido.
- **Despliegue a Producción:** Preparar todo para subir Midas ERP a la nube usando la guía `deploy.md`, habilitando el trabajo colaborativo real.
