import React from 'react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { Zap, TrendingUp, Clock, Star, Heart, Wind, ShieldCheck, Activity, Target } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, authenticated, login } = useAuth();

  const dnaFilters = [
    { label: 'Peanut-Free', type: 'allergen' },
    { label: 'Keto Goal', type: 'goal' },
    { label: 'High Protein', type: 'goal' },
  ];

  const filters = [
    { label: 'Energetic', icon: <Zap size={18} strokeWidth={1.5} /> },
    { label: 'Under 30 min', icon: <Clock size={18} strokeWidth={1.5} /> },
    { label: 'Plant Based', icon: <Heart size={18} strokeWidth={1.5} /> },
    { label: 'Light', icon: <Wind size={18} strokeWidth={1.5} /> },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Intelligence Sidebar (User DNA) */}
      <aside className="lg:w-64 space-y-8">
        <div className="glass-card p-6 rounded-4xl border-moss-sage/20 dark:border-moss-sage/10">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={20} className="text-moss-sage" />
            <h3 className="text-xs uppercase tracking-widest font-extrabold text-espresso-midnight/60 dark:text-alabaster/60">User DNA</h3>
          </div>
          <div className="flex flex-wrap lg:flex-col gap-3">
            {dnaFilters.map((dna, i) => (
              <div key={i} className="medical-badge flex items-center justify-center text-center">
                {dna.label}
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-espresso-midnight/5 dark:border-white/5 space-y-4">
             <div className="flex items-center gap-2">
               <Activity size={16} className="text-moss-sage" />
               <span className="text-[10px] font-bold text-espresso-midnight/40 dark:text-alabaster/40 uppercase tracking-tighter">Health Progress</span>
             </div>
             <div className="h-1 bg-espresso-midnight/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-moss-sage rounded-full" style={{ width: '65%' }}></div>
             </div>
          </div>
        </div>

        <div className="hidden lg:block space-y-4">
          <h4 className="font-serif text-lg font-bold text-espresso-midnight dark:text-alabaster px-2">Mood & Style</h4>
          <div className="space-y-2">
            {filters.map((filter, i) => (
              <button key={i} className="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium text-espresso-midnight/60 dark:text-alabaster/60 hover:bg-white/50 dark:hover:bg-white/5 hover:text-terracotta transition-all flex items-center gap-3">
                {filter.icon}
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-serif font-bold text-espresso-midnight dark:text-alabaster leading-tight">
              {authenticated ? `Bonjour, ${user?.firstName || 'Gourmet'}!` : 'The Private Chef Experience'}
            </h1>
            <p className="text-moss-forest/60 dark:text-moss-sage/60 mt-4 text-lg max-w-2xl font-medium italic">
              "Precision nutrition meets culinary mastery."
            </p>
          </div>
          
          <button 
            onClick={() => !authenticated && login()}
            className="bg-terracotta text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl shadow-terracotta/20 flex items-center gap-3"
          >
            <Target size={20} />
            Generate My Plan
          </button>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Daily Recommendation Hero Card */}
          <div className="md:col-span-2 relative rounded-5xl overflow-hidden group shadow-2xl aspect-[16/10]">
            <img 
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000" 
              alt="Signature Dish" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-espresso-midnight/80 via-espresso-midnight/20 to-transparent" />
            
            <div className="absolute top-8 left-8 flex items-center gap-3">
              <span className="glass-card px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold text-white">
                Daily Recommendation
              </span>
              <div className="match-score-badge text-xs flex items-center gap-2">
                 <Activity size={14} className="text-terracotta" />
                 95% Match
              </div>
            </div>

            <div className="absolute bottom-8 left-8 right-8">
              <div className="glass-card p-8 rounded-4xl space-y-4 border-white/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-serif font-bold text-white mb-2">Roasted Mediterranean Salmon</h3>
                    <div className="flex gap-2">
                       <span className="medical-badge bg-white/10 border-white/20 text-white">High Protein</span>
                       <span className="medical-badge-focus text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                         <Star size={10} className="fill-ochre-soft" /> Soft Ochre Highlight
                       </span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/10 group/tooltip relative">
                  <p className="text-white/90 text-sm italic leading-relaxed cursor-help">
                    "Why this recipe? Matches your 20g protein goal & excludes Dairy."
                  </p>
                  
                  {/* Tooltip implementation via absolute positioning (Glassmorphism card) */}
                  <div className="absolute bottom-full left-0 mb-4 w-72 glass-card p-6 rounded-3xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none border-white/30 z-20">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-3">AI Intelligence</h4>
                    <ul className="space-y-2">
                      <li className="text-[11px] text-white/70 flex items-center gap-2">
                        <div className="w-1 h-1 bg-terracotta rounded-full" />
                        Bio-available Omega-3 for focus
                      </li>
                      <li className="text-[11px] text-white/70 flex items-center gap-2">
                        <div className="w-1 h-1 bg-moss-sage rounded-full" />
                        0% Dairy detected in ingredients
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Precision Data Card */}
          <div className="glass-card p-8 rounded-5xl flex flex-col justify-between shadow-xl border-white/50 dark:border-white/5">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-espresso-midnight dark:bg-white/10 flex items-center justify-center text-white">
                  <Activity size={20} strokeWidth={1.5} />
                </div>
                <h3 className="font-serif font-bold text-xl text-espresso-midnight dark:text-alabaster">Data Precision</h3>
              </div>
              
              <div className="space-y-6">
                {[
                  { label: 'Protein Goal', current: 45, target: 60, color: 'bg-terracotta' },
                  { label: 'Fiber intake', current: 18, target: 25, color: 'bg-moss-sage' },
                ].map((item, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-espresso-midnight/40 dark:text-alabaster/40">
                      <span>{item.label}</span>
                      <span>{Math.round((item.current/item.target)*100)}%</span>
                    </div>
                    <div className="h-2 bg-espresso-midnight/5 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${(item.current/item.target)*100}%` }}></div>
                    </div>
                    <p className="text-[10px] font-medium text-moss-forest/60 dark:text-moss-sage/60">{item.current}g / {item.target}g achieved</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-6 mt-6 border-t border-espresso-midnight/5 dark:border-white/5">
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-ochre-soft bg-ochre-soft/10 px-2 py-1 rounded">PRO TIP</span>
                <p className="text-[10px] text-espresso-midnight/60 dark:text-alabaster/60 leading-relaxed font-medium">Add 10g seeds to reach your Fiber goal for today.</p>
              </div>
            </div>
          </div>

          {/* Recipe Card with Tags */}
          <div className="md:col-span-3 glass-card p-6 rounded-5xl flex flex-col md:flex-row gap-8 items-center shadow-xl border-white/40 dark:border-white/5">
             <div className="w-full md:w-64 h-48 rounded-4xl overflow-hidden flex-shrink-0 shadow-lg relative group">
                <img 
                  src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600" 
                  alt="Secondary" 
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 match-score-badge scale-75 origin-top-right">
                   88%
                </div>
             </div>
             <div className="flex-1 space-y-6 w-full">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-espresso-midnight dark:text-alabaster mb-2">Quinoa Tabbouleh Bowl</h3>
                    <div className="flex flex-wrap gap-2">
                       <span className="medical-badge">Allergen-Free</span>
                       <span className="medical-badge bg-ochre-soft/10 border-ochre-soft/20 text-ochre-soft">Favorite Flavor</span>
                       <span className="text-[10px] font-bold text-moss-sage flex items-center gap-1">
                          <ShieldCheck size={12} /> Matches Keto Goal
                       </span>
                    </div>
                  </div>
                  <div className="bg-alabaster dark:bg-white/5 p-3 rounded-2xl border border-espresso-midnight/5 dark:border-white/5">
                    <TrendingUp size={20} className="text-terracotta" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {[
                     { label: 'Carbs', val: '24g', color: 'text-espresso-midnight dark:text-alabaster' },
                     { label: 'Protein', val: '12g', color: 'text-terracotta' },
                     { label: 'Fat', val: '32g', color: 'text-moss-sage' },
                     { label: 'Cals', val: '380', color: 'text-ochre-soft' },
                   ].map((nut, i) => (
                     <div key={i} className="bg-white/40 dark:bg-white/5 p-3 rounded-2xl text-center border border-white/60 dark:border-white/10">
                        <p className="text-[9px] uppercase tracking-tighter font-bold text-espresso-midnight/30 dark:text-alabaster/30 mb-1">{nut.label}</p>
                        <p className={`text-sm font-black ${nut.color}`}>{nut.val}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {!authenticated && (
        <div className="bg-espresso-midnight rounded-[3rem] p-16 text-center space-y-8 relative overflow-hidden shadow-2xl mt-12">
           <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-10 left-10 w-64 h-64 bg-terracotta rounded-full blur-[100px]" />
              <div className="absolute bottom-10 right-10 w-64 h-64 bg-moss-forest rounded-full blur-[100px]" />
           </div>
           <div className="relative z-10 space-y-4">
             <h2 className="text-4xl md:text-6xl font-serif font-bold text-white max-w-3xl mx-auto leading-tight">
               Elevate your culinary journey with AI.
             </h2>
             <p className="text-alabaster/40 text-lg max-w-xl mx-auto">
               Join our exclusive community of health-conscious gourmets and unlock personalized nutrition.
             </p>
           </div>
           <button 
             onClick={() => login()}
             className="relative z-10 bg-terracotta text-white px-12 py-5 rounded-2xl font-bold hover:scale-105 transition-transform shadow-2xl shadow-terracotta/40"
           >
             Begin Your Experience
           </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
