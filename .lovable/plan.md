# Plan en 3 iteraciones

Saltamos el refactor `src/server → src/api` (no arregla nada real). Vamos en el orden que elegiste: **C → B → A**. Cada iteración es independiente y se puede aprobar/pausar por separado para cuidar créditos.

---

## Iteración C — Scroll vertical en popups con tablas

**Objetivo:** ningún Dialog que contenga tabla/lista larga debe cortar contenido en pantallas pequeñas.

**Archivos a auditar y ajustar:**
- `src/components/purchase-lists-dialog.tsx`
- `src/components/price-history-dialog.tsx`
- `src/components/labels-dialog.tsx`
- `src/components/quote-edit-dialog.tsx`
- `src/components/analyze-supplier-quote-dialog.tsx` (verificar — ya tocado)
- Diálogos inline en: `routes/inventario.tsx`, `routes/cotizaciones.tsx`, `routes/cotizaciones-proveedores.tsx`, `routes/clientes.tsx`, `routes/kits.tsx`, `routes/usuarios.tsx`, `routes/ajustes.tsx`

**Patrón aplicado:**
- `DialogContent` → `flex flex-col max-h-[90vh]`
- Contenedor de tabla → `flex-1 min-h-0 overflow-y-auto` (o `max-h-[60vh] overflow-y-auto` si el dialog no es flex-column)
- Headers de tabla → `sticky top-0 bg-background z-10`
- Footer del dialog → fuera del área scrollable

---

## Iteración B — Limpieza de huérfanos + gestión de unidades

**B.1 – Limpieza automática de huérfanos**
- En `src/stores/settings.ts`: añadir acción `pruneOrphans(usedCategories, usedSuppliers, usedUnits)` que filtra listas dejando solo valores en uso.
- En `routes/ajustes.tsx` (sección de mantenimiento/limpieza): botón "Limpiar registros huérfanos" que recolecta categorías/proveedores/unidades realmente usadas en `inventory.products` + `supplier-quotes` y llama `pruneOrphans`.
- También ejecutar al final de "Limpieza de base de datos" existente, si aplica.
- Toast con resumen: "Eliminadas X categorías, Y proveedores, Z unidades sin uso."

**B.2 – Gestión de unidades en formularios**
- Auditar formularios donde se ingresa unidad: `product-form.tsx`, `quote-edit-dialog.tsx`, `analyze-supplier-quote-dialog.tsx`, formulario de kits.
- Patrón uniforme: input + botón "+" → llama `useSettings.getState().addUnit(value)` → el `Select` se refresca por suscripción (Zustand) → la nueva unidad queda persistida vía `registerServerStore` (ya existente para settings, shared).
- Mismo patrón aplicado a categorías y proveedores donde falte.

---

## Iteración A — Edición en cotizaciones y kits

**A.1 – Editar/borrar productos en popup de cotización**
- En `src/components/quote-edit-dialog.tsx` (o `routes/cotizaciones.$id.tsx`):
  - Cada línea del detalle: botones "Editar" (precio/cantidad/descripción inline) y "Eliminar".
  - Recalcular subtotales/IVA/total en el store al modificar.
  - Persistencia vía store existente (`stores/quotes.ts`) → ya se sincroniza por `registerServerStore`.

**A.2 – Editar Kits**
- En el dialog de detalles de Kit (`routes/kits.tsx`):
  - Modo edición de campos: nombre, descripción, categoría/metadatos.
  - Guardar con acción `useKits.update(id, patch)` (añadir si no existe en `stores/kits.ts`).
  - Persistencia automática por la sincronización del store.
- No se necesitan Server Functions nuevas: el sync de stores ya guarda en MongoDB vía `saveUserData`.

---

## Detalles técnicos

- **Sin nuevas Server Functions** salvo que aparezca un caso real: los stores Zustand ya están enlazados a `saveUserData` (debounce 400ms) — mutar el store ya persiste y refresca la UI.
- **TanStack Query** no se usa ampliamente en este proyecto (datos vienen de stores Zustand hidratados al login). No hay caché que invalidar; la reactividad la da Zustand.
- **TypeScript estricto:** sin `any`, tipos en parámetros de nuevas acciones del store.
- **Estética:** mismos componentes shadcn (`Button`, `Input`, `Dialog`, `Table`) y tokens de color ya en uso.

---

## Notas sobre el refactor descartado

Mover `*.functions.ts` a `src/api/` no aporta seguridad ni corrige errores: TanStack Start ya separa cliente/servidor por nombre de archivo (`*.server.ts` está bloqueado al cliente, `*.functions.ts` se transforma a stub RPC). Los componentes que importan de `src/server/*.functions.ts` están haciendo lo correcto. Si en el futuro quieres el cambio cosmético, lo podemos retomar en una iteración aparte.

---

¿Empezamos por la **Iteración C** sola, o quieres aprobar C+B juntas?
