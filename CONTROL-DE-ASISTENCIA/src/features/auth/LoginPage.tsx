// src/features/auth/LoginPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext.tsx';
import { EyeIcon, EyeOffIcon, ExclamationCircleIcon } from '../../components/ui/Icons.tsx';
import { themes } from '../../config/theme.ts';

const LoginLogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-16 h-16 mb-5 mx-auto" style={{filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))'}}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 16l2 2 4-4" />
    </svg>
);


export const LoginPage = () => {
    const { login } = useAuth();
    // CAMBIO: Se renombra 'username' a 'identifier' para el login mixto
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const theme = themes['indigo']; // Usamos un tema fijo para el login

    // --- Lógica de Animación del Canvas (preservada) ---
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
        
        const currentTheme = { base: theme[500], bg: theme[900], node: theme[100], secondary: theme[400] };
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
    }, [theme]);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        // CAMBIO: Se pasa el 'identifier' a la función de login
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

    const formAnimationClasses = error ? 'animate-shake' : '';

    return (
        <div className="flex justify-center items-center min-h-screen bg-slate-100 font-sans p-4">
            <div className={`w-[900px] max-w-full h-[550px] max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-500 ease-in-out ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${isExiting ? 'opacity-0 scale-95' : ''}`}>
                
                <div className="flex-1 text-white flex flex-col justify-center items-center p-10 text-center relative" style={{backgroundColor: theme[900]}}>
                    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-10"></canvas>
                    <div className="relative z-20">
                        <LoginLogoIcon />
                        <h1 className="m-0 mb-2.5 text-3xl font-bold" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
                            Control de Asistencia
                        </h1>
                        <p className="m-0 text-base opacity-90 max-w-xs" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
                            Gestión de asistencia simple y eficiente para tu equipo.
                        </p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 bg-white overflow-y-auto">
                    <h2 className="text-3xl font-bold text-slate-800 m-0 mb-2">Iniciar Sesión</h2>
                    <p className="text-slate-500 m-0 mb-8">Bienvenido de nuevo.</p>

                    <div className={`transition-all duration-300 ${error ? 'opacity-100' : 'opacity-0 h-0'}`}>
                        {error && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-start">
                                <ExclamationCircleIcon />
                                <div className="ml-3">
                                    <p className="font-bold">Error de Autenticación</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <form onSubmit={handleSubmit} className={formAnimationClasses}>
                        <div className="mb-5">
                            <label htmlFor="identifier" className="block mb-2 text-slate-600 font-semibold text-sm">ID o Nombre de Usuario</label>
                            <input type="text" id="identifier" value={identifier} onChange={handleInputChange(setIdentifier)} required className={`w-full py-3 px-4 border border-slate-300 rounded-lg text-base box-border transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${error ? 'border-red-500' : ''}`} />
                        </div>
                        <div className="mb-5">
                            <label htmlFor="password"  className="block mb-2 text-slate-600 font-semibold text-sm">Contraseña</label>
                             <div className="relative">
                                <input type={isPasswordVisible ? 'text' : 'password'} id="password" value={password} onChange={handleInputChange(setPassword)} required className={`w-full py-3 px-4 border border-slate-300 rounded-lg text-base box-border transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${error ? 'border-red-500' : ''}`} />
                                 <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                                    {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className={`w-full py-3.5 text-white border-none rounded-lg text-lg font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center bg-blue-600 hover:bg-blue-700`}>
                            {isLoading 
                                ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                : 'Ingresar'
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

