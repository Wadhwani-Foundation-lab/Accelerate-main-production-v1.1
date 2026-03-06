import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

interface User {
    id: string;
    email?: string;
    user_metadata?: {
        full_name?: string;
        role?: string;
    };
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<User | null>;
    signUp: (email: string, password: string, fullName: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in (has access token)
        const token = localStorage.getItem('access_token');
        if (token) {
            // Fetch user profile
            api.getMe()
                .then(({ profile }) => {
                    setUser({
                        id: profile.id || '',
                        email: profile.email,
                        user_metadata: {
                            full_name: profile.full_name,
                            role: profile.role,
                        },
                    });
                })
                .catch((error) => {
                    console.error('Failed to fetch user:', error);
                    // Clear invalid token
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const signIn = async (email: string, password: string): Promise<User | null> => {
        const { user: apiUser, session } = await api.login(email, password);

        // Store tokens if session exists
        if (session) {
            localStorage.setItem('access_token', session.access_token);
            localStorage.setItem('refresh_token', session.refresh_token);
        }

        // Set user state
        setUser(apiUser);
        return apiUser;
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        const { user: apiUser, session } = await api.signup({
            email,
            password,
            full_name: fullName,
            role: 'entrepreneur', // Default role
        });

        // Store tokens if session exists
        if (session) {
            localStorage.setItem('access_token', session.access_token);
            localStorage.setItem('refresh_token', session.refresh_token);
        }

        // Set user state
        setUser(apiUser);
    };

    const signOut = async () => {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear tokens and user state
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
