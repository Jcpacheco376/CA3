// src/features/dashboard/widgets/WelcomeWidget.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import { Sun, Moon, Coffee, CalendarCheck, ShieldCheck } from 'lucide-react';
import { themes } from '../../../config/theme';

export const WelcomeWidget = ({ user }: { user: User | null }) => {
    const [greeting, setGreeting] = useState('');
    const [dateString, setDateString] = useState('');
    const [timeString, setTimeString] = useState('');

    // Obtener el tema directamente de la configuración centralizada
    const userTheme = user?.Theme?.toLowerCase() || 'indigo';
    const currentTheme = themes[userTheme] || themes.indigo;

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const hour = now.getHours();
            
            if (hour < 12) setGreeting('Buenos días');
            else if (hour < 18) setGreeting('Buenas tardes');
            else setGreeting('Buenas noches');

            const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            setDateString(now.toLocaleDateString('es-MX', options));
            
            setTimeString(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    const renderIcon = () => {
        const hour = new Date().getHours();
        const iconClass = "opacity-20 absolute -right-4 -bottom-4 transform rotate-12"; // Sin animaciones interactivas
        if (hour < 12) return <Coffee className={`text-amber-100 ${iconClass}`} size={140} />;
        if (hour < 18) return <Sun className={`text-amber-100 ${iconClass}`} size={140} />;
        return <Moon className={`${iconClass}`} size={140} style={{ color: currentTheme[100] }} />;
    };

    return (
        <div 
            className="relative overflow-hidden rounded-2xl p-6 md:p-8 text-white shadow-sm border"
            style={{
                background: `linear-gradient(135deg, ${currentTheme[600]}, ${currentTheme[900]})`,
                borderColor: `${currentTheme[500]}4D`,
            }}
        >
            {/* 1. ANIMACIÓN DE ENTRADA: Keyframes locales para garantizar la animación sin dependencias. */}
            <style>{`
                @keyframes welcome-entry {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-welcome-in {
                    animation: welcome-entry 0.7s ease-out forwards;
                    opacity: 0;
                }
                @keyframes pattern-wave {
                    from { mask-position: 150% 0; }
                    to { mask-position: -50% 0; }
                }
            `}</style>

            {/* 2. PATRÓN DE FONDO: Retícula de puntos más visible y con degradado para integrarse. */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(${currentTheme[100]} 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                    opacity: 0.3,
                    maskImage: 'linear-gradient(to right, transparent 20%, white 50%, transparent 80%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 20%, white 50%, transparent 80%)',
                    maskSize: '200% 100%',
                    animation: 'pattern-wave 8s ease-in-out infinite',
                }}
            />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 
                        className="text-2xl md:text-3xl font-bold mb-1 tracking-tight animate-welcome-in"
                        style={{ animationDelay: '0.1s' }}
                    >
                        {greeting}, {user?.NombreCompleto?.split(' ')[0] || 'Colaborador'}.
                    </h2>
                    <p 
                        className="text-sm md:text-base opacity-90 font-light max-w-lg animate-welcome-in" 
                        style={{ color: currentTheme[100], animationDelay: '0.2s' }}
                    >
                        Bienvenido al panel de control. Aquí tienes un resumen de la actividad de hoy.
                    </p>
                    
                    <div 
                        className="mt-6 flex flex-wrap items-center gap-3 animate-welcome-in"
                        style={{ animationDelay: '0.3s' }}
                    >
                         <div className="flex items-center space-x-2 text-xs md:text-sm bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-sm">
                            <CalendarCheck size={14} style={{ color: currentTheme[100] }} />
                            <span className="capitalize font-medium">{dateString}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs md:text-sm px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5 shadow-sm" style={{ backgroundColor: `${currentTheme[900]}4D` }}>
                            <span className="font-mono font-semibold" style={{ color: currentTheme[100] }}>{timeString}</span>
                        </div>
                    </div>
                </div>
                
               <div 
                    className="hidden md:block p-4 rounded-xl backdrop-blur-sm border min-w-[180px] shadow-lg animate-welcome-in" 
                    style={{ 
                        backgroundColor: `${currentTheme[900]}40`, 
                        borderColor: `${currentTheme[700]}30`,
                        animationDelay: '0.4s' // Retraso para la tarjeta de sesión
                    }}
                >
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: currentTheme[300] }}>Tu Sesión</p>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-1.5 bg-emerald-500/20 rounded-md">
                            <ShieldCheck size={16} className="text-emerald-300" />
                        </div>
                        <div>
                             <p className="text-xs font-semibold text-white">Rol Activo</p>
                             <p className="text-[10px] truncate max-w-[100px]" style={{ color: currentTheme[300] }}>{user?.Roles?.[0]?.NombreRol || 'Usuario'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {renderIcon()}

            {/* Efectos de luz ambiental (blobs) originales para mantener el degradado dinámico */}
            <div className="absolute top-0 right-1/3 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ backgroundColor: currentTheme[500] }}></div>
            <div className="absolute -bottom-8 -left-8 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" style={{ backgroundColor: currentTheme[800] }}></div>
        </div>
    );
};