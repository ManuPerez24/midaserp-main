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

## Instrucción de Activación
Cuando el usuario mencione "ai-instructions", "lee las instrucciones", "recuerda las reglas" o **simplemente confirme que un código funcionó**, el asistente DEBE **obligatoriamente**:
1. Confirmar la recepción.
2. Proveer los diffs para actualizar `plan.md` y reanalizar el sistema para actualizar `architecture.md` con los últimos cambios.
3. Indicar el siguiente paso a programar.