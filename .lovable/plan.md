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

---

## Siguientes Pasos: Fase 5 - Módulo de Proyectos (Gantt, Kanban y Levantamiento)
**Objetivo:** Crear un puente entre las ventas (Cotizaciones) y la ejecución, gestionando levantamientos, tareas y consumo de inventario.

*   **[Completado] Paso 1: Store y Listado.** Crear `useProjects` (Zustand) y la vista principal `/proyectos` con la tabla y tarjetas de proyectos.
*   **[Completado] Paso 2: Pantalla de Levantamiento y Explorador.** Formulario dinámico, notas técnicas y un Explorador de Archivos responsivo (Mobile-first) con vista previa interactiva, cálculo de peso, filtros, y almacenamiento local en Node.js (`public/uploads/`).
*   **[Completado] Paso 3: Vinculación con Cotizaciones.** Interfaz dentro del proyecto para buscar y enlazar cotizaciones existentes de `useQuotes` leyendo directamente sus partidas, incluyendo sumatoria dinámica con impuestos.
*   **[Completado] Paso 4: Tarea Activa y Consumo.** Integrar el proyecto al banner de "Tarea Activa" para descontar material del inventario gradualmente y sumarlo al costo del proyecto.
*   **[Completado] Paso 5: Gantt y Kanban.** Tablero Kanban interactivo y una **Página de Cronograma (Gantt) dedicada** a pantalla completa (`/proyectos/$id`) con repogramación rápida y línea de "Hoy".
*   **[Completado] Paso 5.1: Gantt Avanzado (CSS Grid & SVG).** Creación in-situ, auto-enfoque a "Hoy", barras con progreso bi-tono (70/30%), Avatares de recursos circulares, y conexión de tareas interdependientes mediante vectores SVG en ángulo de 90°.

---

## Backlog / En Espera:

### Fase 3: Notificaciones e Integraciones Externas (Pausado indefinidamente)
**Objetivo:** Conectar el sistema hacia afuera para mejorar la comunicación.
- **Notificaciones por WhatsApp:** Añadir una opción rápida para enviar la URL pública del PDF de la cotización directamente al WhatsApp del cliente con un mensaje predefinido.
- **Despliegue a Producción:** Preparar todo para subir Midas ERP a la nube usando la guía `deploy.md`, habilitando el trabajo colaborativo real.
