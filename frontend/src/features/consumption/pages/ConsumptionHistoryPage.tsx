import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  Filter,
  Check,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumptionService } from '../../../services/consumptionService';
import { ApiError } from '../../../services/errors';
import { ConsumptionAnalysis, ConsumptionResponse } from '../../../types';
import { useToast } from '../../../shared/hooks/useToast';
import { useAuth } from '../../../infrastructure/auth/AuthContext';

const formatNumber = (value: number) =>
    new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);

const formatMacro = (value: number) =>
    `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value)}g`;

const ConsumptionHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { authenticated } = useAuth();
  const consumptionService = useConsumptionService();

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<ConsumptionAnalysis | null>(null);
  const [history, setHistory] = useState<ConsumptionResponse[]>([]);
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'CUSTOM'>('WEEKLY');
  
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const lastInvalidRangeKeyRef = useRef<string | null>(null);

  const hasInvalidCustomRange = useMemo(
    () => period === 'CUSTOM' && Boolean(startDate) && Boolean(endDate) && startDate > endDate,
    [period, startDate, endDate]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'CUSTOM') {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const [analysisData, historyData] = await Promise.all([
        consumptionService.getAnalysis(params),
        consumptionService.getHistory(
          period === 'CUSTOM' ? startDate : undefined,
          period === 'CUSTOM' ? endDate : undefined
        )
      ]);
      setAnalysis(analysisData);
      setHistory(historyData);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : t('analysis.noData'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authenticated) {
      navigate('/');
      return;
    }

    if (hasInvalidCustomRange) {
      const rangeKey = `${startDate}:${endDate}`;
      if (lastInvalidRangeKeyRef.current !== rangeKey) {
        showToast(t('analysis.invalidDateRange'), 'error');
        lastInvalidRangeKeyRef.current = rangeKey;
      }
      setLoading(false);
      return;
    }

    lastInvalidRangeKeyRef.current = null;
    loadData();
  }, [authenticated, hasInvalidCustomRange, period, startDate, endDate, consumptionService, navigate, showToast, t]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('analysis.deleteConfirm'))) return;

    setIsDeleting(id);
    try {
      await consumptionService.deleteConsumption(id);
      showToast(t('analysis.deleteSuccess'), 'success');
      // Veriyi yeniden yükle
      await loadData();
    } catch (error) {
      showToast(t('analysis.deleteError'), 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const maxCalories = useMemo(() => {
    if (!analysis || analysis.dailyDetails.length === 0) return 2500;
    
    const maxVal = Math.max(...analysis.dailyDetails.map(d => Math.max(d.consumedCalories, d.targetCalories)));
    
    // Eğer tüm değerler 0 ise varsayılan 2500
    if (maxVal <= 0) return 2500;

    // Barların tepesindeki değerlerin (kcal) ve tooltip'in kartın üstünden taşmaması için %35 pay bırakıyoruz
    // Kullanıcı talebi doğrultusunda tooltip'in üstte sabitlenmesi için bu alan kritik
    return Math.max(maxVal * 1.35, 1000);
  }, [analysis]);

  const handlePeriodChange = (p: 'WEEKLY' | 'MONTHLY' | 'CUSTOM') => {
    setPeriod(p);
    if (p === 'WEEKLY') {
      setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (p === 'MONTHLY') {
      setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  };

  if (loading && !analysis) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="animate-spin text-terracotta" />
        <p className="font-serif text-xl text-foreground-muted italic">{t('analysis.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2.5 rounded-2xl bg-card border border-card-border hover:bg-primary/5 transition-all text-foreground-muted"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">{t('analysis.title')}</h1>
            <p className="text-foreground-muted">{t('analysis.subtitle')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-card p-1 rounded-2xl border border-card-border shadow-sm">
            {(['WEEKLY', 'MONTHLY', 'CUSTOM'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  period === p ? 'bg-primary text-white shadow-md' : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {t(`analysis.${p.toLowerCase()}`)}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-2xl border transition-all ${
              showFilters ? 'bg-primary text-white border-primary' : 'bg-card border-card-border text-foreground-muted'
            }`}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Custom Date Filters */}
      {showFilters && (
        <div className="meal-card bg-primary/5 border-primary/10 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-foreground-muted ml-1">{t('analysis.startDate')}</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriod('CUSTOM');
              }}
              className="w-full bg-card border-card-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-foreground-muted ml-1">{t('analysis.endDate')}</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriod('CUSTOM');
              }}
              className="w-full bg-card border-card-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
             {hasInvalidCustomRange && (
               <p className="text-xs font-medium text-terracotta">
                 {t('analysis.invalidDateRange')}
               </p>
             )}
             <button 
               onClick={() => setShowFilters(false)}
               disabled={hasInvalidCustomRange}
               className={`w-full h-[40px] flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${
                 hasInvalidCustomRange
                   ? 'bg-foreground-muted/20 text-foreground-muted cursor-not-allowed'
                   : 'bg-primary text-white hover:bg-primary-hover'
               }`}
             >
               <Check size={18} /> {t('analysis.apply')}
             </button>
          </div>
        </div>
      )}

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Weekly Chart Area */}
        <section className="lg:col-span-8 meal-card flex flex-col gap-8 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-card/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <h3 className="meal-section-title">{t('analysis.chartTitle')}</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
               <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-terracotta" /> {t('analysis.consumed')}
               </div>
               <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-foreground-muted/30" /> {t('analysis.target')}
               </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-4 pt-16 custom-scrollbar">
            {(!analysis || analysis.dailyDetails.length === 0) ? (
              <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-card-border rounded-2xl text-foreground-muted italic">
                <p>{t('analysis.noData')}</p>
                <p className="text-[10px] mt-1">{t('analysis.noDataSub')}</p>
              </div>
            ) : (
              <div className={`h-96 flex items-end gap-2 md:gap-4 px-2 relative ${analysis.dailyDetails.length > 10 ? 'min-w-max pr-8' : 'min-w-full'}`}>
                {/* Y-Axis Scale Lines */}
                {[0.25, 0.5, 0.75, 1].map((ratio) => (
                  <div 
                    key={ratio}
                    className="absolute inset-x-0 border-t border-card-border/30 z-0 pointer-events-none"
                    style={{ bottom: `${ratio * 100}%` }}
                  >
                    <span className="sticky left-0 text-[7px] font-bold text-foreground-muted/40 uppercase bg-card/80 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm z-10">
                      {formatNumber(maxCalories * ratio)} kcal
                    </span>
                  </div>
                ))}

                {/* Global Target Line (Averages or Selected Day Target) */}
                <div 
                  className="absolute inset-x-0 border-t-2 border-dashed border-terracotta/30 z-0 pointer-events-none transition-all duration-500"
                  style={{ bottom: `${(analysis.averages.calories / maxCalories) * 100}%` }}
                >
                  <span className="sticky right-4 ml-auto block w-fit text-[8px] font-bold text-terracotta uppercase bg-card/80 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm">
                    {t('analysis.avgTarget')}: {formatNumber(analysis.averages.calories)} kcal
                  </span>
                </div>

                {analysis.dailyDetails.map((day, i) => {
                  const consumedHeight = (day.consumedCalories / maxCalories) * 100;
                  const targetHeight = (day.targetCalories / maxCalories) * 100;
                  const isToday = day.date === new Date().toISOString().split('T')[0];

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative min-w-[40px] h-full justify-end">
                      <div className="w-full relative h-full flex items-end justify-center">
                        {/* Individual Day Target Line Segment */}
                        <div 
                          className="absolute w-full border-t border-dotted border-foreground-muted/20 z-0"
                          style={{ bottom: `${targetHeight}%` }}
                        />
                        
                        {/* Consumed Bar */}
                        <div 
                          className={`w-full max-w-[40px] rounded-t-lg transition-all relative z-10 ${
                            day.consumedCalories > 0 
                              ? (day.consumedCalories > day.targetCalories ? 'bg-terracotta' : 'bg-primary/80')
                              : 'bg-foreground-muted/5'
                          } group-hover:scale-x-110 shadow-sm min-h-[4px]`}
                          style={{ height: `${Math.min(100, Math.max(2, consumedHeight))}%` }}
                        >
                          {day.consumedCalories > 0 && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 rounded border border-card-border shadow-sm">
                              {formatNumber(day.consumedCalories)}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold uppercase ${isToday ? 'text-primary' : 'text-foreground-muted'}`}>
                        {new Date(day.date).toLocaleDateString('tr-TR', { weekday: analysis.dailyDetails.length > 14 ? undefined : 'short', day: 'numeric' })}
                      </span>

                      {/* Tooltip: Fixed at top of chart container, relative to the bar's horizontal position */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-espresso-midnight/95 backdrop-blur-md text-white text-[10px] p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 shadow-2xl border border-white/10">
                        <p className="font-bold border-b border-white/10 pb-1 mb-1">{new Date(day.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</p>
                        <p className="flex justify-between gap-4"><span>{t('analysis.consumed')}:</span> <span className="font-bold">{formatNumber(day.consumedCalories)} kcal</span></p>
                        <p className="flex justify-between gap-4"><span>{t('analysis.target')}:</span> <span className="opacity-80">{formatNumber(day.targetCalories)} kcal</span></p>
                        <p className={`text-[9px] mt-1.5 pt-1.5 border-t border-white/10 font-medium ${day.deviation > 0 ? 'text-terracotta-light' : 'text-sage-light'}`}>
                          {day.deviation > 0 ? `+${formatNumber(day.deviation)} kcal fazla` : `${formatNumber(Math.abs(day.deviation))} kcal eksik`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Stats Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="meal-card bg-terracotta/5 border-terracotta/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-terracotta/10 text-terracotta rounded-xl">
                <TrendingUp size={20} />
              </div>
              <h3 className="meal-section-title text-xl">{t('analysis.summaryTitle')}</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-foreground-muted mb-1">{t('analysis.avgCalories')}</p>
                <p className="text-4xl font-serif font-bold text-terracotta">
                  {formatNumber(analysis?.averages.calories || 0)}
                  <span className="text-sm font-sans font-normal ml-1 text-foreground-muted">kcal/gün</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'P', val: analysis?.averages.protein || 0, color: 'text-terracotta' },
                  { label: 'K', val: analysis?.averages.carbs || 0, color: 'text-foreground' },
                  { label: 'Y', val: analysis?.averages.fat || 0, color: 'text-sage' }
                ].map((m, i) => (
                  <div key={i} className="bg-background/50 p-3 rounded-2xl border border-card-border text-center">
                    <p className="text-[9px] font-bold text-foreground-muted mb-1">{m.label}</p>
                    <p className={`text-xs font-bold ${m.color}`}>{formatMacro(m.val)}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-card-border">
                 <div className="flex items-center gap-2 text-foreground-muted text-xs">
                    <Target size={14} />
                    <span>{t('analysis.targetScore')}: <span className="text-foreground font-bold">
                      {analysis && analysis.averages.calories > 0 
                        ? `${Math.round(Math.max(0, 100 - (Math.abs(analysis.averages.calories - 2000) / 2000) * 100))}%`
                        : '-%'}
                    </span></span>
                 </div>
              </div>
            </div>
          </section>

          <section className="meal-card bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <AlertCircle size={20} />
              </div>
              <h3 className="meal-section-title text-lg">{t('analysis.noteTitle')}</h3>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {analysis && analysis.averages.calories > 0 ? (
                analysis.averages.calories > 2200 
                  ? t('analysis.noteHigh') 
                  : t('analysis.noteGood')
              ) : (
                t('analysis.noteNoData')
              )}
            </p>
          </section>
        </div>

        {/* Detailed Logs Table */}
        <section className="lg:col-span-12 meal-card">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-foreground/5 text-foreground rounded-xl">
                <Calendar size={20} />
              </div>
              <h3 className="meal-section-title">{t('analysis.historyTitle')}</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-foreground-muted">{t('analysis.tableDate')}</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-foreground-muted">{t('analysis.tableFood')}</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-foreground-muted">{t('analysis.tablePortion')}</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-foreground-muted">{t('analysis.tableCalories')}</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-foreground-muted">{t('analysis.tableMacros')}</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-foreground-muted text-right">{t('analysis.tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/50">
                {history.length > 0 ? history.map((item, i) => (
                  <tr key={item.id || i} className="group hover:bg-primary/5 transition-colors">
                    <td className="py-4 text-xs font-medium">
                      {new Date(item.consumedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4">
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.foodName}</p>
                      <p className="text-[10px] text-foreground-muted italic">
                        {item.recipeId ? 'Sistem Tarifi' : 'Manuel Giriş'}
                      </p>
                    </td>
                    <td className="py-4 text-xs text-foreground-muted font-medium">
                      {item.portionLabel || `${item.portionGrams}g`}
                    </td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-terracotta/10 text-terracotta text-xs font-bold">
                        {formatNumber(item.estimatedCalories || 0)} kcal
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold text-terracotta">{Math.round(item.estimatedProtein || 0)}g</span>
                        <span className="text-[10px] font-bold text-foreground">{Math.round(item.estimatedCarbs || 0)}g</span>
                        <span className="text-[10px] font-bold text-sage">{Math.round(item.estimatedFat || 0)}g</span>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => item.id && handleDelete(item.id)}
                        disabled={isDeleting === item.id}
                        className="p-2 rounded-xl text-foreground-muted hover:text-terracotta hover:bg-terracotta/10 transition-all disabled:opacity-50"
                        title={t('analysis.tableActions')}
                      >
                        {isDeleting === item.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-foreground-muted italic">
                      {t('analysis.historyNoData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
};

export default ConsumptionHistoryPage;
