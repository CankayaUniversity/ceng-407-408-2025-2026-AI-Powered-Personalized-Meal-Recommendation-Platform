import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Users, Soup } from 'lucide-react';
import AdminIngredientList from './AdminIngredientList';
import UserList from './UserList';
import AdminSettings from './AdminSettings';

const tabs = [
  { key: 'ingredients', label: 'admin.tabs.ingredients', icon: Soup },
  { key: 'users', label: 'admin.tabs.users', icon: Users },
  { key: 'settings', label: 'admin.tabs.settings', icon: Settings },
] as const;

const AdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState<typeof tabs[number]['key']>('ingredients');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="meal-section-title mb-1">{t('admin.title')}</h1>
        <p className="text-espresso/60 dark:text-alabaster/60 text-sm">{t('admin.subtitle')}</p>
      </div>

      <div className="bg-white dark:bg-espresso-midnight/40 rounded-2xl border border-espresso/10 dark:border-alabaster/10 shadow-sm overflow-hidden">
        <div className="flex gap-2 p-2 border-b border-espresso/10 dark:border-alabaster/10 overflow-x-auto bg-espresso/[0.02] dark:bg-alabaster/[0.02]">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                active === key
                  ? 'bg-terracotta text-white shadow-sm'
                  : 'text-espresso/60 dark:text-alabaster/60 hover:bg-espresso/[0.04] dark:hover:bg-alabaster/[0.06]'
              }`}
            >
              <Icon size={16} />
              {t(label)}
            </button>
          ))}
        </div>
        <div className="p-4 md:p-6">
          {active === 'ingredients' && <AdminIngredientList />}
          {active === 'users' && <UserList />}
          {active === 'settings' && <AdminSettings />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
