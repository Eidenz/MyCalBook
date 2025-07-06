import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Menu, X, Shield, Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-1 rounded-full">
            <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'bg-white text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                aria-label="Light mode"
            >
                <Sun size={16} />
            </button>
            <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-900'}`}
                aria-label="Dark mode"
            >
                <Moon size={16} />
            </button>
        </div>
    );
};

const Header = () => {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinkClasses = ({ isActive }) =>
        `px-3 py-2 md:py-1.5 text-sm font-semibold rounded-md transition-colors ${
            isActive 
            ? 'text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700' 
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
        }`;

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
            {/* Desktop Header */}
            <div className="hidden md:flex justify-between items-center p-4">
                <div className="flex items-center gap-6">
                    <Link to="/" className="text-xl font-bold text-slate-900 dark:text-white">📅 MyCalBook</Link>
                    <nav className="flex items-center gap-2">
                        <NavLink to="/" className={navLinkClasses} end>Calendar</NavLink>
                        <NavLink to="/availability" className={navLinkClasses}>Availability</NavLink>
                        <NavLink to="/event-types" className={navLinkClasses}>Booking Setup</NavLink>
                        <NavLink to="/settings" className={navLinkClasses}>Settings</NavLink>
                        {user?.is_admin ? (
                            <NavLink to="/admin" className={navLinkClasses}>
                                <div className="flex items-center gap-1.5"><Shield size={14} />Admin</div>
                            </NavLink>
                        ) : <></>}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <span className="text-slate-600 dark:text-slate-300 text-sm">
                        Welcome, <span className="font-semibold text-slate-900 dark:text-white">{user?.username}</span>
                    </span>
                    <button 
                        onClick={logout}
                        className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-sm"
                    >
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
            {/* Mobile Header */}
            <div className="md:hidden">
                <div className="flex justify-between items-center p-4">
                    <Link to="/" className="text-lg font-bold text-slate-900 dark:text-white" onClick={closeMobileMenu}>
                        📅 MyCalBook
                    </Link>
                    <div className="flex items-center gap-3">
                            <ThemeToggle />
                        <button
                            onClick={toggleMobileMenu}
                            className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                    <div className="bg-white/50 dark:bg-slate-900/50">
                        <nav className="p-4 space-y-1">
                            {['/', '/availability', '/event-types', '/settings'].map(path => {
                                let label;
                                if (path === '/') label = 'Calendar';
                                else if (path === '/availability') label = 'Availability';
                                else if (path === '/event-types') label = 'Booking Setup';
                                else if (path === '/settings') label = 'Settings';
                                else label = path.charAt(1).toUpperCase() + path.slice(2);
                                return (
                                    <NavLink 
                                        key={path}
                                        to={path} 
                                        className={({isActive}) => `block text-base ${navLinkClasses({isActive})}`}
                                        end={path === '/'}
                                        onClick={closeMobileMenu}
                                    >
                                        {label}
                                    </NavLink>
                                );
                            })}
                        </nav>
                                    
                        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                                        {user?.username}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => { logout(); closeMobileMenu(); }}
                        className="flex items-center gap-2 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 font-medium px-3 py-1.5 rounded-md hover:bg-red-600 hover:text-white transition-colors text-sm active:scale-95"
                    >
                                    <LogOut size={14} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;