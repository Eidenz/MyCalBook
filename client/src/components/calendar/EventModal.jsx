import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ConfirmationModal from '../common/ConfirmationModal';

const EventModal = ({ isOpen, onClose, onEventCreated, onEventUpdated, onEventDeleted, selectedEvent, token }) => {
    const isEditMode = Boolean(selectedEvent);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const getInitialState = () => {
        if (isEditMode) {
            const startDate = new Date(selectedEvent.start_time);
            const endDate = new Date(selectedEvent.end_time);
            return {
                title: selectedEvent.title || '',
                type: selectedEvent.type || 'personal',
                description: selectedEvent.description || '',
                date: startDate.toISOString().split('T')[0],
                startTime: startDate.toTimeString().substring(0, 5),
                endDate: endDate.toISOString().split('T')[0],
                endTime: endDate.toTimeString().substring(0, 5),
            };
        }
        const today = new Date().toISOString().split('T')[0];
        return {
            title: '', type: 'personal', description: '',
            date: today, startTime: '10:00',
            endDate: today, endTime: '11:00',
        };
    };
    
    const [formData, setFormData] = useState(getInitialState());
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData(getInitialState());
        setError('');
    }, [isOpen, selectedEvent]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const startDateTimeUTC = new Date(`${formData.date}T${formData.startTime}`).toISOString();
        const endDateTimeUTC = new Date(`${formData.endDate}T${formData.endTime}`).toISOString();

        const payload = {
            title: formData.title, type: formData.type, description: formData.description,
            start_time: startDateTimeUTC, end_time: endDateTimeUTC,
        };

        const url = isEditMode ? `/api/events/manual/${selectedEvent.id}` : '/api/events/manual';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `Failed to ${isEditMode ? 'update' : 'create'} event.`);
            }

            const resultEvent = await response.json();
            
            if (isEditMode) {
                onEventUpdated(resultEvent);
            } else {
                onEventCreated(resultEvent);
            }
            
            // **BUG FIX:** Close the modal on success for both create and edit.
            onClose(); 

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // handleDelete is unchanged from before
    const handleDelete = async () => {
        if (!isEditMode) return;
        
        setIsSubmitting(true);
        setError('');
        try {
            const response = await fetch(`/api/events/manual/${selectedEvent.id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to delete event.');
            }
            onEventDeleted(selectedEvent.id);
            onClose(); // Close the main event modal after successful deletion
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4 transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{isEditMode ? 'Edit Event' : 'Add New Event'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><X size={24} /></button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* The form fields are identical, they just get pre-filled in edit mode */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold mb-2 text-slate-300">Event Title *</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" />
                        </div>
                        <div className="form-group">
                            <label className="block text-sm font-semibold mb-2 text-slate-300">Event Type *</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition">
                                <option value="personal">Personal Event</option>
                                <option value="blocked">Blocked Time</option>
                            </select>
                        </div>

                        {/* --- Date/Time Section --- */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-1 text-slate-300">Start</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        name="date" 
                                        value={formData.date} 
                                        onChange={handleChange} required 
                                        className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" />
                                    <input 
                                        type="time" 
                                        name="startTime" 
                                        value={formData.startTime} 
                                        onChange={handleChange} required 
                                        className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-1 text-slate-300">End</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        name="endDate" 
                                        value={formData.endDate} 
                                        onChange={handleChange} required 
                                        className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" />
                                    <input 
                                        type="time" 
                                        name="endTime" 
                                        value={formData.endTime} 
                                        onChange={handleChange} required 
                                        className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition" />
                                </div>
                            </div>
                        </div>

                        {/* --- Description Field --- */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold mb-2 text-slate-300">Description</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows="3"
                                className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none transition"
                                placeholder="Add notes or details..."/>
                        </div>

                        {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-lg">{error}</div>}
                    </div>

                    <div className="mt-6 flex justify-between items-center">
                        <div>
                            {isEditMode && (
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmModalOpen(true)} 
                                    disabled={isSubmitting} 
                                    className="px-6 py-2.5 bg-red-800 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500 transition">
                                Close
                            </button>
                            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSubmitting ? '...' : (isEditMode ? 'Save Changes' : 'Create Event')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Event"
                message={`Are you sure you want to permanently delete "${selectedEvent?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                isDestructive={true}
            />
        </div>
    );
};

export default EventModal;