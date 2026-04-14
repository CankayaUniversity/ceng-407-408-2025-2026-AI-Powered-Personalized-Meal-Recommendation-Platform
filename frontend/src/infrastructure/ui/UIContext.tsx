import React, { createContext, useContext, useState } from 'react';

type UIContextType = {
    isConsumptionOpen: boolean;
    openConsumption: () => void;
    closeConsumption: () => void;
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    isUnitConverterOpen: boolean;
    openUnitConverter: () => void;
    closeUnitConverter: () => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConsumptionOpen, setIsConsumptionOpen] = useState(false);
    const openConsumption = () => setIsConsumptionOpen(true);
    const closeConsumption = () => setIsConsumptionOpen(false);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);

    const [isUnitConverterOpen, setIsUnitConverterOpen] = useState(false);
    const openUnitConverter = () => setIsUnitConverterOpen(true);
    const closeUnitConverter = () => setIsUnitConverterOpen(false);

    return (
        <UIContext.Provider value={{ 
            isConsumptionOpen, openConsumption, closeConsumption,
            isSettingsOpen, openSettings, closeSettings,
            isUnitConverterOpen, openUnitConverter, closeUnitConverter
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a UIProvider');
    return context;
};
