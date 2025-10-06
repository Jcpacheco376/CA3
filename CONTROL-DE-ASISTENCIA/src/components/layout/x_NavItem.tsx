// src/components/layout/NavItem.tsx

import React from 'react';
import { ChevronRightIcon } from '../ui/Icons';

// Función recursiva para saber si la vista activa es descendiente de este item
const isDescendantActive = (item, activeView) => {
    if (!item.children || item.children.length === 0) return false;
    return item.children.some(child => child.id === activeView || isDescendantActive(child, activeView));
};

export const NavItem = ({ item, isCollapsed, activeView, setActiveView, openItems, setOpenItems, level = 0 }) => {
    const hasChildren = item.children && item.children.length > 0;
    
    const isChildActive = activeView === item.id;
    const isGroupOpen = hasChildren && openItems.includes(item.id);
    const isParentOfActive = isDescendantActive(item, activeView);

    const handleToggle = () => {
        if (hasChildren) {
            setOpenItems(prev => isGroupOpen ? prev.filter(id => id !== item.id) : [...prev, item.id]);
        }
        
        // Navegamos a la vista del item si la tiene, si no, a la del primer hijo válido.
        const targetView = item.viewId || (hasChildren ? item.children.find(c => c)?.id : item.id);
        if (targetView) setActiveView(targetView);
    };
    
    // --- Estilos Dinámicos ---
    const baseClasses = "flex items-center w-full text-left rounded-md transition-all duration-200 ease-in-out relative";
    const levelClasses = level === 0 ? "h-11 text-base" : "h-9 text-sm";
    
    let dynamicClasses = "text-slate-600 hover:bg-slate-200";
    if (isChildActive) {
        dynamicClasses = "bg-blue-600 text-white font-semibold shadow-sm";
    } else if (isParentOfActive && !isCollapsed) {
        dynamicClasses = "text-blue-700 font-medium hover:bg-slate-200";
    }

    // El padding izquierdo define la jerarquía visual
    const paddingLeft = level === 0 ? 12 : 16 + (level * 20);

    return (
        <div>
            <button 
                onClick={handleToggle} 
                style={{ paddingLeft: `${paddingLeft}px` }}
                className={`${baseClasses} ${levelClasses} ${dynamicClasses}`}
            >
                {/* Icono solo para elementos de nivel superior */}
                {level === 0 && item.icon && <div className="w-6 h-6 flex-shrink-0 mr-3">{item.icon}</div>}
                
                <span className={`transition-opacity duration-200 whitespace-nowrap overflow-hidden truncate ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {item.label}
                </span>
                
                {hasChildren && (
                    <div className={`ml-auto mr-2 transition-all duration-200 flex-shrink-0 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <ChevronRightIcon isOpen={isGroupOpen} />
                    </div>
                )}
            </button>
            
            {hasChildren && !isCollapsed && (
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isGroupOpen ? 'max-h-96' : 'max-h-0'}`}>
                    <div className="pt-1 space-y-1">
                        {item.children.map(child => (
                            <NavItem
                                key={child.id}
                                item={child}
                                isCollapsed={isCollapsed}
                                activeView={activeView}
                                setActiveView={setActiveView}
                                openItems={openItems}
                                setOpenItems={setOpenItems}
                                level={level + 1}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

