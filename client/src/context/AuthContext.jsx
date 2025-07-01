import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const setAuthToken = (t) => {
        setToken(t);
        if (t) {
            localStorage.setItem('token', t);
        } else {
            localStorage.removeItem('token');
        }
    };

    const logout = () => {
        setAuthToken(null);
        setUser(null);
    };

    // A simple function to decode the token payload without a library
    const getUserFromToken = (t) => {
        if (!t) return null;
        try {
            const payload = JSON.parse(atob(t.split('.')[1]));
            return payload.user;
        } catch (e) {
            console.error("Failed to decode token:", e);
            logout(); // The token is invalid, so log out
            return null;
        }
    };

    useEffect(() => {
        if (token) {
            setUser(getUserFromToken(token));
        }
        setIsLoading(false);
    }, [token]);

    const value = {
        token,
        setAuthToken,
        user,
        isAuthenticated: !!token,
        isLoading,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};