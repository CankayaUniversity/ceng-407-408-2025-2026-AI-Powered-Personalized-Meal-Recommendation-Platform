import React, { useState, useMemo } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useSmartConsumption } from '../hooks/useSmartConsumption';
import { 
  ENTRY_MODE_OPTIONS,
  type EntryMode
} from '../types/SmartConsumption.types';
import { 
  locationLabel, 
  getSelectedItemNutrition, 
  sumNutrition, 
} from '../utils/SmartConsumption.utils';
import { LocationAndMealSelector } from './LocationAndMealSelector';
import { MemberSelection } from './MemberSelection';
import { SearchSection } from './SearchSection';
import { SelectedItemsList } from './SelectedItemsList';
import { QuickSummary } from './QuickSummary';
import { type RecipeIngredient } from '../../../types';

interface SmartConsumptionPanelProps {
  onConsumptionLogged?: () => void;
}

const formatNameList = (names: string[]) => {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ve ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]}`;
};

const SmartConsumptionPanel: React.FC<SmartConsumptionPanelProps> = ({ onConsumptionLogged }) => {
  const {
    user,
    inventoryGroups,
    selectedLocationId,
    setSelectedLocationId,
    entryMode,
    setEntryMode,
    mealType,
    setMealType,
    searchQuery,
    setSearchQuery,
    ingredientSearchQuery,
    setIngredientSearchQuery,
    recipeResults,
    ingredientResults,
    selectedItems,
    memberSelections,
    searching,
    isSearchStale,
    errorMessage,
    setErrorMessage,
    submitSummary,
    setSubmitSummary,
    submitting,
    selectedMembers,
    setSelectedMembersForLocation,
    isOutside,
    selectedGroup,
    handleRecipeSelect,
    handleIngredientSelect,
    handleRemoveItem,
    handleRemoveMemberItem,
    handleRecipePortionChange,
    handleIngredientPortionChange,
    handleSubmit,
    getIngredientUnits,
    unitWeights,
    ingredientSpecificWeights,
    recipeDetailsMap,
    memberQueries,
    setMemberQueries,
    memberResults
  } = useSmartConsumption(onConsumptionLogged);

  const activeMembers = useMemo(() => {
    const members = selectedMembers[selectedLocationId] || {};
    return Object.entries(members)
      .filter(([_, isSelected]) => isSelected)
      .map(([userId]) => userId);
  }, [selectedMembers, selectedLocationId]);

  const hasSelectedMembers = activeMembers.length > 0;
  const loggedInUserIdStr = user ? String(user.id) : '';

  const [manualInputs, setManualInputs] = useState<Set<string>>(new Set());

  const toggleManualInput = (key: string) => {
    setManualInputs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleManualPortionUpdate = (itemKey: string, ingredient: any, qty: string, unit: string, userId?: string) => {
    const grams = (ingredientSpecificWeights[ingredient.id]?.[unit.toLowerCase()] || unitWeights[unit.toLowerCase()] || 1) * (parseFloat(qty) || 0);
    const nextPortion = {
      id: `manual-${unit}-${qty}`,
      label: `${qty} ${unit}`,
      grams,
      portionSize: grams > 200 ? 'LARGE' as any : grams > 100 ? 'MEDIUM' as any : 'SMALL' as any,
      note: 'Manual entry'
    };
    handleIngredientPortionChange(itemKey, nextPortion, userId);
  };

  const handleQuickUnitAdjust = (itemKey: string, ingredient: any, unit: string, delta: number, userId?: string) => {
    const items = userId ? (memberSelections[userId] || []) : selectedItems;
    const item = items.find(i => i.key === itemKey);
    if (!item || item.kind !== 'INGREDIENT') return;

    const currentParts = item.portion.label.split(' ');
    const currentQty = parseFloat(currentParts[0]) || 0;
    const currentUnit = currentParts.length > 1 ? currentParts[1] : '';

    let nextQty: number;
    if (currentUnit.toLowerCase() === unit.toLowerCase()) {
      nextQty = Math.max(0, currentQty + delta);
    } else {
      nextQty = delta > 0 ? delta : 0;
    }

    if (nextQty <= 0) nextQty = 0.1;
    handleManualPortionUpdate(itemKey, ingredient, nextQty.toString(), unit, userId);
  };

  const inventoryDeductions = useMemo(() => {
    if (isOutside) return [];
    const summary: Record<number, { name: string; grams: number }> = {};
    const allItems = [...selectedItems, ...Object.values(memberSelections).flat()];
    
    allItems.forEach(item => {
      if (item.kind === 'INGREDIENT') {
        const id = item.ingredient.id;
        if (!summary[id]) summary[id] = { name: item.ingredient.name, grams: 0 };
        summary[id].grams += item.portion.grams;
      } else {
        const recipe = recipeDetailsMap[item.recipe.id];
        if (recipe?.ingredients) {
          recipe.ingredients.forEach((ri: RecipeIngredient) => {
            const id = ri.ingredientId;
            const name = ri.ingredient?.name || `Ingredient #${id}`;
            if (!summary[id]) summary[id] = { name, grams: 0 };
            summary[id].grams += ri.grams * item.portion.multiplier;
          });
        }
      }
    });
    return Object.values(summary).sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
  }, [selectedItems, memberSelections, recipeDetailsMap, isOutside]);

  const selectionLabel = useMemo(() => {
    const totalCount = selectedItems.length + Object.values(memberSelections).reduce((acc, items) => acc + items.length, 0);
    if (totalCount === 0) return 'Secim bekleniyor';
    return totalCount === 1 ? '1 oge hazir' : `${totalCount} oge hazir`;
  }, [selectedItems, memberSelections]);

  const nutritionPreview = useMemo(() => {
    const allItems = [...selectedItems, ...Object.values(memberSelections).flat()];
    return sumNutrition(allItems.map(getSelectedItemNutrition));
  }, [selectedItems, memberSelections]);

    const memberSummaryRows = useMemo(() => {
    const rows: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }> = [];
    if (selectedItems.length > 0 && user) {
      const nutrition = sumNutrition(selectedItems.map(getSelectedItemNutrition));
      rows.push({ 
        name: (user.firstName || user.name || 'Ben'), 
        calories: nutrition.calories || 0, 
        protein: nutrition.protein || 0,
        carbs: nutrition.carbs || 0,
        fat: nutrition.fat || 0
      });
    }
    Object.entries(memberSelections).forEach(([userId, items]) => {
      if (items.length === 0) return;
      const member = selectedGroup?.users.find((u: any) => String(u.id) === userId);
      const nutrition = sumNutrition(items.map(getSelectedItemNutrition));
      rows.push({ 
        name: member?.firstName || member?.name || `Üye #${userId}`, 
        calories: nutrition.calories || 0, 
        protein: nutrition.protein || 0,
        carbs: nutrition.carbs || 0,
        fat: nutrition.fat || 0
      });
    });
    return rows;
  }, [selectedItems, memberSelections, user, selectedGroup]);

  const summaryTitle = useMemo(() => {
    const totalCount = selectedItems.length + Object.values(memberSelections).reduce((acc, items) => acc + items.length, 0);
    return totalCount === 0 ? 'Secimini bekliyorum' : `${totalCount} öğe seçildi`;
  }, [selectedItems, memberSelections]);

  const summarySubtitle = useMemo(() => 
    memberSummaryRows.length > 1 ? `${memberSummaryRows.length} farklı kişi için tüketim girişi yapılıyor.` : null
  , [memberSummaryRows]);

  const activeEntryModeLabel = ENTRY_MODE_OPTIONS.find((option) => option.value === entryMode)?.label ?? entryMode;
  
  const successTitle = submitSummary
    ? submitSummary.failedNames.length > 0
        ? `${submitSummary.responses.length} oge kaydedildi, ${submitSummary.failedNames.length} oge tekrar bekliyor`
        : `${submitSummary.responses.length} oge basariyla kaydedildi`
    : null;

  if (!user) return null;

  return (
    <section className="meal-card rounded-[2.75rem] shadow-brand-hero">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="meal-badge-neon px-4 text-[11px] font-bold tracking-[0.22em]">
              <Sparkles size={14} />
              Smart Consumption
            </div>
            <h2 className="meal-section-title mt-4 text-4xl lg:text-5xl">Ne yediğini hızlıca kaydet, gerekiyorsa stoğu otomatik düş.</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-espresso-midnight/60 dark:text-alabaster/60">
              Home veya Office seçersen tarifin içindeki malzemeler seçili lokasyondan otomatik düşülür. Outside / Other seçeneğinde ise yalnızca kalori ve makrolar loglanır.
            </p>
          </div>

          <div className="flex min-w-0 w-full flex-col gap-3 sm:max-w-[27rem]">
            <div className="meal-metric-card flex min-h-[3.8rem] w-full min-w-0 flex-col justify-between px-4 py-2 dark:bg-white/5">
              <p className="meal-overline tracking-[0.18em]">Mode</p>
              <p className="mt-1.5 line-clamp-2 min-h-[1.6rem] font-serif text-[1.02rem] font-bold text-espresso-midnight dark:text-alabaster">{activeEntryModeLabel}</p>
            </div>
            <div className="meal-metric-card flex min-h-[3.8rem] w-full min-w-0 flex-col justify-between px-4 py-2 dark:bg-white/5">
              <p className="meal-overline tracking-[0.18em]">Location</p>
              <p className="mt-1.5 line-clamp-2 min-h-[1.6rem] font-serif text-[1.02rem] font-bold text-espresso-midnight dark:text-alabaster">{locationLabel(selectedGroup)}</p>
            </div>
            <div className="meal-metric-card flex min-h-[3.8rem] w-full min-w-0 flex-col justify-between border-terracotta/20 px-4 py-2 dark:bg-white/5">
              <p className="meal-overline tracking-[0.18em]">Selected</p>
              <p className="mt-1.5 line-clamp-2 min-h-[1.6rem] font-serif text-[1.02rem] font-bold text-terracotta">{selectionLabel}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2.5rem] bg-white/40 p-6 backdrop-blur-sm dark:bg-white/[0.02]">
          <LocationAndMealSelector 
            inventoryGroups={inventoryGroups}
            selectedLocationId={selectedLocationId}
            onLocationChange={(id) => { setSelectedLocationId(id); setSubmitSummary(null); }}
            mealType={mealType}
            onMealTypeChange={(type) => { setMealType(type); setSubmitSummary(null); }}
            isOutside={isOutside}
          />

          <MemberSelection 
            selectedGroup={selectedGroup}
            selectedLocationId={selectedLocationId}
            selectedMembers={selectedMembers}
            onToggleMember={(userId) => {
              setSelectedMembersForLocation(prev => {
                const isSelected = !(prev[selectedLocationId]?.[userId] ?? false);
                const next = { ...prev, [selectedLocationId]: { ...(prev[selectedLocationId] || {}), [userId]: isSelected } };
                return next;
              });
            }}
            loggedInUserId={loggedInUserIdStr}
          />
        </div>

        <div className="mt-2 grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <SearchSection 
            entryMode={entryMode}
            onEntryModeChange={(mode) => { setEntryMode(mode); setErrorMessage(null); setSubmitSummary(null); }}
            searchQuery={searchQuery}
            onSearchQueryChange={(q) => { setSearchQuery(q); setErrorMessage(null); setSubmitSummary(null); }}
            ingredientSearchQuery={ingredientSearchQuery}
            onIngredientSearchQueryChange={(q) => { setIngredientSearchQuery(q); setErrorMessage(null); setSubmitSummary(null); }}
            searching={searching}
            isSearchStale={isSearchStale}
            recipeResults={recipeResults}
            ingredientResults={ingredientResults}
            onRecipeSelect={handleRecipeSelect}
            onIngredientSelect={handleIngredientSelect}
          />

          <div className="space-y-6">
            <SelectedItemsList 
              selectedItems={selectedItems}
              submitting={submitting}
              onRemoveItem={handleRemoveItem}
              onRecipePortionChange={handleRecipePortionChange}
              getIngredientUnits={getIngredientUnits}
              unitWeights={unitWeights}
              ingredientSpecificWeights={ingredientSpecificWeights}
              onQuickUnitAdjust={(key, ing, unit, delta) => handleQuickUnitAdjust(key, ing, unit, delta)}
              manualInputs={manualInputs}
              toggleManualInput={toggleManualInput}
              onManualPortionUpdate={(key, ing, qty, unit) => handleManualPortionUpdate(key, ing, qty, unit)}
            />

            {errorMessage && (
              <div className="rounded-[1.8rem] border border-terracotta/20 bg-terracotta/5 px-4 py-4 text-sm font-bold text-terracotta">{errorMessage}</div>
            )}

            {submitSummary && successTitle && (
              <div className="rounded-[1.8rem] border border-moss-sage/30 bg-moss-sage/10 px-4 py-4 text-moss-forest">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-moss-sage" />
                  <div>
                    <p className="font-semibold">{successTitle}</p>
                    <p className="mt-1 text-sm text-moss-forest/80">{formatNameList(submitSummary.responses.map(r => r.foodName))}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasSelectedMembers && (
          <div className="mt-12 space-y-12 border-t border-espresso-midnight/5 pt-12 dark:border-alabaster/5">
            {activeMembers.map(userId => {
              const member = selectedGroup?.users.find((u: any) => String(u.id) === userId);
              const mState = { 
                ...(memberQueries[userId] || { query: '', mode: 'RECIPE' as EntryMode }), 
                ...(memberResults[userId] || { recipeResults: [], ingredientResults: [], searching: false }) 
              };
              const mSelections = memberSelections[userId] || [];
              
              return (
                <div key={userId} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-terracotta text-white font-bold font-serif">
                      {member?.firstName?.charAt(0) || member?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-espresso-midnight dark:text-alabaster">
                        {member?.firstName || member?.name} için Seçim
                      </h3>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                    <SearchSection 
                      userId={userId}
                      entryMode={mState.mode}
                      onEntryModeChange={(mode) => {
                        setMemberQueries(prev => ({ 
                          ...prev, 
                          [userId]: { 
                            ...(prev[userId] || { query: '', mode: 'RECIPE' as EntryMode }), 
                            mode 
                          } 
                        }));
                      }}
                      searchQuery={mState.mode === 'RECIPE' ? (mState.query || '') : ''}
                      onSearchQueryChange={(q) => {
                        setMemberQueries(prev => ({ 
                          ...prev, 
                          [userId]: { 
                            ...(prev[userId] || { query: '', mode: 'RECIPE' as EntryMode }), 
                            query: q || '' 
                          } 
                        }));
                      }}
                      ingredientSearchQuery={mState.mode === 'INGREDIENT' ? (mState.query || '') : ''}
                      onIngredientSearchQueryChange={(q) => {
                        setMemberQueries(prev => ({ 
                          ...prev, 
                          [userId]: { 
                            ...(prev[userId] || { query: '', mode: 'RECIPE' as EntryMode }), 
                            query: q || '' 
                          } 
                        }));
                      }}
                      searching={mState.searching}
                      isSearchStale={false}
                      recipeResults={mState.recipeResults || []}
                      ingredientResults={mState.ingredientResults || []}
                      onRecipeSelect={handleRecipeSelect}
                      onIngredientSelect={handleIngredientSelect}
                    />
                    
                    <SelectedItemsList 
                      userId={userId}
                      title={`${member?.firstName || member?.name} için Seçilenler`}
                      selectedItems={mSelections}
                      submitting={submitting}
                      onRemoveItem={(key) => handleRemoveMemberItem(userId, key)}
                      onRecipePortionChange={handleRecipePortionChange}
                      getIngredientUnits={getIngredientUnits}
                      unitWeights={unitWeights}
                      ingredientSpecificWeights={ingredientSpecificWeights}
                      onQuickUnitAdjust={(key, ing, unit, delta, uid) => handleQuickUnitAdjust(key, ing, unit, delta, uid)}
                      manualInputs={manualInputs}
                      toggleManualInput={toggleManualInput}
                      onManualPortionUpdate={(key, ing, qty, unit, uid) => handleManualPortionUpdate(key, ing, qty, unit, uid)}
                    />
                  </div>
                </div>
              );
            })}
            
            {errorMessage && (
              <div className="rounded-[1.8rem] border border-terracotta/20 bg-terracotta/5 px-4 py-4 text-sm font-bold text-terracotta">{errorMessage}</div>
            )}

            {submitSummary && successTitle && (
              <div className="rounded-[1.8rem] border border-moss-sage/30 bg-moss-sage/10 px-4 py-4 text-moss-forest">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-moss-sage" />
                  <div>
                    <p className="font-semibold">{successTitle}</p>
                    <p className="mt-1 text-sm text-moss-forest/80">{formatNameList(submitSummary.responses.map(r => r.foodName))}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <QuickSummary 
          summaryTitle={summaryTitle}
          summarySubtitle={summarySubtitle}
          entryMode={entryMode}
          nutritionPreview={nutritionPreview}
          memberSummaryRows={memberSummaryRows}
          inventoryDeductions={inventoryDeductions}
          isOutside={isOutside}
          selectedGroup={selectedGroup}
          submitting={submitting}
          selectedItemsCount={selectedItems.length}
          memberSelectionsCount={Object.values(memberSelections).flat().length}
        />
      </form>
    </section>
  );
};

export default SmartConsumptionPanel;
