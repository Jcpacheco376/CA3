// src/components/ui/SkeletonCell.tsx
import React from 'react';

export const SkeletonCell = ({ 
    viewMode, 
    isToday, 
    isWeekStart, 
    isFirstDay 
}: { 
    viewMode: string, 
    isToday: boolean, 
    isWeekStart: boolean, 
    isFirstDay: boolean 
}) => {
    
    const cellWidthClass = viewMode === 'week' ? 'min-w-[6rem]' : 'min-w-[4rem]';
    
    let tdClasses = `p-1 align-middle ${cellWidthClass} ${isToday ? 'bg-sky-50/50' : 'bg-white'}`;
    
    if (isWeekStart && !isFirstDay) {
        tdClasses += ' border-l-2 border-slate-300';
    }

    return (
        <td className={tdClasses}>
            {/* --- MODIFICACIÓN AQUÍ --- */}
            {/* Se quita 'bg-slate-200' y 'animate-pulse' y se añade 'shimmer-effect' */}
            <div className="w-24 h-16 mx-auto rounded-md shimmer-effect" />
            {/* --- FIN DE MODIFICACIÓN --- */}
        </td>
    );
};