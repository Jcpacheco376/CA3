import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';

// --- Hook Reutilizable para detectar columnas del Grid ---
export const useGridColumns = () => {
    const [cols, setCols] = useState(1);
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width >= 1536) setCols(4);      // 2xl
            else if (width >= 1280) setCols(3); // xl
            else if (width >= 768) setCols(2);  // md
            else setCols(1);
        };
        handleResize(); // Inicializar
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return cols;
};

// --- Hook para gestionar el Layout Dinámico (Sincronización y Huecos) ---
export const useDynamicLayout = (
    storageKey: string,
    availableItems: string[], // IDs que deben existir (ej. zonas reales)
    gridColumns: number,
    // Función para calcular cuánto ocupa visualmente cada item (para rellenar huecos)
    getItemVisualSize: (id: string, cols: number) => number 
) => {
    const [layout, setLayout] = useState<(string | null)[]>(() => { 
        try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; } 
    });

    useEffect(() => {
        if (availableItems.length === 0) return;

        setLayout(prevLayout => {
            // 1. Limpiar: Mantener solo items que aún existen o nulls
            let newLayout = prevLayout.map(item => (item && availableItems.includes(item)) ? item : null);
            
            // 2. Agregar nuevos: Buscar primer hueco vacío o añadir al final
            const existingInLayout = new Set(newLayout.filter(Boolean) as string[]);
            const missingItems = availableItems.filter(i => !existingInLayout.has(i));
            
            missingItems.forEach(item => {
                const emptyIndex = newLayout.indexOf(null);
                if (emptyIndex > -1) newLayout[emptyIndex] = item;
                else newLayout.push(item);
            });

            // 3. Calcular espacio visual ocupado
            let occupiedVisualUnits = 0;
            const realItems = newLayout.filter(Boolean) as string[];
            
            realItems.forEach(item => {
                occupiedVisualUnits += getItemVisualSize(item, gridColumns);
            });

            // 4. Calcular slots totales necesarios (Múltiplo de columnas, mínimo 2 filas)
            const minRows = 2;
            const rowsNeeded = Math.ceil(occupiedVisualUnits / gridColumns);
            const targetRows = Math.max(minRows, rowsNeeded);
            const targetVisualUnits = targetRows * gridColumns;
            
            // 5. Ajustar cantidad de slots vacíos (Rellenar o Recortar)
            const neededEmptySlots = Math.max(0, targetVisualUnits - occupiedVisualUnits);
            const currentNulls = newLayout.filter(item => item === null).length;

            if (currentNulls < neededEmptySlots) {
                const toAdd = neededEmptySlots - currentNulls;
                for(let i=0; i<toAdd; i++) newLayout.push(null);
            } else {
                // FIX: Solo eliminar nulls del final para no destruir el layout del usuario (huecos intermedios)
                let i = newLayout.length - 1;
                while (i >= 0 && newLayout[i] === null && newLayout.length > targetVisualUnits) {
                    newLayout.pop();
                    i--;
                }
            }
            
            return newLayout;
        });
    }, [availableItems, gridColumns, getItemVisualSize]); // Dependencias clave

    const updateLayout = useCallback((newLayout: (string | null)[]) => {
        setLayout(newLayout);
        localStorage.setItem(storageKey, JSON.stringify(newLayout));
    }, [storageKey]);

    return [layout, updateLayout] as const;
};

interface DraggableGridProps {
    /** Array de identificadores (strings) o nulls para espacios vacíos */
    layout: (string | null)[];
    /** Callback cuando el orden cambia */
    onLayoutChange: (newLayout: (string | null)[]) => void;
    /** Función para renderizar el contenido de cada item */
    renderItem: (key: string, isDragging: boolean) => React.ReactNode;
    /** Función para calcular cuántas filas ocupa un item */
    getItemRowSpan: (key: string, currentColumns: number) => number;
    /** Función opcional para calcular cuántas columnas ocupa un item (por defecto 1) */
    getItemColSpan?: (key: string, currentColumns: number) => number;
    /** Altura base de cada fila en píxeles */
    rowHeight?: number;
    /** Mostrar u ocultar los slots vacíos */
    showEmptySlots?: boolean;
    /** Clases adicionales para el contenedor */
    className?: string;
    /** Habilitar o deshabilitar el arrastre */
    isDraggable?: boolean;
}

export const DraggableGrid = ({
    layout,
    onLayoutChange,
    renderItem,
    getItemRowSpan,
    getItemColSpan,
    rowHeight = 350,
    showEmptySlots = true, // Ahora puede ser controlado desde fuera
    isDraggable = true,    // Por defecto true para compatibilidad
    className = ''
}: DraggableGridProps) => {
    const gridColumns = useGridColumns();
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // --- Drag & Drop Handlers Internos ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Importante: Algunos navegadores requieren datos para iniciar el arrastre
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const newLayout = [...layout];
        const itemDragged = newLayout[draggedIndex];
        
        // Intercambio simple (Swap)
        newLayout[draggedIndex] = newLayout[targetIndex];
        newLayout[targetIndex] = itemDragged;

        onLayoutChange(newLayout);
        setDraggedIndex(targetIndex);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <div 
            className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start pb-10 grid-flow-dense ${className}`}
            style={{ gridAutoRows: `${rowHeight}px` }}
        >
            {layout.map((itemKey, index) => {
                // --- RENDERIZADO DE SLOT VACÍO ---
                if (!itemKey) {
                    if (!showEmptySlots) {
                        return <div key={`empty-${index}`} className="invisible pointer-events-none" style={{ gridRow: 'span 1' }} />;
                    }
                    
                    return (
                        <div
                            key={`empty-${index}`}
                            onDragOver={(e) => handleDragOver(e, index)}
                            className={`
                                h-full min-h-[200px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30 
                                flex items-center justify-center text-slate-300 transition-all duration-200
                                ${draggedIndex !== null ? 'hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-400' : ''}
                            `}
                            style={{ gridRow: 'span 1' }}
                        >
                            {draggedIndex !== null && <Plus size={24} className="opacity-50" />}
                        </div>
                    );
                }

                // --- RENDERIZADO DE ITEM ---
                const colSpan = getItemColSpan ? getItemColSpan(itemKey, gridColumns) : 1;
                const rowSpan = getItemRowSpan(itemKey, gridColumns);
                const isDragging = draggedIndex === index;

                return (
                    <div 
                        key={itemKey}
                        draggable={isDraggable}
                        onDragStart={(e) => {
                            if (!isDraggable) return;
                            handleDragStart(e, index);
                        }}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                            transition-all duration-200
                            ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : ''}
                            ${isDragging ? 'opacity-50 scale-95 ring-2 ring-indigo-400 ring-offset-2 rounded-2xl' : ''} 
                            ${colSpan === 2 ? 'md:col-span-2' : ''}
                            ${colSpan === 3 ? 'xl:col-span-3' : ''}
                            ${colSpan === 4 ? '2xl:col-span-4' : ''}
                        `}
                        style={{ gridRow: `span ${rowSpan}` }}
                    >
                        {renderItem(itemKey, isDragging)}
                    </div>
                );
            })}
        </div>
    );
};
