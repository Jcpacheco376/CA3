// src/features/attendance/AttendanceToolbarContext.tsx

import React, { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { useSharedAttendance } from '../../hooks/useSharedAttendance';
import { useAuth } from '../auth/AuthContext';
import { useAppContext } from '../../context/AppContext';

// Definimos el tipo basado en lo que retorna tu hook
type SharedAttendanceType = ReturnType<typeof useSharedAttendance>;

type AttendanceToolbarContextType = SharedAttendanceType & {
    startDate: Date | null;
    endDate: Date | null;
};

export interface FilterOption {
    value: string | number;
    label: string;
}

export interface FilterConfig {
    id: string;
    icon: React.ReactNode;
    title: string;
    options: FilterOption[];
    selectedValues: (string | number)[];
    onChange: (newSelectedValues: (string | number)[]) => void;
    isActive: boolean; 
    selectionMode?: 'multiple' | 'single';
}

const AttendanceToolbarContext = createContext<AttendanceToolbarContextType | null>(null);

export const useAttendanceToolbarContext = () => {
    const context = useContext(AttendanceToolbarContext);
    if (!context) {
        throw new Error("useAttendanceToolbarContext debe usarse dentro de un AttendanceToolbarProvider");
    }
    return context;
};

export const AttendanceToolbarProvider = ({ children }: { children: ReactNode }) => {
    const { user, getToken } = useAuth();
    const { weekStartDay } = useAppContext();
    // Instanciamos el hook aquí para compartir su estado
    const attendanceState = useSharedAttendance(user, weekStartDay);

    // Estado local para persistir el rango personalizado y evitar que el hook lo sobrescriba
    const [customDateRange, setCustomDateRange] = useState<Date[] | null>(() => {
        try {
            const stored = localStorage.getItem('attendance_custom_range');
            if (stored) {
                const { start, end } = JSON.parse(stored);
                return eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
            }
        } catch (e) {
            console.error("Error loading custom range", e);
        }
        return null;
    });

    // Cache local de la preferencia de vista para evitar parpadeos (Anti-flicker)
    const [cachedViewMode, setCachedViewMode] = useState<string | null>(() => 
        localStorage.getItem('attendance_view_mode_pref')
    );

    // Sincronizar cache cuando cambia el modo real
    useEffect(() => {
        if (attendanceState.viewMode) {
            setCachedViewMode(attendanceState.viewMode);
            localStorage.setItem('attendance_view_mode_pref', attendanceState.viewMode);
        }
    }, [attendanceState.viewMode]);

    // 1. Detectar Logout al desmontar: Si al irse no hay token, marcamos para limpiar.
    useEffect(() => {
        return () => {
            const token = getToken();
            if (!token) {
                localStorage.setItem('attendance_clear_search_flag', 'true');
            }
        };
    }, [getToken]);

    // 2. Limpiar al montar (Login) si existe la marca.
    useEffect(() => {
        const shouldClear = localStorage.getItem('attendance_clear_search_flag');
        if (shouldClear === 'true' && user) {
            attendanceState.setFilters((prev: any) => ({ ...prev, search: '' }));
            localStorage.removeItem('attendance_clear_search_flag');
        }
    }, [user, attendanceState]);

    // 3. Sincronizar rango de fechas si cambia la configuración de inicio de semana
    useEffect(() => {
        if (attendanceState.setDateRange && attendanceState.dateRange && attendanceState.dateRange.length > 0) {
            // Si estamos en modo "Libre" (custom), NO forzamos la alineación con el inicio de semana
            if (attendanceState.viewMode === 'custom') return;

            const currentStart = attendanceState.dateRange[0];
            const currentDayOfWeek = currentStart.getDay(); // 0 (Dom) - 6 (Sab)

            if (currentDayOfWeek !== weekStartDay) {
                const today = new Date();
                const start = startOfWeek(today, { weekStartsOn: weekStartDay });
                const end = endOfWeek(today, { weekStartsOn: weekStartDay });
                const days = eachDayOfInterval({ start, end });
                attendanceState.setDateRange(days);
            }
        }
    }, [weekStartDay, attendanceState]);

    // 4. Calcular fechas de inicio y fin (Centralizado)
    const contextValue: AttendanceToolbarContextType = useMemo(() => {
        // Lógica Anti-Parpadeo:
        // Si el hook retorna 'week' (default) pero el cache dice 'custom' y tenemos rango, forzamos 'custom'.
        let effectiveViewMode = attendanceState.viewMode;
        if (effectiveViewMode === 'week' && cachedViewMode === 'custom' && customDateRange && customDateRange.length > 0) {
            effectiveViewMode = 'custom';
        }

        // Prioridad: Si estamos en modo custom y tenemos un rango local, lo usamos.
        // De lo contrario, usamos el rango del hook.
        let effectiveDateRange = attendanceState.dateRange;
        if (effectiveViewMode === 'custom' && customDateRange && customDateRange.length > 0) {
            effectiveDateRange = customDateRange;
        }

        const startDate = effectiveDateRange?.[0] ?? null;
        const endDate = effectiveDateRange?.[effectiveDateRange.length - 1] ?? null;

        return {
            ...attendanceState,
            viewMode: effectiveViewMode as any,
            dateRange: effectiveDateRange,
            // Interceptamos setDateRange para manejar el estado local en modo custom
            setDateRange: (range: Date[]) => {
                if (effectiveViewMode === 'custom') {
                    setCustomDateRange(range);
                    if (range && range.length > 0) {
                        localStorage.setItem('attendance_custom_range', JSON.stringify({
                            start: range[0].toISOString(),
                            end: range[range.length - 1].toISOString()
                        }));
                    }
                }
                if (attendanceState.setDateRange) {
                    attendanceState.setDateRange(range);
                }
            },
            startDate,
            endDate
        };
    }, [attendanceState, customDateRange, cachedViewMode]);

    return (
        <AttendanceToolbarContext.Provider value={contextValue}>
            {children}
        </AttendanceToolbarContext.Provider>
    );
};
