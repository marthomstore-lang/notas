import React, { createContext, useContext } from 'react';

interface A11yContextType {
    a11yEnabled: boolean;
    enableA11y: () => void;
    disableA11y: () => void;
    speak: (text: string) => void;
}

const A11yContext = createContext<A11yContextType>({
    a11yEnabled: false,
    enableA11y: () => {},
    disableA11y: () => {},
    speak: () => {}
});

export const A11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Asistente de accesibilidad desactivado completamente
    return (
        <A11yContext.Provider value={{
            a11yEnabled: false,
            enableA11y: () => {},
            disableA11y: () => {},
            speak: () => {}
        }}>
            {children}
        </A11yContext.Provider>
    );
};

export const useA11y = () => {
    return useContext(A11yContext);
};
