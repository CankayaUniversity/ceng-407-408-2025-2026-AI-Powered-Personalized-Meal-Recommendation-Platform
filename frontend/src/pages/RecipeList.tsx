import React from 'react';

const RecipeList: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Tarif Listesi</h1>
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <p className="text-gray-600">Henüz bir tarif bulunamadı. Tariflerinizi burada görebilirsiniz.</p>
      </div>
    </div>
  );
};

export default RecipeList;
