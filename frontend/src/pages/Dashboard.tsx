import React from 'react';
import { useKeycloak } from '@react-keycloak/web';

const Dashboard: React.FC = () => {
  const { keycloak } = useKeycloak();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Panel (Dashboard)</h1>
      <p>Hoş geldiniz, {keycloak.tokenParsed?.preferred_username}!</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h2 className="font-semibold text-lg">Önerilen Tarifler</h2>
          <p className="text-gray-600">Bugün için 3 yeni tarifiniz var.</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h2 className="font-semibold text-lg">Günlük Kalori</h2>
          <p className="text-gray-600">1200 / 2000 kcal</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h2 className="font-semibold text-lg">Envanter Durumu</h2>
          <p className="text-gray-600">12 malzeme eksik.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
