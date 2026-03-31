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
type UserService = ReturnType<typeof useUserService>;
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
  weight: '',
  height: '',
  age: '',
  gender: '',
  activityLevel: '',
  dietType: '',
  dietaryGoal: '',
  allergies: [],
  dislikedIngredients: []
});

const buildDisplayName = (authUser: AuthUser | undefined): string => {
  if (!authUser) {
    return '';
  }

  const fullName = [authUser.firstName, authUser.lastName].filter(Boolean).join(' ').trim();
  return fullName || authUser.username;
};

const getInitials = (authUser: AuthUser | undefined): string => {
  if (!authUser) {
    return 'AI';
  }

  const fullName = [authUser.firstName, authUser.lastName].filter(Boolean);
  if (fullName.length > 0) {
    return fullName.map((part) => part![0]).join('').slice(0, 2).toUpperCase();
  }

  return authUser.username.slice(0, 2).toUpperCase();
};

const normalizePreferenceList = (values: string[]): string[] => {
  const seen = new Set<string>();

  return values.reduce<string[]>((acc, item) => {
    const value = item.trim();
    const key = value.toLocaleLowerCase('tr-TR');

    if (!value || seen.has(key)) {
      return acc;
    }

    seen.add(key);
    acc.push(value);
    return acc;
  }, []);
};

const toForm = (profile: User | null): ProfileFormState => ({
  weight: profile?.weight != null ? String(profile.weight) : '',
  height: profile?.height != null ? String(profile.height) : '',
  age: profile?.age != null ? String(profile.age) : '',
  gender: profile?.gender ?? '',
  activityLevel: profile?.activityLevel ?? '',
  dietType: profile?.dietType ?? '',
  dietaryGoal: profile?.dietaryGoal ?? '',
  allergies: normalizePreferenceList(profile?.allergies ?? []),
  dislikedIngredients: normalizePreferenceList(profile?.dislikedIngredients ?? [])
});

const snapshotForm = (form: ProfileFormState): string => JSON.stringify({
  ...form,
  allergies: normalizePreferenceList(form.allergies),
  dislikedIngredients: normalizePreferenceList(form.dislikedIngredients)
});

const toFloat = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toInteger = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildPayload = (authUser: AuthUser, form: ProfileFormState): Partial<User> => ({
  id: authUser.id,
  name: buildDisplayName(authUser),
  email: authUser.email,
  weight: toFloat(form.weight),
  height: toFloat(form.height),
  age: toInteger(form.age),
  gender: form.gender || undefined,
  activityLevel: form.activityLevel || undefined,
  dietType: form.dietType || undefined,
  dietaryGoal: form.dietaryGoal || undefined,
  allergies: normalizePreferenceList(form.allergies),
  dislikedIngredients: normalizePreferenceList(form.dislikedIngredients)
});

const loadProfile = async (authUser: AuthUser, userService: UserService): Promise<User> => {
  try {
    return await userService.getUserById(authUser.id);
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      throw error;
    }

    return userService.upsertUser({
      id: authUser.id,
      name: buildDisplayName(authUser),
      email: authUser.email
    });
  }
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
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
  const [serverSnapshot, setServerSnapshot] = useState(snapshotForm(emptyForm()));

  const isDirty = snapshotForm(form) !== serverSnapshot;
  const displayName = buildDisplayName(user);
  const calorieTarget = profile?.dailyCalorieTarget ?? 2000;

  const applyProfile = (nextProfile: User) => {
    const nextForm = toForm(nextProfile);
    setProfile(nextProfile);
    setForm(nextForm);
    setServerSnapshot(snapshotForm(nextForm));
    setFieldErrors({});
  };

  useEffect(() => {
    let cancelled = false;

    const syncProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setPageError(null);
      setSuccessMessage(null);

      try {
        const nextProfile = await loadProfile(user, userService);

        if (!cancelled) {
          applyProfile(nextProfile);
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(getErrorMessage(error, 'Profil bilgileri yüklenemedi.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    syncProfile();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const updateField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccessMessage(null);
    setPageError(null);
    setFieldErrors((current) => {
      if (!current[field as string]) {
        return current;
      }

      const next = { ...current };
      delete next[field as string];
      return next;
    });
  };

  const addAllergy = () => {
    const value = allergyInput.trim();
    if (!value) {
      return;
    }

    updateField('allergies', [...form.allergies, value]);
    setAllergyInput('');
  };

  const reloadFromServer = async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const nextProfile = await loadProfile(user, userService);
      applyProfile(nextProfile);
    } catch (error) {
      setPageError(getErrorMessage(error, 'Sunucudaki profil bilgileri alınamadı.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      return;
    }

    setSaving(true);
    setPageError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    try {
      const savedProfile = await userService.updateUserProfile(user.id, buildPayload(user, form));
      applyProfile(savedProfile);
      setSuccessMessage('Profil ayarlarınız başarıyla kaydedildi.');
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldErrors(error.fields ?? {});
        setPageError(error.message);
      } else {
        setPageError(getErrorMessage(error, 'Profil kaydedilemedi.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="max-w-5xl mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm px-8 py-10 flex items-center gap-4">
          <Loader2 size={24} className="animate-spin text-orange-500" />
          <div>
            <p className="font-semibold text-gray-900">Profil yükleniyor</p>
            <p className="text-sm text-gray-500">Kullanıcı bilgileri veritabanından okunuyor.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="meal-section-title">Profil Ayarları</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Beslenme ve fiziksel profil bilgilerinizi backend ile senkron yönetin.</p>
        </div>
        <button
          type="button"
          onClick={reloadFromServer}
          disabled={loading || saving || !user?.id}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          Sunucudaki Son Veriyi Getir
        </button>
      </header>

      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">İşlem tamamlanamadı</p>
            <p className="text-sm text-red-600 mt-1">{pageError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-700">
          <p className="font-semibold">Kayıt başarılı</p>
          <p className="text-sm text-green-600 mt-1">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-8">
        <aside className="space-y-6">
          <div className="meal-card rounded-3xl overflow-hidden border-gray-100 p-0 shadow-sm dark:border-gray-800">
            <div className="h-24 bg-orange-500" />
            <div className="px-6 pb-6 -mt-12 text-center">
              <div className="w-24 h-24 mx-auto rounded-full border-4 border-white dark:border-gray-800 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-3xl font-bold shadow-sm">
                {getInitials(user)}
              </div>
              <h2 className="meal-section-title mt-4 text-xl">{displayName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</p>

              <div className="meal-metric-card mt-6 border-orange-100 bg-orange-50 px-4 text-left dark:border-orange-800/40 dark:bg-orange-900/20">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Flame size={18} />
                  <span className="meal-overline tracking-[0.18em] text-orange-600 dark:text-orange-400">Günlük Hedef</span>
                </div>
                <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100 font-serif">{calorieTarget}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sunucu tarafından otomatik hesaplanır.</p>
              </div>

              <div className="mt-6 space-y-3 text-left">
                <div className="meal-metric-card border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">E-posta</p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Mail size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    <span className="truncate">{user?.email || 'Belirtilmedi'}</span>
                  </div>
                </div>
                <div className="meal-metric-card border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sistem ID</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono break-all">{user?.id}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors"
          >
            <LogOut size={20} />
            Oturumu Kapat
          </button>
        </aside>

        <form onSubmit={handleSave} className="space-y-6">
          <section className="meal-card rounded-3xl overflow-hidden border-gray-100 p-0 shadow-sm dark:border-gray-800">
            <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center gap-3">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 rounded-2xl">
                <UserIcon size={20} />
              </div>
              <div>
                <h3 className="meal-section-title text-xl">Fiziksel Bilgiler</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kalori hesabında kullanılan temel veriler.</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Kilo (kg)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.weight}
                  onChange={(event) => updateField('weight', event.target.value)}
                  className="base-input"
                  placeholder="72.5"
                />
                {fieldErrors.weight && <span className="text-sm text-red-600 dark:text-red-400">{fieldErrors.weight}</span>}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Boy (cm)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.height}
                  onChange={(event) => updateField('height', event.target.value)}
                  className="base-input"
                  placeholder="178"
                />
                {fieldErrors.height && <span className="text-sm text-red-600 dark:text-red-400">{fieldErrors.height}</span>}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Yaş</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.age}
                  onChange={(event) => updateField('age', event.target.value)}
                  className="base-input"
                  placeholder="24"
                />
                {fieldErrors.age && <span className="text-sm text-red-600 dark:text-red-400">{fieldErrors.age}</span>}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cinsiyet</span>
                <select
                  value={form.gender}
                  onChange={(event) => updateField('gender', event.target.value as Gender | '')}
                  className="base-input"
                >
                  <option value="" className="dark:bg-gray-800">Seçiniz</option>
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value} className="dark:bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.gender && <span className="text-sm text-red-600 dark:text-red-400">{fieldErrors.gender}</span>}
              </label>
            </div>
          </section>

          <section className="meal-card rounded-3xl overflow-hidden border-gray-100 p-0 shadow-sm dark:border-gray-800">
            <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center gap-3">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 rounded-2xl">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="meal-section-title text-xl">Tercihler ve Alerjenler</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sert kısıtlar ve kişisel damak tercihleri öneri akışına birlikte taşınır.</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Aktivite Seviyesi</span>
                <select
                  value={form.activityLevel}
                  onChange={(event) => updateField('activityLevel', event.target.value as ActivityLevel | '')}
                  className="base-input"
                >
                  <option value="" className="dark:bg-gray-800">Seçiniz</option>
                  {activityOptions.map((option) => (
                    <option key={option.value} value={option.value} className="dark:bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.activityLevel && <span className="text-sm text-red-600 dark:text-red-400">{fieldErrors.activityLevel}</span>}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Hedef</span>
                <select
                  value={form.dietaryGoal}
                  onChange={(event) => updateField('dietaryGoal', event.target.value as DietaryGoal | '')}
                  className="base-input"
                >
                  <option value="" className="dark:bg-gray-800">Seçiniz</option>
                  {goalOptions.map((option) => (
                    <option key={option.value} value={option.value} className="dark:bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.dietaryGoal && <span className="text-sm text-red-600 dark:text-red-400">{fieldErrors.dietaryGoal}</span>}
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Diyet Tipi</span>
                <select
                  value={form.dietType}
                  onChange={(event) => updateField('dietType', event.target.value as DietType | '')}
                  className="base-input"
                >
                  <option value="" className="dark:bg-gray-800">Seçiniz</option>
                  {dietOptions.map((option) => (
                    <option key={option.value} value={option.value} className="dark:bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.dietType && <span className="text-sm text-red-600 dark:text-red-400">{fieldErrors.dietType}</span>}
              </label>

              <div className="space-y-3 md:col-span-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Alerjenler</span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={allergyInput}
                    onChange={(event) => setAllergyInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault();
                        addAllergy();
                      }
                    }}
                    className="base-input flex-1"
                    placeholder="Örn. Fıstık, Laktoz, Gluten"
                  />
                  <button
                    type="button"
                    onClick={addAllergy}
                    className="px-5 py-3 rounded-2xl bg-gray-900 dark:bg-gray-700 text-white font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                  >
                    Ekle
                  </button>
                </div>

                {form.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {form.allergies.map((allergy) => (
                      <span key={allergy} className="meal-badge-neon border-orange-100 bg-orange-50 px-4 py-2 text-sm text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                        {allergy}
                        <button
                          type="button"
                          onClick={() => updateField('allergies', form.allergies.filter((item) => item !== allergy))}
                          className="text-orange-500 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                          aria-label={`${allergy} alerjenini kaldır`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 px-4 py-5 text-sm text-gray-500 dark:text-gray-400">
                    Henüz alerjen eklenmedi.
                  </div>
                )}

                {fieldErrors.allergies && <span className="text-sm text-red-600 dark:text-red-400">{fieldErrors.allergies}</span>}
              </div>

              <div className="space-y-3 md:col-span-2">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Taste Preferences</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sevmediğin gıdaları soft-constraint olarak kaydediyoruz; öneri motoru bunları alerjenlerden farklı şekilde ele alacak.
                  </p>
                </div>

                <TastePreferencePicker
                  values={form.dislikedIngredients}
                  onChange={(nextValues) => updateField('dislikedIngredients', nextValues)}
                  error={fieldErrors.dislikedIngredients}
                />
              </div>
            </div>
          </section>

          <div className="meal-card rounded-3xl border-gray-100 px-6 py-5 shadow-sm dark:border-gray-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {isDirty ? 'Kaydedilmemiş değişiklikleriniz var.' : 'Tüm bilgileriniz sunucu ile senkron.'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Boş bıraktığınız alanlar kaydetme sırasında mevcut değerlerini korur.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => profile && applyProfile(profile)}
                disabled={!profile || !isDirty || saving}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCcw size={16} />
                Son Kayda Dön
              </button>
              <button
                type="submit"
                disabled={saving || loading || !user?.id || !isDirty}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-500 text-white font-semibold shadow-lg shadow-orange-100 dark:shadow-none hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Kaydediliyor' : 'Kaydet'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
