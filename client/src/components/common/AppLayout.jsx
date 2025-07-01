import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const AppLayout = () => {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
                {/* The Outlet component renders the matched child route element */}
                <Outlet />
            </main>
        </div>
    );
};

export default AppLayout;