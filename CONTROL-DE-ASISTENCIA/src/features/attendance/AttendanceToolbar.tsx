// src/features/attendance/AttendanceToolbar.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search as SearchIcon, Briefcase, Building, ChevronDown, Check } from 'lucide-react';
import { Button } from '../../components/ui/Modal';
import { Tooltip } from '../../components/ui/Tooltip';

const DropdownSelect = ({ icon, value, onChange, options, placeholder, renderLabel, showAllOption }: { icon: React.ReactNode, value: string, onChange: (value: string) => void, options: {value: string, label: string}[], placeholder: string, renderLabel: (value: string) => string, showAllOption: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full md:w-56" ref={dropdownRef}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center pl-3 pr-4 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[--theme-500] text-sm text-slate-700">
                <span className="text-slate-400 mr-2">{icon}</span>
                <span className="flex-grow text-left truncate">{renderLabel(value)}</span>
                <ChevronDown size={16} className={`ml-1 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-30 animate-fade-in-fast py-1">
                    {showAllOption && (
                        <button onClick={() => handleSelect('all')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                            {placeholder}
                            {value === 'all' && <Check size={16} className="text-[--theme-500]" />}
                        </button>
                    )}
                    {options.map(opt => (
                        <button key={opt.value} onClick={() => handleSelect(opt.value)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                            <span className="truncate">{opt.label}</span>
                            {value === opt.value && <Check size={16} className="text-[--theme-500]" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


interface AttendanceToolbarProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    selectedDepartment: string;
    setSelectedDepartment: (value: string) => void;
    selectedPayrollGroup: string;
    setSelectedPayrollGroup: (value: string) => void;
    viewMode: 'week' | 'fortnight' | 'month';
    setViewMode: (value: 'week' | 'fortnight' | 'month') => void;
    rangeLabel: string;
    handleDatePrev: () => void;
    handleDateNext: () => void;
    user: any;
}


export const AttendanceToolbar: React.FC<AttendanceToolbarProps> = ({
    searchTerm,
    setSearchTerm,
    selectedDepartment,
    setSelectedDepartment,
    selectedPayrollGroup,
    setSelectedPayrollGroup,
    viewMode,
    setViewMode,
    rangeLabel,
    handleDatePrev,
    handleDateNext,
    user
}) => {

    // Usamos useMemo para procesar las opciones, mejorando el rendimiento.
    const departmentOptions = useMemo(() => {
        // CORRECCIÓN: Usamos las propiedades correctas 'DepartamentoId' y 'Nombre'.
        return user?.Departamentos?.map((d: any) => ({ 
            value: d.DepartamentoId, // La API ahora envía el ID numérico
            label: d.Nombre          // Y el nombre con mayúscula
        })) || [];
    }, [user?.Departamentos]);

    const payrollGroupOptions = useMemo(() => {
        // CORRECCIÓN: Usamos las propiedades correctas 'GrupoNominaId' y 'Nombre'.
        return user?.GruposNomina?.map((g: any) => ({ 
            value: g.GrupoNominaId, // La API ahora envía el ID numérico
            label: g.Nombre         // Y el nombre con mayúscula
        })) || [];
    }, [user?.GruposNomina]);

    return (
        <div className="p-4 border-b border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col md:flex-row items-center gap-2 w-full flex-grow">
                    <Tooltip text="Busca por nombre, apellido o ID de empleado.">
                         <div className="relative w-full md:max-w-xs">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Buscar empleado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--theme-500]"/>
                        </div>
                    </Tooltip>
                     <Tooltip text="Filtrar empleados por departamento">
                        <DropdownSelect 
                            icon={<Building size={16}/>}
                            value={selectedDepartment}
                            onChange={setSelectedDepartment}
                            options={departmentOptions}
                            placeholder="Todos los Deptos."
                            renderLabel={(val) => user?.Departamentos?.find((d: any) => d.DepartamentoId === val)?.Nombre || "Todos los Deptos."}
                            showAllOption={user?.Departamentos?.length > 1}
                        />
                     </Tooltip>
                     <Tooltip text="Filtrar empleados por grupo de nómina">
                         <DropdownSelect 
                            icon={<Briefcase size={16}/>}
                            value={selectedPayrollGroup}
                            onChange={setSelectedPayrollGroup}
                            options={payrollGroupOptions}
                            placeholder="Todos los Grupos"
                            renderLabel={(val) => user?.GruposNomina?.find((g: any) => g.GrupoNominaId === val)?.Nombre || "Todos los Grupos"}
                            showAllOption={user?.GruposNomina?.length > 1}
                        />
                    </Tooltip>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                     <div className="flex items-center rounded-lg border border-slate-300 p-0.5 bg-slate-100">
                        {['week', 'fortnight', 'month'].map((mode) => (
                            <button key={mode} onClick={() => setViewMode(mode as any)}
                                className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${viewMode === mode ? 'bg-white text-[--theme-600] shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                {mode === 'week' ? 'Semana' : mode === 'fortnight' ? 'Quincena' : 'Mes'}
                            </button>
                        ))}
                    </div>
                    <Tooltip text="Periodo anterior"><Button variant="secondary" onClick={handleDatePrev}><ChevronLeft size={20} /></Button></Tooltip>
                     <div className="text-center w-60 md:w-64">
                        <p className="font-semibold text-slate-700 whitespace-nowrap capitalize">{rangeLabel}</p>
                    </div>
                    <Tooltip text="Periodo siguiente"><Button variant="secondary" onClick={handleDateNext}><ChevronRight size={20} /></Button></Tooltip>
                </div>
            </div>
        </div>
    );
};

