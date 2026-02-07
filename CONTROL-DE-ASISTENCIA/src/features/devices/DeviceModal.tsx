// src/features/devices/DeviceModal.tsx
import React, { useState, useEffect } from 'react';
import { 
    Server, 
    Activity, 
    MapPin, 
    KeyRound, 
    Hash, 
    Wifi, 
    CheckCircle2, 
    Trash2, 
    AlertCircle,
    Info,
    Loader2,
    Plus,
    X,
    Eye,
    EyeOff
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { useNotification } from '../../context/NotificationContext';
import { Modal, Button } from '../../components/ui/Modal';
import { SmartSelect } from '../../components/ui/SmartSelect';
import { Tooltip } from '../../components/ui/Tooltip';

// Definición local si no la importas
interface Device {
    DispositivoId: number;
    Nombre: string;
    IpAddress: string;
    Puerto: number;
    ZonaId: number;
    BorrarChecadas: boolean;
    Activo: boolean;
    TieneContrasena?: boolean;
}

interface DeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    deviceToEdit?: Device | null;
}


// --- Componentes UI Internos (Movidos fuera para evitar re-render y pérdida de foco) ---

const InputField = ({ label, icon: Icon, value, onChange, type = "text", placeholder, required = false, fontMono = false, error, tooltip, canToggleVisibility, ...props }: any) => {
    const [isVisible, setIsVisible] = useState(false);
    const inputType = canToggleVisibility && isVisible ? "text" : type;

    return (
        <div className="space-y-1.5">
            {tooltip ? (
                <Tooltip text={tooltip}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide truncate w-fit  border-b border-dotted border-slate-300 hover:text-slate-700 hover:border-slate-400 transition-colors">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                </Tooltip>
            ) : (
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[--theme-500]'}`}>
                    <Icon size={18} />
                </div>
                <input
                    type={inputType}
                    required={required}
                    className={`w-full pl-10 ${canToggleVisibility ? 'pr-10' : 'pr-3'} py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-1 transition-all text-sm text-slate-700 shadow-sm placeholder:text-slate-300 ${fontMono ? 'font-mono' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-[--theme-500] focus:border-[--theme-500]'}`}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    {...props}
                />
                {canToggleVisibility && (
                    <button
                        type="button"
                        onClick={() => setIsVisible(!isVisible)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-in slide-in-from-top-1"><AlertCircle size={12}/> {error}</p>}
        </div>
    );
};

const ToggleSwitch = ({ label, description, checked, onChange, colorClass = "bg-[--theme-600]" }: any) => (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group border border-transparent hover:border-slate-100" onClick={() => onChange(!checked)}>
        <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${checked ? colorClass : 'bg-slate-200'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
        <div className="flex items-center gap-2">
            {description ? (
                <Tooltip text={description}>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 select-none  border-b border-dotted border-slate-300">{label}</span>
                </Tooltip>
            ) : (
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 select-none">{label}</span>
            )}
        </div>
    </div>
);

const PASSWORD_PLACEHOLDER = '••••••••';

export const DeviceModal = ({ isOpen, onClose, onSuccess, deviceToEdit }: DeviceModalProps) => {
    const { getToken } = useAuth();
    const { addNotification } = useNotification();
    
    const [loading, setLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [zones, setZones] = useState<{ ZonaId: number, Nombre: string }[]>([]);
    const [loadingZones, setLoadingZones] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isCreatingZone, setIsCreatingZone] = useState(false);
    const [newZoneName, setNewZoneName] = useState('');
    
    // Estado inicial
    const initialFormState = {
        Nombre: '',
        IpAddress: '192.168.1.201',
        Puerto: 4370,
        Password: '',
        ZonaId: 0,
        BorrarChecadas: false,
        Activo: true
    };
const handleCreateZone = async () => {
        if (!newZoneName.trim()) return;
        setLoadingZones(true);
        try {
            const response = await fetch(`${API_BASE_URL}/devices/zones`, { // O la ruta que definiste
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ Nombre: newZoneName, Descripcion: 'Creada desde Dispositivos' })
            });
            
            if (response.ok) {
                const newZone = await response.json();
                // Agregamos la zona a la lista y la seleccionamos
                setZones(prev => [...prev, newZone]);
                setFormData(prev => ({ ...prev, ZonaId: newZone.ZonaId }));
                setIsCreatingZone(false);
                setNewZoneName('');
                addNotification('Éxito', 'Zona creada correctamente', 'success');
            }
        } catch (e) {
            addNotification('Error', 'No se pudo crear la zona', 'error');
        } finally {
            setLoadingZones(false);
        }
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        if (isOpen) {
            setErrors({}); // Limpiar errores al abrir
            setConnectionStatus('idle'); // Reiniciar estado de conexión
            fetchZones();
            if (deviceToEdit) {
                setFormData({
                    Nombre: deviceToEdit.Nombre,
                    IpAddress: deviceToEdit.IpAddress,
                    Puerto: deviceToEdit.Puerto,
                    Password: deviceToEdit.TieneContrasena ? PASSWORD_PLACEHOLDER : '',
                    ZonaId: deviceToEdit.ZonaId,
                    BorrarChecadas: deviceToEdit.BorrarChecadas,
                    Activo: deviceToEdit.Activo
                });
            } else {
                setFormData(initialFormState);
            }
        }
    }, [isOpen, deviceToEdit]);

    const fetchZones = async () => {
        setLoadingZones(true);
        try {
            const response = await fetch(`${API_BASE_URL}/devices/zones`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (response.ok) {
                const data = await response.json();
                setZones(data);
                // Si es nuevo y hay zonas, preseleccionar la primera
                if (!deviceToEdit && data.length > 0 && formData.ZonaId === 0) {
                    setFormData(prev => ({ ...prev, ZonaId: data[0].ZonaId }));
                }
            }
        } catch (error) {
            console.error("Error fetching zones:", error);
        } finally {
            setLoadingZones(false);
        }
    };

    const getCommKey = () => {
        if (!formData.Password || formData.Password.trim() === '') return '0';
        return formData.Password;
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        
        // Lógica especial para el placeholder de contraseña
        if (deviceToEdit && formData.Password === PASSWORD_PLACEHOLDER) {
            // Si la longitud es menor, el usuario borró algo -> Limpiar todo
            if (val.length < PASSWORD_PLACEHOLDER.length) {
                setFormData({ ...formData, Password: '' });
                return;
            }
            // Si la longitud es mayor, el usuario escribió algo -> Reemplazar placeholder con lo nuevo
            if (val.length > PASSWORD_PLACEHOLDER.length) {
                const newChar = val.slice(PASSWORD_PLACEHOLDER.length);
                setFormData({ ...formData, Password: newChar });
                return;
            }
        }
        setFormData({ ...formData, Password: val });
    };

    // --- Validaciones en tiempo real ---
    const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9.]/g, ''); // Solo números y puntos
        val = val.replace(/\.\./g, '.'); // No puntos dobles
        
        // Validar segmentos
        const parts = val.split('.');
        if (parts.length > 4) return; // Máximo 4 segmentos
        
        // Validar valor de segmento (0-255)
        const lastPart = parts[parts.length - 1];
        if (lastPart && parseInt(lastPart) > 255) return; // No permitir > 255
        if (lastPart.length > 3) return; // No más de 3 dígitos

        setFormData({ ...formData, IpAddress: val });
        
        // Limpiar error si ya es válido
        if (errors.IpAddress) {
             const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
             if (ipRegex.test(val)) {
                 setErrors(prev => { const { IpAddress, ...rest } = prev; return rest; });
             }
        }
    };

    const handleIpBlur = () => {
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (formData.IpAddress && !ipRegex.test(formData.IpAddress)) {
            setErrors(prev => ({ ...prev, IpAddress: 'Formato inválido (Ej. 192.168.1.201)' }));
        }
    };

    const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        if (val === '') {
            setFormData({ ...formData, Puerto: 0 });
            return;
        }
        const num = parseInt(val);
        if (num > 65535) return; // Límite TCP/UDP
        setFormData({ ...formData, Puerto: num });
    };

    const setTesting = (isTesting: boolean) => {
        setFormData(prev => ({ ...prev, Testing: isTesting }));
    };
const handleTestConnection = async () => {
        // Validaciones previas
        if (!formData.IpAddress) {
            addNotification('Requerido', 'Ingrese una dirección IP.', 'warning');
            return;
        }

        setConnectionStatus('testing'); // Estado para mostrar spinner
        setTesting(true); // Bloquear botones

        try {
            let commKey = getCommKey();
            
            // Si estamos editando y la contraseña es el placeholder, enviamos cadena vacía
            // para que el backend sepa que debe usar la contraseña almacenada en BD.
            if (deviceToEdit && formData.Password === PASSWORD_PLACEHOLDER) {
                commKey = "";
            }

            console.log(`Probando conexión a ${formData.IpAddress}...`);
            // Llamamos a la ruta manual (sin ID en la URL)
            const response = await fetch(`${API_BASE_URL}/devices/test-manual`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    IpAddress: formData.IpAddress,
                    Puerto: parseInt(formData.Puerto.toString()),
                    Password: commKey,
                    DeviceId: deviceToEdit?.DispositivoId // Enviamos ID para fallback de contraseña
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'No se pudo conectar');
            }
            
            // Éxito
            setConnectionStatus('success');
            addNotification('Éxito', 'Conexión establecida correctamente.', 'success');
            
            // Resetear estado visual después de 3 seg
            setTimeout(() => setConnectionStatus('idle'), 3000);

        } catch (error: any) {
            setConnectionStatus('error');
            addNotification('Error', error.message, 'error');
            setTimeout(() => setConnectionStatus('idle'), 3000);
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.Nombre || !formData.IpAddress) {
            addNotification('Error', 'Nombre e IP son obligatorios', 'error');
            return;
        }

        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(formData.IpAddress)) {
            setErrors(prev => ({ ...prev, IpAddress: 'Dirección IP inválida' }));
            return;
        }

        if (!formData.ZonaId) {
            addNotification('Error', 'La zona es obligatoria', 'error');
            return;
        }

        setLoading(true);
        try {
            const url = deviceToEdit 
                ? `${API_BASE_URL}/devices/${deviceToEdit.DispositivoId}`
                : `${API_BASE_URL}/devices`;
            
            const commKey = getCommKey();

            // Preparar el cuerpo base
            const body: any = { 
                ...formData, 
                Puerto: parseInt(formData.Puerto.toString())
            };

            // Lógica de Contraseña:
            // Si estamos editando y la contraseña sigue siendo el placeholder, NO la enviamos (undefined)
            // Si es nuevo, o si el usuario la cambió (incluso si la borró a vacío), la enviamos.
            if (deviceToEdit && formData.Password === PASSWORD_PLACEHOLDER) {
                // No enviar PasswordCom para que el backend mantenga la actual
            } else {
                body.PasswordCom = commKey;
            }
            
            // Limpiar campo interno que no va al backend
            delete body.Password;

            const response = await fetch(url, {
                method: deviceToEdit ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar dispositivo');
            }

            addNotification('Éxito', `Dispositivo ${deviceToEdit ? 'actualizado' : 'creado'} correctamente`, 'success');
            onSuccess();
            onClose();
        } catch (error: any) {
            addNotification('Error', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

  // ... (resto del código del componente)

    const footerActions = (
        <button
            type="button"
            onClick={handleTestConnection}
            disabled={connectionStatus === 'testing' || loading}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm
                ${connectionStatus === 'idle' ? 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600' : ''}
                ${connectionStatus === 'testing' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 cursor-wait' : ''}
                ${connectionStatus === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : ''}
                ${connectionStatus === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : ''}
            `}
        >
            {connectionStatus === 'idle' && <Wifi size={18} strokeWidth={2} />}
            {connectionStatus === 'testing' && <Loader2 size={18} className="animate-spin" />}
            {connectionStatus === 'success' && <CheckCircle2 size={18} strokeWidth={2} />}
            {connectionStatus === 'error' && <AlertCircle size={18} strokeWidth={2} />}
            <span>{connectionStatus === 'idle' ? "Probar Conexión" : connectionStatus === 'testing' ? "Conectando..." : connectionStatus === 'success' ? "En Línea" : "Sin Conexión"}</span>
        </button>
    );

    const isFormValid = 
        formData.Nombre?.trim() !== '' &&
        formData.IpAddress?.trim() !== '' &&
        formData.Puerto > 0 &&
        formData.ZonaId > 0 &&
        !errors.IpAddress;

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose} disabled={loading}>
                Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !isFormValid}>
                {loading ? 'Guardando...' : (deviceToEdit ? 'Guardar Cambios' : 'Crear Dispositivo')}
            </Button>
        </>
    );


    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={deviceToEdit ? "Configurar Dispositivo" : "Nuevo Dispositivo"} 
            footer={footer} 
            size="xl"
        >
            <form className="space-y-6">
                
                {/* --- SECCIÓN 1: IDENTIDAD --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField 
                        label="Nombre del Dispositivo" 
                        icon={Server} 
                        placeholder="Ej. Entrada Principal" 
                        value={formData.Nombre} 
                        onChange={(e: any) => setFormData({...formData, Nombre: e.target.value})} 
                        tooltip="Nombre identificador del dispositivo para mostrar en el sistema."
                        required 
                    />

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <Tooltip text="Zona física o lógica a la que pertenece este dispositivo.">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-dotted border-slate-300 w-fit hover:text-slate-700 hover:border-slate-400 transition-colors">Zona Asignada</label>
                            </Tooltip>
                            {!isCreatingZone && (
                                <button 
                                    type="button"
                                    onClick={() => setIsCreatingZone(true)}
                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                >
                                    <Plus size={12} /> Nueva Zona
                                </button>
                            )}
                        </div>
                        
                        {isCreatingZone ? (
                            <div className="flex gap-2 items-center animate-in fade-in zoom-in-95 duration-200">
                                <input 
                                    autoFocus
                                    className="flex-1 py-2 px-3 border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    placeholder="Nombre de la nueva zona"
                                    value={newZoneName}
                                    onChange={e => setNewZoneName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateZone())}
                                />
                                <button 
                                    type="button"
                                    onClick={handleCreateZone}
                                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    <CheckCircle2 size={16} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsCreatingZone(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <SmartSelect
                                options={zones.map(z => ({ value: z.ZonaId, title: z.Nombre, subtitle: `ID: ${z.ZonaId}` }))}
                                value={formData.ZonaId}
                                onChange={(val) => setFormData({ ...formData, ZonaId: val as number })}
                                isLoading={loadingZones}
                                placeholder="Seleccione una zona..."
                                buttonIcon={MapPin}
                            />
                        )}
                    </div>
                </div>

                {/* --- SECCIÓN 2: CONECTIVIDAD (Panel Gris) --- */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/60 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-indigo-500" />
                            <h4 className="text-sm font-bold text-slate-700">Parámetros de Red</h4>
                        </div>
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={connectionStatus === 'testing' || !formData.IpAddress}
                            className={`
                                flex items-center gap-1.5 text-xs font-medium transition-all px-2 py-1 rounded-md
                                ${connectionStatus === 'idle' ? 'text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm' : ''}
                                ${connectionStatus === 'testing' ? 'text-indigo-600 bg-indigo-50' : ''}
                                ${connectionStatus === 'success' ? 'text-emerald-600 bg-emerald-50' : ''}
                                ${connectionStatus === 'error' ? 'text-rose-600 bg-rose-50' : ''}
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                        >
                            {connectionStatus === 'idle' && <Wifi size={14} />}
                            {connectionStatus === 'testing' && <Loader2 size={14} className="animate-spin" />}
                            {connectionStatus === 'success' && <CheckCircle2 size={14} />}
                            {connectionStatus === 'error' && <AlertCircle size={14} />}
                            
                            <span>{connectionStatus === 'idle' ? "Probar Conexión" : connectionStatus === 'testing' ? "Conectando..." : connectionStatus === 'success' ? "En Línea" : "Sin Conexión"}</span>
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                            <InputField 
                                label="Dirección IP" 
                                icon={Wifi} 
                                placeholder="192.168.1.201" 
                                value={formData.IpAddress} 
                        onChange={handleIpChange}
                        onBlur={handleIpBlur}
                        error={errors.IpAddress}
                                fontMono 
                                required 
                                tooltip="Dirección IPv4 estática asignada al dispositivo en la red local."
                            />
                        </div>
                        <div className="md:col-span-3">
                            <InputField 
                                label="Puerto" 
                                icon={Hash} 
                                placeholder="4370" 
                        type="text" // Cambiado a text para controlar mejor la entrada
                                value={formData.Puerto} 
                        onChange={handlePortChange}
                                fontMono 
                                required 
                                tooltip="Puerto de comunicación UDP/TCP (Por defecto: 4370 para ZKTeco)."
                            />
                        </div>
                        <div className="md:col-span-4">
                            <InputField 
                                label="Clave COM" 
                                icon={KeyRound} 
                                placeholder="0" 
                                type="password"
                                value={formData.Password} 
                                onChange={handlePasswordChange} 
                                fontMono 
                                tooltip="Contraseña de comunicación del dispositivo (Comm Key). Dejar en 0 si no tiene."
                                canToggleVisibility={formData.Password !== '' && formData.Password !== PASSWORD_PLACEHOLDER}
                            />
                            {!!deviceToEdit?.TieneContrasena && formData.Password !== '' && formData.Password !== PASSWORD_PLACEHOLDER && (
                                <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1 animate-in slide-in-from-top-1 font-medium">
                                    <Info size={10} /> Se actualizará la contraseña
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-white p-2 rounded border border-slate-100">
                        <Info size={14} className="mt-0.5 shrink-0" />
                        <p>Asegúrate de que el puerto (UDP/TCP) esté abierto en el firewall y que el dispositivo tenga la IP estática configurada.</p>
                    </div>
                </div>

                {/* --- SECCIÓN 3: COMPORTAMIENTO --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToggleSwitch 
                        label="Habilitar Dispositivo"
                        description="Si se desactiva, el sistema no intentará conectarse ni sincronizar datos con este equipo."
                        checked={formData.Activo}
                        onChange={(val: boolean) => setFormData({...formData, Activo: val})}
                        colorClass="bg-emerald-500"
                    />
                    
                    <ToggleSwitch 
                        label="Auto-limpieza de Logs"
                        description="Borra los registros de asistencia de la memoria del reloj inmediatamente después de descargarlos exitosamente."
                        checked={formData.BorrarChecadas}
                        onChange={(val: boolean) => setFormData({...formData, BorrarChecadas: val})}
                        colorClass="bg-rose-500"
                    />
                </div>

            </form>
        </Modal>
    );
};