import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import logo from '../assets/logo.png';
import pkg from '../../package.json';

interface SidebarProps {
    isCollapsed?: boolean;
    toggleSidebar?: () => void;
}

export default function Sidebar({ isCollapsed = false, toggleSidebar }: SidebarProps) {
    const location = useLocation();
    const { user, profile, signOut } = useAuth();

    // Rolü normalize et
    const rawRole = profile?.role || 'user';
    const currentRole = rawRole.toLowerCase().trim();

    // Fatura sorumlusu rollerini tek bir grupta topla
    const isFaturaSorumlusu = currentRole === 'user' || currentRole === 'fatura sorumlusu' || currentRole === 'fatura_sorumlusu';
    const isIrsaliyeSorumlusu = currentRole === 'irsaliye';

    const navItems = [
        { name: 'Kullanıcı Listesi', path: '/recipients', icon: 'group', roles: ['admin'] },
        {
            name: isIrsaliyeSorumlusu ? 'İrsaliye Yükle' : isFaturaSorumlusu ? 'Fatura Yükle' : 'Fatura / İrsaliye Yükle',
            path: '/upload',
            icon: 'upload_file',
            roles: ['user', 'fatura sorumlusu', 'fatura_sorumlusu', 'irsaliye', 'fatura_irsaliye']
        },
        { name: 'Belgelerim', path: '/my-invoices', icon: 'folder_open', roles: ['user', 'fatura sorumlusu', 'fatura_sorumlusu', 'irsaliye', 'fatura_irsaliye'] },
        { name: 'Onaylar', path: '/approvals', icon: 'fact_check', roles: ['manager', 'yonetici'] },
        {
            name: currentRole === 'muhasebe' ? 'Alım Onaylı Faturalar' : currentRole === 'satinalma' ? 'Müdür Onaylı İrsaliyeler' : 'Onaylanan Belgeler',
            path: '/approved-invoices',
            icon: 'verified_user',
            roles: ['manager', 'yonetici', 'muhasebe', 'satinalma']
        },
        {
            name: currentRole === 'satinalma' ? 'İrsaliye Arşivi' : 'Fatura Arşivi',
            path: '/invoice-archive',
            icon: 'inventory_2',
            roles: ['muhasebe', 'satinalma']
        },
        { name: 'Reddedilenler', path: '/rejected-documents', icon: 'hide_source', roles: ['muhasebe', 'satinalma', 'manager', 'yonetici'] },

        { name: 'Sistem Kayıtları', path: '/system-logs', icon: 'manage_search', roles: ['admin', 'manager', 'yonetici'] },
        { name: 'Ayarlar', path: '/settings', icon: 'settings', roles: ['admin', 'manager', 'yonetici', 'user', 'fatura sorumlusu', 'fatura_sorumlusu', 'muhasebe', 'satinalma', 'irsaliye', 'fatura_irsaliye'] },
    ];

    return (
        <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark h-screen fixed left-0 top-0 z-20 transition-all duration-300`}>
            <div className={`py-6 flex items-center ${isCollapsed ? 'justify-center px-4' : 'gap-3 px-6'} overflow-hidden`}>
                <div className="w-8 h-8 rounded-lg overflow-hidden flex shrink-0 items-center justify-center" title={isCollapsed ? "Fatura Yöneticisi" : undefined}>
                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
                {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                        <h1 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">
                            Ardıç Elektrik<br /><span className="text-sm font-medium">Entegrasyon Sistemi</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 tracking-wider">v{pkg.version}</p>
                    </div>
                )}
                {toggleSidebar && (
                    <button
                        onClick={toggleSidebar}
                        className={`absolute right-[-12px] top-6 w-6 h-6 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-full flex items-center justify-center text-slate-500 hover:text-primary transition-colors cursor-pointer z-30 shadow-sm`}
                        title={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
                    >
                        <span className="material-symbols-outlined text-[14px]">
                            {isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
                        </span>
                    </button>
                )}
            </div>
            <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-4 space-y-1 overflow-y-auto`}>
                {navItems
                    .filter(item => {
                        if (!item.roles) return true;
                        // Use original case-insensitive some or the new normalized role
                        return item.roles.some(r => r.toLowerCase() === currentRole);
                    })
                    .map((item) => {
                        const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/');
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                title={isCollapsed ? item.name : undefined}
                                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-lg transition-colors group ${isActive
                                    ? 'bg-primary/10 text-primary dark:text-primary-400'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <span className={`material-symbols-outlined ${isActive ? 'fill-1' : 'group-hover:text-primary'} shrink-0`}>
                                    {item.icon}
                                </span>
                                {!isCollapsed && (
                                    <div className="flex-1 flex items-center justify-between">
                                        <span className="font-medium text-sm leading-tight">{item.name}</span>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
            </nav>
            <div className={`p-4 border-t border-border-light dark:border-border-dark flex flex-col ${isCollapsed ? 'gap-4 items-center' : 'gap-2'}`}>
                {!isCollapsed && (
                    <div className="px-3 mb-2">
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Durum: {profile ? 'Bağlı' : 'Yükleniyor'}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Yetki: {profile?.role || 'Varsayılan'}</div>
                    </div>
                )}
                <div
                    className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10' : 'gap-3 px-3 py-2 w-full'} rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors`}
                    onClick={() => signOut()}
                    title={isCollapsed ? 'Çıkış Yap' : undefined}
                >
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex flex-shrink-0 items-center justify-center overflow-hidden">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Profil" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-500">person</span>
                        )}
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {profile?.full_name || user?.email || 'Kullanıcı'}
                                </p>
                                <p className="text-xs text-slate-500 truncate capitalize">
                                    {profile?.role === 'manager' ? 'Müdür' : profile?.role === 'yonetici' ? 'Yönetici' : profile?.role === 'admin' ? 'Admin' : profile?.role === 'muhasebe' ? 'Muhasebe' : profile?.role === 'satinalma' ? 'Satın Alma' : profile?.role === 'irsaliye' ? 'İrsaliye Sorumlusu' : profile?.role === 'fatura_irsaliye' ? 'Fatura / İrsaliye Sorumlusu' : profile?.role}
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">logout</span>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
