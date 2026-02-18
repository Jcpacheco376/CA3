import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from '../../components/ui/Modal';
import { useAuth } from '../auth/AuthContext';
import { Camera, Upload, X, User, Calendar, Briefcase, MapPin, Clock, FileText, Hash, Fingerprint, Badge } from 'lucide-react';
import { SmartSelect } from '../../components/ui/SmartSelect';
import { format } from 'date-fns';

interface EmpleadoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    empleado?: any;
}

export const EmpleadoModal: React.FC<EmpleadoModalProps> = ({ isOpen, onClose, onSave, empleado }) => {
    const { getToken } = useAuth();
    const [formData, setFormData] = useState<any>({
        CodRef: '',
        NombreCompleto: '',
        FechaNacimiento: '',
        FechaIngreso: format(new Date(), 'yyyy-MM-dd'),
        DepartamentoId: '',
        GrupoNominaId: '',
        PuestoId: '',
        HorarioIdPredeterminado: '',
        EstablecimientoId: '',
        Sexo: 'M',
        NSS: '',
        CURP: '',
        RFC: '',
        Imagen: null, // Base64 string
        Activo: true
    });

    // Catalogs state
    const [departamentos, setDepartamentos] = useState<any[]>([]);
    const [gruposNomina, setGruposNomina] = useState<any[]>([]);
    const [puestos, setPuestos] = useState<any[]>([]);
    const [horarios, setHorarios] = useState<any[]>([]);
    const [establecimientos, setEstablecimientos] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isNew = !empleado;

    useEffect(() => {
        if (isOpen) {
            fetchCatalogs();
            if (empleado) {
                // Initialize with available data (light)
                setFormData((prev: any) => ({
                    ...prev,
                    ...empleado,
                    // If image is already here (from list), use it initially to prevent flickering
                    Imagen: empleado.Imagen ? arrayBufferToBase64(empleado.Imagen) : null
                }));

                // Fetch full details
                setIsLoading(true);
                fetch(`${API_BASE_URL}/employees/${empleado.EmpleadoId}`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                })
                    .then(res => res.ok ? res.json() : Promise.reject(res))
                    .then(fullData => {
                        setFormData((prev: any) => ({
                            ...prev,
                            ...fullData,
                            FechaNacimiento: fullData.FechaNacimiento ? fullData.FechaNacimiento.split('T')[0] : '',
                            FechaIngreso: fullData.FechaIngreso ? fullData.FechaIngreso.split('T')[0] : '',
                            DepartamentoId: fullData.DepartamentoId || '',
                            GrupoNominaId: fullData.GrupoNominaId || '',
                            PuestoId: fullData.PuestoId || '',
                            HorarioIdPredeterminado: fullData.HorarioIdPredeterminado || '',
                            EstablecimientoId: fullData.EstablecimientoId || '',
                            Imagen: fullData.Imagen ? arrayBufferToBase64(fullData.Imagen) : null,
                            Activo: fullData.Activo
                        }));
                    })
                    .catch(err => {
                        console.error("Error fetching full details", err);
                        setError("Error al cargar detalles del empleado.");
                    })
                    .finally(() => setIsLoading(false));

            } else {
                setFormData({
                    CodRef: '',
                    NombreCompleto: '',
                    FechaNacimiento: '',
                    FechaIngreso: format(new Date(), 'yyyy-MM-dd'),
                    DepartamentoId: '',
                    GrupoNominaId: '',
                    PuestoId: '',
                    HorarioIdPredeterminado: '',
                    EstablecimientoId: '',
                    Sexo: 'M',
                    NSS: '',
                    CURP: '',
                    RFC: '',
                    Imagen: null,
                    Activo: true
                });
            }
        }
    }, [isOpen, empleado]);

    const fetchCatalogs = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [deptosRes, gruposRes, puestosRes, horariosRes, estabRes] = await Promise.all([
                fetch(`${API_BASE_URL}/catalogs/departamentos`, { headers }),
                fetch(`${API_BASE_URL}/catalogs/grupos-nomina`, { headers }),
                fetch(`${API_BASE_URL}/catalogs/puestos`, { headers }),
                fetch(`${API_BASE_URL}/catalogs/schedules`, { headers }), // Schedules endpoint
                fetch(`${API_BASE_URL}/catalogs/establecimientos`, { headers })
            ]);

            if (deptosRes.ok) setDepartamentos(await deptosRes.json());
            if (gruposRes.ok) setGruposNomina(await gruposRes.json());
            if (puestosRes.ok) setPuestos(await puestosRes.json());
            if (horariosRes.ok) setHorarios(await horariosRes.json());
            if (estabRes.ok) setEstablecimientos(await estabRes.json());

        } catch (err) {
            console.error("Error fetching catalogs", err);
            setError("Error al cargar catálogos");
        }
    };

    const arrayBufferToBase64 = (buffer: any) => {
        if (!buffer) return null;
        if (typeof buffer === 'string') return buffer; // Already base64
        if (!buffer.data) return null;

        let binary = '';
        const bytes = new Uint8Array(buffer.data);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData((prev: any) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result?.toString().replace('data:', '').replace(/^.+,/, '');
                setFormData((prev: any) => ({ ...prev, Imagen: base64String }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const token = getToken();

        try {
            const url = isNew ? `${API_BASE_URL}/employees` : `${API_BASE_URL}/employees/${empleado.EmpleadoId}`;
            const method = isNew ? 'POST' : 'PUT';

            // Clean data before sending (convert empty strings to null for IDs if API expects it, or keep as string)
            // SQL might expect NULL for empty strings on INT columns, but let's see if we can send 0 or null
            const payload = {
                ...formData,
                DepartamentoId: formData.DepartamentoId || null,
                GrupoNominaId: formData.GrupoNominaId || null,
                PuestoId: formData.PuestoId || null,
                HorarioIdPredeterminado: formData.HorarioIdPredeterminado || null,
                EstablecimientoId: formData.EstablecimientoId || null,
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al guardar empleado');
            }

            onSave(); // Refreshes parent list
            onClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- UI Helpers ---

    const InputGroup = ({ label, children, className = "" }: any) => (
        <div className={`space-y-1 ${className}`}>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                {label}
            </label>
            {children}
        </div>
    );

    const ModernInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
        <input
            {...props}
            className={`w-full bg-white text-slate-900 text-sm rounded-lg border border-slate-200 px-3 py-2 
            focus:outline-none focus:border-[--theme-500] focus:ring-2 focus:ring-[--theme-500]/10 
            transition-all duration-200 placeholder:text-slate-400 font-normal hover:border-slate-300 ${props.className}`}
        />
    );

    const SectionHeader = ({ title, icon: Icon }: any) => (
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
            <Icon size={18} className="text-[--theme-600]" />
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        </div>
    );

    const footer = (
        <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer group p-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200/60">
                    <div className={`w-9 h-5 flex items-center bg-slate-200 rounded-full p-1 duration-300 ease-in-out group-hover:bg-slate-300 ${formData.Activo ? 'bg-[--theme-500] group-hover:bg-[--theme-600]' : ''}`}>
                        <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-300 ease-in-out ${formData.Activo ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className={`text-sm font-medium transition-colors ${formData.Activo ? 'text-[--theme-700]' : 'text-slate-500'}`}>
                        {formData.Activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <input type="checkbox" name="Activo" checked={formData.Activo} onChange={handleChange} className="hidden" />
                </label>
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? 'Guardando...' : 'Guardar'}
                </Button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'Nuevo Colaborador' : 'Editar Colaborador'} footer={footer} size="5xl">
            {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-3 text-sm"><div className="w-1.5 h-1.5 bg-red-500 rounded-full" />{error}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Photo & basic stats */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                                {formData.Imagen ? (
                                    <img src={`data:image/jpeg;base64,${formData.Imagen}`} alt="Foto" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={48} className="text-slate-300" />
                                )}
                            </div>
                            <p className="mt-3 text-xs text-slate-400 font-medium text-center">
                                Fotografía de perfil
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Form Fields */}
                    <div className="lg:col-span-9 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">

                        {/* Personal Information */}
                        <div className="space-y-4">
                            <SectionHeader title="Información Personal" icon={User} />

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Código">
                                    <ModernInput
                                        name="CodRef"
                                        value={formData.CodRef}
                                        onChange={handleChange}
                                        placeholder="Ej. 1001"
                                        required
                                        autoFocus
                                    />
                                </InputGroup>

                                <InputGroup label="RFC">
                                    <ModernInput
                                        name="RFC"
                                        value={formData.RFC}
                                        onChange={handleChange}
                                        placeholder="RFC"
                                    />
                                </InputGroup>

                                <InputGroup label="Nombre Completo" className="col-span-2">
                                    <ModernInput
                                        name="NombreCompleto"
                                        value={formData.NombreCompleto}
                                        onChange={handleChange}
                                        placeholder="Apellidos y Nombres"
                                        required
                                    />
                                </InputGroup>

                                <InputGroup label="Fecha Nacimiento">
                                    <ModernInput
                                        type="date"
                                        name="FechaNacimiento"
                                        value={formData.FechaNacimiento}
                                        onChange={handleChange}
                                    />
                                </InputGroup>

                                <InputGroup label="Sexo">
                                    <SmartSelect
                                        value={formData.Sexo}
                                        options={[{ value: 'M', title: 'Masculino' }, { value: 'F', title: 'Femenino' }]}
                                        onChange={(val: any) => setFormData((prev: any) => ({ ...prev, Sexo: val }))}
                                        placeholder="Seleccionar..."
                                    />
                                </InputGroup>

                                <InputGroup label="CURP" className="col-span-2">
                                    <ModernInput
                                        name="CURP"
                                        value={formData.CURP}
                                        onChange={handleChange}
                                        placeholder="Clave Única de Registro"
                                    />
                                </InputGroup>

                                <InputGroup label="IMSS / NSS" className="col-span-2">
                                    <ModernInput
                                        name="NSS"
                                        value={formData.NSS}
                                        onChange={handleChange}
                                        placeholder="Número de Seguridad Social"
                                    />
                                </InputGroup>
                            </div>
                        </div>

                        {/* Labor Information */}
                        <div className="space-y-4">
                            <SectionHeader title="Información Laboral" icon={Briefcase} />

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Fecha Ingreso">
                                    <ModernInput
                                        type="date"
                                        name="FechaIngreso"
                                        value={formData.FechaIngreso}
                                        onChange={handleChange}
                                    />
                                </InputGroup>

                                <InputGroup label="Horario">
                                    <SmartSelect
                                        value={formData.HorarioIdPredeterminado}
                                        options={horarios.map(h => ({ value: h.HorarioId, title: h.Nombre }))}
                                        onChange={(val) => setFormData(prev => ({ ...prev, HorarioIdPredeterminado: val }))}
                                        placeholder="Seleccionar..."
                                    />
                                </InputGroup>

                                <InputGroup label="Departamento" className="col-span-2">
                                    <SmartSelect
                                        value={formData.DepartamentoId}
                                        options={departamentos.map(d => ({ value: d.DepartamentoId, title: d.Nombre }))}
                                        onChange={(val) => setFormData(prev => ({ ...prev, DepartamentoId: val }))}
                                        placeholder="Seleccionar Departamento..."
                                    />
                                </InputGroup>

                                <InputGroup label="Puesto" className="col-span-2">
                                    <SmartSelect
                                        value={formData.PuestoId}
                                        options={puestos.map(p => ({ value: p.PuestoId, title: p.Nombre }))}
                                        onChange={(val) => setFormData(prev => ({ ...prev, PuestoId: val }))}
                                        placeholder="Seleccionar Puesto..."
                                    />
                                </InputGroup>

                                <InputGroup label="Grupo Nómina">
                                    <SmartSelect
                                        value={formData.GrupoNominaId}
                                        options={gruposNomina.map(g => ({ value: g.GrupoNominaId, title: g.Nombre }))}
                                        onChange={(val) => setFormData(prev => ({ ...prev, GrupoNominaId: val }))}
                                        placeholder="Seleccionar Grupo..."
                                    />
                                </InputGroup>

                                <InputGroup label="Establecimiento">
                                    <SmartSelect
                                        value={formData.EstablecimientoId}
                                        options={establecimientos.map(e => ({ value: e.EstablecimientoId, title: e.Nombre }))}
                                        onChange={(val) => setFormData(prev => ({ ...prev, EstablecimientoId: val }))}
                                        placeholder="Seleccionar..."
                                    />
                                </InputGroup>
                            </div>

                            <div className="mt-6 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                <p className="text-xs text-slate-500 leading-relaxed flex gap-2">
                                    <span className="shrink-0 mt-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                    Todos los campos son importantes para el cálculo de nómina.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
};
