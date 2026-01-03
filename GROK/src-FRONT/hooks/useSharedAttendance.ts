// src/hooks/useSharedAttendance.ts
import { useState, useEffect, useMemo } from 'react';
import {
    format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    addDays, subDays, addWeeks, subWeeks, addMonths, subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';

const SHARED_CONFIG_KEY = 'app_shared_attendance_config';

// Función para obtener el estado inicial, ahora fuera para ser usada en lazy initializer.
const getInitialState = (user: any) => {
    const defaultFilters = {
        depts: user?.Departamentos?.length === 1 ? [user.Departamentos[0].DepartamentoId] : [],
        groups: user?.GruposNomina?.length === 1 ? [user.GruposNomina[0].GrupoNominaId] : [],
        puestos: user?.Puestos?.length === 1 ? [user.Puestos[0].PuestoId] : [],
        estabs: user?.Establecimientos?.length === 1 ? [user.Establecimientos[0].EstablecimientoId] : []
    };

    try {
        const saved = localStorage.getItem(SHARED_CONFIG_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                filters: { ...defaultFilters, ...parsed.filters },
                viewMode: parsed.viewMode || 'week',
                currentDate: parsed.currentDate ? new Date(parsed.currentDate) : new Date()
            };
        }
    } catch (e) { console.error("Error cargando config compartida", e); }

    return { filters: defaultFilters, viewMode: 'week', currentDate: new Date() };
};

export const useSharedAttendance = (user: any) => {
    // 1. Estado Unificado con Lazy Initialization
    const [sharedState, setSharedState] = useState(() => getInitialState(user));
    
    // Desestructuramos para mantener la API del hook intacta
    const { viewMode, currentDate, filters } = sharedState;

    // 2. Persistencia Automática
    useEffect(() => {
        try {
            // Guardamos el estado completo, asegurando consistencia.
            localStorage.setItem(SHARED_CONFIG_KEY, JSON.stringify({
                ...sharedState,
                currentDate: sharedState.currentDate.toISOString() 
            }));
        } catch (e) {
            console.error("Error guardando config compartida", e);
        }
    }, [sharedState]);

    // 3. Setters customizados que actualizan el estado unificado
    const setFilters = (updater: any) => {
        setSharedState(prev => ({ ...prev, filters: typeof updater === 'function' ? updater(prev.filters) : updater }));
    };

    const setViewMode = (newViewMode: 'week' | 'fortnight' | 'month') => {
        setSharedState(prev => ({...prev, viewMode: newViewMode}));
    };

    const setCurrentDate = (updater: any) => {
        setSharedState(prev => ({ ...prev, currentDate: typeof updater === 'function' ? updater(prev.currentDate) : updater }));
    };
    
    // 4. Lógica de Cálculo de Rangos (sin cambios, pero ahora usa el estado unificado)
    const { dateRange, rangeLabel } = useMemo(() => {
        let start, end, label = '';
        const now = currentDate;

        switch (viewMode) {
            case 'fortnight':
                const day = now.getDate();
                if (day <= 15) {
                    start = startOfMonth(now);
                    end = new Date(now.getFullYear(), now.getMonth(), 15);
                } else {
                    start = new Date(now.getFullYear(), now.getMonth(), 16);
                    end = endOfMonth(now);
                }
                label = `${format(start, 'd')} - ${format(end, 'd \'de\' MMMM, yyyy', { locale: es })}`;
                break;
            case 'month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                label = format(start, 'MMMM yyyy', { locale: es });
                break;
            case 'week':
            default:
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = endOfWeek(now, { weekStartsOn: 1 });
                label = `${format(start, 'd')} - ${format(end, 'd \'de\' MMMM, yyyy', { locale: es })}`;
                break;
        }
        
        const range = [];
        let dayCalc = start;
        while (dayCalc <= end) {
            range.push(dayCalc);
            dayCalc = addDays(dayCalc, 1);
        }

        return { dateRange: range, rangeLabel: label }; 

    }, [currentDate, viewMode]);

    // 5. Handlers de Navegación (ahora usan los setters customizados)
    const handleDatePrev = () => {
        setCurrentDate((prev: Date) => {
            switch (viewMode) {
                case 'fortnight': return prev.getDate() <= 15 ? new Date(prev.getFullYear(), prev.getMonth() - 1, 16) : new Date(prev.getFullYear(), prev.getMonth(), 1);
                case 'month': return subMonths(prev, 1);
                default: return subWeeks(prev, 1);
            }
        });
    };

    const handleDateNext = () => {
        setCurrentDate((prev: Date) => {
            switch (viewMode) {
                case 'fortnight': return prev.getDate() <= 15 ? new Date(prev.getFullYear(), prev.getMonth(), 16) : new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
                case 'month': return addMonths(prev, 1);
                default: return addWeeks(prev, 1);
            }
        });
    };

    // Retornamos todo lo que las páginas necesitan, manteniendo la interfaz del hook
    return {
        filters, setFilters,
        viewMode, setViewMode,
        currentDate, setCurrentDate,
        dateRange, rangeLabel,
        handleDatePrev, handleDateNext
    };
};