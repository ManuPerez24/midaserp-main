import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

const LABELS: Record<string, string> = {
  header: "Encabezado (Logo y Folio)",
  client: "Datos del Cliente",
  table: "Tabla de Productos",
  totals: "Totales y Comentarios",
  notes: "Notas Adicionales",
  terms: "Términos y Condiciones",
};

function SortableRow({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-md border bg-background p-3 shadow-sm hover:border-primary/50 transition-colors">
      <button type="button" className="cursor-grab active:cursor-grabbing touch-none p-1 text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="font-medium text-sm">{LABELS[id] || id}</span>
    </div>
  );
}

export function SortablePdfLayout({ layout, onChange }: { layout: string[]; onChange: (next: string[]) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = layout.indexOf(active.id as string);
    const newIdx = layout.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    onChange(arrayMove(layout, oldIdx, newIdx));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={layout} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 max-w-sm">
          {layout.map((id) => (
            <SortableRow key={id} id={id} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}