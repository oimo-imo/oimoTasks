import { Outlet, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Home, FolderKanban, CalendarRange, BarChart2, Menu, X, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../lib/store';
import { SettingsModal } from '../SettingsModal';

export const AppLayout = () => {
    const { user, logout } = useStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const navItems = [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/projects', icon: FolderKanban, label: 'Projects' },
        { path: '/gantt', icon: CalendarRange, label: 'Gantt' },
        { path: '/review', icon: BarChart2, label: 'Review' },
    ];

    const UserAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
        const sizeClasses = {
            sm: 'w-8 h-8 text-xs',
            md: 'w-10 h-10 text-sm',
            lg: 'w-12 h-12 text-base'
        };

        if (user?.photoURL) {
            return (
                <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className={`${sizeClasses[size]} rounded-full border border-gray-200 object-cover`}
                />
            );
        }
        return (
            <div className={`${sizeClasses[size]} rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200`}>
                {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
        );
    };

    return (
        <div className="h-screen w-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden text-gray-800 font-sans">
            <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

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

                {/* Desktop User Profile */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                        <UserAvatar size="md" />
                        <div className="hidden lg:block overflow-hidden">
                            <div className="text-sm font-bold text-gray-700 truncate" title={user?.displayName || ''}>
                                {user?.displayName || 'User'}
                            </div>
                            <div className="text-xs text-gray-400 truncate" title={user?.email || ''}>
                                {user?.email}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 lg:flex lg:flex-col lg:gap-1">
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="flex items-center justify-center lg:justify-start gap-2 p-2 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Settings size={14} />
                            <span className="hidden lg:inline">Settings</span>
                        </button>
                        <button
                            onClick={() => logout()}
                            className="flex items-center justify-center lg:justify-start gap-2 p-2 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut size={14} />
                            <span className="hidden lg:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">O</div>
                    <span className="font-bold text-lg text-gray-800">OimoTasks</span>
                </div>
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Menu size={24} />
                </button>
            </header>

            {/* Mobile Slide-out Drawer */}
            {mobileMenuOpen && (
                <div className="absolute inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="relative w-64 h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="p-4 flex items-center justify-between border-b border-gray-100">
                            <span className="font-bold text-gray-800">Menu</span>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 flex flex-col items-center border-b border-gray-100 bg-gray-50/50">
                            <UserAvatar size="lg" />
                            <div className="mt-3 font-bold text-gray-800 text-center">
                                {user?.displayName || 'User'}
                            </div>
                            <div className="text-xs text-gray-500 text-center break-all">
                                {user?.email}
                            </div>
                        </div>

                        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                            {/* Repeating nav items in drawer if desired, or just setting/profile options */}
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={({ isActive }) => clsx(
                                        "flex items-center p-3 rounded-xl transition-all",
                                        isActive ? "bg-indigo-50 text-indigo-600 font-bold" : "text-gray-500 hover:bg-gray-50"
                                    )}
                                >
                                    <item.icon size={20} />
                                    <span className="ml-3">{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>

                        <div className="p-4 border-t border-gray-100 space-y-1">
                            <button
                                onClick={() => {
                                    setSettingsOpen(true);
                                    setMobileMenuOpen(false);
                                }}
                                className="flex items-center w-full p-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
                            >
                                <Settings size={20} />
                                <span className="ml-3">Settings</span>
                            </button>
                            <button
                                onClick={() => {
                                    logout();
                                    setMobileMenuOpen(false);
                                }}
                                className="flex items-center w-full p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
                            >
                                <LogOut size={20} />
                                <span className="ml-3">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
