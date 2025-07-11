import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Trash2, ShieldCheck, User, AlertTriangle, Shield } from 'lucide-react';
import ConfirmationModal from '../components/common/ConfirmationModal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const AdminDashboard = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingUser, setDeletingUser] = useState(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users', { headers: { 'x-auth-token': token } });
            if (!res.ok) throw new Error('Failed to fetch users.');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        try {
            const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingUser(null);
        }
    };

    if (isLoading) return (
        <div className="p-8">
            <LoadingSpinner size={32} text="Loading user data..." className="py-16" />
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Admin Dashboard</h1>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}
            
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <div className="p-4 bg-white/50 dark:bg-slate-50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-semibold">User Management</h2>
                    <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm mt-1">Total users: {users.length}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                            <tr>
                                <th className="p-3">User</th>
                                <th className="p-3 hidden sm:table-cell">Email</th>
                                <th className="p-3 hidden md:table-cell">Joined</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-200 dark:bg-slate-700/30 transition-colors">
                                    <td className="p-3 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {user.is_admin ? (
                                                <ShieldCheck className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" size={18} title="Admin" />
                                            ) : (
                                                <User className="text-slate-400 dark:text-slate-500 flex-shrink-0" size={18} />
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-900 dark:text-white">{user.username}</span>
                                                {user.is_two_factor_enabled ? (
                                                    <Shield className="text-green-400" size={16} title="2FA Enabled" />
                                                ) : (
                                                    <></>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-400 dark:text-slate-500 dark:text-slate-400 hidden sm:table-cell">{user.email}</td>
                                    <td className="p-3 text-slate-400 dark:text-slate-500 dark:text-slate-400 hidden md:table-cell">{format(new Date(user.created_at), 'MMM d, yyyy')}</td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        {!user.is_admin && (
                                            <button
                                                onClick={() => setDeletingUser(user)}
                                                className="p-2 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                                title="Delete user"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!deletingUser}
                onClose={() => setDeletingUser(null)}
                onConfirm={handleDeleteUser}
                title="Delete User"
                message={`Are you sure you want to permanently delete the user "${deletingUser?.username}"? This action is irreversible.`}
            />
        </div>
    );
};

export default AdminDashboard;