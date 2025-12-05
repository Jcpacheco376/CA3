// src/hooks/useSharedAttendance.ts
import { useState, useEffect, useMemo } from 'react';
import {
    format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    addDays, subDays, addWeeks, subWeeks, addMonths, subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';

const SHARED_CONFIG_KEY = 'app_shared_attendance_config';

export const useSharedAttendance = (user: any) => {
    // 1. Carga Inicial Unificada (Lazy Initialization)
    const initialState = useMemo(() => {
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
                    // AQUÍ ESTÁ LA MAGIA: Recuperamos la fecha o usamos hoy
                    currentDate: parsed.currentDate ? new Date(parsed.currentDate) : new Date()
                };
            }
        } catch (e) { console.error("Error cargando config compartida", e); }

        return { filters: defaultFilters, viewMode: 'week', currentDate: new Date() };
    }, [user]);

    // 2. Estados Compartidos
    const [filters, setFilters] = useState(initialState.filters);
    const [viewMode, setViewMode] = useState<'week' | 'fortnight' | 'month'>(initialState.viewMode as any);
    const [currentDate, setCurrentDate] = useState<Date>(initialState.currentDate);

    // 3. Persistencia Automática (Cada vez que algo cambia, se guarda)
    useEffect(() => {
        try {
            localStorage.setItem(SHARED_CONFIG_KEY, JSON.stringify({
                filters,
                viewMode,
                currentDate: currentDate.toISOString() // Guardamos la fecha
            }));
        } catch (e) {}
    }, [filters, viewMode, currentDate]);

    // 4. Lógica de Cálculo de Rangos (Centralizada)
const { dateRange, rangeLabel } = useMemo(() => {
        let start, end, label = ''; // <--- La variable interna se llama 'label'
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
        
        // Generar array de días
        const range = [];
        let dayCalc = start; // Usamos nombre diferente para evitar confusiones
        while (dayCalc <= end) {
            range.push(dayCalc);
            dayCalc = addDays(dayCalc, 1);
        }

        // --- CORRECCIÓN AQUÍ ---
        // Antes decía: return { dateRange: range, rangeLabel }; 
        // Eso causaba el error porque buscaba 'rangeLabel' que no existía en este ámbito.
        return { dateRange: range, rangeLabel: label }; 
        // -----------------------

    }, [currentDate, viewMode]);

    // 5. Handlers de Navegación (Centralizados)
    const handleDatePrev = () => {
        setCurrentDate(prev => {
            switch (viewMode) {
                case 'fortnight': return prev.getDate() <= 15 ? new Date(prev.getFullYear(), prev.getMonth() - 1, 16) : new Date(prev.getFullYear(), prev.getMonth(), 1);
                case 'month': return subMonths(prev, 1);
                default: return subWeeks(prev, 1);
            }
        });
    };

    const handleDateNext = () => {
        setCurrentDate(prev => {
            switch (viewMode) {
                case 'fortnight': return prev.getDate() <= 15 ? new Date(prev.getFullYear(), prev.getMonth(), 16) : new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
                case 'month': return addMonths(prev, 1);
                default: return addWeeks(prev, 1);
            }
        });
    };

    // Retornamos todo lo que las páginas necesitan
    return {
        filters, setFilters,
        viewMode, setViewMode,
        currentDate, setCurrentDate,
        dateRange, rangeLabel,
        handleDatePrev, handleDateNext
    };
};