// src/features/admin/HorariosPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Removed .tsx/.ts from imports
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';
// Added Coffee, Sun, Sunset, Moon icons
import { Loader2, AlertTriangle, CheckCircle, XCircle, Edit, RotateCw, Coffee, Sun, Moon, Sunset } from 'lucide-react';
import { HorarioModal } from './HorarioModal';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip';
import { Button, Modal } from '../../components/ui/Modal';
import { PencilIcon, PlusCircleIcon } from '../../components/ui/Icons';
import { themes } from '../../config/theme';

// --- Helper Function for Turno Icon ---
const getTurnoIcon = (turno: 'M' | 'V' | 'N' | string | null | undefined, size = 16) => {
    switch (turno) {
        case 'M':
            return <Sun size={size} className="text-amber-500 shrink-0" title="Matutino" />;
        case 'V':
            return <Sunset size={size} className="text-orange-500 shrink-0" title="Vespertino" />;
        case 'N':
            return <Moon size={size} className="text-indigo-500 shrink-0" title="Nocturno" />;
        default:
            return null;
    }
};


// --- COMPONENTES AUXILIARES ---
// Updated JornadaSemanalVisual for Rotativo: Show 7 capsules with numbers and detailed tooltips
const JornadaSemanalVisual = ({ detalles, esRotativo }: { detalles: any[], esRotativo: boolean | number | undefined }) => { // Allow boolean, number or undefined
    const isActuallyRotativo = esRotativo === true || esRotativo === 1;

    // Common container style
    const containerClasses = "flex overflow-hidden rounded-md border border-slate-200 w-fit divide-x divide-slate-200 h-7";

    // Handle 'No definido' case first
    if (!detalles || detalles.length === 0) {
        if (isActuallyRotativo) {
             // Use containerClasses for consistent height and border
             return <div className={`flex items-center justify-center px-3 bg-slate-100 text-slate-500 text-xs italic ${containerClasses}`}>Rotativo (sin turnos definidos)</div>;
        }
        // If not rotativo and no details
         // Use containerClasses for consistent height and border
        return <div className={`flex items-center justify-center px-3 bg-slate-50 text-slate-400 text-xs italic ${containerClasses}`}>No definido</div>;
    }

    // Determine which labels and tooltips to use
    const items = Array.from({ length: 7 }).map((_, index) => {
        const detail = detalles.find(d => d.DiaSemana === index + 1); // Find detail by DiaSemana
        const isLaboral = detail?.EsDiaLaboral || false;
        // Use HoraInicioComida to determine if meal included, similar to modal logic
        const tieneComida = detail?.HoraInicioComida && detail.HoraInicioComida.substring(0, 5) !== '00:00';
        const label = isActuallyRotativo ? `${index + 1}` : ["L", "M", "X", "J", "V", "S", "D"][index];
        const baseTooltipText = isActuallyRotativo ? `Turno ${index + 1}` : ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][index];
        // Use sky blue for laboral days in both modes
        const colorClass = isLaboral ? 'bg-sky-500 text-white' : 'bg-white text-slate-500';

        // --- Enhanced Tooltip Content ---
        let tooltipJsxContent;
        if (isLaboral && detail) {
            tooltipJsxContent = (
                <div className='text-xs text-left p-1'>
                    <p className='font-semibold mb-1 border-b border-slate-600'>{baseTooltipText}</p>
                    {/* Ensure HoraEntrada and HoraSalida exist before substring */}
                    <p>{detail.HoraEntrada?.substring(0,5) ?? '??:??'} - {detail.HoraSalida?.substring(0,5) ?? '??:??'}</p>
                    {/* Use derived tieneComida for tooltip */}
                    {tieneComida && (
                        <p className='flex items-center gap-1 text-amber-600'><Coffee size={12}/> Con comida</p>
                    )}
                </div>
            );
        } else {
             tooltipJsxContent = (
                 <div className='text-xs text-left p-1'>
                    <p className='font-semibold mb-1 border-b border-slate-600'>{baseTooltipText}</p>
                    <p className='text-slate-400'>Descanso</p>
                 </div>
             );
        }
        // --- End Enhanced Tooltip Content ---

        return { index, label, tooltipJsxContent, colorClass }; // Use tooltipJsxContent
    });

    return (
        <div className={containerClasses}>
            {items.map(item => (
                <Tooltip key={item.index} text={item.tooltipJsxContent}> {/* Pass JSX directly */}
                    <span
                        className={`
                            w-7 h-full flex items-center justify-center text-xs font-semibold
                            transition-colors duration-150
                            ${item.colorClass}
                        `}
                    >
                        {item.label}
                    </span>
                </Tooltip>
            ))}
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---

export const HorariosPage = () => {
    const { getToken, can, user } = useAuth();
    const { addNotification } = useNotification();
    const [horarios, setHorarios] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHorario, setSelectedHorario] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const canManage = can('catalogo.horarios.manage');
    const canRead = can('catalogo.horarios.read');

    const fetchHorarios = useCallback(async () => {
        // ... (fetchHorarios logic remains the same) ...
        if (!canRead) {
            setError("No tienes permiso para ver este catálogo.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        const token = getToken();
        if (!token) {
            setError("Sesión no válida.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/catalogs/schedules`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo cargar el catálogo de horarios.');
            }
            const data = await response.json();
             // ***** LOG: Check the exact structure and casing of EsRotativo AND turno here *****
            console.log("[HorariosPage] fetchHorarios - Raw data received:", data);
            if (data && data.length > 0) {
                 console.log("[HorariosPage] fetchHorarios - First item check:", data[0]);
                 console.log(`[HorariosPage] fetchHorarios - Does first item have 'esRotativo'?`, data[0].hasOwnProperty('esRotativo'));
                 console.log(`[HorariosPage] fetchHorarios - Value of 'esRotativo':`, data[0].esRotativo);
                 console.log(`[HorariosPage] fetchHorarios - Does first item have 'turno'?`, data[0].hasOwnProperty('turno'));
                 console.log(`[HorariosPage] fetchHorarios - Value of 'turno':`, data[0].turno);
            }
            setHorarios(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [getToken, canRead]);

    useEffect(() => {
        fetchHorarios();
    }, [fetchHorarios]);

    const handleOpenModal = (horario: any | null = null) => {
        setSelectedHorario(horario);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedHorario(null);
    };

    const handleSave = () => {
        handleCloseModal();
        fetchHorarios();
    };

    const filteredHorarios = useMemo(() => {
        // ... (filteredHorarios logic remains the same) ...
        if (!searchTerm.trim()) return horarios;
        const lowercasedFilter = searchTerm.toLowerCase();
        return horarios.filter(h =>
            (h.Nombre?.toLowerCase().includes(lowercasedFilter)) ||
            (h.Abreviatura?.toLowerCase().includes(lowercasedFilter))
        );
    }, [horarios, searchTerm]);

    const renderContent = () => {
        // ... (renderContent logic remains the same) ...
        if (isLoading) {
            return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin mr-2" /> Cargando horarios...</div>;
        }
        if (error) {
            return <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg"><AlertTriangle className="mx-auto mb-2" />{error}</div>;
        }
        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-left font-semibold text-slate-600">ID</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Abreviatura</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Nombre del Horario</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Jornada Semanal</th>
                            <th className="p-3 text-center font-semibold text-slate-600">Tolerancia (min)</th>
                            <th className="p-3 text-center font-semibold text-slate-600">Estado</th>
                            {canManage && <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHorarios.map((horario) => {
                             // ***** LOG: Check the value being passed for each row *****
                             // console.log(`[HorariosPage] Rendering row for HorarioId ${horario.HorarioId}, esRotativo prop value:`, horario.esRotativo, typeof horario.esRotativo);
                             return (
                                <tr key={horario.HorarioId} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-800">{horario.HorarioId}</td>
                                    <td className="p-3 font-medium text-slate-800">
                                        <span className="px-2 py-1 rounded-md text-xs font-semibold" style={{
                                            backgroundColor: themes[horario.ColorUI as keyof typeof themes]?.[100] || '#EFF6FF',
                                            color: themes[horario.ColorUI as keyof typeof themes]?.[600] || '#2563EB'
                                        }}>
                                            {horario.Abreviatura}
                                        </span>
                                    </td>
                                    {/* Display Turno Icon next to Nombre */}
                                    <td className="p-3 font-medium text-slate-800">
                                        <div className="flex items-center gap-2">
                                            {/* Conditionally render icon only if NOT rotativo and turno is valid */}
                                            {(!horario.esRotativo && horario.turno) && getTurnoIcon(horario.turno)}
                                            <span>{horario.Nombre}</span>
                                        </div>
                                    </td>
                                    {/* Pass esRotativo (camelCase) to JornadaSemanalVisual */}
                                    <td className="p-3"><JornadaSemanalVisual detalles={horario.Detalles} esRotativo={horario.esRotativo} /></td>
                                    <td className="p-3 text-center">{horario.MinutosTolerancia}</td>
                                    <td className="p-3 text-center">
                                        {horario.Activo ?
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={14} /> Activo</span> :
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={14} /> Inactivo</span>
                                        }
                                    </td>
                                    {canManage && (
                                        <td className="p-3 text-center">
                                            <Tooltip text="Editar Horario">
                                                <button onClick={() => handleOpenModal(horario)} className="p-2 text-slate-500 hover:text-[--theme-500] rounded-full hover:bg-slate-100 transition-colors">
                                                    <PencilIcon />
                                                </button>
                                            </Tooltip>
                                        </td>
                                    )}
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    if (!canRead) {
        // ... (Access denied message remains the same) ...
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg">
                    <AlertTriangle className="mx-auto mb-2 h-10 w-10" />
                    <h2 className="text-lg font-semibold">Acceso Denegado</h2>
                    <p>No tienes permiso para ver este catálogo. Contacta a un administrador.</p>
                </div>
            </div>
        );
    }

    // Add keyframes for gradient animation
    const styles = `
        @keyframes gradient-x {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradient-x 3s ease infinite;
        }
    `;

    return (
        <div className="space-y-4">
             <style>{styles}</style> {/* Inject animation styles */}
             {/* <header className="mb-6">

                <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-slate-800">Catálogo de Horarios</h1>
                    <Tooltip text="Define y administra los horarios de trabajo de la empresa.">
                        <span><InfoIcon /></span>
                    </Tooltip>
                </div>
            </header> */}

            <div className="flex justify-between items-center mb-4">

                <div className="max-w-xs">
                     <input
                        type="text"
                        placeholder="Buscar por Nombre o ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--theme-500]"
                    />
                </div>
                {canManage && (
                    <Button onClick={() => handleOpenModal(null)}>
                        <PlusCircleIcon />
                        Nuevo Horario
                    </Button>
                )}
            </div>

            {renderContent()}

            {isModalOpen && (
                // ... (Modal remains the same) ...
                <HorarioModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    horario={selectedHorario}
                />
            )}
        </div>
    );
};

