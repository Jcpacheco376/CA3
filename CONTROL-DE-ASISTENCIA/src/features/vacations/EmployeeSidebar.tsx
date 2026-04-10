// src/features/vacations/EmployeeSidebar.tsx
import React from 'react';
import { Users, Search, CalendarDays, Contact } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { getAvailableVacationDays } from '../../types/vacations';

interface EmployeeSidebarProps {
    employees: any[];
    filteredEmployees: any[];
    searchTerm: string;
    selectedEmployeeId: number | null;
    sidebarWidth: number;
    sidebarRef: React.RefObject<HTMLDivElement>;
    isResizing: boolean;
    vacationMode: any;
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
    vacationMode,
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
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-1.5">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Users size={16} className="text-[--theme-600]" />
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
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500]/20 focus:border-[--theme-500] transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                        {filteredEmployees.map(emp => (
                            <Tooltip key={emp.EmpleadoId} text={`${emp.NombreCompleto} • ${emp.DepartamentoNombre || 'Sin Depto.'}`} placement="right" delay={500}>
                                <button
                                    onClick={() => onSelectEmployee(emp.EmpleadoId)}
                                    className={`w-full text-left p-2.5 rounded-xl transition-[background-color,border-color] duration-300 focus:outline-none border-2 group relative overflow-hidden ${selectedEmployeeId === emp.EmpleadoId ? 'bg-[--theme-50]/50 border-[--theme-500]' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-0.5 gap-2 relative z-10">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className={`font-semibold text-sm truncate ${selectedEmployeeId === emp.EmpleadoId ? 'text-[--theme-900]' : 'text-slate-600 group-hover:text-[--theme-800]'}`}>
                                                {emp.NombreCompleto}
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => { e.stopPropagation(); onViewProfile(emp.EmpleadoId); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onViewProfile(emp.EmpleadoId); } }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-[--theme-600] hover:bg-[--theme-50] cursor-pointer block transition-colors"
                                                >
                                                    <Contact size={14} />
                                                </div>
                                            </div>
                                        </div>
                                        {(() => {
                                            const saldo = getAvailableVacationDays(emp, vacationMode);
                                            const displaySaldo = Math.round(saldo * 100) / 100;
                                            const isNegative = saldo < 0;
                                            return (
                                                <div className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${isNegative ? 'bg-rose-50 text-rose-600' : (saldo > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400')}`} title="Días Restantes">
                                                    <CalendarDays size={10} />
                                                    {displaySaldo}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 opacity-80 group-hover:opacity-100 tracking-tight relative z-10 transition-opacity">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${selectedEmployeeId === emp.EmpleadoId ? 'bg-[--theme-100] text-[--theme-700]' : 'bg-slate-100 text-slate-500'}`}> {emp.CodRef}</span>
                                        <span className="truncate">{emp.PuestoNombre || 'Sin Puesto'}</span>
                                    </div>
                                    {selectedEmployeeId === emp.EmpleadoId && (
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-[--theme-500] opacity-[0.03] -mr-8 -mt-8 rounded-full pointer-events-none" />
                                    )}
                                </button>
                            </Tooltip>
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
