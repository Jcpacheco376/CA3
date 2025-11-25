// Src/features/reports/pages/KardexReportPage.tsx
import React, { useState } from 'react';
import { Search, FileSpreadsheet, Download } from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { ReportFilterBar } from './ReportFilterBar'; // Importamos el nuevo componente
import { PayrollGuardModal } from '../components/PayrollGuardModal'; // <--- 1. IMPORTAR MODAL
export const KardexReportPage = () => {
const { getToken, can } = useAuth(); // Usamos 'can' para verificar el permiso 'nomina.override'
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);
    
    // --- 2. NUEVOS ESTADOS PARA VALIDACIÓN ---
    const [validationResult, setValidationResult] = useState<any>(null);
    const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
    const [pendingFilters, setPendingFilters] = useState<any>(null); // Guardamos los filtros para usarlos después de validar

   const handleValidate = async (filters: any) => {
        setIsLoading(true);
        const token = getToken();
        if (!token) return;

        try {
            // Llamada al endpoint de validación
            const response = await fetch(`${API_BASE_URL}/reports/validate-period`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ startDate: filters.startDate, endDate: filters.endDate }) 
                // Solo necesitamos fechas para validar el semáforo global
            });

            if (!response.ok) throw new Error('Error al validar periodo.');
            
            const result = await response.json();
            
            // Guardamos resultado y filtros, y abrimos el modal
            setValidationResult(result);
            setPendingFilters(filters);
            setIsGuardModalOpen(true);

        } catch (err: any) {
            console.error(err);
            // Si falla la validación técnica (error 500), ¿permitimos continuar o mostramos error?
            // Por seguridad mostramos error.
        } finally {
            setIsLoading(false);
        }
    };
const handleConfirmGeneration = async () => {
        setIsGuardModalOpen(false); // Cerrar modal
        setIsLoading(true); // Volver a poner loading
        
        const token = getToken();
        const filters = pendingFilters; // Recuperamos los filtros guardados

        try {
            const response = await fetch(`${API_BASE_URL}/reports/kardex`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(filters)
            });

            if (!response.ok) throw new Error('Error al generar el reporte.');
            const data = await response.json();
            setReportData(data);
        } catch (err: any) {
            // Manejo de errores
        } finally {
            setIsLoading(false);
            setPendingFilters(null);
        }
    };
    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. Barra de Herramientas Reutilizable */}
            <ReportFilterBar onGenerate={handleValidate} isLoading={isLoading} />

            {/* 2. Resultados */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[400px] flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <h3 className="font-semibold text-slate-700">Resultados ({reportData.length} empleados)</h3>
                    <div className="flex gap-2">
                        <Tooltip text="Exportar a Excel">
                            <button disabled={reportData.length === 0} className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                <FileSpreadsheet size={20} />
                            </button>
                        </Tooltip>
                        <Tooltip text="Exportar a PDF">
                            <button disabled={reportData.length === 0} className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                <Download size={20} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                <div className="flex-grow overflow-auto p-0">
                    {reportData.length === 0 && !isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>{error || 'Selecciona los filtros y genera el reporte.'}</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b sticky top-0">
                                <tr>
                                    <th className="p-3">ID</th>
                                    <th className="p-3">Empleado</th>
                                    <th className="p-3">Departamento</th>
                                    <th className="p-3 text-center">Asistencias</th>
                                    <th className="p-3 text-center">Faltas</th>
                                    <th className="p-3 text-center">Retardos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reportData.map(emp => {
                                    // Calculos simples en frontend para mostrar algo útil
                                    const asistencias = emp.fichas.filter((f: any) => ['A', 'RET'].includes(f.EstatusManualAbrev)).length;
                                    const faltas = emp.fichas.filter((f: any) => f.EstatusManualAbrev === 'F').length;
                                    const retardos = emp.fichas.filter((f: any) => f.EstatusManualAbrev === 'RET').length;

                                    return (
                                        <tr key={emp.empleadoId} className="hover:bg-slate-50">
                                            <td className="p-3 font-mono text-slate-500">{emp.codRef}</td>
                                            <td className="p-3 font-medium text-slate-800">{emp.nombre}</td>
                                            <td className="p-3 text-slate-500">{emp.departamento}</td>
                                            <td className="p-3 text-center font-bold text-green-600">{asistencias}</td>
                                            <td className="p-3 text-center font-bold text-red-600">{faltas}</td>
                                            <td className="p-3 text-center font-bold text-orange-500">{retardos}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        
                    )}
                    <PayrollGuardModal 
                isOpen={isGuardModalOpen}
                onClose={() => setIsGuardModalOpen(false)}
                onConfirm={handleConfirmGeneration}
                validation={validationResult}
                canOverride={can('nomina.override')} // Requiere definir este permiso en tu sistema
            />
                </div>
            </div>
        </div>
    );
};

