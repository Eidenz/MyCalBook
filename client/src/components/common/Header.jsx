import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';

const Header = () => {
    const { user, logout } = useAuth();

    // NavLink will automatically add an 'active' class to the link when its path matches the current URL.
    const navLinkClasses = ({ isActive }) =>
        `px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
            isActive 
            ? 'text-white bg-slate-700' 
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }`;

    return (
        <header className="flex justify-between items-center p-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
            {/* Left Side: Logo and Navigation */}
            <div className="flex items-center gap-6">
                <Link to="/" className="text-xl font-bold text-white">📅 MyCalendar</Link>
                <nav className="flex items-center gap-2">
                    <NavLink to="/" className={navLinkClasses} end>Calendar</NavLink>
                    <NavLink to="/availability" className={navLinkClasses}>Availability</NavLink>
                    <NavLink to="/event-types" className={navLinkClasses}>Event Types</NavLink>
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
        </header>
    );
};

export default Header;