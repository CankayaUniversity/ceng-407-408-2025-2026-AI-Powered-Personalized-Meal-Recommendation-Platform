import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Flame,
  Loader2,
  LogOut,
  Mail,
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

const genderOptions = [
  { value: Gender.MALE, label: 'Erkek' },
  { value: Gender.FEMALE, label: 'Kadın' },
  { value: Gender.OTHER, label: 'Diğer' }
];

const activityOptions = [
  { value: ActivityLevel.SEDENTARY, label: 'Sedanter' },
  { value: ActivityLevel.LIGHTLY_ACTIVE, label: 'Hafif Aktif' },
  { value: ActivityLevel.MODERATELY_ACTIVE, label: 'Orta Aktif' },
  { value: ActivityLevel.VERY_ACTIVE, label: 'Çok Aktif' },
  { value: ActivityLevel.EXTRA_ACTIVE, label: 'Ekstra Aktif' }
];

const dietOptions = [
  { value: DietType.NONE, label: 'Kısıtlama Yok' },
  { value: DietType.VEGAN, label: 'Vegan' },
  { value: DietType.VEGETARIAN, label: 'Vejetaryen' },
  { value: DietType.KETO, label: 'Ketojenik' },
  { value: DietType.PALEO, label: 'Paleo' },
  { value: DietType.GLUTEN_FREE, label: 'Glutensiz' }
];

const goalOptions = [
  { value: DietaryGoal.LOSE_WEIGHT, label: 'Kilo Vermek' },
  { value: DietaryGoal.MAINTAIN_WEIGHT, label: 'Kiloyu Korumak' },
  { value: DietaryGoal.GAIN_WEIGHT, label: 'Kilo Almak' },
  { value: DietaryGoal.BUILD_MUSCLE, label: 'Kas Kazanmak' }
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
  const { user, logout } = useAuth();
  const userService = useUserService();
  const [profile, setProfile] = useState<User | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm());
  const [allergyInput, setAllergyInput] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
        if (active) setPageError(err instanceof ApiError ? err.message : 'Yükleme başarısız.');
      } finally {
        if (active) setLoading(false);
      }
    };
    sync();
    return () => { active = false; };
  }, [user?.id, userService, displayName]);

  const updateField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
    setPageError(null);
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
    setPageError(null);
    setSuccessMessage(null);

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
      setSuccessMessage('Profil başarıyla kaydedildi.');
    } catch (err) {
      if (err instanceof ValidationError) {
        setFieldErrors(err.fields ?? {});
        setPageError(err.message);
      } else {
        setPageError(err instanceof Error ? err.message : 'Kaydedilemedi.');
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
            <p className="font-semibold text-foreground">Profil yükleniyor...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="meal-section-title text-4xl">Profil Ayarları</h1>
            <p className="text-foreground/50 mt-1">Beslenme ve fiziksel verilerinizi yönetin.</p>
          </div>
          <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-secondary px-4 py-2 flex items-center gap-2 border border-card-border bg-card rounded-2xl"
          >
            <RefreshCcw size={16} /> Verileri Yenile
          </button>
        </header>

        {/* Mesaj Panelleri */}
        {pageError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{pageError}</p>
            </div>
        )}
        {successMessage && (
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100">
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-8">
          <aside className="space-y-6">
            <div className="meal-card p-0 overflow-hidden shadow-brand-soft">
              <div className="h-24 bg-primary" />
              <div className="px-6 pb-6 -mt-12 text-center">
                <div className="w-24 h-24 mx-auto rounded-full border-4 border-background bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold shadow-md">
                  {getInitials(user)}
                </div>
                <h2 className="meal-section-title mt-4 text-xl">{displayName}</h2>

                <div className="meal-metric-card mt-6 border-primary/20 bg-primary/5 text-left">
                  <div className="flex items-center gap-2 text-primary">
                    <Flame size={18} />
                    <span className="meal-overline text-primary">Günlük Hedef</span>
                  </div>
                  <div className="mt-2 text-3xl font-bold text-foreground font-serif">{calorieTarget} kcal</div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-foreground/60 justify-center">
                    <Mail size={14} /> <span>{user?.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors"
            >
              <LogOut size={20} /> Oturumu Kapat
            </button>
          </aside>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Fiziksel Bilgiler */}
            <section className="meal-card p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-card-border pb-4">
                <UserIcon className="text-primary" />
                <h3 className="meal-section-title text-xl">Fiziksel Veriler</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Kilo (kg)</span>
                  <input type="number" step="0.1" value={form.weight} onChange={e => updateField('weight', e.target.value)} className="base-input" />
                  {fieldErrors.weight && <p className="text-xs text-red-500">{fieldErrors.weight}</p>}
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Boy (cm)</span>
                  <input type="number" step="0.1" value={form.height} onChange={e => updateField('height', e.target.value)} className="base-input" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Yaş</span>
                  <input type="number" value={form.age} onChange={e => updateField('age', e.target.value)} className="base-input" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Cinsiyet</span>
                  <select value={form.gender} onChange={e => updateField('gender', e.target.value as any)} className="base-input">
                    <option value="">Seçiniz</option>
                    {genderOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
            </section>

            {/* Tercihler */}
            <section className="meal-card p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-card-border pb-4">
                <Shield className="text-primary" />
                <h3 className="meal-section-title text-xl">Beslenme Tercihleri</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Aktivite Seviyesi</span>
                  <select value={form.activityLevel} onChange={e => updateField('activityLevel', e.target.value as any)} className="base-input">
                    <option value="">Seçiniz</option>
                    {activityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Hedef</span>
                  <select value={form.dietaryGoal} onChange={e => updateField('dietaryGoal', e.target.value as any)} className="base-input">
                    <option value="">Seçiniz</option>
                    {goalOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold">Diyet Tipi</span>
                  <select value={form.dietType} onChange={e => updateField('dietType', e.target.value as any)} className="base-input">
                    {dietOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="space-y-3">
                <span className="text-sm font-semibold">Alerjenler</span>
                <div className="flex gap-2">
                  <input type="text" value={allergyInput} onChange={e => setAllergyInput(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), updateField('allergies', [...form.allergies, allergyInput.trim()]), setAllergyInput(''))}
                         className="base-input" placeholder="Örn: Fıstık" />
                  <button type="button" onClick={() => { if(allergyInput) { updateField('allergies', [...form.allergies, allergyInput.trim()]); setAllergyInput(''); }}}
                          className="btn-primary px-6">Ekle</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.allergies.map(a => (
                      <span key={a} className="medical-badge flex items-center gap-1">
                    {a} <X size={14} className="cursor-pointer" onClick={() => updateField('allergies', form.allergies.filter(i => i !== a))} />
                  </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-card-border">
                <TastePreferencePicker values={form.dislikedIngredients} onChange={next => updateField('dislikedIngredients', next)} error={fieldErrors.dislikedIngredients} />
              </div>
            </section>

            {/* Alt Panel: Kaydetme */}
            <div className="meal-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-foreground/50">{isDirty ? 'Kaydedilmemiş değişiklikler var.' : 'Sunucu ile senkronize.'}</p>
              <div className="flex gap-3">
                <button type="button" disabled={!isDirty || saving} onClick={() => profile && applyProfile(profile)} className="btn-secondary px-6 py-2 border rounded-xl">İptal</button>
                <button type="submit" disabled={!isDirty || saving} className="btn-primary px-10 py-3 flex items-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
  );
};

export default Profile;
