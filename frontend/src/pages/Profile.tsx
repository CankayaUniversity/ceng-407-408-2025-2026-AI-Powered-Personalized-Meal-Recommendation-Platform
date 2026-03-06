import React from 'react';
import { useKeycloak } from '@react-keycloak/web';

const Profile: React.FC = () => {
  const { keycloak } = useKeycloak();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Profil</h1>
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Kullanıcı Bilgileri</h2>
        <div className="space-y-2">
          <p><span className="font-medium text-gray-700">Kullanıcı Adı:</span> {keycloak.tokenParsed?.preferred_username}</p>
          <p><span className="font-medium text-gray-700">E-posta:</span> {keycloak.tokenParsed?.email}</p>
          <p><span className="font-medium text-gray-700">Ad Soyad:</span> {keycloak.tokenParsed?.given_name} {keycloak.tokenParsed?.family_name}</p>
        </div>
        <button 
          onClick={() => keycloak.logout()}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};

export default Profile;
