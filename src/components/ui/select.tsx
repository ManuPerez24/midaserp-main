"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectItemInfo = { value: string; label: string; disabled?: boolean };

type SelectContextValue = {
  value?: string;
  open: boolean;
  disabled?: boolean;
  selectedLabel?: string;
  triggerRect: DOMRect | null;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  setOpen: (open: boolean) => void;
  selectValue: (value: string) => void;
};

type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
};

const SELECT_ITEM_NAME = "SelectItem";
const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(component: string) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error(`${component} must be used within Select`);
  return context;
}

function textFromNode(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join(" ").trim();
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return textFromNode(node.props.children);
  }
  return "";
}

function collectItems(node: React.ReactNode): SelectItemInfo[] {
  const items: SelectItemInfo[] = [];
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement<{ value?: string; disabled?: boolean; children?: React.ReactNode }>(child)) {
      return;
    }
    if ((child.type as { displayName?: string }).displayName === SELECT_ITEM_NAME && child.props.value) {
      items.push({
        value: child.props.value,
        label: textFromNode(child.props.children) || child.props.value,
        disabled: child.props.disabled,
      });
      return;
    }
    items.push(...collectItems(child.props.children));
  });
  return items;
}

function Select({ value: controlledValue, defaultValue, onValueChange, disabled, children }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const value = controlledValue ?? internalValue;
  const items = React.useMemo(() => collectItems(children), [children]);
  const selectedLabel = items.find((item) => item.value === value)?.label;

  const updatePosition = React.useCallback(() => {
    if (triggerRef.current) setTriggerRect(triggerRef.current.getBoundingClientRect());
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, updatePosition]);

  const selectValue = React.useCallback(
    (nextValue: string) => {
      if (controlledValue === undefined) setInternalValue(nextValue);
      onValueChange?.(nextValue);
      setOpen(false);
    },
    [controlledValue, onValueChange],
  );

  return (
    <SelectContext.Provider
      value={{
        value,
        open,
        disabled,
        selectedLabel,
        triggerRect,
        triggerRef,
        contentRef,
        setOpen,
        selectValue,
      }}
    >
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  );
}

const SelectGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={className} {...props} />,
);
SelectGroup.displayName = "SelectGroup";

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value, selectedLabel } = useSelectContext("SelectValue");
  return <span className="truncate">{selectedLabel ?? value ?? placeholder}</span>;
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, disabled, onClick, ...props }, ref) => {
  const context = useSelectContext("SelectTrigger");

  return (
    <button
      ref={(node) => {
        context.triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type="button"
      role="combobox"
      aria-expanded={context.open}
      disabled={disabled || context.disabled}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.setOpen(!context.open);
      }}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}>
      <ChevronUp className="h-4 w-4" />
    </div>
  ),
);
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}>
      <ChevronDown className="h-4 w-4" />
    </div>
  ),
);
SelectScrollDownButton.displayName = "SelectScrollDownButton";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { position?: "popper" | "item-aligned" }
>(({ className, children, ...props }, ref) => {
  const context = useSelectContext("SelectContent");

  if (!context.open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={(node) => {
        context.contentRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "fixed z-50 max-h-72 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className,
      )}
      style={{
        top: (context.triggerRect?.bottom ?? 0) + 4,
        left: context.triggerRect?.left ?? 0,
        width: context.triggerRect?.width,
        pointerEvents: "auto",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
});
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
  ),
);
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, children, value, disabled, onClick, ...props }, ref) => {
  const context = useSelectContext("SelectItem");
  const selected = context.value === value;

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.selectValue(value);
      }}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        {selected && <Check className="h-4 w-4" />}
      </span>
      <span>{children}</span>
    </button>
  );
});
SelectItem.displayName = SELECT_ITEM_NAME;

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
  ),
);
SelectSeparator.displayName = "SelectSeparator";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
