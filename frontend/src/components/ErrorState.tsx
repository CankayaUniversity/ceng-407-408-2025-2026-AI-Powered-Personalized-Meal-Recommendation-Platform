import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Bir Hata Oluştu',
  message,
  onRetry,
  fullScreen = false
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 p-4 bg-red-50 rounded-full">
        <AlertCircle className="w-12 h-12 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
        >
          Tekrar Dene
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};
