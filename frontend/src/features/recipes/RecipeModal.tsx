import React, { useState, useEffect } from 'react';
import { X, ChefHat, Clock, Users, Plus, Trash2, Save, Send, Loader2, Camera, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../infrastructure/ui/UIContext';
import { useRecipeService } from '../../services/recipeService';
import { useToast } from '../../shared/hooks/useToast';
import ModalPortal from '../../shared/components/ModalPortal';
import { RecipeRequest } from '../../types';
import { useIngredientLookup } from '../../shared/hooks/useIngredientLookup';

const RecipeModal: React.FC = () => {
    const { t } = useTranslation();
    const { isRecipeModalOpen, closeRecipeModal, recipeToEdit } = useUI();
    const recipeService = useRecipeService();
    const { showToast } = useToast();

    // Form states
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('main');
    const [prepTime, setPrepTime] = useState<number>(30);
    const [servings, setServings] = useState<number>(2);
    const [instructions, setInstructions] = useState('');
    const [ingredients, setIngredients] = useState<{ ingredientId: number, name: string, amount: number, unit: string, grams: number }[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    
    // UI states
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const {
        results: searchResults,
        searching: isSearching
    } = useIngredientLookup({
        query: searchQuery,
        enabled: isRecipeModalOpen && isSearchFocused
    });

    useEffect(() => {
        const fetchDetails = async () => {
            if (recipeToEdit && isRecipeModalOpen) {
                // Temel verileri hemen set et (liste verisinden gelenler)
                setTitle(recipeToEdit.title || '');
                setCategory(recipeToEdit.category || 'main');
                setPrepTime(recipeToEdit.preparationTimeMinutes || 30);
                setServings(recipeToEdit.servings || 2);
                setImagePreview(recipeToEdit.imageUrl || null);
                setImageFile(null);
                setStatus(recipeToEdit.status || null);

                // Eğer detaylar eksikse (ingredients veya instructions yoksa) backend'den çek
                if (!recipeToEdit.ingredients || !recipeToEdit.instructions) {
                    try {
                        setIsLoadingDetails(true);
                        const fullRecipe = await recipeService.getRecipeById(recipeToEdit.id);
                        setInstructions(fullRecipe.instructions || '');
                        if (fullRecipe.ingredients) {
                            setIngredients(fullRecipe.ingredients.map((ing: any) => ({
                                ingredientId: ing.ingredientId || ing.id,
                                name: ing.name || ing.ingredient?.name,
                                amount: ing.amount,
                                unit: ing.unit,
                                grams: ing.grams
                            })));
                        } else {
                            setIngredients([]);
                        }
                    } catch (err) {
                        console.error("Failed to fetch recipe details:", err);
                        setInstructions(recipeToEdit.instructions || '');
                    } finally {
                        setIsLoadingDetails(false);
                    }
                } else {
                    // Detaylar zaten varsa (nadiren liste verisinde tam olabilir)
                    setInstructions(recipeToEdit.instructions || '');
                    setIngredients(recipeToEdit.ingredients.map((ing: any) => ({
                        ingredientId: ing.ingredientId || ing.id,
                        name: ing.name || ing.ingredient?.name,
                        amount: ing.amount,
                        unit: ing.unit,
                        grams: ing.grams
                    })));
                }
            } else if (!isRecipeModalOpen) {
                resetForm();
            }
        };

        fetchDetails();
    }, [recipeToEdit, isRecipeModalOpen, recipeService]);

    const resetForm = () => {
        setTitle('');
        setCategory('main');
        setPrepTime(30);
        setServings(2);
        setInstructions('');
        setIngredients([]);
        setImageFile(null);
        setImagePreview(null);
        setStatus(null);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Lütfen geçerli bir görsel dosyası seçin.', 'error');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddIngredient = (ing: any) => {
        const unit = (ing.preferredUnit || (ing.physicalState === 'LIQUID' ? 'ML' : 'GRAM')).toUpperCase();
        const defaultAmount = unit === 'GRAM' || unit === 'ML' ? 100 : 1;

        // Aynı malzeme ve aynı birim kontrolü
        const existingIndex = ingredients.findIndex(i => i.ingredientId === ing.id && i.unit.toUpperCase() === unit);

        if (existingIndex !== -1) {
            // Malzeme zaten aynı birimle listede var, miktarı topla
            const updatedIngredients = [...ingredients];
            const oldAmount = updatedIngredients[existingIndex].amount;
            const newAmount = oldAmount + defaultAmount;
            updatedIngredients[existingIndex] = {
                ...updatedIngredients[existingIndex],
                amount: newAmount
            };
            setIngredients(updatedIngredients);
            showToast(`${ing.name} zaten listedeydi, miktarı ${newAmount} ${unit} olarak güncellendi.`, 'success');
        } else {
            // Malzeme yok veya farklı birimle var, yeni satır ekle
            setIngredients([...ingredients, { 
                ingredientId: ing.id, 
                name: ing.name, 
                amount: defaultAmount, 
                unit: unit,
                grams: 100 
            }]);
        }
        
        setSearchQuery('');
        setIsSearchFocused(false);
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleAmountChange = (index: number, amount: number) => {
        setIngredients(ingredients.map((ing, i) => i === index ? { ...ing, amount } : ing));
    };

    const handleUnitChange = (index: number, unit: string) => {
        const normalizedUnit = unit.toUpperCase();
        const currentIng = ingredients[index];

        // Aynı malzeme için başka bir satırda bu yeni birim zaten var mı?
        const duplicateIndex = ingredients.findIndex((ing, i) =>
            i !== index &&
            ing.ingredientId === currentIng.ingredientId &&
            ing.unit.toUpperCase() === normalizedUnit
        );

        if (duplicateIndex !== -1) {
            // Birim değiştirildiğinde aynı malzemenin aynı birimli başka bir satırı varsa birleştir
            const newAmount = ingredients[duplicateIndex].amount + currentIng.amount;
            const updatedIngredients = ingredients.filter((_, i) => i !== index);
            
            // Filter sonrası index değişmiş olabilir, ingredientId ve unit ile tekrar bul
            const targetIndex = updatedIngredients.findIndex(ing => 
                ing.ingredientId === currentIng.ingredientId && 
                ing.unit.toUpperCase() === normalizedUnit
            );
            
            updatedIngredients[targetIndex] = {
                ...updatedIngredients[targetIndex],
                amount: newAmount
            };

            setIngredients(updatedIngredients);
            showToast(`${currentIng.name} miktarları birleştirildi: ${newAmount} ${normalizedUnit}`, 'success');
        } else {
            setIngredients(ingredients.map((ing, i) => i === index ? { ...ing, unit: normalizedUnit } : ing));
        }
    };

    const handleSubmit = async (isPublishing: boolean) => {
        if (!title.trim()) {
            showToast('Lütfen bir başlık girin.', 'error');
            return;
        }

        const request: RecipeRequest = {
            title,
            category,
            preparationTimeMinutes: prepTime,
            servings,
            instructions,
            ingredients: ingredients.map(i => ({ 
                ingredientId: i.ingredientId,
                ingredientName: i.name,
                amount: i.amount, 
                unit: i.unit,
                grams: i.grams
            })),
            status: isPublishing ? 'PENDING' : 'DRAFT'
        } as RecipeRequest;

        try {
            if (!isPublishing) setIsSaving(true); else setIsSending(true);
            
            let savedRecipe: any;
            if (recipeToEdit) {
                savedRecipe = await recipeService.updateRecipe(recipeToEdit.id, request);
                showToast(isPublishing ? 'Tarif güncellendi ve onaya gönderildi.' : 'Taslak güncellendi.', 'success');
            } else {
                savedRecipe = await recipeService.createRecipe(request);
                showToast(isPublishing ? 'Tarif oluşturuldu ve onaya gönderildi.' : 'Tarif taslak olarak kaydedildi.', 'success');
            }

            // Görsel varsa yükle
            if (imageFile && savedRecipe?.id) {
                await recipeService.uploadRecipeImage(savedRecipe.id, imageFile);
            }

            closeRecipeModal();
        } catch (err: any) {
            showToast(err.message || 'Bir hata oluştu.', 'error');
        } finally {
            setIsSaving(false);
            setIsSending(false);
        }
    };

    if (!isRecipeModalOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-espresso-midnight/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div 
                    className="relative w-full max-w-4xl bg-white dark:bg-espresso-midnight rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-terracotta text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl">
                                <ChefHat size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-bold">
                                    {recipeToEdit ? t('recipes.modal.editTitle') : t('recipes.modal.addTitle')}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                                        {recipeToEdit ? 'TARİFİ GÜNCELLE' : 'YENİ LEZZET OLUŞTUR'}
                                    </p>
                                    {status && (
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border border-white/20 bg-white/10`}>
                                            {t(`recipes.status.${status.toLowerCase()}`)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={closeRecipeModal}
                            className="p-3 hover:bg-white/10 rounded-2xl transition-all hover:rotate-90"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {isLoadingDetails ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 size={40} className="animate-spin text-terracotta" />
                                <p className="text-sm font-bold text-foreground-muted animate-pulse uppercase tracking-widest">
                                    Mevcut veriler yükleniyor...
                                </p>
                            </div>
                        ) : (
                            <div className="p-8 md:p-12 space-y-12 animate-in fade-in duration-500">
                                {/* Basics Section */}
                                <section className="space-y-6">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-terracotta flex items-center gap-3">
                                        <span className="w-8 h-px bg-terracotta/30" />
                                        {t('recipes.modal.basics')}
                                    </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Image Upload Area */}
                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">
                                            TARİF GÖRSELİ
                                        </label>
                                        <div className="flex gap-6 items-center">
                                            <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden border-2 border-dashed border-card-border bg-black/5 dark:bg-white/5 flex items-center justify-center group shrink-0">
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon size={32} className="text-foreground/20" />
                                                )}
                                                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                    <Camera size={24} className="text-white" />
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                                </label>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <p className="text-sm font-bold text-espresso-midnight dark:text-white">Lezzetli Bir Kare Ekleyin</p>
                                                <p className="text-xs text-foreground-muted">Tarifinizin iştah kabartıcı görünmesi onay şansını artırır.</p>
                                                <div className="flex items-center gap-2">
                                                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-card-border rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:border-terracotta transition-colors">
                                                        {imageFile ? 'GÖRSELİ DEĞİŞTİR' : 'GÖRSEL SEÇ'}
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                                    </label>
                                                    {imageFile && (
                                                        <button 
                                                            onClick={() => {
                                                                setImageFile(null);
                                                                setImagePreview(recipeToEdit?.imageUrl || null);
                                                            }}
                                                            className="px-4 py-2 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors rounded-xl"
                                                        >
                                                            İPTAL
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">
                                            {t('recipes.modal.titleLabel')}
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder={t('recipes.modal.titlePlaceholder')}
                                            className="base-input w-full py-4 bg-black/5 dark:bg-white/5 border-transparent focus:border-terracotta/50 font-bold"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">
                                            {t('recipes.modal.categoryLabel')}
                                        </label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="base-input w-full py-4 px-6 bg-black/5 dark:bg-white/5 border-transparent focus:border-terracotta/50 font-bold appearance-none cursor-pointer"
                                        >
                                            <option value="main">{t('recipes.categories.main')}</option>
                                            <option value="breakfast">{t('recipes.categories.breakfast')}</option>
                                            <option value="salad">{t('recipes.categories.salad')}</option>
                                            <option value="dessert">{t('recipes.categories.dessert')}</option>
                                            <option value="fit">{t('recipes.categories.fit')}</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">
                                                {t('recipes.modal.timeLabel')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={prepTime}
                                                    onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                                                    className="base-input w-full py-4 pl-12 bg-black/5 dark:bg-white/5 border-transparent focus:border-terracotta/50 font-bold"
                                                />
                                                <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-terracotta" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">
                                                {t('recipes.modal.servingsLabel')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={servings}
                                                    onChange={(e) => setServings(parseInt(e.target.value) || 0)}
                                                    className="base-input w-full py-4 pl-12 bg-black/5 dark:bg-white/5 border-transparent focus:border-terracotta/50 font-bold"
                                                />
                                                <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-terracotta" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Ingredients Section */}
                            <section className="space-y-6">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-terracotta flex items-center gap-3">
                                    <span className="w-8 h-px bg-terracotta/30" />
                                    {t('recipes.modal.ingredients')}
                                </h3>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setIsSearchFocused(true)}
                                            placeholder={t('recipes.modal.ingredientPlaceholder')}
                                            className="base-input w-full py-4 pl-12 bg-black/5 dark:bg-white/5 border-transparent focus:border-terracotta/50"
                                        />
                                        <Plus size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-terracotta" />
                                        
                                        {/* Dropdown Results */}
                                        {isSearchFocused && (searchQuery || isSearching) && (
                                            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-espresso-midnight rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden max-h-60 overflow-y-auto">
                                                {isSearching ? (
                                                    <div className="p-4 flex items-center gap-3 text-sm text-foreground/40 italic">
                                                        <Loader2 size={16} className="animate-spin text-terracotta" />
                                                        {t('common.loading')}
                                                    </div>
                                                ) : searchResults.length > 0 ? (
                                                    searchResults.map(ing => (
                                                        <button
                                                            key={ing.id}
                                                            onClick={() => handleAddIngredient(ing)}
                                                            className="w-full text-left p-4 hover:bg-terracotta/5 flex justify-between items-center group transition-colors border-b border-black/5 last:border-0"
                                                        >
                                                            <span className="font-bold">{ing.name}</span>
                                                            <Plus size={16} className="text-terracotta opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-sm text-foreground/40 italic">Sonuç bulunamadı</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Ingredient List */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {ingredients.map((ing, index) => (
                                            <div key={`${ing.ingredientId}-${index}`} className="flex flex-col gap-3 p-5 bg-black/5 dark:bg-white/5 rounded-[2rem] border border-transparent hover:border-terracotta/20 transition-all group shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-bold text-foreground">{ing.name}</p>
                                                    <button 
                                                        onClick={() => handleRemoveIngredient(index)}
                                                        className="p-2 text-foreground/20 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={ing.amount}
                                                        onChange={(e) => handleAmountChange(index, parseFloat(e.target.value) || 0)}
                                                        className="flex-1 py-2 bg-white dark:bg-black/20 border border-card-border rounded-xl text-center font-bold text-sm focus:border-terracotta outline-none"
                                                        placeholder="0"
                                                    />
                                                    <select
                                                        value={ing.unit}
                                                        onChange={(e) => handleUnitChange(index, e.target.value)}
                                                        className="w-28 py-2 bg-white dark:bg-black/20 border border-card-border rounded-xl text-center font-bold text-[10px] focus:border-terracotta outline-none uppercase"
                                                    >
                                                        <option value="GRAM">Gram</option>
                                                        <option value="KG">Kg</option>
                                                        <option value="ML">Ml</option>
                                                        <option value="L">Litre</option>
                                                        <option value="ADET">Adet</option>
                                                        <option value="DİŞ">Diş</option>
                                                        <option value="DEMET">Demet</option>
                                                        <option value="DAL">Dal</option>
                                                        <option value="TUTAM">Tutam</option>
                                                        <option value="BARDAK">Bardak</option>
                                                        <option value="KAŞIK">Kaşık</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Instructions Section */}
                            <section className="space-y-6">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-terracotta flex items-center gap-3">
                                    <span className="w-8 h-px bg-terracotta/30" />
                                    {t('recipes.modal.instructionsLabel')}
                                </h3>
                                <textarea
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder={t('recipes.modal.instructionsPlaceholder')}
                                    rows={8}
                                    className="base-input w-full p-6 bg-black/5 dark:bg-white/5 border-transparent focus:border-terracotta/50 font-medium leading-relaxed resize-none custom-scrollbar"
                                />
                            </section>
                        </div>
                    )}
                </div>

                    {/* Footer */}
                    <div className="p-8 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={isSaving || isSending}
                            className="flex-1 py-4 bg-espresso-midnight text-white dark:bg-white/5 dark:text-white font-black text-[10px] rounded-2xl hover:bg-espresso-midnight/90 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {t('recipes.modal.saveDraft')}
                        </button>
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={isSaving || isSending}
                            className="flex-[1.5] py-4 bg-terracotta text-white font-black text-[10px] rounded-2xl shadow-brand-hero hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {t('recipes.modal.submitForApproval')}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default RecipeModal;
