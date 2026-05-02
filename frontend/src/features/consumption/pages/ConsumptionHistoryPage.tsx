import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  TrendingUp,
  Calendar,
  Target,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Filter,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumptionService } from '../../../services/consumptionService';
import { useUserService } from '../../../services/userService';
import { ApiError } from '../../../services/errors';
import { ConsumptionAnalysis, ConsumptionResponse, User } from '../../../types';
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
  const { authenticated, user } = useAuth();
  const consumptionService = useConsumptionService();
  const userService = useUserService();

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<ConsumptionAnalysis | null>(null);
  const [history, setHistory] = useState<ConsumptionResponse[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return history.slice(startIndex, startIndex + itemsPerPage);
  }, [history, currentPage]);

  const totalPages = Math.ceil(history.length / itemsPerPage);

  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'CUSTOM'>('WEEKLY');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<string>(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
      new Date().toISOString().split('T')[0]
  );

  const lastInvalidRangeKeyRef = useRef<string | null>(null);

  const hasInvalidCustomRange = useMemo(
      () => period === 'CUSTOM' && Boolean(startDate) && Boolean(endDate) && startDate > endDate,
      [period, startDate, endDate]
  );

  const maxCalories = useMemo(() => {
    if (!analysis || !analysis.dailyDetails.length) return 2500;
    const allValues = analysis.dailyDetails.flatMap(d => [d.consumedCalories, d.targetCalories]);
    const absoluteMax = Math.max(...allValues);
    if (absoluteMax <= 0) return 2500;
    const padding = absoluteMax > 8000 ? 1.10 : 1.25;
    return Math.max(absoluteMax * padding, 1000);
  }, [analysis]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'CUSTOM') {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const promises: [Promise<ConsumptionAnalysis>, Promise<ConsumptionResponse[]>, Promise<User> | null] = [
        consumptionService.getAnalysis(params),
        consumptionService.getHistory(startDate, endDate),
        user?.id ? userService.getUserById(user.id) : null
      ];

      const [analysisData, historyData, userData] = await Promise.all(promises);
      setAnalysis(analysisData);
      setHistory(historyData);
      if (userData) setUserProfile(userData);
      setCurrentPage(1);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : t('analysis.noData'), 'error');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, consumptionService, userService, user?.id, showToast, t]);

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
  }, [authenticated, hasInvalidCustomRange, loadData, navigate, showToast, t]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('analysis.deleteConfirm'))) return;
    setIsDeleting(id);
    try {
      await consumptionService.deleteConsumption(id);
      showToast(t('analysis.deleteSuccess'), 'success');
      
      // Update history state locally to avoid full reload and maintain pagination
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch {
      showToast(t('analysis.deleteError'), 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePeriodChange = (p: 'WEEKLY' | 'MONTHLY' | 'CUSTOM') => {
    setPeriod(p);
    const now = new Date();
    if (p === 'WEEKLY') {
      setStartDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (p === 'MONTHLY') {
      setStartDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
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
        {/* Header Section */}
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

        {/* Date Filters */}
        {showFilters && (
            <div className="meal-card bg-primary/5 border-primary/10 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-foreground-muted ml-1">{t('analysis.startDate')}</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPeriod('CUSTOM'); }}
                    className="w-full bg-card border-card-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-foreground-muted ml-1">{t('analysis.endDate')}</label>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPeriod('CUSTOM'); }}
                    className="w-full bg-card border-card-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="flex flex-col justify-end">
                <button
                    onClick={() => setShowFilters(false)}
                    disabled={hasInvalidCustomRange}
                    className={`w-full h-[40px] flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${
                        hasInvalidCustomRange ? 'bg-foreground-muted/20 text-foreground-muted' : 'bg-primary text-white hover:opacity-90'
                    }`}
                >
                  <Check size={18} /> {t('analysis.apply')}
                </button>
              </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CHART SECTION */}
          <section className="lg:col-span-8 meal-card flex flex-col gap-8 relative overflow-hidden">
            {loading && (
                <div className="absolute inset-0 bg-card/60 backdrop-blur-[2px] z-[200] flex items-center justify-center">
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
              {!analysis || analysis.dailyDetails.length === 0 ? (
                  <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-card-border rounded-2xl text-foreground-muted italic">
                    <p>{t('analysis.noData')}</p>
                  </div>
              ) : (
                  <div className="h-[400px] flex items-stretch gap-2 md:gap-4 px-2 relative min-w-full w-max pr-10">

                    {/* Y-Axis Guidelines */}
                    <div className="absolute inset-x-0 top-0 bottom-12 pointer-events-none z-50">
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                          <div
                              key={ratio}
                              className={`absolute inset-x-0 border-b ${
                                  ratio === 0
                                      ? 'border-solid border-foreground-muted/50'
                                      : 'border-card-border/20'
                              }`}
                              style={{ bottom: `${ratio * 100}%` }}
                          >
                      <span className="sticky left-0 inline-block text-[8px] font-bold text-foreground-muted uppercase bg-card/60 backdrop-blur-md px-2 py-1 rounded-sm shadow-sm border border-white/5">
                        {formatNumber(maxCalories * ratio)} kcal
                      </span>
                          </div>
                      ))}

                      {/* Average Target Line */}
                      {analysis.averages.calories > 0 && (
                          <div
                              className="absolute inset-x-0 border-b-2 border-dashed border-terracotta/40 z-20"
                              style={{ bottom: `${(analysis.averages.calories / maxCalories) * 100}%` }}
                          >
                      <span className="sticky right-4 ml-auto block w-fit text-[8px] font-bold text-terracotta uppercase bg-card/95 backdrop-blur-md px-1.5 py-0.5 rounded shadow-sm border border-terracotta/10">
                        {t('analysis.avgTarget')}: {formatNumber(analysis.averages.calories)} kcal
                      </span>
                          </div>
                      )}
                    </div>

                    {/* Bars Rendering */}
                    {analysis.dailyDetails.map((day, i) => {
                      const consumedHeight = (day.consumedCalories / maxCalories) * 100;
                      const targetHeight = (day.targetCalories / maxCalories) * 100;
                      const isToday = day.date === new Date().toISOString().split('T')[0];

                      return (
                          <div key={i} className="flex-1 flex flex-col group relative min-w-[45px] z-40 hover:z-[100]">
                            <div className="flex-1 relative mb-12 flex items-end justify-center">
                              {/* Target Line - Optimized to remove dotted lines at 0cal */}
                              {targetHeight > 1 && (
                                  <div
                                      className="absolute w-full border-b border-dotted border-foreground-muted/40 z-10"
                                      style={{ bottom: `${targetHeight}%` }}
                                  />
                              )}

                              <div
                                  className={`w-full max-w-[32px] rounded-t-lg transition-all relative z-20 ${
                                      day.consumedCalories > day.targetCalories ? 'bg-terracotta' : 'bg-primary'
                                  } group-hover:brightness-110 shadow-sm`}
                                  style={{
                                    height: `${day.consumedCalories > 0 ? Math.max(4, consumedHeight) : 0}%`,
                                  }}
                              />
                            </div>

                            <div className="absolute bottom-0 inset-x-0 h-10 flex items-center justify-center border-t border-card-border/10">
                        <span className={`text-[9px] font-bold ${isToday ? 'text-primary' : 'text-foreground-muted'}`}>
                          {new Date(day.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                            </div>

                            {/* Tooltip */}
                            <div className={`absolute -translate-x-1/2 top-1/4 bg-tooltip border border-white/10 text-white text-[11px] p-4 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[150] shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[170px]
                        ${i < 3 ? 'left-4 translate-x-0' : i > analysis.dailyDetails.length - 4 ? 'right-4 translate-x-0 left-auto' : 'left-1/2'}
                      `}>
                              <p className="font-bold border-b border-white/10 pb-2 mb-2 text-white/90">
                                {new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="opacity-70">{t('analysis.consumed')}:</span>
                                  <b className="text-terracotta-light">{formatNumber(day.consumedCalories)} kcal</b>
                                </div>
                                <div className="flex justify-between opacity-60">
                                  <span>{t('analysis.target')}:</span>
                                  <span>{formatNumber(day.targetCalories)} kcal</span>
                                </div>
                                <div className={`pt-2 border-t border-white/5 mt-1 font-bold flex justify-between ${day.deviation > 0 ? 'text-terracotta-light' : 'text-sage-light'}`}>
                                  <span>{day.deviation > 0 ? t('analysis.over') : t('analysis.under')}:</span>
                                  <span>{formatNumber(Math.abs(day.deviation))} kcal</span>
                                </div>
                              </div>
                            </div>
                          </div>
                      );
                    })}
                  </div>
              )}
            </div>
          </section>

          {/* STATS SIDEBAR */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <section className="meal-card bg-terracotta/5 border-terracotta/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-terracotta/10 text-terracotta rounded-xl"><TrendingUp size={20} /></div>
                <h3 className="meal-section-title text-xl">{t('analysis.summaryTitle')}</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-foreground-muted mb-1">{t('analysis.avgCalories')}</p>
                  <p className="text-4xl font-serif font-bold text-terracotta">
                    {formatNumber(analysis?.averages.calories || 0)}
                    <span className="text-sm font-sans font-normal ml-1 text-foreground-muted">{t('analysis.kcalPerDay')}</span>
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
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-foreground-muted text-xs">
                      <Target size={14} />
                      <span>{t('analysis.targetScore')}: <span className="text-foreground font-bold">
                        {analysis && analysis.averages.calories > 0
                            ? `${Math.round(Math.max(0, 100 - (Math.abs(analysis.averages.calories - 2000) / 2000) * 100))}%`
                            : '-%'}
                      </span></span>
                    </div>

                    {userProfile?.bmi && (
                        <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm p-3 rounded-2xl border border-terracotta/10 shadow-sm animate-in slide-in-from-top-2 duration-500">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-terracotta/10 text-terracotta rounded-lg">
                              <Activity size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">VKI / BMI</span>
                          </div>
                          <span className="text-lg font-serif font-bold text-terracotta">{userProfile.bmi}</span>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="meal-card bg-primary/5 border-primary/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 text-primary rounded-xl"><AlertCircle size={20} /></div>
                <h3 className="meal-section-title text-lg">{t('analysis.noteTitle')}</h3>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed italic">
                {analysis && analysis.averages.calories > 0
                    ? (analysis.averages.calories > 2200 ? t('analysis.noteHigh') : t('analysis.noteGood'))
                    : t('analysis.noteNoData')}
              </p>
            </section>
          </div>

          {/* HISTORY TABLE */}
          <section className="lg:col-span-12 meal-card">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-foreground/5 text-foreground rounded-xl"><Calendar size={20} /></div>
              <h3 className="meal-section-title">{t('analysis.historyTitle')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                <tr className="border-b border-card-border text-left">
                  <th className="pb-4 text-[10px] font-bold uppercase text-foreground-muted">{t('analysis.tableDate')}</th>
                  <th className="pb-4 text-[10px] font-bold uppercase text-foreground-muted">{t('analysis.tableFood')}</th>
                  <th className="pb-4 text-[10px] font-bold uppercase text-foreground-muted">{t('analysis.tableCalories')}</th>
                  <th className="pb-4 text-[10px] font-bold uppercase text-foreground-muted">{t('analysis.tableMacros')}</th>
                  <th className="pb-4 text-[10px] font-bold uppercase text-foreground-muted text-right">{t('analysis.tableActions')}</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-card-border/50">
                {paginatedHistory.length > 0 ? paginatedHistory.map((item, i) => (
                    <tr key={item.id || i} className="group hover:bg-primary/5 transition-colors">
                      <td className="py-4 text-xs font-medium">
                        {new Date(item.consumedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4">
                        <p className="text-sm font-bold text-foreground">{item.foodName}</p>
                        <p className="text-[10px] text-foreground-muted italic">{item.portionLabel}</p>
                      </td>
                      <td className="py-4">
                      <span className="px-2 py-1 rounded-md bg-terracotta/10 text-terracotta text-xs font-bold">
                        {formatNumber(item.estimatedCalories || 0)} kcal
                      </span>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2 text-[10px] font-bold">
                          <span className="text-terracotta">{Math.round(item.estimatedProtein || 0)}g</span>
                          <span className="text-foreground">{Math.round(item.estimatedCarbs || 0)}g</span>
                          <span className="text-sage">{Math.round(item.estimatedFat || 0)}g</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <button
                            onClick={() => item.id && handleDelete(item.id)}
                            disabled={isDeleting === item.id}
                            className="p-2 text-foreground-muted hover:text-terracotta transition-colors"
                        >
                          {isDeleting === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                )) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-foreground-muted italic">{t('analysis.historyNoData')}</td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between border-t border-card-border pt-6">
                  <p className="text-xs text-foreground-muted">
                    {t('analysis.pagination', {
                      total: history.length,
                      from: (currentPage - 1) * itemsPerPage + 1,
                      to: Math.min(currentPage * itemsPerPage, history.length)
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl border border-card-border hover:bg-primary/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => (
                          <button
                              key={i}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                  currentPage === i + 1
                                      ? 'bg-primary text-white shadow-md'
                                      : 'hover:bg-primary/10 text-foreground-muted'
                              }`}
                          >
                            {i + 1}
                          </button>
                      ))}
                    </div>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl border border-card-border hover:bg-primary/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
            )}
          </section>
        </div>
      </div>
  );
};

export default ConsumptionHistoryPage;
