// src/components/ui/Modal.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export const Button = ({ variant = 'primary', children, disabled, ...props }: any) => {
    const { animationsEnabled } = useAppContext();
    const baseClasses = "py-2 px-5 rounded-lg flex items-center gap-2 justify-center font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
    const animationClasses = (animationsEnabled && !disabled) ? 'transition-transform hover:scale-105 active:scale-95' : '';
    
    const styles = {
        primary: `text-white bg-gradient-to-br from-[--theme-500] to-[--theme-600] hover:from-[--theme-600] hover:to-[--theme-700] ${animationClasses}`,
        secondary: `border-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400 ${animationsEnabled && !disabled ? 'transition active:scale-95' : ''}`,
        danger: `text-white bg-red-500 hover:bg-red-600 ${animationClasses}`,
    };

    return <button className={`${baseClasses} ${styles[variant]}`} disabled={disabled} {...props}>{children}</button>;
};

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }: any) => {
    const { animationsEnabled } = useAppContext();
    const [show, setShow] = useState(isOpen);

    useEffect(() => {
        if (isOpen) { setShow(true); } 
        else {
            const timer = setTimeout(() => setShow(false), animationsEnabled ? 200 : 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen, animationsEnabled]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!show) return null;

    const sizeClasses: { [key: string]: string } = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '3xl': 'max-w-3xl',
        '5xl': 'max-w-5xl',
    };

    const animationClass = animationsEnabled ? (isOpen ? 'animate-fade-in' : 'animate-fade-out') : '';
    const panelAnimationClass = animationsEnabled ? (isOpen ? 'animate-scale-in' : 'animate-scale-out') : '';

    const modalContent = (
        <div className={`fixed inset-0 z-40 flex items-center justify-center p-4 ${animationClass}`}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Ajuste: max-h-[90vh] para asegurar que quepa en pantalla */}
            <div className={`bg-white rounded-xl shadow-2xl z-10 w-full transform ${sizeClasses[size] || 'max-w-md'} ${panelAnimationClass} flex flex-col max-h-[90vh]`}>
                <div className="flex justify-between items-center p-4 border-b shrink-0">
                    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-slate-500 transition-colors">
                        <X size={20}/>
                    </button>
                </div>
                
                {/* CORRECCIÓN AQUÍ: Regresamos el p-6 para el margen interno */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
                
                {footer && (
                    <div className="flex justify-end gap-3 p-4 bg-gray-50 rounded-b-xl border-t shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};