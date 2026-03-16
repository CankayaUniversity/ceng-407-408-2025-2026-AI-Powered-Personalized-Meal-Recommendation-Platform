import React from 'react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { ChefHat, Zap, ShoppingBag, BrainCircuit, Star, ArrowRight, Play, ShieldCheck } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { login } = useAuth();

  const features = [
    {
      title: 'Yapay Zeka Destekli Öneriler',
      desc: 'Envanterindeki malzemelere göre senin için en uygun ve besleyici tarifleri saniyeler içinde oluşturur.',
      icon: <BrainCircuit className="text-orange-500" />,
      color: 'bg-orange-50'
    },
    {
      title: 'Akıllı Envanter Takibi',
      desc: 'Eldeki malzemeleri kolayca yönet, son kullanma tarihlerini takip et ve israfı önle.',
      icon: <ShoppingBag className="text-blue-500" />,
      color: 'bg-blue-50'
    },
    {
      title: 'Beslenme Analizi',
      desc: 'Günlük aldığın kaloriyi, protein, karbonhidrat ve yağ dengesini detaylı grafiklerle takip et.',
      icon: <Zap className="text-yellow-500" />,
      color: 'bg-yellow-50'
    },
    {
      title: 'Güvenli ve Kişisel',
      desc: 'Verilerin Keycloak ile en yüksek güvenlik standartlarında korunur, tamamen sana özel bir deneyim sunulur.',
      icon: <ShieldCheck className="text-green-500" />,
      color: 'bg-green-50'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar (Minimal) */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-2 rounded-xl">
            <ChefHat className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">AI Meal</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => login()}
            className="text-gray-600 font-semibold hover:text-gray-900 transition-colors"
          >
            Giriş Yap
          </button>
          <button 
            onClick={() => login()}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg"
          >
            Hemen Katıl
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="px-8 pt-16 pb-24 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8 animate-in slide-in-from-left duration-700">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 px-4 py-2 rounded-full text-orange-600 font-medium text-sm">
            <Star size={16} className="fill-orange-500" />
            <span>AI Destekli Kişisel Mutfak Asistanın</span>
          </div>
          <h1 className="text-6xl font-black text-gray-900 leading-[1.1]">
            Bugün Ne Pişireceğini <span className="text-orange-500 italic">Yapay Zeka</span> Karar Versin
          </h1>
          <p className="text-gray-500 text-xl leading-relaxed max-w-xl">
            Mutfaktaki malzemelerini gir, damak tadını seç ve AI Meal senin için en sağlıklı ve lezzetli tarifleri anında hazırlasın.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={() => login()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-2 group"
            >
              Hemen Ücretsiz Başla
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-gray-700 hover:bg-gray-50 transition-all">
              <div className="bg-white border border-gray-200 p-2 rounded-full shadow-sm text-orange-500">
                <Play size={16} fill="currentColor" />
              </div>
              Nasıl Çalışır?
            </button>
          </div>
          
          <div className="flex items-center gap-6 pt-8 border-t border-gray-100">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              <span className="font-bold text-gray-900">10,000+</span> kullanıcı tarafından seviliyor
            </div>
          </div>
        </div>

        {/* Visual Preview / Placeholder */}
        <div className="relative animate-in zoom-in duration-1000">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-orange-100 rounded-full blur-3xl opacity-50 -z-10"></div>
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10"></div>
          
          <div className="bg-gray-50 rounded-[2.5rem] p-4 border border-gray-200 shadow-2xl relative overflow-hidden group">
            <div className="bg-white rounded-[1.8rem] shadow-sm overflow-hidden aspect-[4/3] flex items-center justify-center relative">
               <img 
                 src="https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=800" 
                 alt="App Preview" 
                 className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
               <div className="absolute bottom-6 left-6 right-6">
                 <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl flex items-center justify-between">
                   <div>
                     <h4 className="font-bold text-gray-900">Özel Tavuk Sote</h4>
                     <p className="text-gray-500 text-xs flex items-center gap-1">
                       <Zap size={12} className="text-orange-500 fill-orange-500" />
                       345 kcal • 20 dk
                     </p>
                   </div>
                   <div className="bg-orange-500 text-white p-2 rounded-xl">
                     <ChefHat size={20} />
                   </div>
                 </div>
               </div>
            </div>
            {/* Floating UI Elements */}
            <div className="absolute top-12 -right-4 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 animate-bounce duration-[3000ms]">
               <div className="flex items-center gap-3">
                 <div className="bg-green-100 p-2 rounded-lg">
                   <Star size={18} className="text-green-600 fill-green-600" />
                 </div>
                 <div>
                   <p className="text-[10px] text-gray-400 font-medium">Günlük Puan</p>
                   <p className="text-sm font-bold text-gray-900">9.4/10</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="bg-gray-50 py-24 px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-gray-900">Mutfakta Yeni Bir Çağ</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Yemek yapma sürecini karmaşıklıktan kurtarıp keyifli bir deneyime dönüştürüyoruz.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                <div className={`${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6`}>
                  {React.cloneElement(feature.icon as React.ReactElement, { size: 28 })}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Numbers */}
      <section className="py-24 px-8 max-w-7xl mx-auto border-b border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <div>
            <p className="text-4xl font-black text-gray-900 mb-2">500+</p>
            <p className="text-gray-500 font-medium">Kayıtlı Tarif</p>
          </div>
          <div>
            <p className="text-4xl font-black text-gray-900 mb-2">12k</p>
            <p className="text-gray-500 font-medium">Mutlu Kullanıcı</p>
          </div>
          <div>
            <p className="text-4xl font-black text-gray-900 mb-2">99%</p>
            <p className="text-gray-500 font-medium">AI Doğruluğu</p>
          </div>
          <div>
            <p className="text-4xl font-black text-gray-900 mb-2">24/7</p>
            <p className="text-gray-500 font-medium">Akıllı Destek</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-gray-500 text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1.5 rounded-lg">
            <ChefHat size={18} className="text-gray-900" />
          </div>
          <span className="text-gray-900 font-bold">AI Meal platform</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-gray-900">Hakkımızda</a>
          <a href="#" className="hover:text-gray-900">Gizlilik</a>
          <a href="#" className="hover:text-gray-900">İletişim</a>
        </div>
        <p>© 2024 AI Powered Meal Platform. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
