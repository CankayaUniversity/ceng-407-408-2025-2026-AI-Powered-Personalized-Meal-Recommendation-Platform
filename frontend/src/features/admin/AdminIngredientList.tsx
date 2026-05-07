import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Search, Edit2, Trash2, Database, 
    ChevronRight, ChevronLeft, Plus
} from 'lucide-react';
import { useIngredientService } from '../../services/ingredientService';
import { useAdminService } from '../../services/adminService';
import { useToast } from '../../shared/hooks/useToast';
import { Ingredient } from '../../types';
import AdminIngredientEditModal from './AdminIngredientEditModal';

const AdminIngredientList: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const ingredientService = useIngredientService();
    const adminService = useAdminService();
    
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const loadIngredients = async () => {
        setLoading(true);
        try {
            // Admin için özel listeleme yoksa arama ile hepsini getiriyoruz
            const data = await ingredientService.searchIngredients(searchTerm, 1000);
            setIngredients(data);
            setCurrentPage(1); // Arama değişince ilk sayfaya dön
        } catch (error) {
            console.error('Failed to load ingredients', error);
            showToast(t('common.error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadIngredients();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleEdit = (id: number) => {
        setSelectedIngredientId(id);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(t('admin.ingredients.deleteConfirm'))) return;
        
        try {
            await adminService.deleteIngredient(id);
            setIngredients(ingredients.filter(i => i.id !== id));
            showToast(t('admin.ingredients.successDelete'), 'success');
        } catch (error) {
            showToast(t('admin.ingredients.errorDelete'), 'error');
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(ingredients.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = ingredients.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="meal-section-title mb-1">
                        {t('admin.ingredients.title')}
                    </h1>
                    <p className="text-espresso/60 dark:text-alabaster/60 text-sm">
                        {t('admin.ingredients.subtitle')}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95"
                        onClick={() => { setSelectedIngredientId(null); setIsEditModalOpen(true); }}
                    >
                        <Plus size={16} strokeWidth={3} />
                        {t('admin.ingredients.newIngredient')}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-espresso-midnight/40 rounded-3xl border border-espresso/10 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-espresso/10 dark:border-white/5 bg-espresso/[0.02] dark:bg-white/[0.02]">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso/30 dark:text-white/30 group-focus-within:text-terracotta transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder={t('admin.ingredients.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-background dark:bg-espresso-midnight/60 rounded-2xl border-none focus:ring-4 focus:ring-terracotta/10 transition-all text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-espresso/40 dark:text-white/40 border-b border-espresso/10 dark:border-white/5 bg-espresso/[0.01] dark:bg-white/[0.01]">
                                <th className="px-6 py-5">{t('admin.ingredients.table.name')}</th>
                                <th className="px-6 py-5">{t('admin.ingredients.table.category')}</th>
                                <th className="px-6 py-5 text-center">{t('admin.ingredients.table.caloriesPer100g')}</th>
                                <th className="px-6 py-5 text-center">{t('admin.ingredients.table.macros')}</th>
                                <th className="px-6 py-5 text-center">{t('admin.ingredients.table.preferredUnit')}</th>
                                <th className="px-6 py-5 text-right">{t('admin.ingredients.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-espresso/5 dark:divide-white/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-5">
                                            <div className="h-10 bg-espresso/5 dark:bg-white/5 rounded-xl w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : ingredients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-espresso/40 dark:text-white/30">
                                        <Database className="mx-auto mb-3 opacity-20" size={40} />
                                        <p>{t('admin.ingredients.noIngredientFound')}</p>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((ingredient) => (
                                    <tr key={ingredient.id} className="hover:bg-espresso/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-espresso-midnight dark:text-alabaster">
                                                {ingredient.name}
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-tighter text-espresso/30 dark:text-white/20">
                                                {t('admin.ingredients.id')}: #{ingredient.id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-espresso/60 dark:text-alabaster/50">
                                            <span className="px-2.5 py-1 bg-espresso/5 dark:bg-white/10 rounded-lg font-medium">
                                                {ingredient.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center text-sm font-bold">
                                            {ingredient.caloriesPer100g?.toFixed(1) || '0.0'} <span className="text-[10px] font-medium opacity-40 uppercase">kcal</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-xs font-black">
                                                <span className="text-terracotta">{ingredient.proteinPer100g?.toFixed(1) || '0'}</span>
                                                <span className="text-espresso/10 dark:text-white/10">/</span>
                                                <span className="text-amber-500">{ingredient.carbsPer100g?.toFixed(1) || '0'}</span>
                                                <span className="text-espresso/10 dark:text-white/10">/</span>
                                                <span className="text-sage">{ingredient.fatPer100g?.toFixed(1) || '0'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                ingredient.preferredUnit 
                                                    ? 'bg-terracotta/10 text-terracotta dark:bg-terracotta/20' 
                                                    : 'bg-espresso/5 text-espresso/40 dark:bg-white/5 dark:text-white/30'
                                            }`}>
                                                {ingredient.preferredUnit 
                                                    ? t(`admin.ingredients.modal.units.${ingredient.preferredUnit.toUpperCase()
                                                        .replace(/Ç/g, 'C')
                                                        .replace(/Ğ/g, 'G')
                                                        .replace(/İ/g, 'I')
                                                        .replace(/Ö/g, 'O')
                                                        .replace(/Ş/g, 'S')
                                                        .replace(/Ü/g, 'U')}`) 
                                                    : t('admin.ingredients.notSelected')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                <button 
                                                    onClick={() => handleEdit(ingredient.id)}
                                                    className="p-2 text-espresso/40 hover:text-terracotta dark:text-white/40 dark:hover:text-terracotta hover:bg-terracotta/10 rounded-xl transition-all shadow-sm border border-espresso/5 dark:border-white/5 bg-white dark:bg-espresso-midnight"
                                                    title={t('admin.ingredients.edit')}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(ingredient.id)}
                                                    className="p-2 text-espresso/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shadow-sm border border-espresso/5 dark:border-white/5 bg-white dark:bg-espresso-midnight"
                                                    title={t('admin.ingredients.delete')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-espresso/10 dark:border-white/5 flex items-center justify-between bg-espresso/[0.01] dark:bg-white/[0.01]">
                        <div className="text-xs font-bold text-espresso/40 dark:text-white/40 uppercase tracking-widest">
                            {t('common.page')} {currentPage} / {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl hover:bg-espresso/5 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                    let pageNum = currentPage;
                                    if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                    
                                    if (pageNum <= 0 || pageNum > totalPages) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => paginate(pageNum)}
                                            className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                                                currentPage === pageNum 
                                                    ? 'bg-terracotta text-white shadow-md' 
                                                    : 'hover:bg-espresso/5 dark:hover:bg-white/5 text-espresso/40 dark:text-white/40'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl hover:bg-espresso/5 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isEditModalOpen && (
                <AdminIngredientEditModal 
                    id={selectedIngredientId} 
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedIngredientId(null);
                    }}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        setSelectedIngredientId(null);
                        loadIngredients();
                        showToast(t('admin.ingredients.successAction'), 'success');
                    }}
                />
            )}
        </div>
    );
};

export default AdminIngredientList;
