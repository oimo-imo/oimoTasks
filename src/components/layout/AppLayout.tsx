import { Outlet, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Home, FolderKanban, CalendarRange, BarChart2, Menu } from 'lucide-react';
import { useState } from 'react';

export const AppLayout = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/projects', icon: FolderKanban, label: 'Projects' },
        { path: '/gantt', icon: CalendarRange, label: 'Gantt' },
        { path: '/review', icon: BarChart2, label: 'Review' },
    ];

    return (
        <div className="h-screen w-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden text-gray-800 font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-20 lg:w-64 flex-col bg-white border-r border-gray-100 flex-shrink-0 z-20 shadow-sm">
                <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">
                        O
                    </div>
                    <span className="ml-3 font-bold text-xl tracking-tight hidden lg:block text-gray-800">OimoTasks</span>
                </div>

                <nav className="flex-1 py-6 flex flex-col gap-2 px-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx(
                                "flex items-center p-3 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-indigo-50 text-indigo-600 shadow-sm font-bold"
                                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                            )}
                        >
                            <item.icon size={24} className={clsx("flex-shrink-0 transition-transform group-hover:scale-110")} />
                            <span className="ml-3 hidden lg:block">{item.label}</span>

                            {/* Desktop Tooltip for small sidebar */}
                            <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 lg:hidden pointer-events-none transition-opacity whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-indigo-400 shadow-md"></div>
                        <div className="hidden lg:block">
                            <div className="text-sm font-bold text-gray-700">User</div>
                            <div className="text-xs text-gray-400">Free Plan</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">O</div>
                    <span className="font-bold text-lg text-gray-800">OimoTasks</span>
                </div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-500">
                    <Menu size={24} />
                </button>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative w-full h-full flex flex-col">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation (Visible on Mobile only) */}
            <nav className="md:hidden h-16 bg-white border-t border-gray-100 flex items-center justify-around px-2 pb-safe z-30 flex-shrink-0">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => clsx(
                            "flex flex-col items-center justify-center w-full h-full gap-1",
                            isActive ? "text-indigo-600" : "text-gray-400"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={clsx("text-[10px] font-medium transition-opacity", isActive ? "opacity-100" : "opacity-0")}>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};
