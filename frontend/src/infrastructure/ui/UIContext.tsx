import React, { createContext, useContext, useState } from 'react';

type UIContextType = {
    isConsumptionOpen: boolean;
    consumptionInitialRecipe: any | null;
    openConsumption: (recipe?: any) => void;
    closeConsumption: () => void;
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    isUnitConverterOpen: boolean;
    openUnitConverter: () => void;
    closeUnitConverter: () => void;
    isRecipeModalOpen: boolean;
    recipeToEdit: any | null;
    openRecipeModal: (recipe?: any) => void;
    closeRecipeModal: () => void;
    isRecipeViewOpen: boolean;
    recipeToView: any | null;
    viewRecipe: (recipe: any) => void;
    closeRecipeView: () => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConsumptionOpen, setIsConsumptionOpen] = useState(false);
    const [consumptionInitialRecipe, setConsumptionInitialRecipe] = useState<any | null>(null);
    const openConsumption = (recipe?: any) => {
        setConsumptionInitialRecipe(recipe || null);
        setIsConsumptionOpen(true);
    };
    const closeConsumption = () => {
        setIsConsumptionOpen(false);
        setConsumptionInitialRecipe(null);
    };

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);

    const [isUnitConverterOpen, setIsUnitConverterOpen] = useState(false);
    const openUnitConverter = () => setIsUnitConverterOpen(true);
    const closeUnitConverter = () => setIsUnitConverterOpen(false);

    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [recipeToEdit, setRecipeToEdit] = useState<any | null>(null);
    const openRecipeModal = (recipe?: any) => {
        setRecipeToEdit(recipe || null);
        setIsRecipeModalOpen(true);
    };
    const closeRecipeModal = () => {
        setIsRecipeModalOpen(false);
        setRecipeToEdit(null);
    };

    const [isRecipeViewOpen, setIsRecipeViewOpen] = useState(false);
    const [recipeToView, setRecipeToView] = useState<any | null>(null);
    const viewRecipe = (recipe: any) => {
        setRecipeToView(recipe);
        setIsRecipeViewOpen(true);
    };
    const closeRecipeView = () => {
        setIsRecipeViewOpen(false);
        setRecipeToView(null);
    };

    return (
        <UIContext.Provider value={{ 
            isConsumptionOpen, consumptionInitialRecipe, openConsumption, closeConsumption,
            isSettingsOpen, openSettings, closeSettings,
            isUnitConverterOpen, openUnitConverter, closeUnitConverter,
            isRecipeModalOpen, recipeToEdit, openRecipeModal, closeRecipeModal,
            isRecipeViewOpen, recipeToView, viewRecipe, closeRecipeView
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
