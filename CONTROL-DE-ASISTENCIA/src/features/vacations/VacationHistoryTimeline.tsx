// src/features/vacations/VacationHistoryTimeline.tsx
import React from 'react';
import { format } from 'date-fns';
import {
    History, RefreshCw, ChevronDown, Edit, Palmtree,
    Umbrella, Zap, Clock
} from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { parseSQLDate, VacationMode, VacationDetailModalState } from '../../types/vacations';

interface VacationHistoryTimelineProps {
    history: any[];
    balance: any;
    selectedYear: number | null;
    expandedYear: number | null;
    yearDetails: Record<number, any>;
    vacationMode: VacationMode;
    officialMode: VacationMode;
    isVacationModeHovered: boolean;
    canManageVacations: boolean;
    isRecalculating: boolean;
    employees: any[];
    selectedEmployeeId: number | null;
    activeTab: string;
    user: any;

    onYearSelect: (year: number) => void;
    onYearExpand: (year: number | null) => void;
    onLoadYearDetails: (empleadoId: number | undefined, year: number) => Promise<void>;
    onOpenDetailModal: (state: VacationDetailModalState) => void;
    onRecalculate: () => Promise<void>;
    onModeChange: (mode: VacationMode) => void;
    onModeHover: (hovered: boolean) => void;

    formatValue: (val: number) => string | number;
    getProportionalValue: (h: any) => number;

    historyContainerRef: React.RefObject<HTMLDivElement>;
}

const classifyRecord = (r: any, def: string): string => {
    const t = (r.Tipo || '').toString().toUpperCase();
    if (t.includes('PAGAD')) return 'PAGADOS';
    if (t.includes('AJUSTE')) return 'AJUSTES';
    if (t.includes('DISFRUTAD')) return 'DISFRUTADOS';
    if (t.includes('SALDOS INICIALES')) return 'SALDOS INICIALES';
    return def;
};

export const VacationHistoryTimeline: React.FC<VacationHistoryTimelineProps> = ({
    history,
    balance,
    selectedYear,
    expandedYear,
    yearDetails,
    vacationMode,
    officialMode,
    isVacationModeHovered,
    canManageVacations,
    isRecalculating,
    employees,
    selectedEmployeeId,
    activeTab,
    user,
    onYearSelect,
    onYearExpand,
    onLoadYearDetails,
    onOpenDetailModal,
    onRecalculate,
    onModeChange,
    onModeHover,
    formatValue,
    getProportionalValue,
    historyContainerRef,
}) => {
    if (history.length === 0 && !balance) {
        return (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
                <Clock size={48} className="text-slate-200 mb-4" />
                <p className="text-slate-500 font-medium">No hay historial disponible.</p>
            </div>
        );
    }

    const selectedEmp = employees.find(e => e.EmpleadoId === selectedEmployeeId);
    const fechaIngreso = selectedEmp?.FechaIngreso || (user as any)?.FechaIngreso;
    const dIngreso = fechaIngreso ? parseSQLDate(fechaIngreso) : null;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const displayHistory = (history.length > 0 ? [...history].reverse() : (balance ? [balance] : []))
        .filter((h: any) => {
            const s = h.FechaInicio ? parseSQLDate(h.FechaInicio) : (h.FechaInicioPeriodo ? parseSQLDate(h.FechaInicioPeriodo) : null);
            return !s || s <= today;
        });

    const getTargetId = () => activeTab === 'team_vacations' ? selectedEmployeeId ?? undefined : user?.EmpleadoId;
    const getEmpName = () => activeTab === 'team_vacations'
        ? employees.find(e => e.EmpleadoId === selectedEmployeeId)?.NombreCompleto
        : user?.NombreCompleto;

    return (
        <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <History size={16} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">Histórico</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="flex items-center bg-slate-100 rounded-xl p-0.5 gap-1 border border-slate-200 shadow-sm relative transition-all duration-300"
                        onMouseEnter={() => onModeHover(true)}
                        onMouseLeave={() => onModeHover(false)}
                    >
                        {(['FIN', 'DEV', 'INI'] as VacationMode[]).map((mode) => {
                            const isActive = vacationMode === mode;
                            const isOfficial = officialMode === mode;
                            const isVisible = isActive || isVacationModeHovered;
                            return (
                                <div key={mode} className={`transition-all duration-500 ease-in-out overflow-hidden ${isVisible ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                    <Tooltip text={
                                        mode === 'FIN' ? 'Los días se otorgan únicamente al finalizar y cumplir el periodo anual.' :
                                            (mode === 'DEV' ? 'Los días se van acumulando de manera proporcional cada día transcurrido del periodo.' :
                                                'La totalidad de los días del periodo están disponibles desde el primer día.')
                                    }>
                                        <button
                                            onClick={() => onModeChange(mode)}
                                            className={`relative px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${isActive ? 'bg-white text-[--theme-600] shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {isOfficial && <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />}
                                            {mode === 'FIN' ? 'Cumplidos' : (mode === 'DEV' ? 'Proporcional' : 'Al Inicio')}
                                        </button>
                                    </Tooltip>
                                </div>
                            );
                        })}
                    </div>
                    {canManageVacations && (
                        <button
                            onClick={onRecalculate}
                            className="p-2 bg-white text-slate-400 border border-slate-200 rounded-lg hover:text-[--theme-700] disabled:opacity-50"
                            disabled={isRecalculating}
                        >
                            <RefreshCw size={14} className={isRecalculating ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            </div>

            <div className="relative pt-1 pb-2">
                <div className="absolute top-[2.5rem] left-0 right-0 h-1 bg-slate-200 z-0" />
                <div
                    ref={historyContainerRef}
                    className="flex items-start gap-0 overflow-x-auto pb-6 pt-4 h-full custom-scrollbar relative z-10"
                >
                    {dIngreso && (
                        <div className="min-w-[100px] flex flex-col items-center group relative z-10">
                            <div className="h-10 flex items-center justify-center mb-1.5">
                                <div className="w-6 h-6 rounded-full border-4 border-slate-300 bg-white shadow-sm relative z-20" />
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-bold uppercase text-slate-400">INGRESO</span>
                                <span className="text-[10px] font-medium text-slate-400">{format(dIngreso, 'dd/MM/yyyy')}</span>
                            </div>
                        </div>
                    )}

                    {(() => {
                        const nodes: React.ReactNode[] = [];
                        displayHistory.forEach((h: any, idx: number) => {
                            const now = new Date();
                            const startDate = h.FechaInicio ? parseSQLDate(h.FechaInicio) : null;
                            const endDate = h.FechaFin ? parseSQLDate(h.FechaFin) : null;
                            const isCurrent = startDate && endDate && now >= startDate && now <= endDate;

                            const propOtorgados = getProportionalValue(h);
                            const totalConsumed = (h.DiasDisfrutados || 0);
                            const percentage = propOtorgados > 0 ? (totalConsumed / propOtorgados) * 100 : 0;
                            const displayRestantes = propOtorgados - totalConsumed;

                            if (idx >= 0 && startDate) {
                                nodes.push(
                                    <div key={`year-sep-${h.Anio}`} className="flex flex-col items-center justify-start min-w-[35px]">
                                        <div className="h-10 flex items-center justify-center mb-1">
                                            <div className="w-3 h-3 rounded-full bg-slate-300 border-2 border-white shadow-sm" />
                                        </div>
                                        <span className="text-[12px] font-bold text-slate-400">{format(startDate, 'yyyy')}</span>
                                    </div>
                                );
                            }

                            nodes.push(
                                <div key={h.Anio} className={`min-w-[150px] max-w-[150px] flex flex-col items-center group relative transition-all duration-300 ${isCurrent ? 'z-30' : 'z-10'}`}>
                                    <div className="h-10 flex items-center justify-center mb-1.5">
                                        <div className={`w-6 h-6 rounded-full border-4 shadow-sm transition-all flex items-center justify-center relative z-20 ${selectedYear === h.Anio ? 'border-[--theme-500] scale-125 bg-white' : (isCurrent ? 'border-slate-400 bg-white' : 'border-slate-300 bg-white group-hover:border-[--theme-400]')}`} />
                                    </div>
                                    <div className="flex flex-col items-center mb-1.5 text-center px-1">
                                        <span className={`text-[13px] font-bold leading-tight ${selectedYear === h.Anio ? 'text-[--theme-600]' : (isCurrent ? 'text-slate-800' : 'text-slate-700')}`}>Aniv. {h.Anio}</span>
                                        <span className={`text-[10px] font-semibold opacity-90 ${selectedYear === h.Anio ? 'text-[--theme-500]' : 'text-slate-500'}`}>
                                            {startDate && endDate ? `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}` : '---'}
                                        </span>
                                    </div>
                                    <div
                                        onClick={async () => {
                                            onYearSelect(h.Anio);
                                            if (expandedYear === h.Anio) {
                                                onYearExpand(null);
                                            } else {
                                                onYearExpand(h.Anio);
                                                if (!yearDetails[h.Anio]) {
                                                    await onLoadYearDetails(getTargetId(), h.Anio);
                                                }
                                            }
                                        }}
                                        onDoubleClick={async (e) => {
                                            e.stopPropagation();
                                            let data = yearDetails[h.Anio];
                                            if (!data) {
                                                await onLoadYearDetails(getTargetId(), h.Anio);
                                                data = yearDetails[h.Anio];
                                            }
                                            if (data) {
                                                const period = startDate && endDate ? `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}` : '';
                                                onOpenDetailModal({ year: h.Anio, data, employeeName: getEmpName() || 'Empleado', period, saldoId: h.SaldoId, endDate: h.FechaFin });
                                            }
                                        }}
                                        className={`w-full text-left bg-white rounded-2xl p-4 border-2 transition-all duration-300 relative overflow-hidden cursor-pointer select-none group/card ${selectedYear === h.Anio ? 'border-[--theme-500]' : 'border-slate-200 shadow-sm'} hover:-translate-y-1 hover:shadow-md active:scale-[0.98]`}
                                    >
                                        <div className="flex justify-between items-center text-[10px] mb-1.5 text-slate-500 text-xs font-bold">
                                            <span>Consumo</span>
                                            <span>{formatValue(totalConsumed)} / {formatValue(propOtorgados)}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                                            <div className={`h-full ${percentage >= 100 ? 'bg-amber-500' : 'bg-[--theme-500]'}`} style={{ width: `${Math.min(100, percentage)}%` }} />
                                        </div>
                                        <div className="flex justify-between items-baseline mt-2 border-t border-slate-100 pt-2 relative">
                                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Disponibles</span>
                                            <span className={`text-sm font-bold ${displayRestantes > 0 ? 'text-[--theme-600]' : 'text-slate-400'}`}>{formatValue(displayRestantes)}</span>
                                        </div>
                                        <div className={`absolute bottom-2 right-2 p-1 text-slate-300 transition-all duration-300 group-hover/card:text-[--theme-400] ${expandedYear === h.Anio ? 'rotate-180 text-[--theme-500] opacity-100' : 'opacity-0 group-hover/card:opacity-100'}`}>
                                            <ChevronDown size={14} />
                                        </div>

                                        <div className={`grid transition-all duration-300 ease-in-out ${expandedYear === h.Anio ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                            <div className="overflow-hidden">
                                                {!yearDetails[h.Anio] ? (
                                                    <div className="flex justify-center py-2"><RefreshCw size={10} className="animate-spin text-slate-300" /></div>
                                                ) : (() => {
                                                    const d = yearDetails[h.Anio];
                                                    const details = [
                                                        ...(d.prenomina?.map((r: any) => ({ ...r, Origin: classifyRecord(r, 'DISFRUTADOS') })) || []),
                                                        ...(d.solicitudes?.map((r: any) => ({ ...r, Origin: 'SOLICITUDES', Dias: r.DiasSolicitados })) || []),
                                                        ...(d.ajustes?.map((r: any) => ({ ...r, Origin: classifyRecord(r, 'AJUSTES') })) || [])
                                                    ];
                                                    const grouped = details.reduce((acc: any, item: any) => {
                                                        const type = item.Origin;
                                                        acc[type] = (acc[type] || 0) + (item.Dias || 0);
                                                        return acc;
                                                    }, {});
                                                    return (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const period = startDate && endDate ? `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}` : '';
                                                                onOpenDetailModal({ year: h.Anio, data: yearDetails[h.Anio], employeeName: getEmpName() || 'Empleado', period, saldoId: h.SaldoId, endDate: h.FechaFin });
                                                            }}
                                                            className="flex flex-col gap-1 pl-0 pr-1 mt-1.5 border-t border-dashed border-slate-100 pt-2 group/detail cursor-pointer"
                                                        >
                                                            {Object.entries(grouped).map(([type, total]) => (
                                                                <div key={type} className="flex items-center justify-between text-[10px] group-hover/detail:bg-slate-50/50 rounded-md transition-colors pl-0 pr-1 py-0.5 min-w-0">
                                                                    <span className="text-slate-400 font-bold flex items-center gap-1 min-w-0 overflow-hidden text-[9px]">
                                                                        <div className={`w-1 h-1 rounded-full ${type === 'PAGADOS' ? 'bg-amber-400' : type === 'AJUSTES' ? 'bg-indigo-400' : type === 'SOLICITUDES' ? 'bg-emerald-400' : type === 'SALDOS INICIALES' ? 'bg-emerald-600' : 'bg-[--theme-400]'}`} />
                                                                        <span className="truncate uppercase tracking-tighter shrink-0">{type === 'DISFRUTADOS' ? 'Disfrutados' : (type === 'SALDOS INICIALES' ? 'Carga Inicial' : type)}</span>
                                                                    </span>
                                                                    <div className="font-black text-slate-700 whitespace-nowrap ml-1 shrink-0">{formatValue(total as number)} d</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                        return nodes;
                    })()}
                </div>
            </div>
        </div>
    );
};
