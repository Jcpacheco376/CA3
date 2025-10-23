import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext'; // Removed .tsx
import { useNotification } from '../../context/NotificationContext'; // Removed .tsx
import { API_BASE_URL } from '../../config/api'; // Removed .ts
import { Loader2, AlertTriangle, CheckCircle, XCircle, Edit, RotateCw } from 'lucide-react'; // Added RotateCw
import { HorarioModal } from './HorarioModal'; // Removed .tsx
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip'; // Removed .tsx
import { Button, Modal } from '../../components/ui/Modal'; // Removed .tsx
import { PencilIcon, PlusCircleIcon } from '../../components/ui/Icons'; // Removed .tsx
import { themes } from '../../config/theme'; // Removed .ts

// --- COMPONENTES AUXILIARES ---
// Updated JornadaSemanalVisual for a cohesive Rotativo style with matching colors
const JornadaSemanalVisual = ({ detalles, esRotativo }: { detalles: any[], esRotativo: boolean | number | undefined }) => { // Allow boolean, number or undefined
    const isActuallyRotativo = esRotativo === true || esRotativo === 1;

    // Use the same outer container structure for consistency
    return (
        <div className="flex overflow-hidden rounded-md border border-slate-200 w-fit divide-x divide-slate-200 h-7"> {/* Base container with fixed height */}
            {isActuallyRotativo ? (
                // Single unified capsule style for Rotativo, using sky-500 and white text
                 <Tooltip text="Horario Rotativo">
                    {/* Changed colors to bg-sky-500 and text-white */}
                    <div className="flex items-center justify-center px-4 h-full bg-sky-500 text-white text-xs font-semibold w-[196px]"> {/* w-7 * 7 days = 196px */}
                        <RotateCw size={14} className="mr-1.5"/> Rotativo
                    </div>
                </Tooltip>
            ) : (
                // Existing logic for non-rotating schedules
                <>
                    {(() => { // IIFE to avoid conditional rendering issues with map
                        const dias = [
                            { abr: 'L', full: 'Lunes' },
                            { abr: 'M', full: 'Martes' },
                            { abr: 'X', full: 'Miércoles' },
                            { abr: 'J', full: 'Jueves' },
                            { abr: 'V', full: 'Viernes' },
                            { abr: 'S', full: 'Sábado' },
                            { abr: 'D', full: 'Domingo' }
                        ];
                        const diasLaborales = new Set(
                            (detalles || [])
                                .filter(d => d.EsDiaLaboral)
                                .map(d => d.DiaSemana - 1)
                        );

                        // Main container for the weekly capsules - ensure h-full
                        const weeklyCapsules = (
                             <div className="flex divide-x divide-slate-200 h-full"> {/* Removed w-fit, added h-full */}
                                {dias.map((dia, index) => (
                                    <Tooltip key={index} text={dia.full}>
                                        <span
                                            className={`
                                                w-7 h-full flex items-center justify-center text-xs font-semibold
                                                transition-colors duration-150
                                                ${diasLaborales.has(index)
                                                    ? 'bg-sky-500 text-white' // Color Laboral
                                                    : 'bg-white text-slate-500' // Color Descanso
                                                }
                                            `}
                                        >
                                            {dia.abr}
                                        </span>
                                    </Tooltip>
                                ))}
                            </div>
                        );

                        // Handle 'No definido' case separately but maintain height and width
                        if (!detalles || detalles.length === 0) {
                            return <div className="flex items-center justify-center px-3 h-full bg-slate-50 text-slate-400 text-xs italic w-[196px]">No definido</div>;
                        }

                        return weeklyCapsules; // Render the weekly view

                    })()}
                </>
            )}
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
             // ***** LOG: Check the exact structure and casing of EsRotativo here *****
             // ***** Log the entire data array and the first item if available *****
            // console.log("[HorariosPage] fetchHorarios - Raw data received:", data);
            // if (data && data.length > 0) {
            //     console.log("[HorariosPage] fetchHorarios - First item check:", data[0]);
            //     console.log(`[HorariosPage] fetchHorarios - Does first item have 'EsRotativo'?`, data[0].hasOwnProperty('EsRotativo'));
            //     console.log(`[HorariosPage] fetchHorarios - Value of 'EsRotativo':`, data[0].EsRotativo);
            //     console.log(`[HorariosPage] fetchHorarios - Does first item have 'esRotativo'?`, data[0].hasOwnProperty('esRotativo'));
            //     console.log(`[HorariosPage] fetchHorarios - Value of 'esRotativo':`, data[0].esRotativo);
            // }
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
        if (!searchTerm.trim()) return horarios;
        const lowercasedFilter = searchTerm.toLowerCase();
        return horarios.filter(h =>
            (h.Nombre?.toLowerCase().includes(lowercasedFilter)) ||
            (h.Abreviatura?.toLowerCase().includes(lowercasedFilter))
        );
    }, [horarios, searchTerm]);

    const renderContent = () => {
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
                                    <td className="p-3 font-medium text-slate-800">{horario.Nombre}</td>
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
        <div className="space-y-6">
             <style>{styles}</style> {/* Inject animation styles */}
             <header className="mb-6">
                <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-slate-800">Catálogo de Horarios</h1>
                    <Tooltip text="Define y administra los horarios de trabajo de la empresa.">
                        <span><InfoIcon /></span>
                    </Tooltip>
                </div>
            </header>

            <div className="flex justify-between items-center mb-4">
                <div className="max-w-xs">
                     <input
                        type="text"
                        placeholder="Buscar por Nombre o ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 border border-slate-300 rounded-lg"
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

