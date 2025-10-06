// src/components/layout/ProfessionalSidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronsRight, Menu, LogOut } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.tsx';

const SidebarItem = ({ item, isActive, onClick, isVisible, isCollapsed }: any) => {
    const { animationsEnabled } = useAppContext();
    const textColor = isActive ? 'text-white' : 'text-slate-600 hover:text-slate-800';
    const iconColor = isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800';
    
    return (
        <div 
            onClick={() => onClick(item.id)} 
            className={`flex items-center w-full cursor-pointer text-sm font-medium rounded-md group relative ${animationsEnabled ? 'transition-all duration-300 ease-in-out' : ''} ${isVisible ? 'opacity-100' : 'opacity-0'}`} 
            style={{ 
                transform: isVisible ? 'translateY(0)' : 'translateY(5px)', 
                paddingLeft: isCollapsed ? '0.625rem' : '1rem', 
                height: '44px' 
            }}
        >
            <div className={`mr-3 shrink-0 ${animationsEnabled ? 'transition-all duration-300 group-hover:scale-110' : ''} ${iconColor} ${isCollapsed ? 'ml-0.5' : ''}`}>
                {item.icon}
            </div>
            {!isCollapsed && <span className={`flex-grow truncate ${animationsEnabled ? 'transition-colors duration-200' : ''} ${textColor}`}>{item.label}</span>}
            {isCollapsed && <div className={`absolute left-full rounded-md px-2 py-1 ml-2 bg-[--theme-600] text-white text-sm invisible opacity-20 ${animationsEnabled ? 'transition-all' : ''} group-hover:visible group-hover:opacity-100 whitespace-nowrap z-20`}>{item.label}</div>}
        </div>
    );
};

export const ProfessionalSidebar = ({ onLogout, activeView, setActiveView, menuConfig }: any) => {
    const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);
    const [isAutoCollapse, setIsAutoCollapse] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [indicatorStyle, setIndicatorStyle] = useState({ opacity: 0, top: 0, height: 0 });
    const [visibleItems, setVisibleItems] = useState<string[]>([]);
    const sidebarRef = useRef<HTMLElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const { animationsEnabled } = useAppContext();
    
    const isCollapsed = isManuallyCollapsed || (isAutoCollapse && !isHovered);

    useEffect(() => {
        const allItemIds = menuConfig.flatMap((sec: any) => sec.items.map((item: any) => item.id));
        const timeouts = allItemIds.map((id: string, index: number) => setTimeout(() => setVisibleItems(prev => [...prev, id]), animationsEnabled ? 100 + index * 40 : 0));
        return () => timeouts.forEach(clearTimeout);
    }, [animationsEnabled, menuConfig]);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            const activeElement = sidebarRef.current?.querySelector(`[data-active='true']`);
            if (activeElement && navRef.current) {
                const navRect = navRef.current.getBoundingClientRect();
                const elemRect = activeElement.getBoundingClientRect();
                setIndicatorStyle({ 
                    top: elemRect.top - navRect.top, 
                    height: elemRect.height, 
                    opacity: 1 
                });
            } else if (visibleItems.length > 0) {
                setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
            }
        }, animationsEnabled ? 50 : 0);
        return () => clearTimeout(timer);
    }, [activeView, isCollapsed, visibleItems, animationsEnabled]);

    return (
        <aside 
            ref={sidebarRef} 
            onMouseEnter={() => setIsHovered(true)} 
            onMouseLeave={() => setIsHovered(false)} 
            className={`relative h-screen bg-white flex flex-col ${animationsEnabled ? 'transition-all duration-300 ease-in-out' : ''} border-r border-gray-200 ${isCollapsed ? 'w-20' : 'w-72'}`}
        >
            <div className="flex items-center p-4 h-16 border-b border-gray-200 gap-2 shrink-0">
                 <button onClick={() => setIsAutoCollapse(prev => !prev)} className={`p-2 rounded-md hover:bg-gray-100 ${isAutoCollapse ? 'text-[--theme-500]' : 'text-slate-500'}`} title="Activar/Desactivar menú automático">
                    <Menu size={20} />
                </button>
                {!isCollapsed && <h1 className="text-xl font-bold text-slate-800 truncate">Control de Asistencia</h1>}
            </div>
            
            <button onClick={() => setIsManuallyCollapsed(prev => !prev)} className={`absolute top-5 -right-[10px] z-20 text-slate-400 hover:text-[--theme-500] ${animationsEnabled ? 'transition-colors' : ''}`} title="Contraer/Expandir menú">
                <ChevronsRight size={20} className={`${animationsEnabled ? 'transition-transform duration-300' : ''} ${isManuallyCollapsed ? '' : 'rotate-180'}`} />
            </button>

            <nav ref={navRef} className="flex-grow p-2 relative overflow-y-auto">
                <div 
                    className={`absolute bg-gradient-to-br from-[--theme-500] to-[--theme-700] rounded-lg shadow-lg shadow-[--theme-500]/30 ${animationsEnabled ? 'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]' : ''}`} 
                    style={{...indicatorStyle, left: isCollapsed ? 4 : 8, right: isCollapsed ? 4 : 8}}
                ></div>
                <div className="relative z-10">
                    {menuConfig.map((section: any) => (
                        <div key={section.section} className="mb-2">
                            {!isCollapsed && <h2 className={`px-3 pt-2 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider ${animationsEnabled ? 'transition-opacity duration-200' : ''}`}>{section.section}</h2>}
                            <div className="flex flex-col">
                                {section.items.map((item: any) => (
                                    <div key={item.id} data-active={activeView === item.id}>
                                        <SidebarItem 
                                            item={item} 
                                            isActive={activeView === item.id} 
                                            onClick={setActiveView} 
                                            isVisible={visibleItems.includes(item.id)} 
                                            isCollapsed={isCollapsed} 
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </nav>

            <div className="p-2 border-t border-gray-200 shrink-0">
                <button onClick={onLogout} className="w-full flex items-center p-2 rounded-lg hover:bg-red-50 text-red-500 font-medium">
                    <LogOut size={18} className="mr-3 ml-1"/>
                    {!isCollapsed && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    );
};


