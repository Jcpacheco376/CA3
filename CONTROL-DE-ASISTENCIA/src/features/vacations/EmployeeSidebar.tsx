// src/features/vacations/EmployeeSidebar.tsx
import React from 'react';
import { Users, Search, CalendarDays, Contact } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';

interface EmployeeSidebarProps {
    employees: any[];
    filteredEmployees: any[];
    searchTerm: string;
    selectedEmployeeId: number | null;
    sidebarWidth: number;
    sidebarRef: React.RefObject<HTMLDivElement>;
    isResizing: boolean;
    onSearch: (term: string) => void;
    onSelectEmployee: (id: number) => void;
    onStartResize: () => void;
    onViewProfile: (id: number) => void;
}

export const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
    filteredEmployees,
    searchTerm,
    selectedEmployeeId,
    sidebarWidth,
    sidebarRef,
    isResizing,
    onSearch,
    onSelectEmployee,
    onStartResize,
    onViewProfile,
}) => {
    return (
        <>
            <div
                ref={sidebarRef}
                style={{ width: sidebarWidth }}
                className="flex-shrink-0 hidden md:flex flex-col h-full"
            >
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                    <div className="p-2 border-b border-slate-100 bg-slate-50 flex flex-col gap-1.5">
                        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                            <Users size={14} className="text-[--theme-500]" />
                            Directorio de Plantilla
                        </h3>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <Search size={12} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar empleado..."
                                value={searchTerm}
                                onChange={(e) => onSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[--theme-500] focus:border-[--theme-500] transition-colors"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                        {filteredEmployees.map(emp => (
                            <button
                                key={emp.EmpleadoId}
                                onClick={() => onSelectEmployee(emp.EmpleadoId)}
                                className={`w-full text-left p-2 rounded-xl transition-all duration-200 focus:outline-none border shadow-sm group ${selectedEmployeeId === emp.EmpleadoId ? 'bg-[--theme-50] border-[--theme-400] ring-1 ring-[--theme-400] shadow-md' : 'bg-white border-slate-100 hover:border-[--theme-200] hover:bg-slate-50 hover:shadow-md'}`}
                            >
                                <div className="flex justify-between items-start mb-0.5 gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className={`font-semibold text-sm truncate ${selectedEmployeeId === emp.EmpleadoId ? 'text-[--theme-800]' : 'text-slate-700 group-hover:text-[--theme-700]'}`}>
                                            {emp.NombreCompleto}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip text="Ver Ficha">
                                                <span
                                                    onClick={(e) => { e.stopPropagation(); onViewProfile(emp.EmpleadoId); }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-[--theme-600] hover:bg-slate-100 cursor-pointer block"
                                                >
                                                    <Contact size={14} />
                                                </span>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${emp.SaldoVacacionesRestantes > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} ${selectedEmployeeId === emp.EmpleadoId && emp.SaldoVacacionesRestantes > 0 ? 'ring-1 ring-emerald-300' : ''}`} title="Días Restantes">
                                        <CalendarDays size={10} />
                                        {emp.SaldoVacacionesRestantes || 0}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 opacity-80 group-hover:opacity-100 tracking-tight">
                                    <span className={`px-1 py-0.5 rounded border ${selectedEmployeeId === emp.EmpleadoId ? 'bg-[--theme-100] text-[--theme-700] border-[--theme-200]' : 'bg-slate-100 text-slate-500 border-slate-200'}`}> {emp.CodRef}</span>
                                    <span className="truncate">{emp.PuestoNombre || 'Sin Puesto'}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {/* Resize handle */}
            <div
                onMouseDown={onStartResize}
                className={`w-4 flex items-center justify-center group cursor-col-resize self-stretch transition-colors relative ${isResizing ? 'bg-[--theme-100]' : 'hover:bg-slate-50'}`}
            >
                <div className={`absolute w-0.5 rounded-full transition-all duration-300 z-10 ${isResizing ? 'bg-[--theme-500] h-full' : 'h-12 bg-slate-300 group-hover:bg-[--theme-400]'}`} />
            </div>
        </>
    );
};
