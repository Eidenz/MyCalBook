import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';

const Header = () => {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // NavLink will automatically add an 'active' class to the link when its path matches the current URL.
    const navLinkClasses = ({ isActive }) =>
        `px-3 py-2 md:py-1.5 text-sm font-semibold rounded-md transition-colors ${
            isActive 
            ? 'text-white bg-slate-700' 
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }`;

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
            {/* Desktop Header */}
            <div className="hidden md:flex justify-between items-center p-4">
                {/* Left Side: Logo and Navigation */}
                <div className="flex items-center gap-6">
                    <Link to="/" className="text-xl font-bold text-white">📅 MyCalendar</Link>
                    <nav className="flex items-center gap-2">
                        <NavLink to="/" className={navLinkClasses} end>Calendar</NavLink>
                        <NavLink to="/availability" className={navLinkClasses}>Availability</NavLink>
                        <NavLink to="/event-types" className={navLinkClasses}>Event Types</NavLink>
                        <NavLink to="/settings" className={navLinkClasses}>Settings</NavLink>
                    </nav>
                </div>

                {/* Right Side: User Menu */}
                <div className="flex items-center gap-4">
                    <span className="text-slate-300 text-sm">
                        Welcome, <span className="font-semibold text-white">{user?.username}</span>
                    </span>
                    <button 
                        onClick={logout}
                        className="flex items-center gap-2 bg-slate-700 text-slate-300 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-sm"
                    >
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden">
                {/* Top bar */}
                <div className="flex justify-between items-center p-4">
                    <Link to="/" className="text-lg font-bold text-white" onClick={closeMobileMenu}>
                        📅 MyCalendar
                    </Link>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleMobileMenu}
                            className="p-2 rounded-md hover:bg-slate-700 transition-colors active:scale-95"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                    <div className="bg-slate-900/50">
                        {/* Navigation Links */}
                        <nav className="px-4 pt-2 space-y-1">
                            <NavLink 
                                to="/" 
                                className={navLinkClasses} 
                                end
                                onClick={closeMobileMenu}
                            >
                                Calendar
                            </NavLink>
                            <NavLink 
                                to="/availability" 
                                className={navLinkClasses}
                                onClick={closeMobileMenu}
                            >
                                Availability
                            </NavLink>
                            <NavLink 
                                to="/event-types" 
                                className={navLinkClasses}
                                onClick={closeMobileMenu}
                            >
                                Event Types
                            </NavLink>
                            <NavLink 
                                to="/settings" 
                                className={navLinkClasses}
                                onClick={closeMobileMenu}
                            >
                                Settings
                            </NavLink>
                        </nav>
                        
                        {/* User Section - Separated */}
                        <div className="mt-4 px-4 py-3 bg-slate-800/50 border-t border-slate-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-slate-300 text-sm font-medium">
                                        {user?.username}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => {
                                        logout();
                                        closeMobileMenu();
                                    }}
                                    className="flex items-center gap-2 bg-slate-600 text-slate-300 font-medium px-3 py-1.5 rounded-md hover:bg-red-600 hover:text-white transition-colors text-sm active:scale-95"
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