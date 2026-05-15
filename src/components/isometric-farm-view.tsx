import { useState, useEffect, useRef, useMemo } from "react";
import { useFarm3D } from "@/stores/3d-farm";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, RefreshCw, Move, Maximize, Wrench } from "lucide-react";
import { v4 as uuid } from "uuid";

export function IsometricFarmView({ printers, onPrinterClick }: { printers: any[], onPrinterClick: (p: any) => void }) {
  const [positions, setPositions] = useState<Record<string, {x: number, y: number}>>({});
  const updatePrinter = useFarm3D(s => s.updatePrinter);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [panning, setPanning] = useState<{ startX: number, startY: number, initPanX: number, initPanY: number } | null>(null);
  const [gizmoDragging, setGizmoDragging] = useState<{ id: string, axis: 'x' | 'y', startX: number, startY: number, initX: number, initY: number, isDeco: boolean } | null>(null);

  const isDraggingRef = useRef(false);
  const [decorations, setDecorations] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('midas_farm_deco') || '[]'); } catch { return []; }
  });
  const [buildTool, setBuildTool] = useState<string | null>(null);
  const [ghostPreview, setGhostPreview] = useState<any[] | null>(null);
  const [drawingState, setDrawingState] = useState<{ startPoint: {x: number, y: number} } | null>(null);
  const [moveMode, setMoveMode] = useState(false);
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null);
  const isDecoSelected = selectedMoveId ? decorations.some(d => d.id === selectedMoveId) : false;

  const positionsRef = useRef(positions);
  useEffect(() => { positionsRef.current = positions; }, [positions]);

  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    printers.forEach((p, i) => {
      const defaultX = (i % 5) * 160 + 80;
      const defaultY = Math.floor(i / 5) * 160 + 80;
      const pos = positions[p.id] || { x: (p as any).posX ?? defaultX, y: (p as any).posY ?? defaultY };
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y > maxY) maxY = pos.y;
    });
    decorations.forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.x > maxX) maxX = d.x;
      if (d.y > maxY) maxY = d.y;
    });

    if (minX === Infinity) {
      minX = 3000; minY = 3000; maxX = 3000; maxY = 3000;
    }

    const w = Math.max(800, maxX - minX);
    const h = Math.max(800, maxY - minY);
    const floorSize = Math.max(w, h) + 1400; // Margen dinámico alrededor de todos los elementos

    return {
      minX, minY, maxX, maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: w,
      height: h,
      floorSize
    };
  }, [printers, decorations, positions]);

  const handleAutoFit = () => {
    const dx = bounds.centerX - 3000;
    const dy = bounds.centerY - 3000;
    if (!containerRef.current) return;
    
    // Corrección: Matriz de proyección isométrica exacta
    const screenX = (dx + dy) * Math.cos(Math.PI / 4);
    const screenY = (dy - dx) * Math.cos(Math.PI / 4) * Math.cos(Math.PI / 3);
    setPan({ x: -screenX, y: -screenY });

    if (containerRef.current) {
      const isoWidth = (bounds.width + bounds.height) * 0.707;
      const isoHeight = (bounds.width + bounds.height) * 0.707 * 0.5 + 300;
      const zoomX = containerRef.current.clientWidth / (isoWidth + 250);
      const zoomY = containerRef.current.clientHeight / (isoHeight + 250);
      setZoom(Math.min(Math.max(0.2, Math.min(zoomX, zoomY)), 2));
    }
  };

  useEffect(() => {
    const t = setTimeout(() => handleAutoFit(), 100);
    return () => clearTimeout(t);
  }, []); // Solo al montar

  // Intercepción no-pasiva para bloquear el scroll de la página al hacer zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(Math.max(0.3, z - e.deltaY * 0.001), 2));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    localStorage.setItem('midas_farm_deco', JSON.stringify(decorations));
  }, [decorations]);


  useEffect(() => {
    if (gizmoDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        if (Math.abs(e.clientX - gizmoDragging.startX) > 3 || Math.abs(e.clientY - gizmoDragging.startY) > 3) {
          isDraggingRef.current = true;
        }
        const dx = (e.clientX - gizmoDragging.startX) / zoom;
        const dy = (e.clientY - gizmoDragging.startY) / zoom;
        
        let newX = gizmoDragging.initX;
        let newY = gizmoDragging.initY;

        // Proyección isométrica ajustada para que el drag se sienta natural
        if (gizmoDragging.axis === 'x') {
          const rawX = gizmoDragging.initX + (dx - dy * 2) * 0.707;
          newX = Math.round(rawX / (gizmoDragging.isDeco ? 20 : 40)) * (gizmoDragging.isDeco ? 20 : 40);
        } else {
          const rawY = gizmoDragging.initY + (dx + dy * 2) * 0.707;
          newY = Math.round(rawY / (gizmoDragging.isDeco ? 20 : 40)) * (gizmoDragging.isDeco ? 20 : 40);
        }

        if (gizmoDragging.isDeco) {
           setDecorations(prev => prev.map(dec => dec.id === gizmoDragging.id ? { ...dec, x: newX, y: newY } : dec));
        } else {
           setPositions(prev => ({ ...prev, [gizmoDragging.id]: { x: newX, y: newY } }));
        }
      };
      const handleMouseUp = () => {
         setGizmoDragging(prev => {
            if (prev && !prev.isDeco) {
                const finalPos = positionsRef.current[prev.id];
                if (finalPos) updatePrinter(prev.id, { posX: finalPos.x, posY: finalPos.y } as any);
            }
            return null;
         });
         setTimeout(() => { isDraggingRef.current = false; }, 50);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [gizmoDragging, zoom, updatePrinter]);

  const handleDecoClick = (id: string, e: any) => {
    const buildMode = !!buildTool;
    if (moveMode) {
       setSelectedMoveId(selectedMoveId === id ? null : id);
       return;
    }
    if (!buildMode) return;
    
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
       setDecorations(prev => prev.filter(d => d.id !== id));
    } else {
       setDecorations(prev => prev.map(d => {
         if (d.id === id) {
            let nType = d.type;
            if (nType === 'wall-x') nType = 'wall-y';
            else if (nType === 'wall-y') nType = 'wall-x';
            else if (nType === 'door-x') nType = 'door-y';
            else if (nType === 'door-y') nType = 'door-x';
            return { ...d, type: nType };
         }
         return d;
       }));
    }
  };

  const handleFloorMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!buildTool) {
        if (ghostPreview) setGhostPreview(null);
        return;
    }
    let target = e.nativeEvent.target as HTMLElement;
    let x = e.nativeEvent.offsetX;
    let y = e.nativeEvent.offsetY;

    while (target && target !== e.currentTarget) {
        x += target.offsetLeft || 0;
        y += target.offsetTop || 0;
        target = target.offsetParent as HTMLElement;
    }
    
    const rawX = x - 3000;
    const rawY = y - 3000;
    const snappedX = Math.round(rawX / 20) * 20;
    const snappedY = Math.round(rawY / 20) * 20;

    if (drawingState) { // We are in the middle of drawing a line
      const startPoint = drawingState.startPoint;
      const endPoint = { x: snappedX, y: snappedY };
      
      const deltaX = endPoint.x - startPoint.x;
      const deltaY = endPoint.y - startPoint.y;

      const newGhosts: any[] = [];
      const type = buildTool; // 'wall' or 'door'

      if (Math.abs(deltaX) > Math.abs(deltaY)) { // Horizontal line
        const numSegments = Math.abs(deltaX) / 20;
        const direction = Math.sign(deltaX);
        for (let i = 0; i < numSegments; i++) {
          newGhosts.push({ id: `ghost-${i}`, type: `${type}-x`, x: startPoint.x + (i * 20 * direction), y: startPoint.y });
        }
      } else { // Vertical line
        const numSegments = Math.abs(deltaY) / 20;
        const direction = Math.sign(deltaY);
        for (let i = 0; i < numSegments; i++) {
          newGhosts.push({ id: `ghost-${i}`, type: `${type}-y`, x: startPoint.x, y: startPoint.y + (i * 20 * direction) });
        }
      }
      setGhostPreview(newGhosts);
    } else { // Just hovering, show a single piece
      setGhostPreview([{ id: 'ghost', type: `${buildTool}-x`, x: snappedX, y: snappedY }]);
    }
  };

  const handleFloorClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDraggingRef.current) return;
      
      if (buildTool) {
          let target = e.nativeEvent.target as HTMLElement;
          let x = e.nativeEvent.offsetX;
          let y = e.nativeEvent.offsetY;

          while (target && target !== e.currentTarget) {
              x += target.offsetLeft || 0;
              y += target.offsetTop || 0;
              target = target.offsetParent as HTMLElement;
          }
          const rawX = x - 3000;
          const rawY = y - 3000;
          const snappedX = Math.round(rawX / 20) * 20;
          const snappedY = Math.round(rawY / 20) * 20;

          if (drawingState) { // This is the second click (Point B)
            if (ghostPreview && ghostPreview.length > 0) {
              const newDecos = ghostPreview.map(g => ({ ...g, id: uuid() }));
              setDecorations(prev => [...prev, ...newDecos]);
            }
            setDrawingState(null);
            setGhostPreview(null);
            if (!e.shiftKey) {
              setBuildTool(null);
            }
          } else { // This is the first click (Point A)
            setDrawingState({ startPoint: { x: snappedX, y: snappedY } });
          }
      } else {
          setSelectedMoveId(null);
          setDrawingState(null);
          setGhostPreview(null);
      }
  };

  useEffect(() => {
    if (panning) {
      const handleMouseMove = (e: MouseEvent) => {
        if (Math.abs(e.clientX - panning.startX) > 3 || Math.abs(e.clientY - panning.startY) > 3) {
          isDraggingRef.current = true;
        }
        setPan({
          x: panning.initPanX + (e.clientX - panning.startX) / zoom,
          y: panning.initPanY + (e.clientY - panning.startY) / zoom
        });
      };
      const handleMouseUp = () => {
        setPanning(null);
        setTimeout(() => { isDraggingRef.current = false; }, 50);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [panning, zoom]);

  return (
    <div 
       ref={containerRef}
       className="relative w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden shadow-inner cursor-grab active:cursor-grabbing select-none"
       onMouseDown={(e) => {
         if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest(".pointer-events-auto")) return;
         setPanning({ startX: e.clientX, startY: e.clientY, initPanX: pan.x, initPanY: pan.y });
       }}
    >
       <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
         <div className="bg-background/80 backdrop-blur text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm border">
           Rueda: Zoom · Clic Izq: Mover Cámara · Modo Mover: Arrastra flechas
         </div>
         {buildTool && <div className="text-xs font-semibold bg-primary/20 text-primary-foreground px-2 py-1 rounded-md mt-2 shadow-md animate-pulse">Modo Constructor Activo (Shift para colocar múltiples)</div>}
       </div>

       <div className="absolute top-4 right-4 z-10 pointer-events-auto flex gap-2">
          {isDecoSelected && (
            <Button variant="destructive" size="sm" className="shadow-md" onClick={() => {
              setDecorations(prev => prev.filter(d => d.id !== selectedMoveId));
              setSelectedMoveId(null);
            }}>
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
          )}
          <Button variant="secondary" size="sm" className="shadow-md" onClick={handleAutoFit}>
             <Maximize className="h-4 w-4 mr-2" /> Centrar
          </Button>
          <Button variant={moveMode ? "default" : "secondary"} size="sm" className="shadow-md" onClick={() => { setMoveMode(!moveMode); setBuildTool(null); setSelectedMoveId(null); }}>
             <Move className="h-4 w-4 mr-2" /> {moveMode ? "Salir de Mover" : "Modo Mover"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={buildTool ? "default" : "secondary"} size="sm" className="shadow-md">
                <Wrench className="h-4 w-4 mr-2" /> {buildTool ? "Construyendo..." : "Constructor"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setBuildTool('wall'); setMoveMode(false); setDrawingState(null); }}>Pared</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setBuildTool('door'); setMoveMode(false); setDrawingState(null); }}>Puerta</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { if(confirm("¿Eliminar todas las paredes y puertas?")) setDecorations([]); }}>Limpiar Todo</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setBuildTool(null); setDrawingState(null); setGhostPreview(null); }} className="text-destructive focus:bg-destructive/20 focus:text-destructive-foreground">Salir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
       </div>
       
       <div className="absolute top-1/2 left-1/2" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}>
         <div 
            className="iso-floor absolute cursor-grab active:cursor-grabbing"
            style={{ transform: "rotateX(60deg) rotateZ(-45deg)", transformStyle: "preserve-3d", width: 6000, height: 6000, marginLeft: -3000, marginTop: -3000 }}
            onClick={handleFloorClick}
            onMouseMove={handleFloorMouseMove}
            onMouseLeave={() => setGhostPreview(null)}
         >
            <div 
               className="absolute bg-slate-800/80 transition-all duration-700 ease-in-out border border-slate-700/30 rounded-full" 
               style={{ 
                   left: bounds.centerX - bounds.floorSize / 2,
                   top: bounds.centerY - bounds.floorSize / 2,
                   width: bounds.floorSize, 
                   height: bounds.floorSize,
                   backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.05) 2px, transparent 2px)', 
                   backgroundSize: '40px 40px', 
                   backgroundPosition: `${-(bounds.centerX - bounds.floorSize / 2)}px ${-(bounds.centerY - bounds.floorSize / 2)}px`,
                   maskImage: 'radial-gradient(circle at center, black 15%, transparent 60%)', 
                   WebkitMaskImage: 'radial-gradient(circle at center, black 15%, transparent 60%)' 
               }} 
            />
            {ghostPreview && ghostPreview.map(g => (
                <IsoWall 
                    key={g.id}
                    deco={g} 
                    buildMode={true}
                    isGhost={true}
                />
            ))}
            {decorations.map((d) => (
              <IsoWall 
                key={d.id} 
                deco={d} 
                buildMode={!!buildTool}
                moveMode={moveMode}
                isMoving={selectedMoveId === d.id}
                isOtherMoving={selectedMoveId !== null && selectedMoveId !== d.id}
                isBuilding={!!buildTool}
                onDragStart={(axis: 'x'|'y', e: React.MouseEvent) => {
                   setGizmoDragging({ id: d.id, axis, startX: e.clientX, startY: e.clientY, initX: d.x, initY: d.y, isDeco: true });
                }}
                onClick={(e: any) => { e.stopPropagation(); handleDecoClick(d.id, e); }}
             onRotate={() => {
                setDecorations(prev => prev.map(dec => {
                   if (dec.id === d.id) {
                      let nType = dec.type;
                      if (nType === 'wall-x') nType = 'wall-y';
                      else if (nType === 'wall-y') nType = 'wall-x';
                      else if (nType === 'door-x') nType = 'door-y';
                      else if (nType === 'door-y') nType = 'door-x';
                      return { ...dec, type: nType };
                   }
                   return dec;
                }));
             }}
              />
            ))}
            {printers.map((p, i) => {
               const pos = positions[p.id] || { x: (p as any).posX ?? (i % 5) * 160 + 80, y: (p as any).posY ?? Math.floor(i / 5) * 160 + 80 };
               return (
                 <IsoPrinter 
                   key={p.id} 
                   printer={p} 
                   x={pos.x} 
                   y={pos.y} 
                   isMoving={selectedMoveId === p.id}
                   isOtherMoving={selectedMoveId !== null && selectedMoveId !== p.id}
                   isBuilding={!!buildTool}
                   onDragStart={(axis: 'x'|'y', e: React.MouseEvent) => {
                      setGizmoDragging({ id: p.id, axis, startX: e.clientX, startY: e.clientY, initX: pos.x, initY: pos.y, isDeco: false });
                   }}
                   onClick={(e: any) => {
                      e.stopPropagation();
                      if (moveMode) {
                        setSelectedMoveId(selectedMoveId === p.id ? null : p.id);
                      } else if (!buildTool) {
                        onPrinterClick(p);
                      }
                   }}
              onRotate={() => {
                 const currentRot = (p as any).rotation || 0;
                 updatePrinter(p.id, { rotation: (currentRot + 90) % 360 } as any);
              }}
                 />
               );
            })}
         </div>
       </div>
    </div>
  )
}

export function IsoPrinter({ printer, x, y, onClick, isMoving, isOtherMoving, onDragStart, onRotate, isBuilding }: any) {
  let color = "bg-slate-600"; let topColor = "bg-slate-500"; let rightColor = "bg-slate-700";
  if (printer.state === "Imprimiendo") { color = "bg-emerald-600"; topColor = "bg-emerald-500"; rightColor = "bg-emerald-700"; } 
  else if (printer.state === "Pausada") { color = "bg-amber-600"; topColor = "bg-amber-500"; rightColor = "bg-amber-700"; } 
  else if (printer.state === "Mantenimiento") { color = "bg-rose-600"; topColor = "bg-rose-500"; rightColor = "bg-rose-700"; }
  const isTall = printer.isTall || printer.model?.toLowerCase().includes("plus");
  const zHeight = isTall ? 180 : 100;
  const zPos = (printer as any).posZ || 0;
  const rotation = printer.rotation || 0;

  return (
    <div 
      className={`absolute w-[80px] h-[80px] group ${isMoving ? 'z-[100]' : 'transition-all duration-300 z-10'} ${isOtherMoving ? 'opacity-30 pointer-events-none' : ''} ${isBuilding ? 'pointer-events-none' : ''} ${onClick && !isOtherMoving ? 'cursor-pointer' : ''}`}
      style={{ transform: `translate3d(${x}px, ${y}px, ${zPos}px)`, transformStyle: "preserve-3d" }}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/60 blur-md transform translate-x-6 translate-y-6" style={{ transform: `translateZ(${-1 - zPos}px) translateX(20px) translateY(20px)` }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max max-w-[200px] p-1.5 px-3 bg-background/90 backdrop-blur-sm border rounded-lg shadow-xl text-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-40" style={{ transform: `translateZ(${zHeight + 50}px) rotateZ(45deg) rotateX(-60deg)`}}>
        <p className="font-bold text-xs truncate">{printer.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{printer.model}</p>
      </div>
      {printer.state === "Imprimiendo" && (<div className="absolute -inset-4 bg-emerald-500/40 blur-xl transform rounded-full" style={{ transform: "translateZ(-1px)" }}></div>)}
      
      <div className="absolute inset-0 transition-transform duration-300" style={{ transform: `rotateZ(${rotation}deg)`, transformStyle: "preserve-3d" }}>
        <div className={`absolute inset-0 ${color} group-hover:brightness-110 transition-all`} />
        <div className={`absolute left-0 origin-left ${rightColor} border border-black/20 group-hover:brightness-110 transition-all`} style={{ width: zHeight, height: '80px', transform: "rotateY(-90deg)" }} />
        <div className={`absolute top-0 w-[80px] origin-top ${color} border border-black/20 group-hover:brightness-110 transition-all`} style={{ height: zHeight, transform: "rotateX(90deg)" }} />
        <div className={`absolute bottom-0 w-[80px] origin-bottom ${color} border border-black/20 group-hover:brightness-110 transition-all`} style={{ height: zHeight, transform: "rotateX(-90deg)" }} />
        <div className={`absolute w-[80px] h-[80px] ${topColor} border border-black/20 flex items-center justify-center group-hover:bg-primary/80 transition-all group-hover:brightness-110`} style={{ transform: `translateZ(${zHeight}px)` }}>
           <div className="w-[60px] h-[60px] bg-slate-800 border-2 border-slate-900 rounded flex items-center justify-center relative shadow-inner overflow-hidden">
             {printer.state === "Imprimiendo" && (
                <>
                 <div className="absolute bottom-2 left-2 right-2 h-[4px] bg-emerald-500/80 rounded-sm shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" style={{ transform: "translateZ(2px)" }} />
                </>
             )}
             {printer.state === "Pausada" && <div className="absolute bottom-2 left-2 right-2 h-[4px] bg-amber-500/80 rounded-sm" />}
             {printer.state === "Mantenimiento" && <div className="absolute inset-0 flex items-center justify-center bg-rose-500/20"><div className="w-6 h-1 bg-rose-500 rotate-45" /><div className="absolute w-6 h-1 bg-rose-500 -rotate-45" /></div>}
           </div>
        </div>
      </div>
      {isMoving && <GizmoArrows onDragStart={onDragStart} onRotate={onRotate} zHeight={zHeight} />}
    </div>
  )
}

export function IsoWall({ deco, onClick, buildMode, moveMode, isMoving, isOtherMoving, onDragStart, onRotate, isGhost, isBuilding }: any) {
  const isX = deco.type === 'wall-x' || deco.type === 'door-x';
  const isDoor = deco.type.startsWith('door');
  const w = isX ? (deco.length || 120) : 10;
  const h = isX ? 10 : (deco.length || 120);
  const zHeight = isDoor ? 0 : 100;
  
  // Offset para centrar la pared en el mouse
  const offsetX = isX ? -w / 2 : -5;
  const offsetY = isX ? -5 : -h / 2;
  const color = "bg-slate-300";
  const topColor = "bg-slate-200";
  const rightColor = "bg-slate-400";

  return (
    <div 
      className={`absolute group ${isMoving ? 'z-[100]' : 'transition-all duration-300 z-0'} ${isOtherMoving ? 'opacity-30 pointer-events-none' : ''} ${isBuilding || isGhost ? 'pointer-events-none' : ''} ${onClick && !isOtherMoving ? 'cursor-pointer' : ''} ${isGhost ? 'opacity-50' : ''}`}
      style={{ width: w, height: h, transform: `translate3d(${deco.x + offsetX}px, ${deco.y + offsetY}px, 0)`, transformStyle: "preserve-3d" }}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {isDoor ? (
        <div className="absolute inset-0 bg-amber-900/30 border border-amber-900/50 flex items-center justify-center text-[10px] group-hover:brightness-110 transition-all">
           {buildMode && <span className="opacity-0 group-hover:opacity-100">🚪</span>}
        </div>
      ) : (
        <>
          <div className={`absolute left-0 origin-left ${rightColor} border border-black/10 group-hover:brightness-110 transition-all`} style={{ width: zHeight, height: h, transform: "rotateY(-90deg)" }} />
          <div className={`absolute top-0 w-full origin-top ${color} border border-black/10 group-hover:brightness-110 transition-all`} style={{ height: zHeight, transform: "rotateX(90deg)" }} />
          <div className={`absolute bottom-0 w-full origin-bottom ${color} border border-black/10 group-hover:brightness-110 transition-all`} style={{ height: zHeight, transform: "rotateX(-90deg)" }} />
          <div className={`absolute right-0 origin-right ${rightColor} border border-black/10 group-hover:brightness-110 transition-all`} style={{ width: zHeight, height: h, transform: "rotateY(90deg)" }} />
          <div className={`absolute w-full h-full ${topColor} border border-black/10 flex items-center justify-center group-hover:brightness-110 transition-all`} style={{ transform: `translateZ(${zHeight}px)` }}>
             {buildMode && <span className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground rotate-45 pointer-events-none">🧱</span>}
          </div>
        </>
      )}
      {isMoving && <GizmoArrows onDragStart={onDragStart} onRotate={onRotate} zHeight={zHeight} />}
    </div>
  )
}

export function GizmoArrows({ onDragStart, onRotate, zHeight = 0 }: { onDragStart: (axis: 'x' | 'y', e: React.MouseEvent) => void, onRotate?: () => void, zHeight?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ transform: `translateZ(${zHeight + 20}px)` }}>
      {onRotate && (
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 hover:bg-blue-400 rounded-full shadow flex items-center justify-center text-white cursor-pointer pointer-events-auto border border-blue-700 z-[60] opacity-90 hover:opacity-100 transition-all hover:scale-110"
          onMouseDown={(e) => { e.stopPropagation(); onRotate(); }}
          onClick={(e) => e.stopPropagation()}
          title="Girar 90°"
        >
          <RefreshCw className="h-4 w-4" />
        </div>
      )}
      <div 
        className="absolute top-1/2 -translate-y-1/2 -right-16 w-14 h-10 bg-rose-500 hover:bg-rose-400 rounded-r-full shadow flex items-center justify-center text-white text-[12px] font-black cursor-grab active:cursor-grabbing pointer-events-auto border border-rose-700 z-50 opacity-90 hover:opacity-100 transition-all hover:scale-110"
        onMouseDown={(e) => { e.stopPropagation(); onDragStart('x', e); }}
        onClick={(e) => e.stopPropagation()}
        title="Arrastrar en Eje X"
      >
        ↔ X
      </div>
      <div 
        className="absolute left-1/2 -translate-x-1/2 -bottom-16 h-14 w-10 bg-emerald-500 hover:bg-emerald-400 rounded-b-full shadow flex flex-col items-center justify-center text-white text-[12px] font-black cursor-grab active:cursor-grabbing pointer-events-auto border border-emerald-700 z-50 opacity-90 hover:opacity-100 transition-all hover:scale-110"
        onMouseDown={(e) => { e.stopPropagation(); onDragStart('y', e); }}
        onClick={(e) => e.stopPropagation()}
        title="Arrastrar en Eje Y"
      >
        <span style={{ transform: "rotate(90deg)" }}>↔ Y</span>
      </div>
    </div>
  )
}