// src/components/ui/TableSkeleton.tsx
import React from 'react';
import { SkeletonCell } from './SkeletonCell';
import { GripVertical } from 'lucide-react';
import { format, getDay, isToday as isTodayDateFns } from 'date-fns';
import { es } from 'date-fns/locale';

const getHeaderWidthClass = (viewMode: string) => {
    return viewMode === 'week' ? 'min-w-[6rem]' : 'min-w-[4rem]';
};

// --- MODIFICACIÓN AQUÍ ---
// Ya no es solo una barra, es un contenedor con el efecto shimmer
const SkeletonBar = ({ width }: { width: string }) => (
    <div 
      className={`h-4 rounded-md ${width} shimmer-effect`} 
    />
);
// --- FIN DE MODIFICACIÓN ---

export const TableSkeleton = ({ 
    employeeColumnWidth, 
    dateRange, 
    viewMode,
    weekStartDay = 1 // Default to Monday if not provided
}: { 
    employeeColumnWidth: number, 
    dateRange: Date[], 
    viewMode: string,
    weekStartDay?: number 
}) => {
    
    const skeletonRows = Array(15).fill(0);

    return (
        <div className="overflow-auto relative flex-1">
            <table className="text-sm text-center border-collapse table-fixed">
                <thead 
                    className="sticky top-0 z-20" 
                    style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
                >
                    <tr className="bg-slate-50">
                        <th 
                            className="p-2 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-30 shadow-sm" 
                            style={{ 
                                width: `${employeeColumnWidth}px`, 
                                willChange: 'transform', 
                                transform: 'translate3d(0, 0, 0)' 
                            }}
                        >
                            <div className="flex justify-between items-center h-full">
                                <span>Empleado</span>
                                <div className="absolute right-0 top-0 h-full w-2.5 cursor-col-resize group flex items-center justify-center">
                                    <GripVertical className="h-5 text-slate-300" />
                                </div>
                            </div>
                        </th>
                        
                        {dateRange.map((day, dayIndex) => {
                             const isWeekStart = getDay(day) === weekStartDay;
                             let thClasses = `px-1 py-2 font-semibold text-slate-600 ${getHeaderWidthClass(viewMode)} ${isTodayDateFns(day) ? 'bg-sky-100' : 'bg-slate-50'}`;
                             if (isWeekStart && dayIndex > 0) {
                                 thClasses += ' border-l-2 border-slate-300';
                             }

                            return (
                                <th key={dayIndex} className={thClasses}>
                                    <span className="capitalize text-base">{format(day, 'eee', { locale: es })}</span>
                                    <span className="block text-xl font-bold text-slate-800">{format(day, 'dd')}</span>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                
                <tbody>
                    {skeletonRows.map((_, rowIndex) => (
                        <tr key={rowIndex} className="group">
                            <td 
                                className="p-2 text-left sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-sm align-top border-b border-slate-100"
                                style={{ 
                                    width: `${employeeColumnWidth}px`, 
                                    willChange: 'transform', 
                                    transform: 'translate3d(0, 0, 0)'
                                }}
                            >
                                <div 
                                    className="w-full space-y-2" 
                                    style={{ width: `${employeeColumnWidth - 16}px`}}
                                >
                                    {/* --- MODIFICACIÓN AQUÍ --- */}
                                    {/* Las barras ahora usan el componente actualizado */}
                                    <SkeletonBar width="w-3/4" />
                                    <SkeletonBar width="w-1/2" />
                                    {/* Esta barra simula la barra de progreso */}
                                    <div className="h-1.5 bg-slate-200 rounded-full w-3/4 shimmer-effect mt-3" />
                                    {/* --- FIN DE MODIFICACIÓN --- */}
                                </div>
                            </td>
                            
                            {dateRange.map((day, dayIndex) => (
                                <SkeletonCell 
                                    key={dayIndex} 
                                    viewMode={viewMode}
                                    isToday={isTodayDateFns(day)}
                                    isWeekStart={getDay(day) === weekStartDay}
                                    isFirstDay={dayIndex === 0}
                                />
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};