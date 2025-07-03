import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, Loader, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const CancellationPage = () => {
    const { token } = useParams();
    const [booking, setBooking] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const [error, setError] = useState('');
    const [isCancelled, setIsCancelled] = useState(false);

    useEffect(() => {
        const fetchBooking = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/public/bookings/${token}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setBooking(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBooking();
    }, [token]);

    const handleConfirmCancellation = async () => {
        setIsCancelling(true);
        setError('');
        try {
            const res = await fetch(`/api/public/bookings/${token}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setIsCancelled(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsCancelling(false);
        }
    };
    
    const renderContent = () => {
        if (isLoading) return <div className="text-center text-slate-300 flex items-center gap-2"><Loader className="animate-spin" />Loading booking details...</div>;
        if (error) return <div className="text-center text-red-400 flex items-center gap-2"><AlertTriangle />{error}</div>;

        if (isCancelled) {
            return (
                <div className="text-center animate-fade-in-up">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4" />
                    <h1 className="text-2xl font-bold text-white">Booking Cancelled</h1>
                    <p className="text-slate-400 mt-2">Your booking has been successfully cancelled. A confirmation has been sent if an email was provided.</p>
                    <Link to="/" className="mt-6 inline-block text-indigo-400 hover:underline">Return to Home</Link>
                </div>
            );
        }

        if (booking) {
            return (
                <div className="animate-fade-in-up">
                    <h1 className="text-2xl font-bold text-white text-center">Cancel Booking</h1>
                    <p className="text-center text-slate-400 mt-2 mb-6">Please confirm you want to cancel the following event:</p>
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-3">
                        <p className="font-semibold text-lg text-white">{booking.title}</p>
                        <div className="flex items-center gap-3 text-slate-300"><Calendar size={16} /><span>{format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}</span></div>
                        <div className="flex items-center gap-3 text-slate-300"><Clock size={16} /><span>{format(new Date(booking.start_time), 'HH:mm')}</span></div>
                    </div>
                    <button 
                        onClick={handleConfirmCancellation} 
                        disabled={isCancelling}
                        className="w-full mt-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                    >
                        {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                    </button>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto bg-slate-800 rounded-2xl shadow-2xl p-8">
                {renderContent()}
            </div>
        </div>
    );
};

export default CancellationPage;