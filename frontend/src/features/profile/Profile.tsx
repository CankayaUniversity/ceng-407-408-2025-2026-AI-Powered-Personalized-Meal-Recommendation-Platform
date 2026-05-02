import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Flame,
  Loader2,
  LogOut,
  RefreshCcw,
  Save,
  Shield,
  User as UserIcon,
  X
} from 'lucide-react';
import { useAuth, type AuthUser } from '../../infrastructure/auth/AuthContext';
import { ApiError, NotFoundError, ValidationError } from '../../services/errors';
import { useUserService } from '../../services/userService';
import { ActivityLevel, DietaryGoal, DietType, Gender, type User } from '../../types';
import TastePreferencePicker from './TastePreferencePicker';
import { useToast } from '../../shared/hooks/useToast';

interface ProfileFormState {
  weight: string;
  height: string;
  age: string;
  gender: Gender | '';
  activityLevel: ActivityLevel | '';
  dietType: DietType | '';
  dietaryGoal: DietaryGoal | '';
  allergies: string[];
  dislikedIngredients: string[];
}

const genderOptions = (t: Function) => [
  { value: Gender.MALE, label: t('profile.gender.male') },
  { value: Gender.FEMALE, label: t('profile.gender.female') },
  { value: Gender.OTHER, label: t('profile.gender.other') }
];

const activityOptions = (t: Function) => [
  { value: ActivityLevel.SEDENTARY, label: t('profile.activity.sedentary') },
  { value: ActivityLevel.LIGHTLY_ACTIVE, label: t('profile.activity.lightlyActive') },
  { value: ActivityLevel.MODERATELY_ACTIVE, label: t('profile.activity.moderatelyActive') },
  { value: ActivityLevel.VERY_ACTIVE, label: t('profile.activity.veryActive') },
  { value: ActivityLevel.EXTRA_ACTIVE, label: t('profile.activity.extraActive') }
];

const dietOptions = (t: Function) => [
  { value: DietType.NONE, label: t('profile.diet.none') },
  { value: DietType.VEGAN, label: t('profile.diet.vegan') },
  { value: DietType.VEGETARIAN, label: t('profile.diet.vegetarian') },
  { value: DietType.KETO, label: t('profile.diet.keto') },
  { value: DietType.PALEO, label: t('profile.diet.paleo') },
  { value: DietType.GLUTEN_FREE, label: t('profile.diet.glutenFree') }
];

const goalOptions = (t: Function) => [
  { value: DietaryGoal.LOSE_WEIGHT, label: t('profile.goal.loseWeight') },
  { value: DietaryGoal.MAINTAIN_WEIGHT, label: t('profile.goal.maintainWeight') },
  { value: DietaryGoal.GAIN_WEIGHT, label: t('profile.goal.gainWeight') },
  { value: DietaryGoal.BUILD_MUSCLE, label: t('profile.goal.buildMuscle') }
];

const emptyForm = (): ProfileFormState => ({
  weight: '', height: '', age: '', gender: '',
  activityLevel: '', dietType: '', dietaryGoal: '',
  allergies: [], dislikedIngredients: []
});

const buildDisplayName = (authUser: AuthUser | undefined): string => {
  if (!authUser) return '';
  return [authUser.firstName, authUser.lastName].filter(Boolean).join(' ').trim() || authUser.username;
};

const getInitials = (authUser: AuthUser | undefined): string => {
  if (!authUser) return 'AI';
  const fullName = [authUser.firstName, authUser.lastName].filter(Boolean);
  return fullName.length > 0
      ? fullName.map((part) => part![0]).join('').slice(0, 2).toUpperCase()
      : authUser.username.slice(0, 2).toUpperCase();
};

const normalizePreferenceList = (values: string[]): string[] => {
  const seen = new Set<string>();
  return values.reduce<string[]>((acc, item) => {
    const value = item.trim();
    const key = value.toLocaleLowerCase('tr-TR');
    if (!value || seen.has(key)) return acc;
    seen.add(key);
    acc.push(value);
    return acc;
  }, []);
};

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const userService = useUserService();

  const [profile, setProfile] = useState<User | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm());
  const [allergyInput, setAllergyInput] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverSnapshot, setServerSnapshot] = useState(JSON.stringify(emptyForm()));

  const isDirty = JSON.stringify(form) !== serverSnapshot;
  const displayName = buildDisplayName(user);
  const calorieTarget = profile?.dailyCalorieTarget ?? 0;

  const applyProfile = (p: User) => {
    const nextForm: ProfileFormState = {
      weight: p.weight != null ? String(p.weight) : '',
      height: p.height != null ? String(p.height) : '',
      age: p.age != null ? String(p.age) : '',
      gender: p.gender ?? '',
      activityLevel: p.activityLevel ?? '',
      dietType: p.dietType ?? '',
      dietaryGoal: p.dietaryGoal ?? '',
      allergies: normalizePreferenceList(p.allergies ?? []),
      dislikedIngredients: normalizePreferenceList(p.dislikedIngredients ?? [])
    };
    setProfile(p);
    setForm(nextForm);
    setServerSnapshot(JSON.stringify(nextForm));
    setFieldErrors({});
  };

  useEffect(() => {
    let active = true;
    const sync = async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        setLoading(true);
        const data = await userService.getUserById(user.id).catch(err => {
          if (err instanceof NotFoundError) {
            return userService.upsertUser({ id: user.id, name: displayName, email: user.email });
          }
          throw err;
        });
        if (active) applyProfile(data);
      } catch (err) {
        if (active) showToast(err instanceof ApiError ? err.message : t('toasts.profile.loadError'), 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    sync();
    return () => { active = false; };
  }, [user?.id, userService, displayName, showToast]);

  const updateField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field as string]) {
      const next = { ...fieldErrors };
      delete next[field as string];
      setFieldErrors(next);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);

    try {
      const payload: Partial<User> = {
        weight: form.weight ? Number(form.weight) : undefined,
        height: form.height ? Number(form.height) : undefined,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        activityLevel: form.activityLevel || undefined,
        dietType: form.dietType || undefined,
        dietaryGoal: form.dietaryGoal || undefined,
        allergies: normalizePreferenceList(form.allergies),
        dislikedIngredients: normalizePreferenceList(form.dislikedIngredients)
      };
      const saved = await userService.updateUserProfile(user.id, payload);
      applyProfile(saved);
      showToast(t('toasts.profile.saveSuccess'), 'success');
    } catch (err) {
      if (err instanceof ValidationError) {
        setFieldErrors(err.fields ?? {});
        showToast(err.message, 'error');
      } else {
        showToast(t('toasts.profile.saveError'), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
        <div className="max-w-5xl mx-auto min-h-[60vh] flex items-center justify-center">
          <div className="meal-card px-8 py-10 flex items-center gap-4">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="font-semibold text-foreground">{t('profile.loading')}</p>
          </div>
        </div>
    );
  }

  return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between px-2">
          <div>
            <span className="meal-overline">{t('profile.overline')}</span>
            <h1 className="meal-section-title text-4xl md:text-5xl">{t('profile.title')}</h1>
          </div>
          <button
              type="button"
              onClick={() => {
                window.location.reload();
                showToast("Veriler tazeleniyor...", "info");
              }}
              className="btn-secondary flex items-center gap-2 group"
          >
            <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
            Verileri Yenile
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-8">
          <aside className="space-y-6">
            <div className="meal-card meal-highlight-frame p-0 overflow-hidden shadow-brand-elevated">
              <div className="h-28 bg-primary/90" />
              <div className="px-6 pb-8 -mt-14 text-center">
                <div className="w-28 h-28 mx-auto rounded-[2.5rem] border-8 border-background bg-card text-primary flex items-center justify-center text-4xl font-bold shadow-lg overflow-hidden">
                  {getInitials(user)}
                </div>
                <h2 className="meal-section-title mt-4 text-2xl tracking-tight">{displayName}</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-foreground/30 mt-1 mb-6">
                  {user?.email}
                </p>

                <div className="meal-metric-card bg-primary/5 border-primary/10 text-left">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Flame size={16} strokeWidth={2.5} />
                    <span className="meal-overline text-primary opacity-100">{t('profile.dailyEnergy')}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/50 dark:bg-black/10 border border-primary/5 shadow-sm">
                      <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">{t('profile.dailyEnergy')}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground font-serif">{calorieTarget}</span>
                        <span className="text-xs font-sans opacity-60">kcal</span>
                      </div>
                    </div>
                    {profile?.bmi && (
                      <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-terracotta/5 border border-terracotta/10 shadow-sm">
                        <span className="text-[10px] font-bold text-terracotta uppercase tracking-widest mb-1">{t('dashboard.stats.bmiValue')}</span>
                        <span className="text-2xl font-bold text-terracotta font-serif">
                          {profile.bmi}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-600 rounded-[2rem] font-bold hover:bg-red-600 hover:text-white transition-all duration-300 border border-red-500/20 shadow-sm"
            >
              <LogOut size={20} /> {t('actions.logout')}
            </button>
          </aside>

          <form onSubmit={handleSave} className="space-y-6">
            <section className="meal-card space-y-6 border-none shadow-brand-soft">
              <div className="flex items-center gap-3 border-b border-card-border pb-5">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <UserIcon size={20} />
                </div>
                <h3 className="meal-section-title text-xl">{t('profile.physicalDetails')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="meal-overline pl-1">{t('profile.weight')}</span>
                  <input type="number" step="0.1" value={form.weight} onChange={e => updateField('weight', e.target.value)} className="base-input" placeholder="0.0" />
                  {fieldErrors.weight && <p className="text-xs text-red-500 font-bold ml-1 italic">{fieldErrors.weight}</p>}
                </div>
                <div className="space-y-2">
                  <span className="meal-overline pl-1">{t('profile.height')}</span>
                  <input type="number" step="0.1" value={form.height} onChange={e => updateField('height', e.target.value)} className="base-input" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <span className="meal-overline pl-1">{t('profile.age')}</span>
                  <input type="number" value={form.age} onChange={e => updateField('age', e.target.value)} className="base-input" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <span className="meal-overline pl-1">{t('profile.biologicalSex')}</span>
                  <select value={form.gender} onChange={e => updateField('gender', e.target.value as any)} className="base-input">
                    <option value="">{t('profile.notSpecified')}</option>
                    {genderOptions(t).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="meal-card space-y-6 border-none shadow-brand-soft">
              <div className="flex items-center gap-3 border-b border-card-border pb-5">
                <div className="p-2 bg-sage/10 rounded-xl text-sage">
                  <Shield size={20} />
                </div>
                <h3 className="meal-section-title text-xl">{t('profile.lifestyle.title')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="meal-overline pl-1">{t('profile.activityLevel')}</span>
                  <select value={form.activityLevel} onChange={e => updateField('activityLevel', e.target.value as any)} className="base-input">
                    <option value="">{t('common.select')}</option>
                    {activityOptions(t).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <span className="meal-overline pl-1">{t('profile.nutritionGoal')}</span>
                  <select value={form.dietaryGoal} onChange={e => updateField('dietaryGoal', e.target.value as any)} className="base-input">
                    <option value="">{t('common.select')}</option>
                    {goalOptions(t).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <span className="meal-overline pl-1">{t('profile.diet.label')}</span>
                  <select value={form.dietType} onChange={e => updateField('dietType', e.target.value as any)} className="base-input">
                    {dietOptions(t).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <span className="meal-overline pl-1">{t('profile.allergensLabel')}</span>
                <div className="flex gap-2">
                  <input
                      type="text"
                      value={allergyInput}
                      onChange={e => setAllergyInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), allergyInput && updateField('allergies', [...form.allergies, allergyInput.trim()]), setAllergyInput(''))}
                      className="base-input"
                      placeholder={t('profile.allergens.placeholder')}
                  />
                  <button type="button" onClick={() => { if(allergyInput) { updateField('allergies', [...form.allergies, allergyInput.trim()]); setAllergyInput(''); }}}
                          className="btn-primary px-8">{t('inventory.modeAdd')}</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.allergies.map(a => (
                      <span key={a} className="medical-badge pr-2">
                      {a}
                        <X size={12} className="ml-1 hover:text-red-500 cursor-pointer" onClick={() => updateField('allergies', form.allergies.filter(i => i !== a))} />
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-card-border">
                <TastePreferencePicker values={form.dislikedIngredients} onChange={next => updateField('dislikedIngredients', next)} error={fieldErrors.dislikedIngredients} />
              </div>
            </section>

            <div className="meal-card meal-highlight-frame sticky bottom-6 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-brand-elevated bg-card/90 backdrop-blur-xl z-10">
              <div className="flex flex-col">
                <p className="text-xs font-bold uppercase tracking-widest opacity-40">{t('profile.statusLabel')}</p>
                <p className="text-sm font-semibold">{isDirty ? t('profile.dirty') : t('profile.clean')}</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button type="button" disabled={!isDirty || saving} onClick={() => profile && applyProfile(profile)} className="btn-secondary flex-1 sm:flex-none py-3">{t('profile.revert')}</button>
                <button type="submit" disabled={!isDirty || saving} className="btn-primary flex-1 sm:flex-none py-3 px-12 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {t('profile.save')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
  );
};

export default Profile;
