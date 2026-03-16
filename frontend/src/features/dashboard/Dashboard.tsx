import React from 'react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { Utensils, Zap, TrendingUp, Clock, Star, Lock, ChefHat } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, authenticated, login } = useAuth();

  const stats = [
    { title: 'Günlük Kalori', value: authenticated ? '1,240 / 2,000' : '---', unit: 'kcal', icon: <Zap className="text-orange-500" />, trend: authenticated ? '+5%' : 'N/A', color: 'bg-orange-50' },
    { title: 'Kayıtlı Tarif', value: authenticated ? '24' : '---', unit: 'adet', icon: <Utensils className="text-blue-500" />, trend: authenticated ? '+2' : 'N/A', color: 'bg-blue-50' },
    { title: 'Haftalık Puan', value: authenticated ? '4.8' : '---', unit: 'yıldız', icon: <Star className="text-yellow-500" />, trend: authenticated ? 'Sabit' : 'N/A', color: 'bg-yellow-50' },
    { title: 'Aktiflik', value: authenticated ? '85' : '---', unit: '%', icon: <TrendingUp className="text-green-500" />, trend: authenticated ? '+12%' : 'N/A', color: 'bg-green-50' },
  ];

  const recentRecipes = [
    { id: 1, name: 'Izgara Somon', calories: 450, time: '25 dk', difficulty: 'Orta', rating: 4.9 },
    { id: 2, name: 'Kinoa Salatası', calories: 320, time: '15 dk', difficulty: 'Kolay', rating: 4.7 },
    { id: 3, name: 'Sebzeli Tavuk Sote', calories: 380, time: '30 dk', difficulty: 'Orta', rating: 4.5 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {authenticated ? `Hoş geldin, ${user?.firstName || 'Kullanıcı'}! 👋` : 'Panelinize Hoş Geldiniz!'}
          </h1>
          <p className="text-gray-500 mt-2">
            {authenticated 
              ? 'Bugün senin için hazırladığımız önerilere göz at.' 
              : 'Kişiselleştirilmiş deneyim için lütfen giriş yapın.'}
          </p>
        </div>
        {!authenticated && (
          <button 
            onClick={() => login()}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg"
          >
            Giriş Yap
          </button>
        )}
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
            {!authenticated && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                <Lock size={20} className="text-gray-400" />
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                {stat.icon}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              <span className="text-gray-500 text-xs">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Recipes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Popüler Tarifler</h2>
            <button className="text-orange-500 text-sm font-semibold hover:underline">Hepsini Gör</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentRecipes.slice(0, 2).map((recipe) => (
              <div key={recipe.id} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                <div className="h-48 bg-gray-200 relative">
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                      <span className="text-white font-bold text-lg">{recipe.name}</span>
                   </div>
                   <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      {recipe.rating}
                   </div>
                </div>
                <div className="p-4 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    {recipe.time}
                  </div>
                  <div className="flex items-center gap-1 text-orange-600 font-medium">
                    <Zap size={16} />
                    {recipe.calories} kcal
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {!authenticated && (
            <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2rem] flex flex-col items-center text-center space-y-4">
               <div className="bg-blue-100 p-4 rounded-full text-blue-600">
                 <ChefHat size={32} />
               </div>
               <h3 className="text-xl font-bold text-blue-900">Kendi Listenizi Oluşturun</h3>
               <p className="text-blue-700 max-w-md">
                 Favori tariflerinizi kaydetmek, envanterinizi yönetmek ve size özel öneriler almak için sisteme kayıt olmalısınız.
               </p>
               <button 
                 onClick={() => login()}
                 className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
               >
                 Hemen Katıl
               </button>
            </div>
          )}
        </div>

        {/* Action Card */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Hızlı İşlemler</h2>
          <div className="bg-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-200">
             <h3 className="text-xl font-bold mb-2">Hemen Öneri Al!</h3>
             <p className="text-orange-100 text-sm mb-6">Envanterindeki malzemelere göre yapay zeka senin için en iyi tarifi seçsin.</p>
             <button 
               onClick={() => !authenticated ? login() : undefined}
               className="w-full bg-white text-orange-600 py-3 rounded-xl font-bold hover:bg-orange-50 transition-colors"
             >
               {!authenticated ? 'Giriş Yap ve Başlat' : 'Sihirbazı Başlat'}
             </button>
          </div>
          
          {authenticated && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
               <h3 className="font-bold text-gray-900 mb-4">Beslenme Özeti</h3>
               <div className="space-y-4">
                 {[
                   { label: 'Protein', p: 75, color: 'bg-blue-500' },
                   { label: 'Karbonhidrat', p: 45, color: 'bg-orange-500' },
                   { label: 'Yağ', p: 30, color: 'bg-yellow-500' },
                 ].map((item, i) => (
                   <div key={i} className="space-y-1">
                     <div className="flex justify-between text-xs font-medium">
                       <span>{item.label}</span>
                       <span>%{item.p}</span>
                     </div>
                     <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                       <div className={`h-full ${item.color}`} style={{ width: `${item.p}%` }}></div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
          
          {!authenticated && (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl">
               <div className="flex items-center gap-3 mb-4">
                 <div className="bg-orange-500 p-2 rounded-lg">
                   <Star size={20} className="fill-white" />
                 </div>
                 <h3 className="font-bold">Premium Deneyim</h3>
               </div>
               <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                 Yapay zeka asistanımızla mutfakta harikalar yaratmaya hazır mısınız?
               </p>
               <ul className="space-y-3 mb-6 text-sm">
                 <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Sınırsız AI Öneri
                 </li>
                 <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    Beslenme Takibi
                 </li>
               </ul>
               <button 
                 onClick={() => login()}
                 className="w-full bg-white/10 hover:bg-white/20 border border-white/20 py-3 rounded-xl font-bold transition-all"
               >
                 Daha Fazla Bilgi
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
