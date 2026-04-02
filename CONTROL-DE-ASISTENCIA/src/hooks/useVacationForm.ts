import { useState, useEffect, useCallback } from 'react';
import { isSameDay, addDays, parseISO, differenceInCalendarDays } from 'date-fns';

interface VacationRequestForm {
    empleadoId: string;
    fechaInicio: string;
    fechaFin: string;
    // Display-only estimates (real calculation is done by the backend SP)
    diasNaturales: number;
    diasFeriados: number; // Only DIA_FERIADO events — used for the UI dot indicator
    comentarios: string;
}

interface UseVacationFormProps {
    initialEmployeeId?: string;
    calendarEvents?: any[];
    onDaysCalculated?: (days: number) => void;
}

// Calculate display-only estimates for the UI card:
// - diasNaturales: total calendar days in range
// - diasFeriados: DIA_FERIADO calendar events within range (for the note label)
// NO hardcoded weekend/rest-day logic — that's the backend's job using the employee's schedule.
const calcDisplayEstimates = (startDate: Date, endDate: Date, calendarEvents: any[]): {
    diasNaturales: number;
    diasFeriados: number;
} => {
    const diasNaturales = differenceInCalendarDays(endDate, startDate) + 1;
    let diasFeriados = 0;

    let current = startDate;
    while (current <= endDate) {
        const isFeriado = calendarEvents.some(ev =>
            ev.TipoEventoId === 'DIA_FERIADO' &&
            ev.Fecha &&
            isSameDay(parseISO(ev.Fecha.substring(0, 10)), current)
        );
        if (isFeriado) diasFeriados++;
        current = addDays(current, 1);
    }

    return { diasNaturales, diasFeriados };
};

export const useVacationForm = ({ initialEmployeeId = '', calendarEvents = [], onDaysCalculated }: UseVacationFormProps) => {
    const [newRequest, setNewRequest] = useState<VacationRequestForm>({
        empleadoId: initialEmployeeId,
        fechaInicio: '',
        fechaFin: '',
        diasNaturales: 0,
        diasFeriados: 0,
        comentarios: ''
    });

    useEffect(() => {
        setNewRequest(prev => ({ ...prev, empleadoId: initialEmployeeId }));
    }, [initialEmployeeId]);

    const calculateAndSetDays = useCallback(() => {
        const { fechaInicio, fechaFin } = newRequest;
        if (fechaInicio && fechaFin) {
            const start = parseISO(fechaInicio);
            const end = parseISO(fechaFin);

            if (start && end && start <= end) {
                const { diasNaturales, diasFeriados } = calcDisplayEstimates(start, end, calendarEvents);
                setNewRequest(prev => ({ ...prev, diasNaturales, diasFeriados }));
                // Notify parent with natural days as a rough estimate only
                onDaysCalculated?.(diasNaturales);
            } else {
                setNewRequest(prev => ({ ...prev, diasNaturales: 0, diasFeriados: 0 }));
                onDaysCalculated?.(0);
            }
        } else {
            setNewRequest(prev => ({ ...prev, diasNaturales: 0, diasFeriados: 0 }));
            onDaysCalculated?.(0);
        }
    }, [newRequest.fechaInicio, newRequest.fechaFin, calendarEvents, onDaysCalculated]);

    useEffect(() => {
        calculateAndSetDays();
    }, [calculateAndSetDays]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewRequest(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = useCallback(() => {
        setNewRequest({
            empleadoId: initialEmployeeId,
            fechaInicio: '',
            fechaFin: '',
            diasNaturales: 0,
            diasFeriados: 0,
            comentarios: ''
        });
    }, [initialEmployeeId]);

    return {
        newRequest,
        setNewRequest,
        handleInputChange,
        resetForm,
        calculateAndSetDays
    };
};