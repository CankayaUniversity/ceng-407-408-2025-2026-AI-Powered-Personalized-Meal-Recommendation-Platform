import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useTheme } from '../../infrastructure/theme/ThemeContext';
import {
    ChefHat, Target, BrainCircuit, Star, Play, ShieldCheck,
    Activity, Wind, Heart, Clock, Sun, Moon, Languages, ArrowRight
} from 'lucide-react';

/**
 * MealAI Landing Page - The "Digital Private Chef" Experience
 * Projenin ana vitrini. Tipografi ağırlıklı, premium ve samimi bir tasarım.
 * Tasarım Dili: Espresso Midnight (Derinlik), Terracotta (Enerji), Moss Sage (Doğallık)
 */

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
        <div className="min-h-screen bg-alabaster dark:bg-[#1A1817] transition-colors duration-500 font-sans selection:bg-terracotta/20 overflow-x-hidden">

            {/* Dynamic Background Blur - Ambient Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-terracotta/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-moss-sage/5 blur-[100px] rounded-full" />
            </div>

            {/* Navbar - Glassmorphism UI */}
            <nav className="sticky top-0 z-50 px-6 py-5 max-w-7xl mx-auto">
                <div className="glass-card flex items-center justify-between px-8 py-4 rounded-[2rem] border-white/40 dark:border-white/5 shadow-brand-card">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="bg-terracotta p-2.5 rounded-2xl shadow-xl shadow-terracotta/20 transition-all group-hover:scale-110 group-hover:rotate-6">
                            <ChefHat className="text-white" size={24} strokeWidth={1.8} />
                        </div>
                        <span className="text-xl font-serif font-bold tracking-tight text-espresso-midnight dark:text-white">MealAI</span>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="hidden md:flex items-center gap-8 mr-4">
                            <button onClick={toggleLanguage} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-espresso-midnight/40 dark:text-alabaster/40 hover:text-terracotta transition-colors">
                                <Languages size={16} /> {i18n.language.toUpperCase()}
                            </button>
                            <button onClick={toggleTheme} className="text-espresso-midnight/40 dark:text-alabaster/40 hover:text-terracotta transition-colors">
                                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </div>

                        <button
                            onClick={() => login()}
                            className="text-xs font-bold uppercase tracking-widest text-espresso-midnight/60 dark:text-alabaster/60 hover:text-terracotta transition-colors"
                        >
                            {t('landing.nav.login')}
                        </button>
                        <button
                            onClick={() => register()}
                            className="bg-espresso-midnight dark:bg-terracotta text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-brand-hero hover:scale-105 active:scale-95 transition-all"
                        >
                            {t('landing.nav.join')}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="px-6 pt-16 pb-32 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-10 animate-in fade-in slide-in-from-left duration-1000">
                    <div className="inline-flex items-center gap-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-card-border px-5 py-2.5 rounded-full text-moss-forest dark:text-moss-sage font-bold text-[10px] uppercase tracking-[0.25em]">
                        <Star size={12} className="fill-terracotta text-terracotta" />
                        <span>{t('landing.hero.badge')}</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-serif font-bold text-espresso-midnight dark:text-white leading-[0.95] tracking-tighter">
                        {t('landing.hero.title').split(t('landing.hero.title_italic'))[0]}
                        <span className="text-terracotta italic font-normal">{t('landing.hero.title_italic')}</span>
                        {t('landing.hero.title').split(t('landing.hero.title_italic'))[1]}
                    </h1>

                    <p className="text-foreground-muted text-xl leading-relaxed max-w-xl font-medium italic border-l-4 border-terracotta/20 pl-8">
                        {t('landing.hero.subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-5 pt-4">
                        <button
                            onClick={() => register()}
                            className="bg-terracotta hover:bg-terracotta-spiced text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all shadow-brand-hero flex items-center justify-center gap-3 group"
                        >
                            {t('landing.hero.cta_start')}
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg text-espresso-midnight dark:text-alabaster hover:bg-white/50 dark:hover:bg-white/5 transition-all glass-card border-card-border">
                            <div className="bg-terracotta/10 p-2 rounded-full text-terracotta">
                                <Play size={18} fill="currentColor" />
                            </div>
                            {t('landing.hero.cta_manifesto')}
                        </button>
                    </div>

                    <div className="flex items-center gap-8 pt-10 border-t border-card-border">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-12 h-12 rounded-full border-4 border-alabaster dark:border-[#1A1817] bg-card-border overflow-hidden shadow-lg">
                                    <img src={`https://i.pravatar.cc/150?u=mealai${i}`} alt="User" />
                                </div>
                            ))}
                        </div>
                        <div className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em]">
               <span className="text-espresso-midnight dark:text-white text-lg font-serif normal-case tracking-tight font-bold block leading-none mb-1">
                 {t('landing.hero.users_count')}
               </span>
                            {t('landing.hero.users_label')}
                        </div>
                    </div>
                </div>

                {/* Hero Visual - "App in a Box" Concept */}
                <div className="relative animate-in zoom-in fade-in duration-1000 lg:ml-10">
                    <div className="meal-card p-4 rounded-[4rem] shadow-brand-hero relative overflow-hidden group border-white/60 dark:border-white/5 rotate-3 hover:rotate-0 transition-transform duration-700">
                        <div className="rounded-[3rem] overflow-hidden aspect-[4/5] relative">
                            <img
                                src="https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=1000"
                                alt="Healthy Food MealAI"
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-espresso-midnight/80 via-transparent to-transparent" />

                            {/* Floatings - UI Elements */}
                            <div className="absolute top-8 left-8 glass-card p-4 rounded-3xl animate-bounce duration-[4000ms]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-moss-sage rounded-xl flex items-center justify-center text-white shadow-lg">
                                        <Activity size={20} />
                                    </div>
                                    <div className="pr-4">
                                        <p className="text-[9px] uppercase font-black text-espresso-midnight/40 dark:text-white/40 tracking-widest">Macro Match</p>
                                        <p className="text-sm font-bold text-espresso-midnight dark:text-white">98% Perfect</p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-10 left-10 right-10">
                                <div className="glass-card p-6 rounded-3xl backdrop-blur-xl border-white/20 shadow-2xl">
                                    <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-2">Today's Suggestion</p>
                                    <h4 className="font-serif text-2xl font-bold text-espresso-midnight dark:text-white mb-4">Roasted Quinoa & Salmon Bowl</h4>
                                    <div className="flex gap-2">
                                        <span className="meal-badge-neon px-3 py-1 text-[9px]">Gluten-Free</span>
                                        <span className="meal-badge-neon px-3 py-1 text-[9px]">High Protein</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute -z-10 -bottom-10 -right-10 w-64 h-64 bg-terracotta/20 rounded-full blur-3xl opacity-50" />
                </div>
            </header>

            {/* Features Grid */}
            <section className="bg-white/40 dark:bg-white/[0.02] py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-3xl space-y-6 mb-20">
                        <p className="meal-overline">Intelligent Core</p>
                        <h2 className="text-5xl md:text-6xl font-serif font-bold text-espresso-midnight dark:text-white leading-tight">
                            {t('landing.features.title').split(t('landing.features.title_highlight'))[0]}
                            <span className="text-terracotta italic font-normal italic">{t('landing.features.title_highlight')}</span>
                            {t('landing.features.title').split(t('landing.features.title_highlight'))[1]}
                        </h2>
                        <p className="text-foreground-muted text-lg italic border-l-2 border-moss-sage pl-6">
                            {t('landing.features.subtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, i) => (
                            <div key={i} className="meal-card p-10 rounded-[3rem] border-card-border hover:-translate-y-2 transition-all group">
                                <div className={`${feature.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500`}>
                                    {React.cloneElement(feature.icon as React.ReactElement, { size: 30, strokeWidth: 1.5 })}
                                </div>
                                <h3 className="text-2xl font-serif font-bold text-espresso-midnight dark:text-white mb-4 leading-tight">{feature.title}</h3>
                                <p className="text-foreground-muted leading-relaxed text-sm italic">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-32 px-6 max-w-7xl mx-auto">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
                    {[
                        { label: t('landing.stats.recipes'), val: '50k+', icon: <ChefHat className="text-terracotta" /> },
                        { label: t('landing.stats.members'), val: '12k', icon: <Heart className="text-moss-sage" /> },
                        { label: t('landing.stats.accuracy'), val: '99%', icon: <Activity className="text-ochre-soft" /> },
                        { label: t('landing.stats.speed'), val: '< 2s', icon: <Clock className="text-moss-forest" /> },
                    ].map((stat, i) => (
                        <div key={i} className="space-y-4 border-l border-card-border pl-8 group hover:border-terracotta transition-colors duration-500">
                            <div className="flex items-center gap-3 text-foreground-muted uppercase tracking-[0.25em] text-[9px] font-black">
                                {stat.icon}
                                {stat.label}
                            </div>
                            <p className="text-6xl font-serif font-bold text-espresso-midnight dark:text-white leading-none tracking-tighter group-hover:text-terracotta transition-colors">
                                {stat.val}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final Call to Action */}
            <section className="px-6 pb-32 max-w-7xl mx-auto">
                <div className="bg-espresso-midnight rounded-[4rem] p-12 md:p-24 text-center space-y-12 relative overflow-hidden shadow-brand-hero">
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-terracotta rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-moss-forest rounded-full blur-[120px]" />
                    </div>

                    <div className="relative z-10 space-y-8">
                        <h2 className="text-4xl md:text-7xl font-serif font-bold text-white max-w-4xl mx-auto leading-[1.1] tracking-tighter">
                            {t('landing.cta.title')}
                        </h2>
                        <p className="text-alabaster/40 text-lg md:text-xl max-w-2xl mx-auto italic font-medium">
                            {t('landing.cta.subtitle')}
                        </p>
                    </div>

                    <button
                        onClick={() => login()}
                        className="relative z-10 bg-terracotta text-white px-12 py-6 rounded-[2rem] font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-terracotta/40 group"
                    >
              <span className="flex items-center gap-3">
                {t('landing.cta.button')}
                  <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </span>
                    </button>
                </div>
            </section>

            {/* Minimal Footer */}
            <footer className="py-20 px-6 max-w-7xl mx-auto border-t border-card-border">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="flex items-center gap-4">
                        <div className="bg-espresso-midnight dark:bg-white/5 p-2.5 rounded-xl">
                            <ChefHat size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-serif font-bold text-espresso-midnight dark:text-white tracking-tight">MealAI</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted">
                        <a href="#" className="hover:text-terracotta transition-colors">{t('landing.footer.manifesto')}</a>
                        <a href="#" className="hover:text-terracotta transition-colors">{t('landing.footer.privacy')}</a>
                        <a href="#" className="hover:text-terracotta transition-colors">{t('landing.footer.connect')}</a>
                    </div>

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted/40">
                        {t('landing.footer.rights')}
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
