import React, { createContext, useContext, useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface A11yContextType {
    a11yEnabled: boolean;
    enableA11y: () => void;
    disableA11y: () => void;
    speak: (text: string) => void;
}

const A11yContext = createContext<A11yContextType | undefined>(undefined);

export const A11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [a11yEnabled, setA11yEnabled] = useState(false);

    const speak = (text: string) => {
        if (!a11yEnabled) return;
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance();
        msg.text = text;
        msg.lang = 'es-ES';
        msg.rate = 1.2;
        window.speechSynthesis.speak(msg);
    };

    const enableA11y = () => {
        setA11yEnabled(true);
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance();
        msg.text = "Modo de asistencia activado. Escaneando ventana actual.";
        msg.lang = 'es-ES';
        window.speechSynthesis.speak(msg);
        
        // Pequeño delay para que no se pisen los mensajes
        setTimeout(() => {
            const allText = Array.from(document.querySelectorAll('h1, h2, p, label, button, input'))
                .map(el => {
                    if (el.tagName === 'INPUT') return (el as HTMLInputElement).placeholder;
                    return el.textContent;
                })
                .filter(txt => txt && txt.length > 0)
                .join('. ');
            speak("Contenido de la ventana: " + allText);
        }, 1500);
    };

    const disableA11y = () => {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance();
        msg.text = "Asistencia de voz desactivada.";
        msg.lang = 'es-ES';
        window.speechSynthesis.speak(msg);
        setA11yEnabled(false);
    };

    const toggleA11y = () => {
        if (a11yEnabled) disableA11y();
        else enableA11y();
    };

    useEffect(() => {
        if (!a11yEnabled) return;

        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // Intentar obtener texto descriptivo
            const label = target.getAttribute('aria-label') || 
                          target.getAttribute('title') || 
                          (target as HTMLButtonElement).innerText || 
                          (target as HTMLInputElement).placeholder ||
                          target.textContent;

            if (label) {
                // Si es un botón, avisar que es un botón
                let prefix = "";
                if (target.tagName === 'BUTTON') prefix = "Botón ";
                if (target.tagName === 'INPUT') prefix = "Campo ";
                if (target.tagName === 'A') prefix = "Enlace ";

                speak(`${prefix} ${label}`);
            }
        };

        window.addEventListener('focusin', handleFocus);
        return () => window.removeEventListener('focusin', handleFocus);
    }, [a11yEnabled]);

    return (
        <A11yContext.Provider value={{ a11yEnabled, enableA11y, disableA11y, speak }}>
            {children}
            {/* Botón Flotante de Accesibilidad */}
            <button 
                onClick={toggleA11y}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: a11yEnabled ? '#3b82f6' : '#94a3b8',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20000,
                    transition: 'all 0.3s ease'
                }}
                title={a11yEnabled ? "Desactivar Narrador" : "Activar Narrador"}
                aria-label={a11yEnabled ? "Desactivar Narrador de voz" : "Activar Narrador de voz"}
            >
                {a11yEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
        </A11yContext.Provider>
    );
};

export const useA11y = () => {
    const context = useContext(A11yContext);
    if (context === undefined) {
        throw new Error('useA11y must be used within an A11yProvider');
    }
    return context;
};
