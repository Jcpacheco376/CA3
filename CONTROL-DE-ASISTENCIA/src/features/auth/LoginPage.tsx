// src/features/auth/LoginPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth, APP_VERSION } from './AuthContext.tsx';
import { EyeIcon, EyeOffIcon, ExclamationCircleIcon } from '../../components/ui/Icons.tsx';
// Importamos iconos adicionales para los modos de login
import { Hash, User, ArrowRight } from 'lucide-react'; 

const LoginLogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-16 h-16 mb-5 mx-auto" style={{filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))'}}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 16l2 2 4-4" />
    </svg>
);

export const LoginPage = () => {
    const { login } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    
    // --- NUEVO: Estado para el modo de login (ID vs Usuario) ---
    const [loginMode, setLoginMode] = useState<'id' | 'user'>('id');
    
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- CAMBIO DE COLOR: Usamos el azul exacto del botón (blue-600 de Tailwind es #2563eb) ---
    // Definimos la paleta para el canvas basada en este azul
    const brandColor = 'rgba(18, 72, 189, 1)'; 

    // Para las partículas, usamos tonos derivados para que combinen
    const particleColor = '#60a5fa'; // Azul claro para el efecto tecnológico

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        const parent = canvas.parentElement;
        if(!parent) return;

        let animationFrameId: number;
        let points: Point[] = [];
        const pointCount = 40;
        let time = 0;
        let scannerY: number, scannerDirection = 1;
        let mouse = { x: undefined as number | undefined, y: undefined as number | undefined };
        let hoveredPoint: Point | null = null;
        
        // Tema ajustado para el nuevo fondo oscuro
        const currentTheme = { 
            base: particleColor, 
            bg: brandColor,  
            node: '#ffffff', 
            secondary: '#93c5fd' 
        };
        
        function hexToRgb(hex: string) { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null; }

        class Point {
            canvas: HTMLCanvasElement; x: number; y: number; vx: number; vy: number; radius: number; iconRadius: number; employeeId: string; status: string; hoverAlpha: number;
            constructor(x: number, y: number, canvas: HTMLCanvasElement) { this.canvas = canvas; this.x = x; this.y = y; this.vx = (Math.random() - 0.5) * 0.2; this.vy = (Math.random() - 0.5) * 0.2; this.radius = Math.random() * 2 + 1.5; this.iconRadius = 8; this.employeeId = `EMP-${Math.floor(Math.random() * 9000) + 1000}`; this.status = Math.random() > 0.2 ? 'Activo' : 'Inactivo'; this.hoverAlpha = 0; }
            update() { this.x += this.vx; this.y += this.vy; if (this.x < this.radius || this.x > this.canvas.width - this.radius) this.vx *= -1; if (this.y < this.radius || this.y > this.canvas.height - this.radius) this.vy *= -1; }
            updateHover(isClosest: boolean) { const targetHoverAlpha = isClosest ? 1 : 0; this.hoverAlpha += (targetHoverAlpha - this.hoverAlpha) * 0.1; }
            draw(ctx: CanvasRenderingContext2D) { ctx.shadowColor = currentTheme.node; ctx.shadowBlur = 12; const baseAlpha = 0.9 * (1 - this.hoverAlpha); const iconAlpha = this.hoverAlpha; ctx.fillStyle = currentTheme.node; if (baseAlpha > 0.01) { ctx.globalAlpha = baseAlpha; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); } if (iconAlpha > 0.01) { ctx.globalAlpha = iconAlpha; ctx.beginPath(); ctx.arc(this.x, this.y - this.iconRadius / 2, this.iconRadius / 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(this.x, this.y + this.iconRadius, this.iconRadius, Math.PI, Math.PI * 2, false); ctx.fill(); } ctx.globalAlpha = 1.0; ctx.shadowBlur = 0; }
            drawInfo(ctx: CanvasRenderingContext2D) { if (this.hoverAlpha > 0.01) { ctx.save(); ctx.globalAlpha = this.hoverAlpha; const infoX = this.x + 20; const infoY = this.y - 15; const rectWidth = 110; const rectHeight = 45; ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.strokeStyle = currentTheme.node; ctx.lineWidth = 1; ctx.beginPath(); (ctx as any).roundRect(infoX, infoY, rectWidth, rectHeight, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = `rgba(255, 255, 255, ${this.hoverAlpha})`; ctx.font = '10px sans-serif'; ctx.fillText(this.employeeId, infoX + 10, infoY + 18); ctx.fillStyle = this.status === 'Activo' ? `rgba(16, 185, 129, ${this.hoverAlpha})` : `rgba(239, 68, 68, ${this.hoverAlpha})`; ctx.fillText(`Estado: ${this.status}`, infoX + 10, infoY + 34); ctx.restore(); } }
        }

        function drawGridScanner(ctx: CanvasRenderingContext2D, focusPoint: Point | null) { time += 0.02; const gridSize = 30; const maxDist = Math.max(canvas.width, canvas.height); let pulseOriginX = canvas.width / 2; let pulseOriginY = canvas.height / 2; let pulseFactor = 1; if (focusPoint) { pulseOriginX += (focusPoint.x - pulseOriginX) * 0.1; pulseOriginY += (focusPoint.y - pulseOriginY) * 0.1; pulseFactor = 1 + focusPoint.hoverAlpha * 1.5; } const pulseRadius = (time * 50 * pulseFactor) % maxDist; const pulseWidth = 150; for (let x = 0; x <= canvas.width; x += gridSize) { for (let y = 0; y <= canvas.height; y += gridSize) { const dist = Math.hypot(x - pulseOriginX, y - pulseOriginY); let alpha = 0.05; if (dist > pulseRadius - pulseWidth && dist < pulseRadius) { const pulseEdgeFactor = 1 - (pulseRadius - dist) / pulseWidth; alpha = 0.05 + pulseEdgeFactor * 0.3; } const rgb = hexToRgb(currentTheme.base); if(rgb) ctx.fillStyle = `rgba(${rgb}, ${alpha})`; ctx.fillRect(x - 1, y - 1, 2, 2); } } scannerY += scannerDirection * 1.5; if (scannerY > canvas.height || scannerY < 0) scannerDirection *= -1; const secondaryRgb = hexToRgb(currentTheme.secondary); if(secondaryRgb) { ctx.strokeStyle = `rgba(${secondaryRgb}, 0.4)`; ctx.shadowColor = currentTheme.secondary; } ctx.shadowBlur = 18; ctx.beginPath(); ctx.moveTo(0, scannerY); ctx.lineTo(canvas.width, scannerY); ctx.lineWidth = 1; ctx.stroke(); ctx.shadowBlur = 0; }
        function connect(ctx: CanvasRenderingContext2D) { ctx.shadowColor = currentTheme.node; ctx.shadowBlur = 12; const nodeRgb = hexToRgb(currentTheme.node); if(!nodeRgb) return; for (let i = 0; i < points.length; i++) { for (let j = i + 1; j < points.length; j++) { const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y); if (dist < 120) { ctx.beginPath(); ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[j].x, points[j].y); ctx.strokeStyle = `rgba(${nodeRgb}, ${(1 - dist / 120) * 0.4})`; ctx.lineWidth = 0.5; ctx.stroke(); } } } ctx.shadowBlur = 0; }
        
        const init = () => { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; scannerY = 0; points = []; for (let i = 0; i < pointCount; i++) { points.push(new Point(Math.random() * canvas.width, Math.random() * canvas.height, canvas)); } };
        const animate = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); let closestPoint: Point | null = null; let minDistance = Infinity; points.forEach(p => { if (mouse.x !== undefined && mouse.y !== undefined) { const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y); if (dist < p.iconRadius * 2.5 && dist < minDistance) { minDistance = dist; closestPoint = p; } } }); hoveredPoint = closestPoint; points.forEach(p => { p.update(); p.updateHover(p === hoveredPoint); }); drawGridScanner(ctx, hoveredPoint); connect(ctx); points.forEach(p => p.draw(ctx)); points.forEach(p => p.drawInfo(ctx)); animationFrameId = requestAnimationFrame(animate); };
        
        init(); animate();

        const handleResize = () => init();
        const handleMouseMove = (event: MouseEvent) => { const rect = canvas.getBoundingClientRect(); mouse.x = event.clientX - rect.left; mouse.y = event.clientY - rect.top; };
        const handleMouseOut = () => { mouse.x = undefined; mouse.y = undefined; };
        
        window.addEventListener('resize', handleResize);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseout', handleMouseOut);
        
        return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', handleResize); canvas.removeEventListener('mousemove', handleMouseMove); canvas.removeEventListener('mouseout', handleMouseOut); };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const result = await login(identifier, password);
        if (result !== true) {
            setError(result as string);
            setIsLoading(false);
        } else {
            setIsExiting(true);
        }
    };

    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (error) setError('');
        setter(e.target.value);
    };

    const handleModeSwitch = (mode: 'id' | 'user') => {
        setLoginMode(mode);
        setIdentifier(''); 
        setError('');
    };

    const formAnimationClasses = error ? 'animate-shake' : '';

    return (
        <div className="flex justify-center items-center min-h-screen bg-slate-100 font-sans p-4">
            <div className={`w-[900px] max-w-full h-[550px] max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-500 ease-in-out ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${isExiting ? 'opacity-0 scale-95' : ''}`}>
                
                {/* --- PANEL IZQUIERDO: FONDO PROFUNDO PARA CONFIANZA --- */}
                <div className="flex-1 text-white flex flex-col justify-center items-center p-10 text-center relative" style={{backgroundColor: brandColor}}>
                    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-10"></canvas>
                    <div className="relative z-20">
                        <LoginLogoIcon />
                        {/* --- CAMBIO DE MENSAJE --- 
                           Reflejando Profesionalismo, Claridad y Transparencia 
                        */}
                        <h1 className="m-0 mb-3 text-3xl font-bold" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
                            Control de asistencia
                        </h1>
                        <p className="m-0 text-base opacity-90 max-w-xs leading-relaxed" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
                            Plataforma integral para una gestión de nómina clara y transparente.
                            {/* El estándar profesional para el control de asistencia. */}
                            {/* Integridad operativa para una nómina precisa. */}
                        </p>
                        
                        <div className="mt-8 pt-6 border-t border-white/10 w-32 mx-auto">
                            <span className="text-[10px] font-mono opacity-40 tracking-[0.2em]">v{APP_VERSION}</span>
                        </div>
                    </div>
                </div>

                {/* --- PANEL DERECHO: LIMPIEZA Y AMIGABILIDAD --- */}
                <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 bg-white overflow-y-auto">
                    <h2 className="text-3xl font-bold text-slate-800 m-0 mb-2">Bienvenido</h2>
                    <p className="text-slate-500 m-0 mb-6">Ingresa tus credenciales para acceder al sistema.</p>

                    <div className={`transition-all duration-300 ${error ? 'opacity-100' : 'opacity-0 h-0'}`}>
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md mb-6 flex items-start text-sm">
                                <ExclamationCircleIcon />
                                <div className="ml-2">
                                    <p className="font-bold">Acceso Denegado</p>
                                    <p>{error}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <form onSubmit={handleSubmit} className={formAnimationClasses}>
                        
                        {/* Selector de Modo (Pestañas) */}
                        <div className="flex p-1 bg-slate-100 rounded-lg mb-6 relative">
                            <div 
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-md shadow-sm transition-all duration-300 ease-out border border-slate-200`}
                                style={{ left: loginMode === 'id' ? '4px' : 'calc(50%)' }}
                            ></div>

                            <button 
                                type="button"
                                onClick={() => handleModeSwitch('id')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md z-10 transition-colors duration-200 ${loginMode === 'id' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Hash size={16} className={loginMode === 'id' ? 'text-blue-600' : 'text-slate-400'} />
                                ID de Nómina
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleModeSwitch('user')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md z-10 transition-colors duration-200 ${loginMode === 'user' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <User size={16} className={loginMode === 'user' ? 'text-blue-600' : 'text-slate-400'} />
                                Usuario
                            </button>
                        </div>

                        {/* Campo Identificador */}
                        <div className="mb-5 relative group">
                            <label htmlFor="identifier" className="block mb-2 text-slate-600 font-semibold text-xs uppercase tracking-wide">
                                {loginMode === 'id' ? 'Número de Empleado' : 'Nombre de Usuario'}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    {loginMode === 'id' ? <Hash size={20} /> : <User size={20} />}
                                </div>
                                <input 
                                    type={loginMode === 'id' ? 'number' : 'text'} 
                                    id="identifier" 
                                    value={identifier} 
                                    onChange={handleInputChange(setIdentifier)} 
                                    placeholder={loginMode === 'id' ? 'Ej: 1045' : 'Ej: juan.perez'}
                                    required 
                                    autoFocus
                                    className={`w-full py-3 pl-10 pr-4 border border-slate-300 rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`} 
                                />
                            </div>
                        </div>

                        {/* Campo Contraseña */}
                        <div className="mb-8">
                            <label htmlFor="password" className="block mb-2 text-slate-600 font-semibold text-xs uppercase tracking-wide">Contraseña</label>
                             <div className="relative group">
                                <input 
                                    type={isPasswordVisible ? 'text' : 'password'} 
                                    id="password" 
                                    value={password} 
                                    onChange={handleInputChange(setPassword)} 
                                    required 
                                    placeholder="••••••••"
                                    className={`w-full py-3 px-4 border border-slate-300 rounded-lg text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`} 
                                />
                                 <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none">
                                    {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            // EL BOTÓN MANTIENE SU AZUL BRILLANTE (blue-600) PARA EL CTA
                            className={`w-full py-3.5 text-white border-none rounded-lg text-lg font-bold cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 group relative overflow-hidden`}
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            
                            {isLoading 
                                ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                : <span className="flex items-center gap-2">Acceder <ArrowRight size={20} className="opacity-80 group-hover:translate-x-1 transition-transform"/></span>
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};