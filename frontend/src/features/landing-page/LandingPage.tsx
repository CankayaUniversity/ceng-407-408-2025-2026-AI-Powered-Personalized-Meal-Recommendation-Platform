import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useTheme } from '../../infrastructure/theme/ThemeContext';
import { ChefHat, Target, BrainCircuit, Star, Play, ShieldCheck, Activity, Wind, Heart, Clock, Sun, Moon, Languages } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { login, register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(newLang);
  };

  const features = [
    {
      title: t('landing.features.items.ai.title'),
      desc: t('landing.features.items.ai.desc'),
      icon: <BrainCircuit className="text-terracotta" />,
      color: 'bg-terracotta/10'
    },
    {
      title: t('landing.features.items.clinical.title'),
      desc: t('landing.features.items.clinical.desc'),
      icon: <ShieldCheck className="text-moss-sage" />,
      color: 'bg-moss-sage/10'
    },
    {
      title: t('landing.features.items.gourmet.title'),
      desc: t('landing.features.items.gourmet.desc'),
      icon: <Activity className="text-ochre-soft" />,
      color: 'bg-ochre-soft/10'
    },
    {
      title: t('landing.features.items.inventory.title'),
      desc: t('landing.features.items.inventory.desc'),
      icon: <Wind className="text-moss-forest" />,
      color: 'bg-moss-forest/10'
    }
  ];

  return (
    <div className="min-h-screen bg-alabaster dark:bg-[#1A1817] transition-colors duration-500 font-sans selection:bg-terracotta/20">
      {/* Navbar (Minimal & Elegant) */}
      <nav className="flex items-center justify-between px-10 py-8 max-w-7xl mx-auto relative z-50">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="bg-terracotta p-2.5 rounded-2xl shadow-xl shadow-terracotta/20 transition-transform group-hover:scale-110">
            <ChefHat className="text-white" size={26} strokeWidth={1.5} />
          </div>
          <span className="text-2xl font-serif font-bold tracking-tight text-espresso-midnight dark:text-white">Chef AI</span>
        </div>
        <div className="flex items-center gap-8">
          {/* Language Toggle Button */}
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/50 dark:bg-white/5 border border-espresso-midnight/5 dark:border-white/10 text-espresso-midnight dark:text-alabaster hover:text-terracotta dark:hover:text-terracotta transition-all shadow-sm"
            aria-label="Toggle Language"
          >
            <Languages size={20} strokeWidth={1.5} />
            <span className="text-xs font-black uppercase tracking-widest leading-none">
              {i18n.language.startsWith('tr') ? 'TR' : 'EN'}
            </span>
          </button>

          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-2xl bg-white/50 dark:bg-white/5 border border-espresso-midnight/5 dark:border-white/10 text-espresso-midnight dark:text-alabaster hover:text-terracotta dark:hover:text-terracotta transition-all shadow-sm"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
          </button>
          
          <button 
            onClick={() => login()}
            className="text-espresso-midnight/60 dark:text-alabaster/60 font-bold hover:text-terracotta dark:hover:text-terracotta transition-colors text-sm uppercase tracking-widest"
          >
            {t('landing.nav.login')}
          </button>
          <button 
            onClick={() => register()}
            className="bg-espresso-midnight dark:bg-terracotta text-white px-8 py-3.5 rounded-2xl font-bold hover:scale-105 transition-all shadow-2xl shadow-black/10 dark:shadow-terracotta/20 text-sm"
          >
            {t('landing.nav.join')}
          </button>
        </div>
      </nav>

      {/* Hero Section - The "Digital Private Chef" Experience */}
      <header className="px-10 pt-12 pb-32 max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative">
        <div className="space-y-10 animate-in fade-in slide-in-from-left duration-1000">
          <div className="inline-flex items-center gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-espresso-midnight/5 dark:border-white/10 px-5 py-2.5 rounded-full text-moss-forest dark:text-moss-sage font-bold text-xs uppercase tracking-[0.2em]">
            <Star size={14} className="fill-ochre-soft text-ochre-soft" />
            <span>{t('landing.hero.badge')}</span>
          </div>
          
          <h1 className="text-7xl font-serif font-bold text-espresso-midnight dark:text-white leading-[1.05]">
            {t('landing.hero.title').split(t('landing.hero.title_italic'))[0]}
            <span className="text-terracotta italic font-normal">{t('landing.hero.title_italic')}</span>
            {t('landing.hero.title').split(t('landing.hero.title_italic'))[1]}
          </h1>
          
          <p className="text-espresso-midnight/60 dark:text-alabaster/60 text-xl leading-relaxed max-w-xl font-medium italic border-l-4 border-terracotta/20 pl-6">
            {t('landing.hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 pt-4">
            <button 
              onClick={() => register()}
              className="bg-terracotta hover:bg-terracotta-spiced text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all shadow-2xl shadow-terracotta/30 flex items-center justify-center gap-3 group"
            >
              {t('landing.hero.cta_start')}
              <Target size={22} className="group-hover:rotate-45 transition-transform" />
            </button>
            <button className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg text-espresso-midnight dark:text-alabaster hover:bg-white/50 dark:hover:bg-white/5 transition-all glass-card border-none">
              <div className="bg-terracotta/10 p-2 rounded-full text-terracotta">
                <Play size={18} fill="currentColor" />
              </div>
              {t('landing.hero.cta_manifesto')}
            </button>
          </div>
          
          <div className="flex items-center gap-8 pt-10 border-t border-espresso-midnight/5 dark:border-white/5">
             <div className="flex -space-x-4">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="w-12 h-12 rounded-full border-4 border-alabaster dark:border-[#1A1817] bg-espresso-midnight overflow-hidden shadow-lg">
                   <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="User" />
                 </div>
               ))}
             </div>
             <div className="text-sm font-medium text-espresso-midnight/40 dark:text-alabaster/40">
               <span className="font-black text-espresso-midnight dark:text-white text-lg block tracking-tight">{t('landing.hero.users_count')}</span>
               {t('landing.hero.users_label')}
             </div>
          </div>
        </div>

        {/* Visual Preview - Bento Grid Style Preview */}
        <div className="relative animate-in zoom-in fade-in duration-1000">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-terracotta/10 rounded-full blur-[120px] -z-10" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-moss-sage/10 rounded-full blur-[120px] -z-10" />
          
          <div className="glass-card p-6 rounded-[3.5rem] shadow-2xl relative overflow-hidden group border-white/40 dark:border-white/5">
             <div className="rounded-[2.5rem] overflow-hidden aspect-[4/5] relative">
                <img 
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000" 
                  alt="App Interface" 
                  className="object-cover w-full h-full transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-espresso-midnight/60 via-transparent to-transparent"></div>
                
                {/* Floatings Elements */}
                <div className="absolute top-6 left-6 glass-card p-4 rounded-3xl animate-bounce duration-[3000ms]">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-terracotta rounded-xl flex items-center justify-center text-white">
                         <Activity size={16} />
                      </div>
                      <div className="pr-2">
                         <p className="text-[10px] uppercase font-black text-white/50 tracking-tighter">Match Score</p>
                         <p className="text-sm font-bold text-white">98% Perfect</p>
                      </div>
                   </div>
                </div>

                <div className="absolute bottom-8 left-8 right-8">
                   <div className="glass-card p-6 rounded-3xl backdrop-blur-xl border-white/20">
                      <h4 className="font-serif text-xl font-bold text-white mb-2">Roasted Mediterranean Salmon</h4>
                      <div className="flex gap-2">
                         <span className="medical-badge bg-white/10 text-white border-white/20">Keto</span>
                         <span className="medical-badge bg-white/10 text-white border-white/20">Protein Focus</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Bento Grid Features */}
      <section className="bg-white/30 dark:bg-white/[0.02] py-32 px-10">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="max-w-3xl space-y-6">
            <h2 className="text-5xl font-serif font-bold text-espresso-midnight dark:text-white tracking-tight">
              {t('landing.features.title').split(t('landing.features.title_highlight'))[0]}
              <span className="text-moss-sage italic font-normal text-4xl">{t('landing.features.title_highlight')}</span>
              {t('landing.features.title').split(t('landing.features.title_highlight'))[1]}
            </h2>
            <p className="text-espresso-midnight/50 dark:text-alabaster/40 text-lg font-medium leading-relaxed italic">
              {t('landing.features.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className={`glass-card p-10 rounded-5xl border-white/40 dark:border-white/5 transition-all hover:-translate-y-2 group ${i === 0 || i === 3 ? 'md:col-span-1' : 'md:col-span-1'}`}>
                <div className={`${feature.color} w-16 h-16 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform`}>
                  {React.cloneElement(feature.icon as React.ReactElement, { size: 32, strokeWidth: 1.5 })}
                </div>
                <h3 className="text-2xl font-serif font-bold text-espresso-midnight dark:text-white mb-4 leading-tight">{feature.title}</h3>
                <p className="text-espresso-midnight/50 dark:text-alabaster/50 leading-relaxed text-sm font-medium italic">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Precision Section (Stats) */}
      <section className="py-32 px-10 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-16">
          {[
            { label: t('landing.stats.recipes'), val: '50k+', icon: <ChefHat className="text-terracotta" /> },
            { label: t('landing.stats.members'), val: '12k', icon: <Heart className="text-moss-sage" /> },
            { label: t('landing.stats.accuracy'), val: '99%', icon: <Activity className="text-ochre-soft" /> },
            { label: t('landing.stats.speed'), val: '< 2sn', icon: <Clock className="text-moss-forest" /> },
          ].map((stat, i) => (
            <div key={i} className="space-y-4 border-l border-espresso-midnight/5 dark:border-white/5 pl-8">
              <div className="flex items-center gap-3 text-espresso-midnight/30 dark:text-alabaster/20 uppercase tracking-widest text-[10px] font-black">
                {stat.icon}
                {stat.label}
              </div>
              <p className="text-6xl font-serif font-bold text-espresso-midnight dark:text-white leading-none">{stat.val}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-10 pb-32 max-w-7xl mx-auto">
         <div className="bg-espresso-midnight rounded-[4rem] p-20 text-center space-y-12 relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
               <div className="absolute top-10 left-10 w-96 h-96 bg-terracotta rounded-full blur-[150px]" />
               <div className="absolute bottom-10 right-10 w-96 h-96 bg-moss-forest rounded-full blur-[150px]" />
            </div>
            
            <div className="relative z-10 space-y-6">
               <h2 className="text-5xl md:text-7xl font-serif font-bold text-white max-w-4xl mx-auto leading-tight">
                  {t('landing.cta.title')}
               </h2>
               <p className="text-alabaster/40 text-xl max-w-2xl mx-auto italic font-medium">
                  {t('landing.cta.subtitle')}
               </p>
            </div>
            
            <button 
              onClick={() => login()}
              className="relative z-10 bg-terracotta text-white px-16 py-6 rounded-3xl font-bold text-xl hover:scale-105 transition-all shadow-2xl shadow-terracotta/40"
            >
              {t('landing.cta.button')}
            </button>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 text-espresso-midnight/40 dark:text-alabaster/20 text-[10px] font-black uppercase tracking-[0.3em]">
        <div className="flex items-center gap-4">
          <div className="bg-espresso-midnight/5 dark:bg-white/5 p-2 rounded-xl transition-colors hover:bg-terracotta/10">
            <ChefHat size={20} className="text-espresso-midnight dark:text-white" />
          </div>
          <span className="text-espresso-midnight dark:text-white text-lg font-serif normal-case tracking-tight font-bold">Chef AI Platform</span>
        </div>
        <div className="flex gap-12">
          <a href="#" className="hover:text-terracotta transition-colors">{t('landing.footer.manifesto')}</a>
          <a href="#" className="hover:text-terracotta transition-colors">{t('landing.footer.privacy')}</a>
          <a href="#" className="hover:text-terracotta transition-colors">{t('landing.footer.connect')}</a>
        </div>
        <p>{t('landing.footer.rights')}</p>
      </footer>
    </div>
  );
};

export default LandingPage;
