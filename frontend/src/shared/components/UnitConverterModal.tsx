import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ArrowRightLeft, Calculator, Search, Loader2, Info, ChevronDown } from 'lucide-react';
import { useUI } from '../../infrastructure/ui/UIContext';
import { useIngredientService } from '../../services/ingredientService';
import { matchesIngredientQuery, useIngredientLookup } from '../hooks/useIngredientLookup';
import { Ingredient, UnitConversion } from '../../types';

const UnitConverterModal: React.FC = () => {
    const { isUnitConverterOpen, closeUnitConverter } = useUI();
    const ingredientService = useIngredientService();

    const [amount, setAmount] = useState<string>('1');
    const [sourceUnit, setSourceUnit] = useState<string>('GRAM');
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [conversions, setConversions] = useState<UnitConversion[]>([]);
    const [unitWeights, setUnitWeights] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'converter' | 'reference'>('converter');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const {
        results: searchResults,
        searching: isSearching,
        searchError,
        hasCompletedSearch,
        canSearch,
        resetSearch
    } = useIngredientLookup({
        query: searchQuery,
        enabled: isUnitConverterOpen && !selectedIngredient
    });

    // Fetch unit weights for reference or source unit selection
    useEffect(() => {
        const fetchWeights = async () => {
            try {
                const weights = await ingredientService.getAllUnitWeights(selectedIngredient?.id);
                setUnitWeights(weights);
                
                // Update source unit if it's no longer valid for selected ingredient
                if (selectedIngredient && !weights[sourceUnit.toLowerCase()]) {
                    setSourceUnit(selectedIngredient.physicalState === 'LIQUID' ? 'ML' : 'GRAM');
                }
            } catch (error) {
                console.error('Error fetching unit weights:', error);
            }
        };
        fetchWeights();
    }, [selectedIngredient, ingredientService]);

    useEffect(() => {
        if (!isUnitConverterOpen) {
            setIsSearchFocused(false);
            resetSearch();
        }
    }, [isUnitConverterOpen, resetSearch]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target?.closest('[data-ingredient-search="unit-converter"]')) {
                setIsSearchFocused(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const fetchConversions = useCallback(async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            setConversions([]);
            return;
        }
        setIsLoading(true);
        try {
            let data: UnitConversion[];
            if (selectedIngredient) {
                data = await ingredientService.getUnitConversions(
                    selectedIngredient.id,
                    parseFloat(amount),
                    sourceUnit
                );
            } else {
                data = await ingredientService.getStandardConversions(
                    parseFloat(amount),
                    sourceUnit
                );
            }
            setConversions(data);
        } catch (error) {
            console.error('Conversion fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedIngredient, amount, sourceUnit, ingredientService]);

    useEffect(() => {
        fetchConversions();
    }, [fetchConversions]);

    const unitsList = useMemo(() => {
        const physicalState = selectedIngredient?.physicalState;
        
        // Sıvı/Katı filtrelemesi: 
        // Sıvı ise: GRAM, KG, ADET, PAKET, DILIM gizle
        // Katı ise: ML, LITRE, L gizle
        const forbiddenUnits = physicalState === 'LIQUID' 
            ? ['GRAM', 'KG', 'ADET', 'PAKET', 'DILIM'] 
            : physicalState === 'SOLID' 
                ? ['ML', 'LITRE', 'L']
                : []; // SEMI_SOLID veya null durumunda her şeyi göster veya varsayılan

        return Object.keys(unitWeights)
            .map(u => u.toUpperCase())
            .filter(u => !forbiddenUnits.includes(u))
            .sort();
    }, [unitWeights, selectedIngredient]);

    const filteredConversions = useMemo(() => {
        const physicalState = selectedIngredient?.physicalState;
        if (!physicalState) return conversions;

        const forbiddenUnits = physicalState === 'LIQUID' 
            ? ['GRAM', 'KG', 'ADET', 'PAKET', 'DILIM'] 
            : physicalState === 'SOLID' 
                ? ['ML', 'LITRE', 'L']
                : [];

        return conversions.filter(conv => !forbiddenUnits.includes(conv.unit.toUpperCase()));
    }, [conversions, selectedIngredient]);

    if (!isUnitConverterOpen) return null;

    const shouldShowDropdown =
        isSearchFocused &&
        !selectedIngredient &&
        canSearch &&
        (isSearching || searchResults.length > 0 || !!searchError || hasCompletedSearch);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-espresso-midnight/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div 
                className="relative w-full max-w-2xl bg-white dark:bg-espresso-midnight rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-terracotta text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Calculator size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-serif font-bold">Birim Dönüştürücü</h2>
                            <p className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Akıllı Miktar Hesaplama</p>
                        </div>
                    </div>
                    <button 
                        onClick={closeUnitConverter}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-black/5 dark:border-white/5">
                    <button 
                        onClick={() => setActiveTab('converter')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'converter' ? 'text-terracotta border-b-2 border-terracotta' : 'text-foreground/40 hover:text-foreground/60'}`}
                    >
                        Dönüştürücü
                    </button>
                    <button 
                        onClick={() => setActiveTab('reference')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reference' ? 'text-terracotta border-b-2 border-terracotta' : 'text-foreground/40 hover:text-foreground/60'}`}
                    >
                        Referans Değerler
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {activeTab === 'converter' ? (
                        <div className="p-8 space-y-8">
                            {/* Ingredient Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1 flex items-center gap-2">
                                    <Info size={10} />
                                    Malzeme Bazlı Dönüşüm (Opsiyonel)
                                </label>
                                <div className="relative" data-ingredient-search="unit-converter">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30">
                                        <Search size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            const nextQuery = e.target.value;
                                            const shouldClearSelection = selectedIngredient
                                                ? !matchesIngredientQuery(nextQuery, selectedIngredient.name)
                                                : false;

                                            setSearchQuery(nextQuery);

                                            if (shouldClearSelection) {
                                                setSelectedIngredient(null);
                                                setConversions([]);
                                            }
                                        }}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setIsSearchFocused(false);
                                            }
                                        }}
                                        placeholder="Malzeme adı (örn: Süt, Un...)"
                                        className="base-input w-full pl-12 py-4 bg-black/5 dark:bg-white/5 border-transparent focus:border-terracotta/50"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Loader2 size={18} className="animate-spin text-terracotta" />
                                        </div>
                                    )}

                                    {/* Search Results Dropdown */}
                                    {shouldShowDropdown && (
                                        <div className="absolute z-40 top-full left-0 right-0 mt-2 bg-white dark:bg-espresso-midnight rounded-2xl shadow-xl border border-black/5 dark:border-white/10 overflow-hidden max-h-60 overflow-y-auto">
                                            {isSearching ? (
                                                <div className="px-6 py-5 text-sm text-foreground/50 flex items-center gap-3">
                                                    <Loader2 size={18} className="animate-spin text-terracotta" />
                                                    Malzemeler aranıyor...
                                                </div>
                                            ) : searchError ? (
                                                <div className="px-6 py-5 text-sm font-semibold text-red-500 bg-red-500/5">
                                                    {searchError}
                                                </div>
                                            ) : searchResults.length > 0 ? (
                                                searchResults.map((ing) => (
                                                    <button
                                                        key={ing.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedIngredient(ing);
                                                            setSearchQuery(ing.name);
                                                            setIsSearchFocused(false);
                                                        }}
                                                        className="w-full text-left px-6 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5 last:border-0"
                                                    >
                                                        <p className="font-bold text-sm">{ing.name}</p>
                                                        <p className="text-[10px] text-foreground/40 uppercase tracking-tighter">{ing.category}</p>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-6 py-5 text-sm text-foreground/45">
                                                    Bu aramayla eşleşen bir malzeme bulunamadı.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {selectedIngredient ? (
                                    <div className="flex items-center justify-between px-4 py-2 bg-terracotta/5 border border-terracotta/20 rounded-xl">
                                        <span className="text-xs font-bold text-terracotta">{selectedIngredient.name} yoğunluğu baz alınıyor</span>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setSelectedIngredient(null);
                                                setSearchQuery('');
                                                setConversions([]);
                                                setIsSearchFocused(false);
                                            }}
                                            className="text-[10px] font-black text-terracotta hover:underline uppercase"
                                        >
                                            Genel Moda Dön
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-[9px] text-foreground/30 px-1 italic">Herhangi bir malzeme seçilmezse standart su yoğunluğu (1.0) baz alınır.</p>
                                )}
                            </div>

                            {/* Amount & Unit Input */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">
                                        Miktar
                                    </label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="1.00"
                                        className="base-input w-full py-4 text-center font-serif text-2xl bg-black/5 dark:bg-white/5 border-transparent focus:border-terracotta/50"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">
                                        Kaynak Birim
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={sourceUnit}
                                            onChange={(e) => setSourceUnit(e.target.value)}
                                            className="base-input w-full py-4 px-6 bg-black/5 dark:bg-white/5 border-transparent focus:border-terracotta/50 appearance-none font-bold text-sm cursor-pointer"
                                        >
                                            {unitsList.map(unit => (
                                                <option key={unit} value={unit}>{unit}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/30">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Results */}
                            <div className="space-y-4 pt-4 pb-4">
                                <div className="flex items-center gap-2 px-1">
                                    <ArrowRightLeft size={14} className="text-terracotta" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Dönüşüm Karşılıkları</span>
                                </div>

                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-black/5 dark:bg-white/5 rounded-3xl">
                                        <Loader2 size={32} className="animate-spin text-terracotta" />
                                        <p className="text-xs font-medium text-foreground/40">Hesaplanıyor...</p>
                                    </div>
                                ) : filteredConversions.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {filteredConversions.map((conv, idx) => (
                                            <div 
                                                key={idx}
                                                className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center group transition-all ${conv.unit.toUpperCase() === sourceUnit ? 'bg-terracotta/10 border-terracotta/30' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-terracotta/30'}`}
                                            >
                                                <span className="text-lg font-serif font-bold text-espresso-midnight dark:text-white group-hover:text-terracotta transition-colors">
                                                    {conv.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mt-1">
                                                    {conv.displayName || conv.unit}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-black/5 dark:bg-white/5 rounded-3xl border-2 border-dashed border-black/5 dark:border-white/5">
                                        <Calculator size={32} className="text-foreground/10" />
                                        <p className="text-xs font-medium text-foreground/30 px-8 text-center">
                                            Dönüşümleri görmek için miktar girin.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <Info size={16} className="text-terracotta" />
                                    Standart Ölçü Birimleri
                                </h3>
                                <p className="text-xs text-foreground/50">
                                    Sistemimizde varsayılan olarak kabul edilen gramaj değerleri aşağıdadır. Malzeme seçildiğinde bu değerler yoğunluğa göre değişebilir.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.entries(unitWeights)
                                    .filter(([unit]) => !['g', 'gram', 'kg', 'kilogram', 'ml', 'litre', 'liter'].includes(unit))
                                    .sort((a, b) => a[0].localeCompare(b[0]))
                                    .map(([unit, weight]) => (
                                        <div key={unit} className="flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                            <span className="text-xs font-bold uppercase tracking-widest text-foreground/60">{unit}</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-lg font-serif font-bold text-terracotta">{weight}</span>
                                                <span className="text-[9px] font-black text-foreground/30">GRAM</span>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                            
                            <div className="p-4 rounded-2xl bg-terracotta/5 border border-terracotta/10">
                                <p className="text-[10px] leading-relaxed text-terracotta/70 italic">
                                    * Not: Sıvı malzemelerde (Süt, Yağ vb.) 1 ML su yoğunluğu olan 1 gramdan farklı olabilir. 
                                    Birim dönüştürücü sekmesinden malzeme seçerek gerçek gramajı hesaplayabilirsiniz.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5">
                    <button
                        onClick={closeUnitConverter}
                        className="w-full py-4 bg-espresso-midnight text-white dark:bg-white dark:text-espresso-midnight font-bold text-xs rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
                    >
                        KAPAT
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnitConverterModal;
