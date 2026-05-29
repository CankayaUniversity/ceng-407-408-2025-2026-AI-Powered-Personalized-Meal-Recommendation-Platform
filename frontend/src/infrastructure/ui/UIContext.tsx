import React, { createContext, useContext, useState } from 'react';
import type { RecipeListItem } from '../../types';

type UIContextType = {
    isConsumptionOpen: boolean;
    consumptionInitialRecipe: RecipeListItem | null;
    openConsumption: (recipe?: RecipeListItem | null) => void;
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

const isConsumptionInitialRecipe = (value: unknown): value is RecipeListItem => {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as RecipeListItem).id === 'number' &&
        typeof (value as RecipeListItem).title === 'string' &&
        (value as RecipeListItem).title.trim().length > 0
    );
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConsumptionOpen, setIsConsumptionOpen] = useState(false);
    const [consumptionInitialRecipe, setConsumptionInitialRecipe] = useState<RecipeListItem | null>(null);
    const openConsumption = (recipe?: RecipeListItem | null) => {
        setConsumptionInitialRecipe(isConsumptionInitialRecipe(recipe) ? recipe : null);
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
