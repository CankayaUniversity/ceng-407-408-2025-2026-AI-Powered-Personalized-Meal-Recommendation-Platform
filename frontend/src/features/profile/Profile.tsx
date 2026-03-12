import React, { useEffect, useState } from 'react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { User as UserIcon, Mail, Shield, Bell, Settings, LogOut, Camera, ChevronRight, Loader2 } from 'lucide-react';
import { useUserService } from '../../services/userService';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const userService = useUserService();
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [isSynced, setIsMounted] = useState(false); // Senkronizasyon kontrolü için bayrak

  useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      // Eğer kullanıcı ID'si varsa ve henüz senkronize edilmediyse çalış
      if (user?.id && !dbUser && !isSynced) {
        setLoading(true);
        try {
          const response = await userService.upsertUser({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          });
          
          if (mounted) {
            setDbUser(response.data);
            setIsMounted(true); // Başarılı olduktan sonra bayrağı kaldır
          }
        } catch (error: any) {
          // 409 (Conflict) hatası, e-posta çakışması veya ID uyuşmazlığı durumunda gelebilir.
          // Backend artık bu durumu ele alıyor (silip yeniden oluşturuyor), 
          // ancak bir yarış durumu (race condition) veya geçici hata durumunda döngüyü kırmalıyız.
          if (error.response?.status === 409 || error.response?.status === 401) {
             console.warn("User sync handled non-critical error:", error.response?.status);
             setIsMounted(true); 
          } else {
             console.error("User sync error:", error);
          }
        } finally {
          if (mounted) setLoading(false);
        }
      }
    };

    syncUser();
    return () => { mounted = false; };
  }, [user?.id, userService, dbUser, isSynced]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profil Ayarları</h1>
          <p className="text-gray-500 mt-1">Kişisel bilgilerinizi ve uygulama tercihlerini yönetin.</p>
        </div>
        {loading && <Loader2 className="animate-spin text-orange-500" size={24} />}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Info */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-orange-500"></div>
            <div className="relative">
               <div className="w-32 h-32 bg-white rounded-full mx-auto p-1 shadow-lg border-4 border-white">
                  <div className="w-full h-full bg-orange-100 rounded-full flex items-center justify-center text-4xl text-orange-500 font-bold">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </div>
               </div>
               <button className="absolute bottom-0 right-1/2 translate-x-16 p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-orange-500 transition-colors">
                  <Camera size={18} />
               </button>
            </div>
            <div className="mt-4">
               <h2 className="text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
               <p className="text-gray-500 text-sm">@{user?.username}</p>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-50 flex justify-around">
               <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {dbUser?.dailyCalorieTarget || '0'}
                  </div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Hedef Kalori</div>
               </div>
               <div className="border-l border-gray-100"></div>
               <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">4.9</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Puanım</div>
               </div>
            </div>
          </div>

          <button 
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors"
          >
            <LogOut size={20} />
            Oturumu Kapat
          </button>
        </div>

        {/* Right Column: Settings Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Section */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                 <UserIcon size={20} />
              </div>
              <h3 className="font-bold text-gray-900">Kişisel Bilgiler</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Adınız</label>
                <div className="p-3 bg-gray-50 rounded-xl text-gray-700 font-medium border border-transparent">
                   {user?.firstName}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Soyadınız</label>
                <div className="p-3 bg-gray-50 rounded-xl text-gray-700 font-medium border border-transparent">
                   {user?.lastName}
                </div>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">E-posta Adresi</label>
                <div className="p-3 bg-gray-50 rounded-xl text-gray-700 font-medium flex items-center gap-3 opacity-70">
                   <Mail size={18} className="text-gray-400" />
                   {user?.email}
                </div>
              </div>
              {dbUser?.id && (
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sistem Kayıt ID</label>
                  <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 font-mono break-all">
                    {user?.id}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Preferences & Security */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50">
             {[
               { icon: <Shield size={20} className="text-green-500" />, title: 'Güvenlik', desc: 'Şifre ve iki faktörlü doğrulama', color: 'bg-green-50' },
               { icon: <Bell size={20} className="text-purple-500" />, title: 'Bildirimler', desc: 'Yemek saati ve yeni tarif uyarıları', color: 'bg-purple-50' },
               { icon: <Settings size={20} className="text-gray-500" />, title: 'Hesap Tercihleri', desc: 'Dil, bölge ve veri kullanımı', color: 'bg-gray-50' },
             ].map((item, i) => (
               <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors group">
                 <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-2xl ${item.color}`}>
                     {item.icon}
                   </div>
                   <div>
                     <h4 className="font-bold text-gray-900">{item.title}</h4>
                     <p className="text-sm text-gray-500">{item.desc}</p>
                   </div>
                 </div>
                 <ChevronRight size={20} className="text-gray-300 group-hover:text-orange-500 transition-colors" />
               </div>
             ))}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
