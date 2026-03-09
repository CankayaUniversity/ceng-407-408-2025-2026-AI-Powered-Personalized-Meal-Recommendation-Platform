import React, { useState } from 'react';
import { Search, Filter, Clock, Zap, Star, ChevronRight } from 'lucide-react';

const RecipeList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const recipes = [
    { id: 1, name: 'Akdeniz Salatası', category: 'Salata', calories: 250, time: '10 dk', rating: 4.8, image: '🥗' },
    { id: 2, name: 'Fırınlanmış Levrek', category: 'Deniz Ürünleri', calories: 420, time: '35 dk', rating: 4.9, image: '🐟' },
    { id: 3, name: 'Mercimek Köftesi', category: 'Atıştırmalık', calories: 310, time: '45 dk', rating: 4.7, image: '🧆' },
    { id: 4, name: 'Sebzeli Lazanya', category: 'Ana Yemek', calories: 580, time: '50 dk', rating: 4.6, image: '🍝' },
    { id: 5, name: 'Avokadolu Tost', category: 'Kahvaltı', calories: 340, time: '12 dk', rating: 4.5, image: '🥑' },
    { id: 6, name: 'Meyveli Yoğurt Kasesi', category: 'Tatlı', calories: 210, time: '5 dk', rating: 4.8, image: '🥣' },
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tarif Kütüphanesi</h1>
          <p className="text-gray-500 mt-1">Damak tadına uygun yüzlerce sağlıklı tarif.</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
             <Filter size={18} />
             Filtrele
           </button>
           <button className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100">
             Yeni Tarif Ekle
           </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text"
          placeholder="Tarif, malzeme veya kategori ara..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {['Hepsi', 'Ana Yemek', 'Kahvaltı', 'Salata', 'Tatlı', 'Atıştırmalık'].map((cat, i) => (
          <button 
            key={i}
            className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${
              i === 0 ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-100 hover:border-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="h-52 bg-orange-50 flex items-center justify-center text-6xl relative">
               {recipe.image}
               <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-orange-600 shadow-sm">
                 {recipe.category}
               </div>
               <button className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-md text-gray-400 hover:text-red-500 transition-colors">
                  <Star size={20} className={recipe.rating > 4.7 ? 'fill-yellow-500 text-yellow-500' : ''} />
               </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-500 transition-colors">{recipe.name}</h3>
                <div className="flex items-center gap-1 text-sm font-bold bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                  <Star size={14} className="fill-green-700" />
                  {recipe.rating}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  {recipe.time}
                </div>
                <div className="flex items-center gap-1 text-orange-600 font-semibold">
                  <Zap size={16} />
                  {recipe.calories} kcal
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Detayları Gör</span>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecipeList;
