// src/features/attendance/EmployeeProfileModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config/api';
import { format, startOfWeek, endOfWeek, differenceInYears, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge, Cake, Calendar as CalendarIcon, Hash, Fingerprint, X, User, Briefcase, Building, AlertCircle, Mars, Venus } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { themes } from '../../config/theme';

export const EmployeeProfileModal = ({ employeeId, onClose, getToken, user }: { employeeId: string, onClose: () => void, getToken: () => string | null, user: any }) => {
    const [employeeData, setEmployeeData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2, isInitial: true });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartOffset = useRef({ x: 0, y: 0 });
    const cardRef = useRef<HTMLDivElement>(null);

    const arrayBufferToBase64 = (buffer: { type: string, data: number[] }) => {
        if (!buffer || !buffer.data) return '';
        let binary = '';
        const bytes = new Uint8Array(buffer.data);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    useEffect(() => {
        const fetchEmployeeData = async () => {
            setIsLoading(true);
            setError(null);
            const token = getToken();
            if (!token) { setError("Sesión no válida."); setIsLoading(false); return; }
            try {
                // Pequeño delay para que la UI de carga sea perceptible
                await new Promise(resolve => setTimeout(resolve, 300));
                const res = await fetch(`${API_BASE_URL}/employees/${employeeId}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || 'No se pudo cargar la información del empleado.');
                }
                setEmployeeData(await res.json());
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEmployeeData();
    }, [employeeId, getToken]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleDragStart = (e: React.MouseEvent) => {
        if (cardRef.current) {
            setIsDragging(true);
            const rect = cardRef.current.getBoundingClientRect();
            dragStartOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragStartOffset.current.x,
                y: e.clientY - dragStartOffset.current.y,
                isInitial: false,
            });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            document.body.classList.add('select-none');
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp, { once: true });
        }

        return () => {
            document.body.classList.remove('select-none');
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const getAge = (birthDate: string) => !birthDate ? null : differenceInYears(new Date(), new Date(birthDate));

    const getBirthdayStatus = (birthDateStr: string): { isToday: boolean, isThisWeek: boolean, isThisMonth: boolean } => {
        const result = { isToday: false, isThisWeek: false, isThisMonth: false };
        if (!birthDateStr) return result;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Hoy (local) a medianoche

        const birthDateParts = birthDateStr.substring(0, 10).split('-');
        const birthMonth = parseInt(birthDateParts[1]) - 1; // Mes (0-11)
        const birthDay = parseInt(birthDateParts[2]); // Día (1-31)

        const birthDateThisYear = new Date(today.getFullYear(), birthMonth, birthDay);

        result.isToday = today.getTime() === birthDateThisYear.getTime();

        result.isThisWeek = isWithinInterval(birthDateThisYear, {
            start: startOfWeek(today, { weekStartsOn: 1 }),
            end: endOfWeek(today, { weekStartsOn: 1 })
        });

        // Compara mes local vs mes local
        result.isThisMonth = birthDateThisYear.getMonth() === today.getMonth();

        return result;
    };


    const InfoItem = ({ icon, label, value, children }: { icon: React.ReactNode, label: string, value?: string | number | null, children?: React.ReactNode }) => (
        <div>
            <dt className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">{icon}{label}</dt>
            <dd className="text-sm text-slate-800 font-medium mt-0.5 flex items-center gap-2">{value || 'N/A'}{children}</dd>
        </div>
    );

    const SkeletonItem = () => (
        <div className="space-y-1.5"><div className="h-3 bg-slate-200/70 rounded w-20"></div><div className="h-4 bg-slate-300/70 rounded w-32"></div></div>
    );

    const renderContent = () => {
        if (error) return (
            <div className="flex flex-col items-center justify-center text-center p-8"><AlertCircle className="w-12 h-12 text-red-400 mb-4" /><h4 className="text-lg font-semibold text-slate-800">Error al Cargar</h4><p className="text-slate-500 mt-1">{error}</p></div>
        );

        const photoSrc = !isLoading && employeeData?.Imagen ? `data:image/jpeg;base64,${arrayBufferToBase64(employeeData.Imagen)}` : `https://placehold.co/128x128/e2e8f0/64748b?text=${!isLoading ? (employeeData?.NombreCompleto?.[0] || '?') : ''}`;
        const birthdayStatus = isLoading ? { isToday: false, isThisWeek: false, isThisMonth: false } : getBirthdayStatus(employeeData.FechaNacimiento);

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 pt-4">
                <div className="col-span-1 flex flex-col items-center">
                    <div className={`relative w-32 h-32 rounded-full transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                        <img src={photoSrc} alt="Foto de perfil" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md" />
                        {birthdayStatus.isToday &&
                            <Tooltip text="¡Feliz Cumpleaños!">
                                <div className="absolute -top-1 -right-1 bg-white p-1 rounded-full shadow-lg">
                                    <Cake size={24} className="text-pink-500" />
                                </div>
                            </Tooltip>
                        }
                    </div>
                    <div className="text-center mt-3">
                        {isLoading ? (
                            <><div className="h-5 bg-slate-300/70 rounded w-48 mx-auto mt-2"></div><div className="h-4 bg-slate-200/70 rounded w-32 mx-auto mt-1.5"></div></>
                        ) : (
                            <><h3 className="text-lg font-bold text-slate-900">{employeeData.NombreCompleto}</h3><p className="text-sm text-slate-500">{employeeData.puesto_descripcion}</p></>
                        )}
                    </div>
                </div>
                <div className="col-span-2">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
                        {isLoading ? <><SkeletonItem /><SkeletonItem /><SkeletonItem /><SkeletonItem /><SkeletonItem /><SkeletonItem /><SkeletonItem /><SkeletonItem /></> : (
                            <>
                                <InfoItem icon={<CalendarIcon size={14} />} label="Fecha de Ingreso" value={employeeData.FechaIngreso ? format(new Date(employeeData.FechaIngreso), 'd MMM yyyy', { locale: es }) : null} />
                                <InfoItem icon={<Cake size={14} />} label="Edad" value={getAge(employeeData.FechaNacimiento)}>
                                    {birthdayStatus.isToday && <span className="text-xs font-bold text-pink-500 bg-pink-100 px-2 py-0.5 rounded-full">¡HOY!</span>}
                                    {!birthdayStatus.isToday && birthdayStatus.isThisWeek && <span className="text-xs text-slate-500">(cumple esta semana)</span>}
                                    {!birthdayStatus.isToday && !birthdayStatus.isThisWeek && birthdayStatus.isThisMonth && <span className="text-xs text-slate-500">(cumple este mes)</span>}
                                </InfoItem>
                                <InfoItem icon={<Fingerprint size={14} />} label="CURP" value={employeeData.CURP} />
                                <InfoItem icon={<Hash size={14} />} label="NSS" value={employeeData.NSS} />
                                <InfoItem icon={<Badge size={14} />} label="RFC" value={employeeData.RFC} />
                                <InfoItem icon={<Building size={14} />} label="Departamento" value={employeeData.departamento_nombre} />
                                <InfoItem icon={<Briefcase size={14} />} label="Grupo Nómina" value={employeeData.grupo_nomina_nombre} />
                                <InfoItem icon={<User size={14} />} label="Sexo" value={employeeData.Sexo === 'M' ? 'Masculino' : 'Femenino'}>{employeeData.Sexo === 'M' ? <Mars size={14} className="text-blue-500" /> : <Venus size={14} className="text-pink-500" />}</InfoItem>
                            </>
                        )}
                    </dl>
                </div>
            </div>
        );
    };

    const cardTransform = position.isInitial ? "translate(-50%, -50%)" : "none";
    const positionStyle = { top: `${position.y}px`, left: `${position.x}px`, transform: cardTransform };
    const themeName = user?.Theme || 'indigo';
    const themeColors = themes[themeName];

    return (
        <div ref={cardRef} className={`fixed bg-white rounded-xl shadow-2xl z-40 w-[600px] animate-scale-in overflow-hidden`} style={positionStyle}>
            <div onMouseDown={handleDragStart} className="h-12 w-full cursor-move p-4 flex items-center border-b border-slate-200" style={{ backgroundColor: themeColors[50] }}>
                <h3 className="font-semibold" style={{ color: themeColors[600] }}>Ficha de Empleado</h3>
            </div>
            <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:bg-slate-200"><X size={18} /></button>
            <div className={`absolute inset-0 bg-white/30 bg-clip-padding backdrop-filter backdrop-blur-sm animate-pulse ${!isLoading && 'hidden'}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
            {renderContent()}
        </div>
    );
};

