import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';

export interface User {
    id: string;
    name: string;
    role: 'Admin' | 'Docente' | 'Visita';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (rut: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Clear any old local storage tokens
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        const savedToken = sessionStorage.getItem('token');
        const savedUser = sessionStorage.getItem('user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const login = async (rut: string, password: string): Promise<boolean> => {
        try {
            const res = await fetch('/_/backend/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rut, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                setToken(data.token);
                setUser(data.user);
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                return true;
            } else {
                // Mostrar alerta con el estado del error para diagnosticar problemas en Vercel
                alert(`Error en el servidor: HTTP ${res.status} ${res.statusText}\nRespuesta: ${JSON.stringify(data)}`);
                return false;
            }
        } catch (error: any) {
            console.error("Login failed", error);
            alert(`Error de red o conexión fallida: ${error.message}`);
            return false;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
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
