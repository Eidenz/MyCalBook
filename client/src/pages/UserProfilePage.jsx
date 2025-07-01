import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, MapPin, ChevronRight } from 'lucide-react';

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

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white">Book a hangout with {user?.username}</h1>
                    <p className="text-slate-400 mt-2">Select one of the event types below to get started.</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
                    {eventTypes.length > 0 ? (
                        eventTypes.map(et => (
                            <Link to={`/book/${et.slug}`} key={et.id} className="block bg-slate-800 hover:bg-slate-700/50 border border-slate-700 p-5 rounded-lg transition-all duration-300 group">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{et.title}</h2>
                                        {et.description && (
                                            <p className="text-slate-400 mt-2 text-sm">{et.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-3 text-slate-400 text-sm">
                                            <span className="flex items-center gap-1.5"><Clock size={14}/> {et.durations.join(', ')} min</span>
                                            <span className="flex items-center gap-1.5"><MapPin size={14}/> {et.location}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-transform" size={24}/>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 py-8">This user has no public event types available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;