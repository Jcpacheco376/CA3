// src/components/ui/Tooltip.tsx
import React, { useState, useRef, useEffect } from 'react'; // <--- Añadido useEffect aquí
import ReactDOM from 'react-dom';

export const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
);

export const Tooltip = ({
    text,
    children,
    placement = 'top',
    offset = 8,
    delay = 100,
    zIndex = 10050, // Must be above SmartSelect dropdown (z-[9999])
    disabled = false,
    className,
    withArrow = false, // Nueva propiedad para la "colita"
    triggerClassName
}: {
    text: React.ReactNode;
    children: React.ReactNode;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    offset?: number,
    delay?: number,
    zIndex?: number, // <-- Nueva propiedad zIndex
    disabled?: boolean,
    className?: string,
    withArrow?: boolean,
    triggerClassName?: string
}) => {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const targetRef = useRef<HTMLSpanElement>(null);
    const timerRef = useRef<number | null>(null);

    // Limpieza de temporizadores al desmontar para evitar fugas de memoria
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const handleMouseEnter = () => {
        if (disabled) return;
        timerRef.current = window.setTimeout(() => {
            if (targetRef.current) {
                const rect = targetRef.current.getBoundingClientRect();
                let newPos = { top: 0, left: 0 };

                switch (placement) {
                    case 'top':
                        newPos = { top: rect.top - offset, left: rect.left + rect.width / 2 };
                        break;
                    case 'bottom':
                        newPos = { top: rect.bottom + offset, left: rect.left + rect.width / 2 };
                        break;
                    case 'left':
                        newPos = { top: rect.top + rect.height / 2, left: rect.left - offset };
                        break;
                    case 'right':
                        newPos = { top: rect.top + rect.height / 2, left: rect.right + offset };
                        break;
                }
                setPosition(newPos);
                setVisible(true);
            }
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setVisible(false);
    };

    // Robust cleanup to prevent stuck tooltips (e.g. on scroll, click, or tab switch)
    useEffect(() => {
        if (!visible) return;

        const hideTooltip = () => {
            setVisible(false);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        window.addEventListener('scroll', hideTooltip, { capture: true, passive: true });
        window.addEventListener('mousedown', hideTooltip, { capture: true, passive: true });
        window.addEventListener('touchstart', hideTooltip, { capture: true, passive: true });
        window.addEventListener('wheel', hideTooltip, { capture: true, passive: true });
        window.addEventListener('blur', hideTooltip);

        return () => {
            window.removeEventListener('scroll', hideTooltip, { capture: true });
            window.removeEventListener('mousedown', hideTooltip, { capture: true });
            window.removeEventListener('touchstart', hideTooltip, { capture: true });
            window.removeEventListener('wheel', hideTooltip, { capture: true });
            window.removeEventListener('blur', hideTooltip);
        };
    }, [visible]);

    const getTooltipPositionClasses = () => {
        switch (placement) {
            case 'top': return 'transform -translate-x-1/2 -translate-y-full';
            case 'bottom': return 'transform -translate-x-1/2';
            case 'left': return 'transform -translate-x-full -translate-y-1/2';
            case 'right': return 'transform -translate-y-1/2';
            default: return 'transform -translate-x-1/2 -translate-y-full';
        }
    }

    const getArrowClasses = () => {
        if (!withArrow) return '';
        const base = "before:content-[''] before:absolute before:border-[6px] before:border-transparent";
        switch (placement) {
            case 'top': return `${base} before:top-full before:left-1/2 before:-translate-x-1/2 before:border-t-slate-800`;
            case 'bottom': return `${base} before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-b-slate-800`;
            case 'left': return `${base} before:left-full before:top-1/2 before:-translate-y-1/2 before:border-l-slate-800`;
            case 'right': return `${base} before:right-full before:top-1/2 before:-translate-y-1/2 before:border-r-slate-800`;
            default: return '';
        }
    }

    const target = (
        <span ref={targetRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={handleMouseLeave} className={triggerClassName}>
            {children}
        </span>
    );

    const tooltipContent = (
        <div
            className={`fixed bg-slate-800 text-white text-xs rounded-md p-2 shadow-lg z-50 ${getTooltipPositionClasses()} ${getArrowClasses()} ${className || ''}`}
            style={{ top: position.top, left: position.left, pointerEvents: 'none', zIndex }} // <-- zIndex aplicado aquí
        >
            {text}
        </div>
    );

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { // <-- Error estaba aquí, faltaba importar useEffect
        setIsMounted(true);
        let portalRoot = document.getElementById('portal-root-tooltip');
        if (!portalRoot) {
            portalRoot = document.createElement('div');
            portalRoot.id = 'portal-root-tooltip';
            document.body.appendChild(portalRoot);
        }
        return () => {
            // Optional: clean up portal root if it's empty
            if (portalRoot && portalRoot.children.length === 0) {
                // portalRoot.remove(); // Comentado para evitar posibles problemas si se desmonta rápido
            }
        }
    }, [])


    if (!isMounted) {
        return <>{target}</>;
    }


    return (
        <>
            {target}
            {/* Solo renderizamos el portal si es visible, ahorrando miles de nodos DOM */}
            {(visible && !disabled) && ReactDOM.createPortal(tooltipContent, document.getElementById('portal-root-tooltip')!)}
        </>
    );
};
