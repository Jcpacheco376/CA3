import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { useNotification } from '../../context/NotificationContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Palmtree, Plus, CheckCircle2, XCircle, Clock, Save, FileText } from 'lucide-react';
import { Modal, Button } from '../../components/ui/Modal';
import { Tooltip } from '../../components/ui/Tooltip';

export const VacationsPage = () => {
    const { user, getToken, can } = useAuth();
    const { addNotification } = useNotification();
    const isManager = can('vacaciones.manage');

    const [activeTab, setActiveTab] = useState<'my_vacations' | 'approvals'>('my_vacations');
    const [balance, setBalance] = useState<any>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [newRequest, setNewRequest] = useState({
        fechaInicio: '',
        fechaFin: '',
        diasSolicitados: 1,
        comentarios: ''
    });

    const fetchData = async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) return;

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            // Need a reliable way to get EmpleadoId for the logged in user.
            // In many systems user.EmpleadoId exists, or we use a designated endpoint to get "my profile".
            // Since this differs per system, assuming the backend can map it or we use admin lists.
            // For now, let's fetch requests and if it's admin, fetch all.
            const reqUrl = isManager && activeTab === 'approvals'
                ? `${API_BASE_URL}/vacations/requests`
                : `${API_BASE_URL}/vacations/requests?empleadoId=${user?.UsuarioId}`; // Hacky mapping, better if backend handles `me`

            console.log("Fetching from:", reqUrl);
            const reqsRes = await fetch(reqUrl, { headers });

            if (reqsRes.ok) {
                setRequests(await reqsRes.json());
            } else {
                console.error("Error fetching requests:", await reqsRes.text());
            }

            // Fetch balance for MY vacations
            if (activeTab === 'my_vacations') {
                const balRes = await fetch(`${API_BASE_URL}/vacations/balance/${user?.UsuarioId}`, { headers }); // Replace with correct mapping
                if (balRes.ok) {
                    setBalance(await balRes.json());
                } else {
                    console.error("Error fetching balance:", await balRes.text());
                }
            }
        } catch (e) {
            console.error("fetchData Error:", e);
            addNotification('Error', 'No se pudo cargar la información de vacaciones.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleCreateRequest = async () => {
        if (!newRequest.fechaInicio || !newRequest.fechaFin || newRequest.diasSolicitados <= 0) {
            addNotification('Atención', 'Datos de solicitud inválidos.', 'warning');
            return;
        }

        try {
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/vacations/request`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empleadoId: user?.UsuarioId, // Assuming UsuarioId = EmpleadoId for prototype, adjust if map differs
                    fechaInicio: newRequest.fechaInicio,
                    fechaFin: newRequest.fechaFin,
                    diasSolicitados: newRequest.diasSolicitados,
                    comentarios: newRequest.comentarios
                })
            });

            if (res.ok) {
                addNotification('Éxito', 'Solicitud creada correctamente.', 'success');
                setIsRequestModalOpen(false);
                fetchData();
            } else {
                const data = await res.json();
                addNotification('Error', data.message || 'Error al crear solicitud.', 'error');
            }
        } catch (e) {
            addNotification('Error', 'Revisa la conexión.', 'error');
        }
    };

    const handleApproveReject = async (id: number, estatus: 'Aprobado' | 'Rechazado') => {
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/vacations/approve/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ estatus })
            });

            if (res.ok) {
                addNotification('Éxito', `Solicitud ${estatus}.`, 'success');
                fetchData();
            } else {
                const data = await res.json();
                addNotification('Error', data.message || 'Error al procesar.', 'error');
            }
        } catch (e) {
            addNotification('Error', 'Debe conectarse al servidor.', 'error');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Aprobado': return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
            case 'Rechazado': return 'bg-rose-100 text-rose-700 ring-1 ring-rose-200';
            default: return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
        }
    };

    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
                <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">No hay solicitudes</h3>
            <p className="text-slate-500 max-w-sm text-center mt-2">
                Aún no hay registros en esta sección.
            </p>
        </div>
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-content-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-[--theme-100] text-[--theme-600] rounded-lg">
                            <Palmtree size={24} />
                        </div>
                        Control de Vacaciones
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gestiona tus días de descanso y aprueba las solicitudes de tu equipo.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('my_vacations')}
                    className={`pb-3 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'my_vacations' ? 'border-[--theme-500] text-[--theme-600]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Mis Vacaciones
                </button>
                {isManager && (
                    <button
                        onClick={() => setActiveTab('approvals')}
                        className={`pb-3 px-4 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'approvals' ? 'border-[--theme-500] text-[--theme-600]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Aprobaciones Pendientes
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="h-48 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--theme-500]"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'my_vacations' && (
                        <div className="space-y-6">
                            {/* Dashboard Balance */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
                                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Otorgados ({new Date().getFullYear()})</span>
                                    <span className="text-4xl font-bold text-slate-800 mt-2">{balance?.DiasOtorgados || 0}</span>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
                                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Disfrutados</span>
                                    <span className="text-4xl font-bold text-blue-600 mt-2">{balance?.DiasDisfrutados || 0}</span>
                                </div>
                                <div className="bg-gradient-to-br from-[--theme-500] to-[--theme-700] p-6 rounded-xl shadow-sm text-white flex flex-col items-center justify-center relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 opacity-10">
                                        <Palmtree size={120} />
                                    </div>
                                    <span className="text-sm font-medium text-[--theme-100] uppercase tracking-wider relative z-10">Días Restantes</span>
                                    <span className="text-5xl font-bold mt-2 relative z-10">{balance?.DiasRestantes || 0}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-8">
                                <h2 className="text-lg font-semibold text-slate-800">Historial de Solicitudes</h2>
                                <button
                                    onClick={() => setIsRequestModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[--theme-500] hover:bg-[--theme-600] text-white rounded-lg transition-colors shadow-sm font-medium"
                                >
                                    <Plus size={18} />
                                    Nueva Solicitud
                                </button>
                            </div>

                            {/* Table */}
                            {requests.length === 0 ? renderEmptyState() : (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                                                <th className="px-6 py-3 font-semibold">Fechas</th>
                                                <th className="px-6 py-3 font-semibold text-center">Días</th>
                                                <th className="px-6 py-3 font-semibold">Comentarios</th>
                                                <th className="px-6 py-3 font-semibold">Alta</th>
                                                <th className="px-6 py-3 font-semibold">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {requests.map(req => (
                                                <tr key={req.SolicitudId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-800">
                                                            {format(new Date(req.FechaInicio), 'dd MMM yyyy', { locale: es })} - {format(new Date(req.FechaFin), 'dd MMM yyyy', { locale: es })}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-semibold text-slate-700">{req.DiasSolicitados}</td>
                                                    <td className="px-6 py-4 text-slate-600 text-sm">{req.Comentarios || '-'}</td>
                                                    <td className="px-6 py-4 text-slate-500 text-sm">{format(new Date(req.FechaSolicitud), 'dd MMM, HH:mm')}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-max ${getStatusStyle(req.Estatus)}`}>
                                                            {req.Estatus === 'Aprobado' && <CheckCircle2 size={14} />}
                                                            {req.Estatus === 'Rechazado' && <XCircle size={14} />}
                                                            {req.Estatus === 'Pendiente' && <Clock size={14} />}
                                                            {req.Estatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'approvals' && (
                        <div className="space-y-6">
                            {requests.length === 0 ? renderEmptyState() : (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                                                <th className="px-6 py-3 font-semibold">Empleado</th>
                                                <th className="px-6 py-3 font-semibold">Fechas Solicitadas</th>
                                                <th className="px-6 py-3 font-semibold text-center">Días</th>
                                                <th className="px-6 py-3 font-semibold">Estado</th>
                                                <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {requests.map(req => (
                                                <tr key={req.SolicitudId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-slate-800">{req.NombreCompleto}</div>
                                                        <div className="text-xs text-slate-500">Cod: {req.CodRef}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-700">
                                                            {format(new Date(req.FechaInicio), 'dd MMM yyyy', { locale: es })} al {format(new Date(req.FechaFin), 'dd MMM yyyy', { locale: es })}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]" title={req.Comentarios}>
                                                            {req.Comentarios}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-700">{req.DiasSolicitados}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-max ${getStatusStyle(req.Estatus)}`}>
                                                            {req.Estatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {req.Estatus === 'Pendiente' ? (
                                                            <>
                                                                <button onClick={() => handleApproveReject(req.SolicitudId, 'Aprobado')} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-sm font-medium transition-colors shadow-sm">
                                                                    Aprobar
                                                                </button>
                                                                <button onClick={() => handleApproveReject(req.SolicitudId, 'Rechazado')} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded text-sm font-medium transition-colors">
                                                                    Rechazar
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-400 text-sm">Resuelta</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Modal Nueva Solicitud */}
            <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Nueva Solicitud de Vacaciones">
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Inicio</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all"
                                value={newRequest.fechaInicio}
                                onChange={(e) => setNewRequest({ ...newRequest, fechaInicio: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Fin</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all"
                                value={newRequest.fechaFin}
                                onChange={(e) => setNewRequest({ ...newRequest, fechaFin: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Días a Descontar (Hábiles)</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all"
                            value={newRequest.diasSolicitados}
                            onChange={(e) => setNewRequest({ ...newRequest, diasSolicitados: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-slate-500 mt-1">Calcula manualmente los días excluyendo fines de semana/descansos.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios</label>
                        <textarea
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all min-h-[80px]"
                            value={newRequest.comentarios}
                            onChange={(e) => setNewRequest({ ...newRequest, comentarios: e.target.value })}
                            placeholder="Motivo o detalle adicional..."
                        ></textarea>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setIsRequestModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateRequest} className="bg-[--theme-500] hover:bg-[--theme-600] text-white">
                            <Save size={16} className="mr-2" />
                            Enviar Solicitud
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
