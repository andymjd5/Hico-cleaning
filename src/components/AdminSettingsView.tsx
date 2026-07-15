import React, { useState } from 'react';
import { 
  Settings, 
  Users, 
  Plus, 
  RefreshCw, 
  DollarSign, 
  Shield, 
  Key, 
  Search, 
  Check, 
  UserPlus, 
  Trash2, 
  Unlock 
} from 'lucide-react';
import { Agent, Screen, Commune } from '../types';

interface AdminSettingsViewProps {
  agents: Agent[];
  onAddAgent: (newAgent: Agent) => void;
  onUpdateAgent: (updatedAgent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
  defaultTab?: 'screens' | 'pricing' | 'accounts' | 'passwords';
  onTabChange?: (tab: 'screens' | 'pricing' | 'accounts' | 'passwords') => void;
  communes?: Commune[];
}

export default function AdminSettingsView({
  agents,
  onAddAgent,
  onUpdateAgent,
  onDeleteAgent,
  defaultTab = 'screens',
  onTabChange,
  communes = []
}: AdminSettingsViewProps) {
  // 1. Tab State
  const [activeTab, setActiveTab] = useState<'screens' | 'pricing' | 'accounts' | 'passwords'>(defaultTab);

  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleTabClick = (tab: 'screens' | 'pricing' | 'accounts' | 'passwords') => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // 2. Pricing State
  const [subscriptionPrice, setSubscriptionPrice] = useState<number>(() => {
    const saved = localStorage.getItem('hico_subscription_price');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('hico_subscription_currency') || '$';
  });
  const [communePrices, setCommunePrices] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('hico_commune_prices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading commune prices", e);
      }
    }
    return {};
  });
  const [priceSuccess, setPriceSuccess] = useState(false);

  // 3. Permissions/Screens State
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('hico_role_permissions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let updated = false;
        
        if (parsed.admin) {
          const requiredAdminScreens = [
            'sachets_management', 'finance_management', 'admin_settings_screens', 
            'admin_settings_pricing', 'admin_settings_accounts', 'admin_settings_passwords'
          ];
          requiredAdminScreens.forEach(s => {
            if (!parsed.admin.includes(s)) {
              parsed.admin.push(s);
              updated = true;
            }
          });
        }
        
        if (parsed.agent) {
          const requiredAgentScreens = [
            'sachets_management', 'finance_management'
          ];
          requiredAgentScreens.forEach(s => {
            if (!parsed.agent.includes(s)) {
              parsed.agent.push(s);
              updated = true;
            }
          });
        }
        
        if (updated) {
          localStorage.setItem('hico_role_permissions', JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        console.error("Error loading permissions", e);
      }
    }
    return {
      admin: ['dashboard', 'communes', 'avenues', 'recensement_form', 'abonne_list', 'abonne_detail', 'rapports', 'commune_explorer', 'dechets_map', 'sachets_management', 'admin_settings_screens', 'admin_settings_pricing', 'admin_settings_accounts', 'admin_settings_passwords'],
      agent: ['dashboard', 'communes', 'avenues', 'recensement_form', 'abonne_list', 'abonne_detail', 'commune_explorer', 'dechets_map', 'sachets_management'],
      abonne: ['abonne_space'],
      eboueur: ['eboueur_space']
    };
  });
  const [permissionsSuccess, setPermissionsSuccess] = useState(false);

  // 4. Create Account State
  const [newAgentNom, setNewAgentNom] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentRole, setNewAgentRole] = useState<'admin' | 'agent' | 'abonne' | 'eboueur'>('agent');
  const [newAgentPassword, setNewAgentPassword] = useState('password');
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  // 5. Password Reset / Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [tempPasswordShow, setTempPasswordShow] = useState<{ userId: string; pass: string } | null>(null);

  // Handle saving subscription prices
  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('hico_subscription_price', subscriptionPrice.toString());
    localStorage.setItem('hico_subscription_currency', currency);
    localStorage.setItem('hico_commune_prices', JSON.stringify(communePrices));
    setPriceSuccess(true);
    setTimeout(() => setPriceSuccess(false), 3000);
  };

  // Handle saving custom screen permissions per role
  const handleSavePermissions = () => {
    localStorage.setItem('hico_role_permissions', JSON.stringify(rolePermissions));
    setPermissionsSuccess(true);
    setTimeout(() => setPermissionsSuccess(false), 3000);
  };

  // Toggle specific screen permission for a role
  const togglePermission = (role: string, screen: string) => {
    const current = rolePermissions[role] || [];
    let updated: string[];
    if (current.includes(screen)) {
      updated = current.filter(s => s !== screen);
    } else {
      updated = [...current, screen];
    }
    setRolePermissions({
      ...rolePermissions,
      [role]: updated
    });
  };

  // Create new account
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);

    const cleanPhone = newAgentPhone.replace(/\s+/g, '');
    if (!newAgentNom.trim() || !cleanPhone) {
      setAccountError('Veuillez remplir le nom et le numéro de téléphone.');
      return;
    }

    // Check if phone exists
    const exists = agents.some(a => a.telephone.replace(/\s+/g, '') === cleanPhone);
    if (exists) {
      setAccountError('Un compte avec ce numéro de téléphone existe déjà.');
      return;
    }

    const newAgent: Agent = {
      id: 'agent-' + Math.random().toString(36).substring(2, 11),
      nom: newAgentNom.trim(),
      telephone: newAgentPhone.trim(),
      role: newAgentRole,
      created_at: new Date().toISOString(),
      password: newAgentPassword || 'password',
      isTempPassword: false
    };

    onAddAgent(newAgent);
    setAccountSuccess(`Le compte de ${newAgent.nom} (${newAgent.role}) a été créé avec succès !`);
    
    // Clear fields
    setNewAgentNom('');
    setNewAgentPhone('');
    setNewAgentPassword('password');
  };

  // Reset password to a temporary password
  const handleResetPassword = (agentId: string) => {
    const foundAgent = agents.find(a => a.id === agentId);
    if (!foundAgent) return;

    // Generate random 6-character alphanumeric password
    const tempPass = 'TEMP-' + Math.floor(100000 + Math.random() * 900000).toString();
    
    const updatedAgent: Agent = {
      ...foundAgent,
      password: tempPass,
      isTempPassword: true
    };

    onUpdateAgent(updatedAgent);
    setTempPasswordShow({ userId: agentId, pass: tempPass });
  };

  // Filter agents based on search
  const filteredAgents = agents.filter(a => 
    a.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.telephone.includes(searchTerm) ||
    a.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableScreens: { id: string; label: string; rolesAllowed: string[] }[] = [
    { id: 'dashboard', label: 'Tableau de Bord / Statistiques', rolesAllowed: ['admin', 'agent'] },
    { id: 'communes', label: 'Recensement (Communes & Avenues)', rolesAllowed: ['admin', 'agent'] },
    { id: 'abonne_list', label: 'Gestion des Abonnés', rolesAllowed: ['admin', 'agent'] },
    { id: 'commune_explorer', label: 'Explorateur de position GPS', rolesAllowed: ['admin', 'agent'] },
    { id: 'dechets_map', label: 'Carte Poubelles & Éboueurs (Leaflet)', rolesAllowed: ['admin', 'agent', 'eboueur'] },
    { id: 'rapports', label: 'Rapports & Graphiques D3', rolesAllowed: ['admin', 'agent'] },
    { id: 'sachets_management', label: 'Gestion de Sachets Poubelles', rolesAllowed: ['admin', 'agent'] },
    { id: 'abonne_space', label: 'Espace Abonné Exclusif', rolesAllowed: ['abonne'] },
    { id: 'eboueur_space', label: 'Espace Mission Éboueur Exclusif', rolesAllowed: ['eboueur'] },
    { id: 'admin_settings_screens', label: 'Paramètres: Options d\'Affichage / Rôles (Point 1)', rolesAllowed: ['admin'] },
    { id: 'admin_settings_pricing', label: 'Paramètres: Prix d\'Abonnement (Point 2)', rolesAllowed: ['admin'] },
    { id: 'admin_settings_accounts', label: 'Paramètres: Création de Comptes Agents (Point 3)', rolesAllowed: ['admin'] },
    { id: 'admin_settings_passwords', label: 'Paramètres: Mot de Passe Temporaire (Point 4)', rolesAllowed: ['admin'] }
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background pb-12" id="admin_settings_view">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant" id="settings_title_container">
        <div className="flex items-center gap-2" id="settings_title_left">
          <div className="w-9 h-9 rounded-xl bg-surface text-primary flex items-center justify-center border border-outline-variant" id="settings_icon_bg">
            <Settings size={18} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-on-background font-sans" id="settings_h2">Paramètres Système</h2>
        </div>
        <span className="bg-primary/20 text-indigo-400 text-xs px-3 py-1 rounded-full font-bold border border-primary/25 uppercase tracking-wider font-mono" id="admin_badge">
          ADMINISTRATEUR 👑
        </span>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-surface p-1.5 rounded-2xl border border-outline-variant" id="settings_tabs">
        <button
          id="tab_btn_screens"
          onClick={() => handleTabClick('screens')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'screens'
              ? 'bg-primary text-on-primary shadow-md'
              : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
          }`}
        >
          <Shield size={14} />
          Options d'Affichage / Rôles
        </button>
        <button
          id="tab_btn_pricing"
          onClick={() => handleTabClick('pricing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pricing'
              ? 'bg-primary text-on-primary shadow-md'
              : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
          }`}
        >
          <DollarSign size={14} />
          Prix d'Abonnement
        </button>
        <button
          id="tab_btn_accounts"
          onClick={() => handleTabClick('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'accounts'
              ? 'bg-primary text-on-primary shadow-md'
              : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
          }`}
        >
          <UserPlus size={14} />
          Création de Comptes Agents
        </button>
        <button
          id="tab_btn_passwords"
          onClick={() => handleTabClick('passwords')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'passwords'
              ? 'bg-primary text-on-primary shadow-md'
              : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
          }`}
        >
          <Key size={14} />
          Mot de Passe Temporaire
        </button>
      </div>

      {/* TAB CONTENT 1: Screens Display options per role */}
      {activeTab === 'screens' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-4 animate-fade-in" id="screens_settings_card">
          <div className="flex flex-col gap-1" id="screens_settings_header">
            <h3 className="text-base font-black text-on-surface tracking-tight">Configuration des options d'affichage par rôle</h3>
            <p className="text-xs text-on-surface-variant">Configurez quels écrans ou menus s'affichent dans la barre latérale pour chaque rôle utilisateur.</p>
          </div>

          <div className="overflow-x-auto mt-2 border border-outline-variant rounded-2xl" id="screens_table_wrapper">
            <table className="w-full text-left border-collapse text-xs" id="screens_table">
              <thead>
                <tr className="bg-background border-b border-outline-variant text-on-surface-variant font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Écran / Option de menu</th>
                  <th className="p-3.5 text-center">Admin 👑</th>
                  <th className="p-3.5 text-center">Agent 📋</th>
                  <th className="p-3.5 text-center">Abonné 👤</th>
                  <th className="p-3.5 text-center">Éboueur 🚚</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {availableScreens.map((screen) => (
                  <tr key={screen.id} className="hover:bg-background/40 transition-colors">
                    <td className="p-3.5 pl-4 font-semibold text-on-surface flex flex-col gap-0.5">
                      <span>{screen.label}</span>
                      <span className="text-[10px] text-gray-500 font-mono font-medium">/{screen.id}</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['admin'] || []).includes(screen.id)}
                        onChange={() => togglePermission('admin', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['agent'] || []).includes(screen.id)}
                        onChange={() => togglePermission('agent', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['abonne'] || []).includes(screen.id)}
                        onChange={() => togglePermission('abonne', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['eboueur'] || []).includes(screen.id)}
                        onChange={() => togglePermission('eboueur', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 mt-4" id="screens_actions">
            {permissionsSuccess && (
              <span className="text-xs text-[#10b981] font-bold self-center flex items-center gap-1 bg-[#10b981]/15 border border-[#10b981]/20 px-3 py-1.5 rounded-xl animate-fade-in">
                <Check size={14} /> Permissions enregistrées !
              </span>
            )}
            <button
              id="btn_save_permissions"
              onClick={handleSavePermissions}
              className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              Enregistrer les Permissions
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Subscription Pricing */}
      {activeTab === 'pricing' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-4 animate-fade-in" id="pricing_settings_card">
          <div className="flex flex-col gap-1" id="pricing_settings_header">
            <h3 className="text-base font-black text-on-surface tracking-tight">Modification des Tarifs d'Abonnement</h3>
            <p className="text-xs text-on-surface-variant">Modifiez le prix facturé mensuellement par ménage recensé pour l'abonnement d'évacuation des déchets.</p>
          </div>

          <form onSubmit={handleSavePricing} className="flex flex-col gap-4 mt-2" id="pricing_form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="sub_price">
                  Tarif Mensuel Général par défaut (par ménage)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500 font-bold font-mono">
                    $
                  </span>
                  <input 
                    type="number"
                    id="sub_price"
                    step="0.1"
                    min="0"
                    value={subscriptionPrice}
                    onChange={(e) => setSubscriptionPrice(parseFloat(e.target.value) || 0)}
                    className="w-full h-11 pl-8 pr-3 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="sub_currency">
                  Devise d'Affichage
                </label>
                <select
                  id="sub_currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold"
                >
                  <option value="$">USD ($)</option>
                  <option value="FC">CDF (FC)</option>
                  <option value="€">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="bg-background/50 border border-outline-variant p-4 rounded-2xl flex items-start gap-3 mt-1 max-w-2xl">
              <div className="text-amber-500 shrink-0 text-base mt-0.5">💡</div>
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="font-bold text-on-surface">Calcul Automatique des factures</span>
                <span className="text-on-surface-variant leading-relaxed">
                  Le système calculera automatiquement le montant à payer pour chaque parcelle abonnée en multipliant : 
                  <br />
                  <strong className="text-primary font-mono font-bold">Nombre de ménages × Tarif de la commune {currency}</strong>.
                </span>
              </div>
            </div>

            {/* Tarifs personnalisés par commune */}
            {communes && communes.length > 0 && (
              <div className="border-t border-outline-variant/60 pt-5 mt-4" id="commune_pricing_section">
                <h4 className="text-sm font-black text-on-surface tracking-tight mb-1">
                  Tarifs personnalisés par Commune
                </h4>
                <p className="text-[11px] text-on-surface-variant mb-4 leading-normal">
                  Saisissez un tarif spécifique pour chaque commune si nécessaire. Les communes sans tarif personnalisé utiliseront automatiquement le tarif par défaut ci-dessus (<strong className="font-bold">{subscriptionPrice} {currency}</strong>).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {communes.map((comm) => {
                    const customVal = communePrices[comm.id] !== undefined ? communePrices[comm.id] : '';
                    return (
                      <div 
                        key={comm.id}
                        className="bg-background/40 border border-outline-variant rounded-2xl p-3 flex flex-col gap-1.5 hover:border-outline/50 transition-all"
                      >
                        <span className="text-xs font-bold text-on-surface truncate">{comm.nom}</span>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-500 font-bold font-mono text-xs">
                            {currency}
                          </span>
                          <input 
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder={`${subscriptionPrice}`}
                            value={customVal}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              setCommunePrices(prev => {
                                const updated = { ...prev };
                                if (val === undefined || isNaN(val)) {
                                  delete updated[comm.id];
                                } else {
                                  updated[comm.id] = val;
                                }
                                return updated;
                              });
                            }}
                            className="w-full h-9 pl-7 pr-2 bg-surface border border-outline-variant rounded-lg text-on-surface text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono font-bold"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              {priceSuccess && (
                <span className="text-xs text-[#10b981] font-bold self-center flex items-center gap-1 bg-[#10b981]/15 border border-[#10b981]/20 px-3 py-1.5 rounded-xl animate-fade-in">
                  <Check size={14} /> Tarifs mis à jour avec succès !
                </span>
              )}
              <button
                type="submit"
                id="btn_save_pricing"
                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Enregistrer les Tarifs
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT 3: Create accounts */}
      {activeTab === 'accounts' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-4 animate-fade-in" id="accounts_settings_card">
          <div className="flex flex-col gap-1" id="accounts_settings_header">
            <h3 className="text-base font-black text-on-surface tracking-tight">Création de Comptes (Agents, Éboueurs, Abonnés, Admins)</h3>
            <p className="text-xs text-on-surface-variant">Enregistrez de nouveaux comptes utilisateurs (Agents recenseurs, Administrateurs, Éboueurs ou Abonnés) avec accès sécurisé par mot de passe.</p>
          </div>

          <form onSubmit={handleCreateAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2" id="create_account_form">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="acc_nom">
                  Nom Complet de l'Utilisateur (Agent, Éboueur, etc.)
                </label>
                <input 
                  type="text"
                  id="acc_nom"
                  value={newAgentNom}
                  onChange={(e) => setNewAgentNom(e.target.value)}
                  placeholder="Ex: Patient Mwamba"
                  className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="acc_phone">
                  Numéro de Téléphone (Identifiant)
                </label>
                <input 
                  type="text"
                  id="acc_phone"
                  value={newAgentPhone}
                  onChange={(e) => setNewAgentPhone(e.target.value)}
                  placeholder="Ex: 0812345678"
                  className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="acc_role">
                  Rôle Système (Permissions)
                </label>
                <select
                  id="acc_role"
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value as any)}
                  className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold"
                >
                  <option value="agent">Agent Recenseur 📋</option>
                  <option value="eboueur">Agent Éboueur (Chauffeur) 🚚</option>
                  <option value="abonne">Abonné (Bailleur) 👤</option>
                  <option value="admin">Administrateur Système 👑</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="acc_pass">
                  Mot de Passe Initial
                </label>
                <input 
                  type="text"
                  id="acc_pass"
                  value={newAgentPassword}
                  onChange={(e) => setNewAgentPassword(e.target.value)}
                  className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-3 mt-2">
              {accountError && (
                <p className="text-xs text-error font-bold bg-error-container/15 border border-error/20 p-3 rounded-xl animate-fade-in">
                  ❌ {accountError}
                </p>
              )}
              {accountSuccess && (
                <p className="text-xs text-[#10b981] font-bold bg-[#10b981]/15 border border-[#10b981]/20 p-3 rounded-xl animate-fade-in">
                  ✅ {accountSuccess}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  id="btn_create_account"
                  className="px-6 py-3 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  Créer le Compte
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT 4: Passwords Reset */}
      {activeTab === 'passwords' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-4 animate-fade-in" id="passwords_settings_card">
          <div className="flex flex-col gap-1" id="passwords_settings_header">
            <h3 className="text-base font-black text-on-surface tracking-tight">Gestion des réinitialisations de mot de passe temporaire</h3>
            <p className="text-xs text-on-surface-variant">Si un agent ou un abonné a oublié son mot de passe, générez-lui instantanément un mot de passe temporaire à usage unique pour se reconnecter.</p>
          </div>

          {/* Search Box */}
          <div className="relative mt-1" id="passwords_search_box">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
              <Search size={16} />
            </span>
            <input 
              type="text"
              placeholder="Rechercher par nom, téléphone ou rôle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans"
            />
          </div>

          {/* Temp Password Generated Success Display Box */}
          {tempPasswordShow && (
            <div className="bg-primary/10 border-2 border-primary/30 p-4 rounded-2xl flex flex-col gap-2.5 animate-bounce-in" id="temp_password_success_box">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-full bg-primary text-on-primary">
                  <Check size={14} />
                </span>
                <span className="text-xs font-black text-on-surface">Mot de passe temporaire généré !</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-normal">
                Transmettez ce mot de passe temporaire de sécurité à l'utilisateur :
              </p>
              <div className="flex items-center gap-2 self-start bg-background px-4 py-2 rounded-xl border border-outline font-mono text-base font-extrabold text-primary select-all">
                {tempPasswordShow.pass}
              </div>
              <p className="text-[10px] text-gray-500">
                L'utilisateur devra obligatoirement le modifier dès sa première connexion dans la section Profil.
              </p>
            </div>
          )}

          {/* User list */}
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1 mt-2 border border-outline-variant rounded-2xl p-2 bg-background/20" id="users_pass_list">
            {filteredAgents.length === 0 ? (
              <p className="text-center text-xs text-on-surface-variant py-8">Aucun compte trouvé correspondant à votre recherche.</p>
            ) : (
              filteredAgents.map((agent) => (
                <div 
                  key={agent.id}
                  className="bg-surface border border-outline-variant/60 rounded-xl p-3.5 flex items-center justify-between gap-4 hover:border-outline transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-primary font-bold text-sm border border-outline-variant">
                      {agent.nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-on-surface">{agent.nom}</span>
                      <span className="text-[10px] text-gray-500 font-mono font-medium">
                        Tél : {agent.telephone} • Rôle : <span className="font-bold capitalize">{agent.role}</span>
                      </span>
                      {agent.isTempPassword && (
                        <span className="text-[9px] bg-amber-500/15 text-amber-500 border border-amber-500/25 px-1.5 py-0.5 rounded w-max font-bold mt-1 uppercase tracking-wide">
                          ⚠️ MDP Temporaire Actif
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id={`btn_reset_pass_${agent.id}`}
                      onClick={() => handleResetPassword(agent.id)}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                      title="Réinitialiser le mot de passe"
                    >
                      <Unlock size={12} />
                      Générer MDP Temp
                    </button>
                    {agent.id !== 'admin-1' && (
                      <button
                        id={`btn_delete_agent_${agent.id}`}
                        onClick={() => {
                          if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte de ${agent.nom} ?`)) {
                            onDeleteAgent(agent.id);
                          }
                        }}
                        className="p-1.5 text-error hover:bg-error-container/10 rounded-lg transition-all cursor-pointer"
                        title="Supprimer ce compte"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
