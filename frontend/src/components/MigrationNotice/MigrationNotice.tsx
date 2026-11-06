import React, { useState, useEffect, useRef } from 'react';
import { Rocket, ExternalLink, ArrowRight, Pause, Play, Sparkles, School } from 'lucide-react';
import './MigrationNotice.css';

interface MigrationNoticeProps {
    targetUrl?: string;
    initialSeconds?: number;
    bannerImage?: string;
}

export const MigrationNotice: React.FC<MigrationNoticeProps> = ({
    targetUrl = 'https://ltp-v2.vercel.app/',
    initialSeconds = 10,
    bannerImage = '/assets/migration-banner.png'
}) => {
    const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [imageError, setImageError] = useState<boolean>(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isPaused) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        if (secondsLeft <= 0) {
            window.location.href = targetUrl;
            return;
        }

        timerRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    window.location.href = targetUrl;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, secondsLeft, targetUrl]);

    const handleRedirectNow = () => {
        window.location.href = targetUrl;
    };

    const togglePause = () => {
        setIsPaused((prev) => !prev);
    };

    const progressPercentage = ((initialSeconds - secondsLeft) / initialSeconds) * 100;

    return (
        <div className="migration-overlay" role="dialog" aria-modal="true">
            <div className="migration-card">
                {/* Header decorativo con logo o imagen */}
                <div className="migration-banner-wrapper">
                    {!imageError && bannerImage ? (
                        <img 
                            src={bannerImage} 
                            alt="Nos Mudamos" 
                            className="migration-hero-image"
                            onError={() => setImageError(true)} 
                        />
                    ) : (
                        <div className="migration-fallback-hero">
                            <div className="fallback-glow-circle">
                                <Rocket className="fallback-rocket-icon" size={64} />
                            </div>
                            <Sparkles className="sparkle-float-1" size={24} />
                            <Sparkles className="sparkle-float-2" size={20} />
                        </div>
                    )}
                    <div className="migration-school-pill">
                        <img src="/assets/logo.png" alt="Logo Colegio" className="pill-school-logo" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                        <span>LICEO T.P. CAMPANARIO</span>
                    </div>
                </div>

                {/* Contenido principal */}
                <div className="migration-body">
                    <div className="migration-badge">
                        <Rocket size={16} />
                        <span>¡NUEVA PLATAFORMA OFICIAL!</span>
                    </div>

                    <h1 className="migration-title">¡Nos hemos mudado!</h1>

                    <p className="migration-description">
                        Estimada comunidad educativa: nos hemos trasladado a una nueva versión más moderna, rápida y con nuevas funciones para la gestión académica.
                    </p>

                    <div className="migration-url-box">
                        <span className="url-label">Nueva dirección web:</span>
                        <a href={targetUrl} className="url-link" target="_self">
                            {targetUrl}
                            <ExternalLink size={15} />
                        </a>
                    </div>

                    {/* Cuenta regresiva interactiva */}
                    <div className="countdown-section">
                        <div className="countdown-ring-container">
                            <div className={`countdown-number-bubble ${secondsLeft <= 2 ? 'pulse-urgent' : ''}`}>
                                <span className="countdown-digits">{secondsLeft}</span>
                                <span className="countdown-unit">seg</span>
                            </div>
                        </div>

                        <div className="countdown-text-group">
                            <p className="countdown-status">
                                {isPaused ? (
                                    <span className="status-paused">Redirección en pausa (modo prueba)</span>
                                ) : (
                                    <span>Redirigiendo automáticamente en <strong>{secondsLeft}</strong> segundo{secondsLeft === 1 ? '' : 's'}...</span>
                                )}
                            </p>
                            <div className="countdown-progress-track">
                                <div 
                                    className="countdown-progress-fill" 
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="migration-actions">
                        <button 
                            type="button" 
                            className="btn-redirect-now"
                            onClick={handleRedirectNow}
                        >
                            <span>Ir a la nueva plataforma ahora</span>
                            <ArrowRight size={18} />
                        </button>

                        <button 
                            type="button" 
                            className={`btn-toggle-pause ${isPaused ? 'is-paused' : ''}`}
                            onClick={togglePause}
                            title="Pausar o reanudar el contador para revisar la pantalla de prueba"
                        >
                            {isPaused ? (
                                <>
                                    <Play size={16} />
                                    <span>Reanudar redirección (10s)</span>
                                </>
                            ) : (
                                <>
                                    <Pause size={16} />
                                    <span>Pausar para revisar</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="migration-footer-note">
                        <School size={14} />
                        <span>Liceo Técnico Profesional Campanario · Sistema de Gestión Escolar</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
