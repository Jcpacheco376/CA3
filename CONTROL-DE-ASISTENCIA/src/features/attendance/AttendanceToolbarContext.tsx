// src/features/attendance/AttendanceToolbarContext.tsx
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { useSharedAttendance } from '../../hooks/useSharedAttendance';
import { useAuth } from '../auth/AuthContext';
import { useAppContext } from '../../context/AppContext';

// Definimos el tipo basado en lo que retorna tu hook
type AttendanceToolbarContextType = ReturnType<typeof useSharedAttendance>;

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

    return (
        <AttendanceToolbarContext.Provider value={attendanceState}>
            {children}
        </AttendanceToolbarContext.Provider>
    );
};