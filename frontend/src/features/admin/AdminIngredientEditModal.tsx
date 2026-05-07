import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Info, Activity } from 'lucide-react';
import { useAdminService, AdminIngredientRequest } from '../../services/adminService';
import { useIngredientService } from '../../services/ingredientService';
import { useToast } from '../../shared/hooks/useToast';
import { IngredientCategory, PhysicalState } from '../../types';

interface AdminIngredientEditModalProps {
    id: number | null;
    onClose: () => void;
    onSuccess: () => void;
}

const AdminIngredientEditModal: React.FC<AdminIngredientEditModalProps> = ({ id, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const adminService = useAdminService();
    const ingredientService = useIngredientService();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availableUnits, setAvailableUnits] = useState<string[]>([]);
    
    const [formData, setFormData] = useState<AdminIngredientRequest>({
        name: '',
        category: 'OTHERS',
        density: 1.0,
        physicalState: 'SOLID',
        preferredUnit: 'GRAM',
        caloriesPer100g: 0,
        proteinPer100g: 0,
        carbsPer100g: 0,
        fatPer100g: 0
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch available units from backend
                const unitsMap = await ingredientService.getAllUnitWeights();
                setAvailableUnits(Object.keys(unitsMap).sort());

                if (id) {
                    const data = await adminService.getIngredient(id);
                    setFormData({
                        name: data.name,
                        category: data.category,
                        density: data.density || 1.0,
                        physicalState: data.physicalState || 'SOLID',
                        preferredUnit: data.preferredUnit || 'GRAM',
                        caloriesPer100g: data.caloriesPer100g || 0,
                        proteinPer100g: data.proteinPer100g || 0,
                        carbsPer100g: data.carbsPer100g || 0,
                        fatPer100g: data.fatPer100g || 0
                    });
                }
            } catch (error) {
                console.error('Failed to fetch initial data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (id) {
                await adminService.updateIngredient(id, formData);
            } else {
                await adminService.createIngredient(formData);
            }
            onSuccess();
        } catch (error) {
            console.error('Save failed', error);
            showToast(t('common.error'), 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-espresso-midnight/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-espresso-midnight w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-espresso/10 dark:border-white/10">
                <div className="flex items-center justify-between px-8 py-6 border-b border-espresso/10 dark:border-white/5 bg-espresso/[0.02] dark:bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-terracotta/10 text-terracotta rounded-2xl">
                            <Activity size={24} />
                        </div>
                        <h2 className="text-2xl font-bold font-serif text-espresso-midnight dark:text-alabaster">
                            {id ? t('admin.ingredients.editIngredient') : t('admin.ingredients.newIngredient')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-espresso/5 dark:hover:bg-white/5 rounded-2xl transition-all text-espresso/40 hover:text-terracotta">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Temel Bilgiler */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-espresso/40 dark:text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Info size={14} /> {t('admin.ingredients.modal.basicInfo')}
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-espresso/60 dark:text-white/60">{t('admin.ingredients.modal.name')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-5 py-3 bg-white dark:bg-white/5 rounded-2xl border border-espresso/10 dark:border-white/10 focus:ring-4 focus:ring-terracotta/10 text-sm font-medium transition-all text-espresso-midnight dark:text-alabaster placeholder:text-espresso/20 dark:placeholder:text-white/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-espresso/60 dark:text-white/60">{t('admin.ingredients.modal.category')}</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as IngredientCategory })}
                                        className="w-full px-5 py-3 bg-white dark:bg-white/5 rounded-2xl border border-espresso/10 dark:border-white/10 focus:ring-4 focus:ring-terracotta/10 text-sm font-medium transition-all text-espresso-midnight dark:text-alabaster appearance-none cursor-pointer"
                                    >
                                        {Object.values(IngredientCategory).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-espresso/60 dark:text-white/60">{t('admin.ingredients.modal.physicalState')}</label>
                                        <select
                                            value={formData.physicalState}
                                            onChange={e => setFormData({ ...formData, physicalState: e.target.value as PhysicalState })}
                                            className="w-full px-5 py-3 bg-white dark:bg-white/5 rounded-2xl border border-espresso/10 dark:border-white/10 focus:ring-4 focus:ring-terracotta/10 text-sm font-medium transition-all text-espresso-midnight dark:text-alabaster appearance-none cursor-pointer"
                                        >
                                            {Object.values(PhysicalState).map(state => (
                                                <option key={state} value={state}>{state}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-espresso/60 dark:text-white/60">{t('admin.ingredients.modal.preferredUnit')}</label>
                                        <select
                                            value={formData.preferredUnit}
                                            onChange={e => setFormData({ ...formData, preferredUnit: e.target.value })}
                                            className="w-full px-5 py-3 bg-white dark:bg-white/5 rounded-2xl border border-espresso/10 dark:border-white/10 focus:ring-4 focus:ring-terracotta/10 text-sm font-medium transition-all text-espresso-midnight dark:text-alabaster appearance-none cursor-pointer"
                                        >
                                            {availableUnits.map(unit => {
                                                const normalizedKey = unit.toUpperCase()
                                                    .replace(/Ç/g, 'C')
                                                    .replace(/Ğ/g, 'G')
                                                    .replace(/İ/g, 'I')
                                                    .replace(/Ö/g, 'O')
                                                    .replace(/Ş/g, 'S')
                                                    .replace(/Ü/g, 'U');
                                                
                                                return (
                                                    <option key={unit} value={unit.toUpperCase()}>
                                                        {t(`admin.ingredients.modal.units.${normalizedKey}`, { 
                                                            defaultValue: unit.charAt(0).toUpperCase() + unit.slice(1) 
                                                        })}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-espresso/60 dark:text-white/60">{t('admin.ingredients.modal.density')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.density}
                                        onChange={e => setFormData({ ...formData, density: parseFloat(e.target.value) })}
                                        className="w-full px-5 py-3 bg-white dark:bg-white/5 rounded-2xl border border-espresso/10 dark:border-white/10 focus:ring-4 focus:ring-terracotta/10 text-sm font-medium transition-all text-espresso-midnight dark:text-alabaster"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Besin Değerleri */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-espresso/40 dark:text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity size={14} /> {t('admin.ingredients.modal.nutritionalValues')}
                            </h3>

                            <div className="bg-espresso/[0.02] dark:bg-white/[0.02] p-6 rounded-3xl border border-espresso/5 dark:border-white/5 space-y-6">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest mb-2 text-terracotta">{t('admin.ingredients.modal.calories')}</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.caloriesPer100g}
                                        onChange={e => setFormData({ ...formData, caloriesPer100g: parseFloat(e.target.value) })}
                                        className="w-full px-5 py-3 bg-white dark:bg-white/5 rounded-2xl border border-espresso/10 dark:border-white/10 focus:ring-4 focus:ring-terracotta/10 text-lg font-black text-espresso-midnight dark:text-alabaster"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-blue-500 text-center">{t('admin.ingredients.modal.protein')}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.proteinPer100g}
                                            onChange={e => setFormData({ ...formData, proteinPer100g: parseFloat(e.target.value) })}
                                            className="w-full px-2 py-3 bg-white dark:bg-white/5 rounded-2xl border border-espresso/10 dark:border-white/10 focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-center transition-all text-espresso-midnight dark:text-alabaster"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-amber-500 text-center">{t('admin.ingredients.modal.carbs')}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.carbsPer100g}
                                            onChange={e => setFormData({ ...formData, carbsPer100g: parseFloat(e.target.value) })}
                                            className="w-full px-2 py-3 bg-white dark:bg-white/5 rounded-2xl border border-espresso/10 dark:border-white/10 focus:ring-4 focus:ring-amber-500/10 text-sm font-bold text-center transition-all text-espresso-midnight dark:text-alabaster"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-sage text-center">{t('admin.ingredients.modal.fat')}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.fatPer100g}
                                            onChange={e => setFormData({ ...formData, fatPer100g: parseFloat(e.target.value) })}
                                            className="w-full px-2 py-3 bg-white dark:bg-white/5 rounded-2xl border border-espresso/10 dark:border-white/10 focus:ring-4 focus:ring-sage/10 text-sm font-bold text-center transition-all text-espresso-midnight dark:text-alabaster"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl flex items-start gap-3 border border-amber-100 dark:border-amber-900/20 shadow-sm">
                                <Info size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/60 leading-relaxed font-medium">
                                    {t('admin.settings.infoDesc')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 mt-10 pt-8 border-t border-espresso/10 dark:border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 text-xs font-black uppercase tracking-widest text-espresso/50 dark:text-white/50 hover:text-terracotta dark:hover:text-terracotta transition-all"
                        >
                            {t('admin.ingredients.modal.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex items-center gap-2 px-10 py-3 rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} strokeWidth={2.5} />
                            )}
                            {saving ? t('admin.ingredients.modal.saving') : t('admin.ingredients.modal.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminIngredientEditModal;
