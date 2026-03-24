// src/components/layout/ProfessionalSidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronsRight, ChevronsUp, Menu, LogOut, Bell } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.tsx';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { NotificationPanel } from './AppHeader';
import { useNotification } from '../../context/NotificationContext.tsx';

const SidebarItem = ({ item, isActive, onClick, isVisible, isCollapsed }: any) => {
    const textColor = isActive ? 'text-white' : 'text-slate-600 hover:text-slate-800';
    const iconColor = isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800';

    const itemContent = (
        <div
            onClick={() => onClick(item.id)}
            className={`flex items-center w-full cursor-pointer text-sm font-medium rounded-md group relative transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'} ${isCollapsed ? 'justify-center' : ''}`}
            style={{
                transform: isVisible ? 'translateY(0)' : 'translateY(5px)',
                paddingLeft: isCollapsed ? 0 : '1rem',
                height: '44px'
            }}
        >
            <div className={`shrink-0 transition-all duration-300 group-hover:scale-110 ${iconColor} ${isCollapsed ? '' : 'mr-3'}`}>
                {item.icon}
            </div>
            {!isCollapsed && <span className={`flex-grow truncate transition-colors duration-200 ${textColor}`}>{item.label}</span>}
        </div>
    );

    if (isCollapsed) {
        return (
            <Tooltip text={item.label} placement="right" withArrow={true}>
                {itemContent}
            </Tooltip>
        );
    }

    return itemContent;
};

const SidebarHeaderContent = ({ user, themeColors, onProfileClick, isCollapsed }: any) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isBellAnimating, setIsBellAnimating] = useState(false);
    const { notifications } = useNotification();
    const unreadCount = notifications.filter((n: any) => !n.read).length;

    useEffect(() => {
        if (notifications.length > 0) {
            if (!notifications[0].read) {
                setIsBellAnimating(true);
                const timer = setTimeout(() => setIsBellAnimating(false), 600);
                return () => clearTimeout(timer);
            }
        }
    }, [notifications]);

    const avatarInitial = user?.NombreCompleto ? user.NombreCompleto.charAt(0).toUpperCase() : '?';
    const fullName = user?.NombreCompleto || 'Cargando...';
    const roles = user?.Roles?.map((r: any) => r.NombreRol).join(', ') || 'Usuario';

    return (
        <div className={`flex ${isCollapsed ? 'flex-col justify-center' : 'justify-between w-full px-2'} items-center gap-2 mb-2`}>
            <div className="relative flex justify-center">
                <button onClick={() => setIsPanelOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 relative">
                    <Bell size={20} className={isBellAnimating ? 'animate-ring' : ''} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                </button>
                <NotificationPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} positionClass="bottom-14 left-10" />
            </div>
            <button onClick={onProfileClick} className={`flex items-center gap-2 p-1 rounded-md hover:bg-gray-100 ${isCollapsed ? 'justify-center mx-auto' : 'flex-grow min-w-0'}`} title={isCollapsed ? fullName : ''}>
                <img
                    src={`https://placehold.co/40x40/${themeColors?.[100]?.substring(1) || 'ffffff'}/${themeColors?.[900]?.substring(1) || '000000'}?text=${avatarInitial}`}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full shrink-0"
                />
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-slate-700 text-left truncate">{fullName}</p>
                        <p className="text-xs text-slate-500 text-left truncate">{roles}</p>
                    </div>
                )}
            </button>
        </div>
    );
};

export const ProfessionalSidebar = ({ onLogout, activeView, setActiveView, menuConfig, isHeaderCollapsed, setIsHeaderCollapsed, user, themeColors, onProfileClick }: any) => {
    const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);
    const [isAutoCollapse, setIsAutoCollapse] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [indicatorStyle, setIndicatorStyle] = useState({ opacity: 0, top: 0, height: 0 });
    const [visibleItems, setVisibleItems] = useState<string[]>([]);
    const sidebarRef = useRef<HTMLElement>(null);
    const navRef = useRef<HTMLElement>(null);

    const isCollapsed = isManuallyCollapsed || (isAutoCollapse && !isHovered);

    useEffect(() => {
        const allItemIds = menuConfig.flatMap((sec: any) => sec.items.map((item: any) => item.id));
        const timeouts = allItemIds.map((id: string, index: number) => setTimeout(() => setVisibleItems(prev => [...prev, id]), 100 + index * 40));
        return () => timeouts.forEach(clearTimeout);
    }, [menuConfig]);

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
        }, 50);
        return () => clearTimeout(timer);
    }, [activeView, isCollapsed, visibleItems]);

    return (
        <aside
            ref={sidebarRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative z-[70] h-screen bg-white flex flex-col transition-all duration-300 ease-in-out border-r border-gray-200 ${isCollapsed ? 'w-20' : 'w-72'}`}
        >
            <div className="flex items-center p-4 h-16 border-b border-gray-200 gap-2 shrink-0">
                <Tooltip text="Activar/Desactivar menú automático" placement="right">
                    <button onClick={() => setIsAutoCollapse(prev => !prev)} className={`p-2 rounded-md hover:bg-gray-100 ${isAutoCollapse ? 'text-[--theme-500]' : 'text-slate-500'}`}>
                        <Menu size={20} />
                    </button>
                </Tooltip>
                {!isCollapsed && <h1 className="text-xl font-bold text-slate-800 truncate">Control de Asistencia</h1>}
            </div>

            <div className="absolute top-5 -right-[10px] z-20 flex flex-col gap-3">
                <button onClick={() => setIsManuallyCollapsed(prev => !prev)} className={`text-slate-400 hover:text-[--theme-500] transition-colors`} title="Contraer/Expandir menú lateral">
                    <ChevronsRight size={20} className={`bg-white rounded-full transition-transform duration-300 ${isManuallyCollapsed ? '' : 'rotate-180'}`} />
                </button>
                <button onClick={() => setIsHeaderCollapsed((p: boolean) => !p)} className={`text-slate-400 hover:text-[--theme-500] transition-colors`} title="Contraer/Expandir cabecera">
                    <ChevronsUp size={20} className={`bg-white rounded-full transition-transform duration-300 ${isHeaderCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>

            <div className="flex-grow p-2 relative overflow-y-auto overflow-x-hidden">
                <nav ref={navRef} className="relative">
                    <div
                        className={`absolute bg-gradient-to-br from-[--theme-500] to-[--theme-700] rounded-lg shadow-lg shadow-[--theme-500]/30 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]`}
                        style={{ ...indicatorStyle, left: isCollapsed ? 4 : 8, right: isCollapsed ? 4 : 8 }}
                    ></div>
                    <div className="relative z-10">
                        {menuConfig.map((section: any) => (
                            <div key={section.section} className="mb-2">
                                {!isCollapsed && <h2 className={`px-3 pt-2 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider transition-opacity duration-200`}>{section.section}</h2>}
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
            </div>

            <div className={`transition-all duration-300 transform-gpu ease-in-out shrink-0 w-full relative z-[80] ${isHeaderCollapsed ? 'max-h-32 opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-2 border-t border-gray-200 w-full h-full flex flex-col justify-center">
                    <SidebarHeaderContent user={user} themeColors={themeColors} onProfileClick={onProfileClick} isCollapsed={isCollapsed} />
                </div>
            </div>

            <div className="p-2 border-t border-gray-200 shrink-0">
                <button onClick={onLogout} className="w-full flex items-center p-2 rounded-lg hover:bg-red-50 text-red-500 font-medium">
                    <LogOut size={18} className="mr-3 ml-1" />
                    {!isCollapsed && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    );
};
