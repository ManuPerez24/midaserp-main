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

## Backlog / En Espera:

### Fase 3: Notificaciones e Integraciones Externas (Pausado indefinidamente)
**Objetivo:** Conectar el sistema hacia afuera para mejorar la comunicación.
- **Notificaciones por WhatsApp:** Añadir una opción rápida para enviar la URL pública del PDF de la cotización directamente al WhatsApp del cliente con un mensaje predefinido.
- **Despliegue a Producción:** Preparar todo para subir Midas ERP a la nube usando la guía `deploy.md`, habilitando el trabajo colaborativo real.
