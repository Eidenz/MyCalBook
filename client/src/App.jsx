import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Pages
import CalendarView from './pages/CalendarView';
import Login from './pages/Login';
import Register from './pages/Register';
import Availability from './pages/Availability';
import EventTypes from './pages/EventTypes';
import BookingPage from './pages/BookingPage';
import Settings from './pages/Settings';
import CancellationPage from './pages/CancellationPage';
import UserProfilePage from './pages/UserProfilePage';

// Common Components
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/common/AppLayout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-900 text-white font-sans">
          <Routes>
            {/* Public Routes - these do not have the header */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="/cancel/:token" element={<CancellationPage />} />
            <Route path="/u/:username" element={<UserProfilePage />} />
            
            {/* Private Routes - wrapped in the AppLayout to get the header */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<CalendarView />} />
                <Route path="/availability" element={<Availability />} />
                <Route path="/event-types" element={<EventTypes />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;