import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from '../../components/ui/Modal';
import { useAuth } from '../auth/AuthContext';
//import { Camera, Upload, X, User, Calendar, Briefcase, MapPin, Clock, FileText, Hash, Fingerprint, Badge, Check, CheckCheck, XCircle } from 'lucide-react';
import { Camera, Upload, X, User, Calendar, Briefcase, MapPin, Clock, FileText, Hash, Fingerprint, Badge, Check, CheckCheck, XCircle, Lock } from 'lucide-react';
import { themes } from '../../config/theme';
import { SmartSelect } from '../../components/ui/SmartSelect';
import { ModernDatePicker } from '../../components/ui/ModernDatePicker';
import { format } from 'date-fns';
import { Tooltip } from '../../components/ui/Tooltip';
import { Zone } from '../../types';

interface EmpleadoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    empleado?: any;
}

// --- Helper Components (Adapted from UserModal) ---

const Checkbox = ({ id, label, checked, onChange }: { id: string | number, label: string, checked: boolean, onChange: (checked: boolean) => void }) => {
    return (
        <label htmlFor={`cb-zone-${id}`} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors">
            <div className="relative w-5 h-5 shrink-0">
                <input id={`cb-zone-${id}`} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer appearance-none w-5 h-5 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[--theme-500]" />
                <div className="absolute inset-0 w-full h-full rounded-md border-2 border-slate-300 peer-checked:bg-[--theme-500] peer-checked:border-[--theme-500] transition-colors pointer-events-none"></div>
                <Check size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none transition-opacity opacity-0 peer-checked:opacity-100" />
            </div>
            <span className="text-sm text-slate-700 select-none truncate" title={label}>{label}</span>
        </label>
    );
};

const ToggleSwitch = ({ checked, onChange, themeColor }: { checked: boolean, onChange: (checked: boolean) => void, themeColor: string }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
            style={{
                backgroundColor: checked ? themeColor : '#E5E7EB', // Tailwind's gray-200
            }}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};

const CatalogSection = ({ title, icon, items, selectedItems, onItemsChange, keyField, labelField, loading, error }: any) => {
    const validSelectedItems = Array.isArray(selectedItems) ? selectedItems : [];
    const allSelected = items.length > 0 && validSelectedItems.length === items.length;
    const handleToggleAll = () => allSelected ? onItemsChange([]) : onItemsChange(items);

    const handleToggle = (item: any) => {
        const itemId = item[keyField];
        const isSelected = validSelectedItems.some((s: any) => s[keyField] === itemId);
        // We filter or add the full item object
        onItemsChange(isSelected ? validSelectedItems.filter((s: any) => s[keyField] !== itemId) : [...validSelectedItems, item]);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-2 px-1">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">{icon} {title}</h4>
                <Tooltip text={allSelected ? "Limpiar todo" : "Marcar todos"}>
                    <button type="button" onClick={handleToggleAll} className={`p-1 transition-colors ${allSelected ? 'text-red-500 hover:text-red-700' : 'text-slate-400 hover:text-[--theme-500]'}`}>
                        {allSelected ? <XCircle size={16} /> : <CheckCheck size={16} />}
                    </button>
                </Tooltip>
            </div>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 flex-1 min-h-[120px]">
                <div className="max-h-48 h-full overflow-y-auto space-y-1 custom-scrollbar">
                    {loading && <p className="text-xs text-slate-400 p-2">Cargando...</p>}
                    {error && <p className="text-xs text-red-500 p-2">{error}</p>}
                    {!loading && !error && items.length === 0 && <p className="text-xs text-slate-400 p-2">Sin datos disponibles.</p>}
                    {!loading && !error && items.map((item: any) => (
                        <Checkbox key={item[keyField]} id={`${keyField}-${item[keyField]}`} label={item[labelField]}
                            checked={validSelectedItems.some((s: any) => s[keyField] === item[keyField])}
                            onChange={() => handleToggle(item)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export const EmpleadoModal: React.FC<EmpleadoModalProps> = ({ isOpen, onClose, onSave, empleado }) => {
    const { getToken, user } = useAuth();
    const [formData, setFormData] = useState<any>({
        CodRef: '',
        Pim: '', // New field for Device ID
        Nombres: '',
        ApellidoPaterno: '',
        ApellidoMaterno: '',
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
        Activo: true,
        Zonas: [] // Array of Zone objects or Zone IDs
    });

    // Catalogs state
    const [departamentos, setDepartamentos] = useState<any[]>([]);
    const [gruposNomina, setGruposNomina] = useState<any[]>([]);
    const [puestos, setPuestos] = useState<any[]>([]);
    const [horarios, setHorarios] = useState<any[]>([]);
    const [establecimientos, setEstablecimientos] = useState<any[]>([]);
    const [zonas, setZonas] = useState<Zone[]>([]);
    const [sortedZonas, setSortedZonas] = useState<Zone[]>([]);
    const [systemConfig, setSystemConfig] = useState<any>({}); // Store system config

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasSortedRef = useRef(false);

    const isNew = !empleado;
    const theme = themes[user?.Theme as keyof typeof themes] || themes.indigo;

    // Effect to handle one-time sorting of Zonas (Assigned First, then Alphabetical)
    useEffect(() => {
        if (!isOpen) {
            hasSortedRef.current = false;
            setSortedZonas([]);
            return;
        }

        // Wait for catalogs and employee data loading (if editing)
        if (zonas.length === 0) return;
        if (!isNew && isLoading) return;

        // Check if we already sorted for this session to prevent re-sorting on user interaction
        if (hasSortedRef.current) return;

        // Sorting Logic
        const assignedIds = new Set(formData.Zonas ? formData.Zonas.map((z: any) => z.ZonaId) : []);

        const assigned = zonas.filter(z => assignedIds.has(z.ZonaId));
        const unassigned = zonas.filter(z => !assignedIds.has(z.ZonaId));

        const sortByName = (a: Zone, b: Zone) => a.Nombre.localeCompare(b.Nombre);

        assigned.sort(sortByName);
        unassigned.sort(sortByName);

        setSortedZonas([...assigned, ...unassigned]);
        hasSortedRef.current = true;

    }, [isOpen, isLoading, zonas, formData.Zonas, isNew]);

    useEffect(() => {
        if (isOpen) {
            fetchCatalogs();
            if (empleado) {
                // Initialize with available data (light)
                setFormData((prev: any) => ({
                    ...prev,
                    ...empleado,
                    // If image is already here (from list), use it initially to prevent flickering
                    Imagen: empleado.Imagen ? arrayBufferToBase64(empleado.Imagen) : null,
                    Zonas: Array.isArray(empleado.Zonas) ? empleado.Zonas : []
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
                            Activo: fullData.Activo,
                            Zonas: Array.isArray(fullData.Zonas) ? fullData.Zonas : []
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
                    Pim: '',
                    Nombres: '',
                    ApellidoPaterno: '',
                    ApellidoMaterno: '',
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
                    Activo: true,
                    Zonas: []
                });
            }
        }
    }, [isOpen, empleado]);

    const fetchCatalogs = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [deptosRes, gruposRes, puestosRes, horariosRes, estabRes, zonasRes, configRes] = await Promise.all([
                fetch(`${API_BASE_URL}/catalogs/departamentos`, { headers }),
                fetch(`${API_BASE_URL}/catalogs/grupos-nomina`, { headers }),
                fetch(`${API_BASE_URL}/catalogs/puestos`, { headers }),
                fetch(`${API_BASE_URL}/catalogs/schedules`, { headers }), // Schedules endpoint
                fetch(`${API_BASE_URL}/catalogs/establecimientos`, { headers }),
                fetch(`${API_BASE_URL}/devices/zones`, { headers }),
                fetch(`${API_BASE_URL}/catalogs/system-config`, { headers }) // Fetch system config
            ]);

            if (deptosRes.ok) setDepartamentos(await deptosRes.json());
            if (gruposRes.ok) setGruposNomina(await gruposRes.json());
            if (puestosRes.ok) setPuestos(await puestosRes.json());
            if (horariosRes.ok) setHorarios(await horariosRes.json());
            if (estabRes.ok) setEstablecimientos(await estabRes.json());
            if (zonasRes.ok) setZonas(await zonasRes.json());
            if (configRes.ok) setSystemConfig(await configRes.json());

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

    const handleZonasChange = (newZonas: Zone[]) => {
        setFormData((prev: any) => ({ ...prev, Zonas: newZonas }));
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
            const payload = {
                ...formData,
                Pim: formData.Pim || null, // Send Pim
                DepartamentoId: formData.DepartamentoId || null,
                GrupoNominaId: formData.GrupoNominaId || null,
                PuestoId: formData.PuestoId || null,
                HorarioIdPredeterminado: formData.HorarioIdPredeterminado || null,
                EstablecimientoId: formData.EstablecimientoId || null,
                // Ensure Zonas are sent in the format backend expects (e.g., array of IDs or objects)
                // Assuming backend can handle the array of objects if that's what we received,
                // or we might need to map to IDs. Let's map to be safe if that's the pattern, 
                // but usually full object update might be easier. 
                // However, matching UserModal pattern which sends "Roles" as array of Role objects.
                // We'll stick to sending the array of Zone objects.
                Zonas: formData.Zonas
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
            focus:outline-none focus:border-[--theme-500] 
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
        <div className="flex justify-end items-center w-full gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
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

                        {/* Zone Assignment in Left Column to utilize space */}
                        <div className="pt-2">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Badge size={14} /> Control de Acceso
                            </h4>
                            <CatalogSection
                                title="Zonas Asignadas"
                                icon={<MapPin size={14} />}
                                items={sortedZonas.length > 0 ? sortedZonas : zonas}
                                selectedItems={formData.Zonas}
                                onItemsChange={handleZonasChange}
                                keyField="ZonaId"
                                labelField="Nombre"
                                loading={false}
                                error={null}
                            />
                        </div>

                    </div>

                    {/* Right Column: Form Fields */}
                    <div className="lg:col-span-9 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">

                        {/* Personal Information */}
                        <div className="space-y-3">
                            <SectionHeader title="Información Personal" icon={User} />

                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup label="Código">
                                    {(() => {
                                        const isBlocked = systemConfig.SyncEmpleados === 'true' || systemConfig.SyncEmpleados === true;
                                        const input = (
                                            <ModernInput
                                                name="CodRef"
                                                value={formData.CodRef}
                                                onChange={handleChange}
                                                placeholder="Ej. 1001"
                                                required
                                                autoFocus={!isBlocked}
                                                disabled={isBlocked}
                                                className={isBlocked ? 'bg-slate-200 text-slate-500 cursor-not-allowed pr-8' : ''}
                                            />
                                        );
                                        return isBlocked ? (
                                            <Tooltip text="Campo bloqueado por sincronización externa">
                                                <div className="relative w-full">
                                                    {input}
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                                        <Lock size={14} />
                                                    </div>
                                                </div>
                                            </Tooltip>
                                        ) : input;
                                    })()}
                                </InputGroup>

                                <InputGroup label="ID Dispositivo (Pim)">
                                    <ModernInput
                                        name="Pim"
                                        value={formData.Pim || ''}
                                        onChange={handleChange}
                                        placeholder="ID en Checador"
                                    />
                                </InputGroup>

                                <InputGroup label="Nombres" className="col-span-2">
                                    <ModernInput
                                        name="Nombres"
                                        value={formData.Nombres || ''}
                                        onChange={handleChange}
                                        placeholder="Ej. Juan Carlos"
                                        required
                                    />
                                </InputGroup>

                                <InputGroup label="Apellido Paterno">
                                    <ModernInput
                                        name="ApellidoPaterno"
                                        value={formData.ApellidoPaterno || ''}
                                        onChange={handleChange}
                                        placeholder="Ej. Perez"
                                        required
                                    />
                                </InputGroup>

                                <InputGroup label="Apellido Materno">
                                    <ModernInput
                                        name="ApellidoMaterno"
                                        value={formData.ApellidoMaterno || ''}
                                        onChange={handleChange}
                                        placeholder="Ej. Lopez"
                                    />
                                </InputGroup>

                                <InputGroup label="Fecha Nacimiento">
                                    <ModernDatePicker
                                        value={formData.FechaNacimiento}
                                        onChange={(date) => setFormData(prev => ({
                                            ...prev,
                                            FechaNacimiento: date ? date.toISOString().split('T')[0] : null
                                        }))}
                                        placeholder="Seleccionar fecha"
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

                                <InputGroup label="RFC">
                                    <ModernInput
                                        name="RFC"
                                        value={formData.RFC}
                                        onChange={handleChange}
                                        placeholder="RFC"
                                    />
                                </InputGroup>

                                <InputGroup label="IMSS / NSS">
                                    <ModernInput
                                        name="NSS"
                                        value={formData.NSS}
                                        onChange={handleChange}
                                        placeholder="No. Seguro Social"
                                    />
                                </InputGroup>

                                <InputGroup label="CURP" className="col-span-2">
                                    <ModernInput
                                        name="CURP"
                                        value={formData.CURP}
                                        onChange={handleChange}
                                        placeholder="Clave Única de Registro de Población"
                                    />
                                </InputGroup>
                            </div>
                        </div>

                        {/* Labor Information */}
                        <div className="space-y-3">
                            <SectionHeader title="Información Laboral" icon={Briefcase} />

                            <div className="grid grid-cols-2 gap-3">
                                <InputGroup label="Fecha Ingreso">
                                    <ModernDatePicker
                                        value={formData.FechaIngreso}
                                        onChange={(date) => setFormData(prev => ({
                                            ...prev,
                                            FechaIngreso: date ? date.toISOString().split('T')[0] : null
                                        }))}
                                        placeholder="Seleccionar fecha de ingreso"
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

                                <InputGroup label="Grupo Nómina" className="col-span-2">
                                    <SmartSelect
                                        value={formData.GrupoNominaId}
                                        options={gruposNomina.map(g => ({ value: g.GrupoNominaId, title: g.Nombre }))}
                                        onChange={(val) => setFormData(prev => ({ ...prev, GrupoNominaId: val }))}
                                        placeholder="Seleccionar Grupo Nómina..."
                                    />
                                </InputGroup>

                                <InputGroup label="Establecimiento" className="col-span-2">
                                    <SmartSelect
                                        value={formData.EstablecimientoId}
                                        options={establecimientos.map(e => ({ value: e.EstablecimientoId, title: e.Nombre }))}
                                        onChange={(val) => setFormData(prev => ({ ...prev, EstablecimientoId: val }))}
                                        placeholder="Seleccionar Establecimiento..."
                                    />
                                </InputGroup>

                                {/* Activo Toggle Moved to Right Side */}
                                <div className="col-span-2 flex justify-end mt-4">
                                    <div className="flex items-center gap-2">
                                        <ToggleSwitch
                                            checked={formData.Activo}
                                            onChange={(val) => setFormData((prev: any) => ({ ...prev, Activo: val }))}
                                            themeColor={theme[600]}
                                        />
                                        <span className="text-sm font-medium text-slate-700">
                                            {formData.Activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
};
