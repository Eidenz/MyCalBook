import React from 'react';
import { Repeat, AlertTriangle } from 'lucide-react';

const RecurrenceEditModal = ({ isOpen, onClose, onConfirm, verb = 'edit' }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
            onClick={onClose}
        >
            <div 
                className="bg-slate-100 dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all animate-in fade-in-0 zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                        <Repeat className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="text-lg leading-6 font-bold text-slate-900 dark:text-white">
                            Edit Recurring Event
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            This is a recurring event. How would you like to {verb} it?
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700/60 px-4 py-3 text-base font-medium text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 transition-colors"
                        onClick={() => { onConfirm('single'); onClose(); }}
                    >
                        This event only
                    </button>
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700/60 px-4 py-3 text-base font-medium text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 transition-colors"
                        onClick={() => { onConfirm('all'); onClose(); }}
                    >
                        This and all future events
                    </button>
                    <button
                        type="button"
                        className="mt-2 text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecurrenceEditModal;