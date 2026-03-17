import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main antialiased min-h-screen flex overflow-hidden">
            {/* Electron pencere sürükleme bölgesi */}
            <div className="fixed top-0 left-0 right-0 h-[36px] z-[9999]" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
            <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
            <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} min-h-screen relative overflow-y-auto`}>
                <Outlet />
            </main>
        </div>
    );
}
