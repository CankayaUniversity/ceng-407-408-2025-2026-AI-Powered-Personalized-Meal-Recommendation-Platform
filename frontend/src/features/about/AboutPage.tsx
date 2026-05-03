import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Rocket, Eye, Heart, Info } from 'lucide-react';
import { useTheme } from '../../infrastructure/theme/ThemeContext';
import amblem from '../../assets/meal_amblem.png';
import logoDark from '../../assets/meal_logo_dark.png';
import logoLight from '../../assets/meal_logo_light.png';

const AboutPage: React.FC = () => {
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-bold text-black/40 dark:text-alabaster/40 hover:text-terracotta transition-colors uppercase tracking-widest"
                >
                    <ChevronLeft size={16} />
                    {t('about.back')}
                </button>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-terracotta/10 text-terracotta rounded-full text-[10px] font-black uppercase tracking-widest">
                    <Info size={12} />
                    {t('about.title')}
                </div>
            </div>

            {/* Hero Section with Logo */}
            <div className="relative group overflow-hidden rounded-[3rem] border-2 border-terracotta/10 dark:border-white/5 shadow-2xl bg-transparent">
                <div className="p-10 md:p-16 flex flex-col md:flex-row items-center gap-12">
                    <div className="meal-brand-amblem-container about-hero-amblem-box bg-transparent border-none shadow-none">
                        <img 
                            src={amblem} 
                            alt="MealAI Amblem" 
                            className="meal-brand-amblem-img"
                        />
                        <div className="h-20 meal-brand-logo-container bg-transparent border-none shadow-none">
                            <img 
                                src={isDark ? logoDark : logoLight} 
                                alt="MealAI Logo" 
                                className="meal-brand-logo-img" 
                            />
                        </div>
                    </div>
                    <div className="space-y-6 text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-espresso-midnight dark:text-white leading-tight">
                            {t('about.heroTitle')}
                        </h1>
                        <p className="text-xl text-foreground-muted italic leading-relaxed font-medium border-l-4 border-terracotta/20 pl-6 hidden md:block">
                            "{t('about.story.content')}"
                        </p>
                    </div>
                </div>
                {/* Story for Mobile */}
                <div className="px-10 pb-10 md:hidden">
                    <p className="text-lg text-foreground-muted italic leading-relaxed font-medium border-l-4 border-terracotta/20 pl-6 text-center">
                        "{t('about.story.content')}"
                    </p>
                </div>
            </div>

            {/* Mission & Vision Grid */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Mission */}
                <div className="meal-card p-10 rounded-[3rem] border-2 border-terracotta/5 dark:border-white/5 hover:border-terracotta/20 transition-all space-y-6">
                    <div className="w-16 h-16 bg-terracotta/10 rounded-2xl flex items-center justify-center text-terracotta">
                        <Rocket size={32} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-espresso-midnight dark:text-white">
                        {t('about.mission.title')}
                    </h2>
                    <p className="text-foreground-muted leading-relaxed italic">
                        {t('about.mission.content')}
                    </p>
                </div>

                {/* Vision */}
                <div className="meal-card p-10 rounded-[3rem] border-2 border-moss-sage/10 dark:border-white/5 hover:border-moss-sage/20 transition-all space-y-6">
                    <div className="w-16 h-16 bg-moss-sage/10 rounded-2xl flex items-center justify-center text-moss-sage">
                        <Eye size={32} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-espresso-midnight dark:text-white">
                        {t('about.vision.title')}
                    </h2>
                    <p className="text-foreground-muted leading-relaxed italic">
                        {t('about.vision.content')}
                    </p>
                </div>
            </div>

            {/* Values / Story Section */}
            <div className="meal-card p-12 rounded-[3rem] border-2 border-ochre-soft/10 dark:border-white/5 bg-ochre-soft/5 text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="mx-auto w-16 h-16 bg-ochre-soft/20 rounded-full flex items-center justify-center text-ochre-soft">
                    <Heart size={32} fill="currentColor" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-espresso-midnight dark:text-white max-w-2xl mx-auto">
                    {t('landing.hero.badge')}
                </h2>
                <p className="text-foreground-muted text-lg leading-relaxed max-w-2xl mx-auto italic">
                    {t('landing.features.subtitle')}
                </p>
            </div>
        </div>
    );
};

export default AboutPage;
