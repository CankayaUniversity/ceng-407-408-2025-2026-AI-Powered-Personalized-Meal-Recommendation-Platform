import React from 'react';
import amblem from '../../assets/meal_amblem.png';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  const containerClasses = fullScreen 
    ? "fixed inset-0 bg-alabaster/90 dark:bg-espresso-midnight/90 backdrop-blur-md flex flex-col items-center justify-center z-[100]"
    : "flex flex-col items-center justify-center py-10 w-full";

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center justify-center">
        {/* Dış halka animasyonu */}
        <div className={`absolute border-4 border-terracotta/20 border-t-terracotta rounded-full animate-spin ${sizeClasses[size]}`} />
        
        {/* Logo */}
        <div className={`meal-brand-amblem-container spinner-amblem-box bg-transparent border-none shadow-none ${
          size === 'sm' ? 'w-5 h-5 p-1' : 
          size === 'md' ? 'w-10 h-10' : 
          size === 'lg' ? 'w-16 h-16' : 'w-20 h-20'
        }`}>
          <img src={amblem} alt="Loading..." className="meal-brand-amblem-img" />
        </div>
      </div>
      
      {message && (
        <p className="mt-6 text-sm font-bold tracking-[0.2em] text-espresso-midnight/40 dark:text-white/40 uppercase animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};
