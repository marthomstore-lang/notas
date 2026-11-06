import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import './Login.css';

export const Login = () => {
    const [rut, setRut] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const success = await login(rut, password);
        if (success) {
            navigate('/');
        } else {
            setError('Credenciales inválidas');
        }
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Solo permitimos números y K/k
        const val = e.target.value.replace(/[^0-9kK]/g, '');
        setRut(val);
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-logo">
                    <img src="/assets/logo.png" alt="Logo Liceo" style={{ width: '80%', height: 'auto' }} />
                </div>
                <h2>Liceo Pro</h2>
                <p>Gestión Académica Institucional</p>
                <form onSubmit={handleLogin}>
                    {error && (
                        <div style={{ 
                            background: '#fef2f2', 
                            color: '#ef4444', 
                            padding: '12px', 
                            borderRadius: '12px', 
                            marginBottom: '20px', 
                            fontSize: '0.85rem', 
                            fontWeight: '600',
                            border: '1px solid #fee2e2'
                        }}>
                            {error}
                        </div>
                    )}
                    <div className="input-group">
                        <UserIcon size={20} className="input-icon" />
                        <input 
                            type="text" 
                            placeholder="RUT de usuario (ej: 123456789)" 
                            value={rut} 
                            onChange={handleRutChange}
                            required 
                        />
                    </div>
                    <div className="input-group" style={{ position: 'relative' }}>
                        <Lock size={20} className="input-icon" />
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Contraseña" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                            style={{ paddingRight: '45px' }}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '5px'
                            }}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <button type="submit" className="login-btn">Acceder al Sistema</button>
                </form>
                <div className="login-footer">
                    &copy; 2026 Liceo Pro &bull; Plataforma Administrativa
                </div>
            </div>
        </div>
    );
};
