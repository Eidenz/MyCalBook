import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Clock, MapPin, Globe, Eye, EyeOff } from 'lucide-react';
import EventTypeModal from '../components/eventtypes/EventTypeModal';
import ConfirmationModal from '../components/common/ConfirmationModal';

const EventTypes = () => {
    const { token, user } = useAuth();
    const [eventTypes, setEventTypes] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEventType, setEditingEventType] = useState(null);
    const [deletingEventType, setDeletingEventType] = useState(null);
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // For now, we'll just re-use the availability one to get the default.
                // A proper implementation would fetch from a /api/schedules endpoint.
                // This is just a placeholder until we build schedule management.
                setSchedules([{ id: 1, name: 'Default' }]);

                const eventsRes = await fetch('/api/event-types', { headers: { 'x-auth-token': token } });
                if (!eventsRes.ok) throw new Error("Failed to fetch event types.");
                const eventsData = await eventsRes.json();
                setEventTypes(eventsData);

            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [token]);
    
    const openModalForEdit = (eventType) => {
        setEditingEventType(eventType);
        setIsModalOpen(true);
    };

    const openModalForNew = () => {
        setEditingEventType(null);
        setIsModalOpen(true);
    };

    const handleSave = (savedEventType) => {
        if (editingEventType) {
            setEventTypes(prev => prev.map(et => et.id === savedEventType.id ? savedEventType : et));
        } else {
            setEventTypes(prev => [savedEventType, ...prev]);
        }
    };

    const handleDelete = async () => {
        if (!deletingEventType) return;
        try {
            await fetch(`/api/event-types/${deletingEventType.id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            setEventTypes(prev => prev.filter(et => et.id !== deletingEventType.id));
            setDeletingEventType(null);
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEventType(null);
    };

    if (isLoading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                 <div>
                    <h1 className="text-3xl font-bold text-white">Booking Setup</h1>
                    <p className="text-slate-400 mt-1">Create and manage your bookable events.</p>
                </div>
                <button onClick={openModalForNew} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:opacity-90 transition">
                    <Plus size={20}/> New Booking Type
                </button>
            </div>

            {user && (
                <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center gap-4">
                    <Globe className="text-indigo-400 flex-shrink-0" size={20}/>
                    <div>
                        <span className="text-slate-300">Your public booking page is live at:</span>
                        <a href={`/u/${user.username}`} target="_blank" rel="noopener noreferrer" className="block font-mono text-indigo-400 hover:underline break-all">
                            {window.location.origin}/u/{user.username}
                        </a>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventTypes.map(et => {
                    const durations = typeof et.durations === 'string' ? JSON.parse(et.durations) : et.durations;
                    return (
                    <div key={et.id} className="bg-slate-800 rounded-lg shadow-lg p-5 flex flex-col border border-slate-700">
                        <div className="flex justify-between items-start gap-2">
                           <h2 className="text-xl font-bold text-white mb-3 break-words">{et.title}</h2>
                           <span className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-400">
                             {et.is_public ? <Eye size={14}/> : <EyeOff size={14}/>}
                             {et.is_public ? 'Public' : 'Private'}
                           </span>
                        </div>
                        <div className="space-y-2 text-slate-400 flex-grow">
                            <div className="flex items-center gap-2"><Clock size={16}/><span>{durations.join(', ')} min</span></div>
                            <div className="flex items-center gap-2"><MapPin size={16}/><span>{et.location}</span></div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                            <a href={`/book/${et.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline">View booking page</a>
                            <div>
                                <button onClick={() => openModalForEdit(et)} className="text-sm text-slate-400 hover:text-white">Edit</button>
                                <button onClick={() => setDeletingEventType(et)} className="text-sm text-red-500/70 hover:text-red-500 ml-2">Delete</button>
                            </div>
                        </div>
                    </div>
                    )
                })}
            </div>

            <EventTypeModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                token={token}
                schedules={schedules}
                eventType={editingEventType}
            />

            <ConfirmationModal 
                isOpen={!!deletingEventType}
                onClose={() => setDeletingEventType(null)}
                onConfirm={handleDelete}
                title="Delete Event Type"
                message={`Are you sure you want to delete "${deletingEventType?.title}"? All associated booking links will stop working.`}
            />
        </div>
    );
};

export default EventTypes;