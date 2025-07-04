import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, MapPin, ChevronRight, UserX } from 'lucide-react';

const UserProfilePage = () => {
    const { username } = useParams();
    const [user, setUser] = useState(null);
    const [eventTypes, setEventTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/public/user/${username}`);
                if (!res.ok) {
                    throw new Error('This user or page does not exist.');
                }
                const data = await res.json();
                setUser(data.user);
                setEventTypes(data.eventTypes);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [username]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-300">Loading profile...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md mx-auto text-center bg-slate-100/50 dark:bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl p-8 animate-fade-in-up">
                    <UserX className="mx-auto text-red-400 h-16 w-16 mb-4" />
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Not Found</h1>
                    <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-2">
                        Sorry, we couldn't find a user with the username "{username}".
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 mt-1 text-sm">
                        Please check the URL and try again.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Book a hangout with {user?.username}</h1>
                    <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-2">Select one of the event types below to get started.</p>
                </div>
                <div className="bg-slate-100/50 dark:bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
                    {eventTypes.length > 0 ? (
                        eventTypes.map(et => (
                            <Link to={`/book/${et.slug}`} key={et.id} className="block bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 dark:bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-700 p-5 rounded-lg transition-all duration-300 group">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{et.title}</h2>
                                        {et.description && (
                                            <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-2 text-sm">{et.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-3 text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm">
                                            <span className="flex items-center gap-1.5"><Clock size={14}/> {et.durations.join(', ')} min</span>
                                            <span className="flex items-center gap-1.5"><MapPin size={14}/> {et.location}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform" size={24}/>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p className="text-center text-slate-400 dark:text-slate-500 py-8">This user has no public event types available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;