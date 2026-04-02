import React, { createContext, useContext, useState } from 'react';

type UIContextType = {
    isConsumptionOpen: boolean;
    openConsumption: () => void;
    closeConsumption: () => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConsumptionOpen, setIsConsumptionOpen] = useState(false);
    const openConsumption = () => setIsConsumptionOpen(true);
    const closeConsumption = () => setIsConsumptionOpen(false);

    return (
        <UIContext.Provider value={{ isConsumptionOpen, openConsumption, closeConsumption }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a UIProvider');
    return context;
};
