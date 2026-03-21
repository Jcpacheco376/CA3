import { useState, useEffect, useCallback } from 'react';
import { isSameDay, differenceInDays, addDays, getDay, parseISO } from 'date-fns';

interface VacationRequestForm {
    empleadoId: string;
    fechaInicio: string;
    fechaFin: string;
    diasSolicitados: number;
    comentarios: string;
}

interface UseVacationFormProps {
    initialEmployeeId?: string;
    onDaysCalculated?: (days: number) => void;
}

const isWeekend = (date: Date) => {
    const day = getDay(date);
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
    if (isSameDay(startDate, endDate)) {
        return isWeekend(startDate) ? 0 : 1;
    }

    let days = 0;
    let currentDate = startDate;

    while (currentDate <= endDate) {
        if (!isWeekend(currentDate)) {
            days++;
        }
        currentDate = addDays(currentDate, 1);
    }
    return days;
};

export const useVacationForm = ({ initialEmployeeId = '', onDaysCalculated }: UseVacationFormProps) => {
    const [newRequest, setNewRequest] = useState<VacationRequestForm>({
        empleadoId: initialEmployeeId,
        fechaInicio: '',
        fechaFin: '',
        diasSolicitados: 0,
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
                const businessDays = calculateBusinessDays(start, end);
                setNewRequest(prev => ({ ...prev, diasSolicitados: businessDays }));
                onDaysCalculated?.(businessDays);
            } else {
                setNewRequest(prev => ({ ...prev, diasSolicitados: 0 }));
                onDaysCalculated?.(0);
            }
        } else {
            setNewRequest(prev => ({ ...prev, diasSolicitados: 0 }));
            onDaysCalculated?.(0);
        }
    }, [newRequest.fechaInicio, newRequest.fechaFin, onDaysCalculated]);

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
            diasSolicitados: 0,
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