import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({ size = 24, className = '', text = 'Loading...' }) => {
    return (
        <div className={`flex items-center justify-center gap-3 ${className}`}>
            <Loader size={size} className="animate-spin text-indigo-500" />
            <span className="text-slate-600 dark:text-slate-400">{text}</span>
        </div>
    );
};

export default LoadingSpinner;
