// src/components/ui/ConfirmationModal.tsx
import React from 'react';
import { Modal, Button } from './Modal'; // Reutilizamos tu Modal genérico
import { AlertTriangle, Info, CheckCircle, HelpCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
}

export const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    children, 
    confirmText = "Confirmar", 
    cancelText = "Cancelar",
    variant = 'warning' 
}: ConfirmationModalProps) => {

    // Configuración visual según la variante (Iconos y colores del icono)
    const styles = {
        danger: { 
            icon: AlertTriangle, 
            iconClass: 'text-red-600', 
            bgClass: 'bg-red-50', 
            btnVariant: 'danger' 
        },
        warning: { 
            icon: AlertTriangle, 
            iconClass: 'text-amber-600', 
            bgClass: 'bg-amber-50', 
            btnVariant: 'primary' // O puedes crear un variant 'warning' en tu Button si lo deseas
        },
        info: { 
            icon: Info, 
            iconClass: 'text-blue-600', 
            bgClass: 'bg-blue-50', 
            btnVariant: 'primary' 
        },
        success: { 
            icon: CheckCircle, 
            iconClass: 'text-emerald-600', 
            bgClass: 'bg-emerald-50', 
            btnVariant: 'primary' 
        }
    };

    const currentStyle = styles[variant] || styles.warning;
    const Icon = currentStyle.icon;

    // Construimos el footer usando tus componentes Button estandarizados
    const footerContent = (
        <>
            <Button variant="secondary" onClick={onClose}>
                {cancelText}
            </Button>
            <Button variant={currentStyle.btnVariant as any} onClick={onConfirm}>
                {confirmText}
            </Button>
        </>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title} 
            footer={footerContent} 
            size="md" // Tamaño estándar para confirmaciones
        >
            <div className="flex items-start gap-4">
                {/* Icono decorativo a la izquierda */}
                <div className={`p-3 rounded-full shrink-0 ${currentStyle.bgClass} ${currentStyle.iconClass}`}>
                    <Icon size={24} />
                </div>
                
                {/* Contenido del mensaje */}
                <div className="text-sm text-slate-600 pt-1">
                    {children}
                </div>
            </div>
        </Modal>
    );
};