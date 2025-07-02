import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = true, // To style the confirm button (e.g., red for delete)
}) => {
    if (!isOpen) return null;

    const confirmButtonClass = isDestructive
        ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
        : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800";

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" // Higher z-index than other modals
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-4 md:p-6 transform transition-all scale-100 animate-in fade-in-0 zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-red-900/50 sm:mx-0">
                        <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3 md:ml-4 text-left flex-1">
                        <h3 className="text-base md:text-lg leading-6 font-bold text-white" id="modal-title">
                            {title}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 md:mt-6 flex flex-col-reverse sm:flex-row-reverse gap-3">
                    <button
                        type="button"
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-3 md:py-2 text-base font-medium text-white sm:w-auto sm:text-sm transition-all active:scale-95 ${confirmButtonClass}`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-3 md:py-2 bg-slate-700 text-base font-medium text-slate-300 hover:bg-slate-600 active:bg-slate-500 sm:w-auto sm:text-sm transition-all active:scale-95"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;