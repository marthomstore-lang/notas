import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import './Login.css';
import { useA11y } from '../context/A11yContext';

export const Login = () => {
    const [rut, setRut] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const { a11yEnabled, enableA11y, speak } = useA11y();
    const [showA11yModal, setShowA11yModal] = useState(true);

    // Accesibilidad por voz
    React.useEffect(() => {
        if (showA11yModal && !a11yEnabled) {
            const announce = () => {
                const msg = new SpeechSynthesisUtterance();
                msg.text = "Bienvenido a Liceo Pro. ¿Desea activar las funciones de asistencia por voz para personas no videntes? Presione la tecla Enter para activar, o Escape para continuar sin asistencia.";
                msg.lang = 'es-ES';
                window.speechSynthesis.speak(msg);
            };
            const timer = setTimeout(announce, 500);
            return () => clearTimeout(timer);
        }
    }, [showA11yModal, a11yEnabled]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showA11yModal) {
                if (e.key === 'Enter') {
                    handleActivateA11y();
                } else if (e.key === 'Escape') {
                    setShowA11yModal(false);
                }
            }
            
            if (e.altKey && e.key.toLowerCase() === 'a') {
                handleActivateA11y();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showA11yModal]);

    const handleActivateA11y = () => {
        enableA11y();
        setShowA11yModal(false);
    };

    // Eco de Teclado: Narrar lo que se escribe
    const echoKey = (key: string, isPassword = false) => {
        if (!a11yEnabled) return;
        
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance();
        
        if (isPassword) {
            msg.text = "punto";
        } else {
            const keyMap: Record<string, string> = {
                '-': 'guion',
                ',': 'coma',
                '.': 'punto',
                'k': 'ka',
                'K': 'ka'
            };
            msg.text = keyMap[key] || key;
        }
        
        msg.lang = 'es-ES';
        msg.rate = 1.5;
        window.speechSynthesis.speak(msg);
    };

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
            {/* Modal de Accesibilidad */}
            {showA11yModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.9)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '24px',
                        maxWidth: '500px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ 
                            width: '64px', 
                            height: '64px', 
                            background: '#eff6ff', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            color: '#3b82f6'
                        }}>
                            <UserIcon size={32} />
                        </div>
                        <h2 style={{ color: '#1e293b', marginBottom: '15px', fontSize: '1.5rem' }}>Asistente de Accesibilidad</h2>
                        <p style={{ color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
                            ¿Desea activar las funciones de asistencia por voz y navegación simplificada para personas no videntes?
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button 
                                onClick={handleActivateA11y}
                                className="primary-btn"
                                style={{ background: '#3b82f6', padding: '12px 25px' }}
                            >
                                Sí, activar (Enter)
                            </button>
                            <button 
                                onClick={() => setShowA11yModal(false)}
                                style={{ 
                                    background: '#f1f5f9', 
                                    border: 'none', 
                                    padding: '12px 25px', 
                                    borderRadius: '12px',
                                    color: '#475569',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                No, gracias (Esc)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Botón de accesibilidad invisible pero enfocable */}
            <button 
                onClick={handleActivateA11y}
                style={{ 
                    position: 'absolute', 
                    top: '-100px', 
                    left: '0', 
                    padding: '10px', 
                    background: '#1e293b', 
                    color: 'white', 
                    zIndex: 10000 
                }}
                onFocus={(e) => e.target.style.top = '0'}
                onBlur={(e) => e.target.style.top = '-100px'}
            >
                Asistente de Accesibilidad para Personas No Videntes
            </button>
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
                            placeholder="RUT de usuario (ej: 18803735)" 
                            value={rut} 
                            onChange={handleRutChange}
                            required 
                            onFocus={() => speak("Campo R U T. Ingrese su número de identidad.")}
                            onKeyDown={(e) => {
                                if (e.key.length === 1) echoKey(e.key);
                            }}
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
                            onFocus={() => speak("Campo contraseña. Ingrese su clave.")}
                            onKeyDown={(e) => {
                                if (e.key.length === 1) echoKey(e.key, true);
                            }}
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
                    <button type="submit" className="login-btn" onFocus={() => speak("Botón. Acceder al sistema.")}>Acceder al Sistema</button>
                </form>
                <div className="login-footer">
                    &copy; 2026 Liceo Pro &bull; Plataforma Administrativa
                </div>
            </div>
        </div>
    );
};
