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
  Unlock,
  Database,
  Copy,
  CheckCheck,
  Building2,
  MapPin,
  Globe,
  Info
} from 'lucide-react';
import { Agent, AgentRole, Screen, Commune } from '../types';

interface AdminSettingsViewProps {
  agents: Agent[];
  onAddAgent: (newAgent: Agent) => void;
  onUpdateAgent: (updatedAgent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
  defaultTab?: 'screens' | 'pricing' | 'accounts' | 'passwords' | 'supabase_sql';
  onTabChange?: (tab: 'screens' | 'pricing' | 'accounts' | 'passwords' | 'supabase_sql') => void;
  communes?: Commune[];
  isSupabaseConfigured?: boolean;
  dbStatus?: string;
  supabase?: any;
}

export default function AdminSettingsView({
  agents,
  onAddAgent,
  onUpdateAgent,
  onDeleteAgent,
  defaultTab = 'screens',
  onTabChange,
  communes = [],
  isSupabaseConfigured = false,
  dbStatus = 'disconnected',
  supabase = null
}: AdminSettingsViewProps) {
  // 1. Tab State
  const [activeTab, setActiveTab] = useState<'screens' | 'pricing' | 'accounts' | 'passwords' | 'supabase_sql'>(defaultTab);

  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleTabClick = (tab: 'screens' | 'pricing' | 'accounts' | 'passwords' | 'supabase_sql') => {
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

        if (parsed.bourgmestre) {
          const filtered = parsed.bourgmestre.filter(
            (s: string) => !['dechets_map', 'sachets_management', 'finance_management', 'commune_explorer', 'communes', 'avenues', 'recensement_form'].includes(s)
          );
          if (filtered.length !== parsed.bourgmestre.length) {
            parsed.bourgmestre = filtered;
            updated = true;
          }
          if (!parsed.bourgmestre.includes('gestion_communale')) {
            parsed.bourgmestre.push('gestion_communale');
            updated = true;
          }
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
      admin: ['dashboard', 'communes', 'avenues', 'recensement_form', 'abonne_list', 'abonne_detail', 'rapports', 'commune_explorer', 'dechets_map', 'gestion_communale', 'sachets_management', 'finance_management', 'support', 'admin_settings_screens', 'admin_settings_pricing', 'admin_settings_accounts', 'admin_settings_passwords'],
      bourgmestre: ['dashboard', 'gestion_communale', 'rapports', 'abonne_list', 'abonne_detail', 'support'],
      agent: ['dashboard', 'communes', 'avenues', 'recensement_form', 'abonne_list', 'abonne_detail', 'commune_explorer', 'dechets_map', 'gestion_communale', 'sachets_management', 'finance_management', 'support'],
      finance_manager: ['dashboard', 'finance_management', 'rapports', 'support'],
      sachets_manager: ['dashboard', 'sachets_management', 'support'],
      poubelles_manager: ['dashboard', 'dechets_map', 'support'],
      support: ['dashboard', 'support', 'abonne_list', 'abonne_detail', 'rapports'],
      abonne: ['abonne_space', 'support'],
      eboueur: ['eboueur_space', 'support']
    };
  });
  const [permissionsSuccess, setPermissionsSuccess] = useState(false);

  // 4. Create Account State
  const [newAgentNom, setNewAgentNom] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentRole, setNewAgentRole] = useState<AgentRole>('agent');
  const [newAgentCommuneId, setNewAgentCommuneId] = useState<string>('all');
  const [newAgentPassword, setNewAgentPassword] = useState('password');
  const [newAgentCapacite, setNewAgentCapacite] = useState<number>(6);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  // 5. Password Reset / Search State & SQL Copy
  const [searchTerm, setSearchTerm] = useState('');
  const [tempPasswordShow, setTempPasswordShow] = useState<{ userId: string; pass: string } | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  const SUPABASE_ISOLATION_SQL = `-- =========================================================================
-- HICO-CLEANING : SCRIPT SQL D'ISOLATION ET D'AUTONOMIE PAR COMMUNE
-- À exécuter dans l'éditeur SQL de votre projet Supabase (Dashboard -> SQL Editor)
-- =========================================================================

-- 1. Table AGENTS : Rattachement communal et capacité
ALTER TABLE IF EXISTS agents 
ADD COLUMN IF NOT EXISTS commune_id TEXT,
ADD COLUMN IF NOT EXISTS commune_nom TEXT,
ADD COLUMN IF NOT EXISTS capacite_camion INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS charge_actuelle INTEGER DEFAULT 0;

-- 2. Table SIGNAUX_POUBELLES : Rattachement communal & Statuts
ALTER TABLE IF EXISTS signaux_poubelles 
ADD COLUMN IF NOT EXISTS commune_id TEXT,
ADD COLUMN IF NOT EXISTS commune_nom TEXT,
ADD COLUMN IF NOT EXISTS avenue_id TEXT,
ADD COLUMN IF NOT EXISTS avenue_nom TEXT,
ADD COLUMN IF NOT EXISTS parcelle_id TEXT,
ADD COLUMN IF NOT EXISTS numero_parcelle TEXT,
ADD COLUMN IF NOT EXISTS bailleur_nom TEXT,
ADD COLUMN IF NOT EXISTS bailleur_telephone TEXT,
ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS assigned_eboueur_id TEXT,
ADD COLUMN IF NOT EXISTS eboueur_assigne_id TEXT,
ADD COLUMN IF NOT EXISTS type_poubelle TEXT DEFAULT 'biodegradable',
ADD COLUMN IF NOT EXISTS is_hors_delai BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_partiel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS partiel_note TEXT,
ADD COLUMN IF NOT EXISTS estimated_arrival_minutes INTEGER,
ADD COLUMN IF NOT EXISTS eta_appointment_time TEXT,
ADD COLUMN IF NOT EXISTS confirmation_abonne TEXT DEFAULT 'en_attente',
ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS litige_abonne BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS litige_raison TEXT,
ADD COLUMN IF NOT EXISTS litige_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS photo_preuve_url TEXT,
ADD COLUMN IF NOT EXISTS gps_validation JSONB,
ADD COLUMN IF NOT EXISTS sachets_remis_bio INTEGER,
ADD COLUMN IF NOT EXISTS sachets_remis_non_bio INTEGER;

-- 3. Table SUBSCRIPTION_PAYMENTS (Paiements Redevance / Factures)
ALTER TABLE IF EXISTS subscription_payments 
ADD COLUMN IF NOT EXISTS commune_id TEXT,
ADD COLUMN IF NOT EXISTS commune_nom TEXT,
ADD COLUMN IF NOT EXISTS parcelle_id TEXT,
ADD COLUMN IF NOT EXISTS abonne_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- 4. Table SACHET_STOCKS & DISTRIBUTIONS (Gestion des sachets)
ALTER TABLE IF EXISTS sachet_stocks 
ADD COLUMN IF NOT EXISTS commune_id TEXT,
ADD COLUMN IF NOT EXISTS commune_nom TEXT;

ALTER TABLE IF EXISTS sachet_distributions 
ADD COLUMN IF NOT EXISTS commune_id TEXT,
ADD COLUMN IF NOT EXISTS commune_nom TEXT;

ALTER TABLE IF EXISTS agent_dotations 
ADD COLUMN IF NOT EXISTS commune_id TEXT;

-- 5. Table DISPUTE_SIGNALS (Contentieux & Litiges)
ALTER TABLE IF EXISTS dispute_signals 
ADD COLUMN IF NOT EXISTS commune_id TEXT,
ADD COLUMN IF NOT EXISTS commune_nom TEXT;

ALTER TABLE IF EXISTS dis_signals 
ADD COLUMN IF NOT EXISTS commune_id TEXT,
ADD COLUMN IF NOT EXISTS commune_nom TEXT;

-- 6. Table INCIVISME_INCIDENTS & CONVOCATIONS (Bourgmestre & Police d'assainissement)
ALTER TABLE IF EXISTS incivisme_incidents 
ADD COLUMN IF NOT EXISTS commune_id TEXT,
ADD COLUMN IF NOT EXISTS commune_nom TEXT;

ALTER TABLE IF EXISTS convocations_communales 
ADD COLUMN IF NOT EXISTS commune_id TEXT,
ADD COLUMN IF NOT EXISTS commune_nom TEXT;

-- 7. Table SYSTEM_SETTINGS (Paramètres de tarification et permissions de rôles)
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Index pour optimiser les requêtes temps réel filtrées par commune
CREATE INDEX IF NOT EXISTS idx_agents_commune_id ON agents(commune_id);
CREATE INDEX IF NOT EXISTS idx_signaux_commune_id ON signaux_poubelles(commune_id);
CREATE INDEX IF NOT EXISTS idx_payments_commune_id ON subscription_payments(commune_id);
CREATE INDEX IF NOT EXISTS idx_sachets_commune_id ON sachet_stocks(commune_id);

-- 9. Activer les publications Realtime pour signaux et agents
ALTER PUBLICATION supabase_realtime ADD TABLE signaux_poubelles;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_ISOLATION_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  // Effect to load system settings from Supabase if connected
  React.useEffect(() => {
    const fetchSystemSettings = async () => {
      if (isSupabaseConfigured && dbStatus === 'connected' && supabase) {
        try {
          const { data, error } = await supabase.from('system_settings').select('*');
          if (!error && data && data.length > 0) {
            data.forEach((setting: any) => {
              const rawVal = setting.value;
              let valStr = '';
              if (typeof rawVal === 'object' && rawVal !== null) {
                valStr = JSON.stringify(rawVal);
              } else {
                valStr = String(rawVal);
                if (valStr.startsWith('"') && valStr.endsWith('"')) {
                  valStr = valStr.substring(1, valStr.length - 1);
                }
              }

              if (setting.id === 'subscription_price') {
                const p = parseFloat(valStr);
                if (!isNaN(p)) {
                  setSubscriptionPrice(p);
                  localStorage.setItem('hico_subscription_price', valStr);
                }
              } else if (setting.id === 'subscription_currency') {
                setCurrency(valStr);
                localStorage.setItem('hico_subscription_currency', valStr);
              } else if (setting.id === 'commune_prices') {
                const parsed = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
                setCommunePrices(parsed || {});
                localStorage.setItem('hico_commune_prices', valStr);
              } else if (setting.id === 'role_permissions') {
                const parsed = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
                setRolePermissions(parsed || {});
                localStorage.setItem('hico_role_permissions', valStr);
              }
            });
          }
        } catch (err) {
          console.warn("Erreur lors du chargement des paramètres système depuis Supabase:", err);
        }
      }
    };
    fetchSystemSettings();
  }, [isSupabaseConfigured, dbStatus, supabase]);

  // Handle saving subscription prices
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('hico_subscription_price', subscriptionPrice.toString());
    localStorage.setItem('hico_subscription_currency', currency);
    localStorage.setItem('hico_commune_prices', JSON.stringify(communePrices));

    if (isSupabaseConfigured && dbStatus === 'connected' && supabase) {
      try {
        await supabase.from('system_settings').upsert([
          { id: 'subscription_price', value: subscriptionPrice.toString() },
          { id: 'subscription_currency', value: currency },
          { id: 'commune_prices', value: communePrices }
        ]);
      } catch (err) {
        console.warn("Échec d'enregistrement des tarifs sur Supabase :", err);
      }
    }

    setPriceSuccess(true);
    setTimeout(() => setPriceSuccess(false), 3000);
  };

  // Handle saving custom screen permissions per role
  const handleSavePermissions = async () => {
    localStorage.setItem('hico_role_permissions', JSON.stringify(rolePermissions));

    if (isSupabaseConfigured && dbStatus === 'connected' && supabase) {
      try {
        await supabase.from('system_settings').upsert([
          { id: 'role_permissions', value: rolePermissions }
        ]);
      } catch (err) {
        console.warn("Échec d'enregistrement des permissions sur Supabase :", err);
      }
    }

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

    const isGlobal = newAgentCommuneId === 'all' || !newAgentCommuneId;
    const selectedCommObj = communes.find(c => c.id === newAgentCommuneId);

    const newAgent: Agent = {
      id: 'agent-' + Math.random().toString(36).substring(2, 11),
      nom: newAgentNom.trim(),
      telephone: newAgentPhone.trim(),
      role: newAgentRole,
      created_at: new Date().toISOString(),
      password: newAgentPassword || 'password',
      isTempPassword: false,
      capacite_camion: newAgentRole === 'eboueur' ? newAgentCapacite : undefined,
      charge_actuelle: 0,
      commune_id: isGlobal ? 'all' : newAgentCommuneId,
      commune_nom: isGlobal ? 'Toutes les communes (Kinshasa)' : (selectedCommObj ? selectedCommObj.nom : newAgentCommuneId)
    };

    onAddAgent(newAgent);
    setAccountSuccess(`Le compte de ${newAgent.nom} (${newAgent.role} - ${newAgent.commune_nom}) a été créé avec succès !`);
    
    // Clear fields
    setNewAgentNom('');
    setNewAgentPhone('');
    setNewAgentPassword('password');
    setNewAgentCommuneId('all');
  };

  // Reassign agent to a specific commune or global
  const handleUpdateAgentCommune = (agentId: string, commId: string) => {
    const targetAgent = agents.find(a => a.id === agentId);
    if (!targetAgent) return;

    const isGlobal = commId === 'all' || !commId;
    const selectedCommObj = communes.find(c => c.id === commId);

    const updatedAgent: Agent = {
      ...targetAgent,
      commune_id: isGlobal ? 'all' : commId,
      commune_nom: isGlobal ? 'Toutes les communes (Kinshasa)' : (selectedCommObj ? selectedCommObj.nom : commId)
    };

    onUpdateAgent(updatedAgent);
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
    { id: 'gestion_communale', label: 'Gestion Communale (Bourgmestre & Convocations)', rolesAllowed: ['admin', 'bourgmestre', 'agent'] },
    { id: 'dechets_map', label: 'Carte Poubelles & Éboueurs (Leaflet)', rolesAllowed: ['admin', 'agent', 'eboueur', 'poubelles_manager'] },
    { id: 'rapports', label: 'Rapports & Graphiques D3', rolesAllowed: ['admin', 'agent', 'finance_manager'] },
    { id: 'sachets_management', label: 'Gestion de Sachets Poubelles', rolesAllowed: ['admin', 'agent', 'sachets_manager'] },
    { id: 'finance_management', label: 'Gestion Financière (Recettes & Dépenses)', rolesAllowed: ['admin', 'agent', 'finance_manager'] },
    { id: 'support', label: 'Support & Assistance Client', rolesAllowed: ['admin', 'agent', 'support', 'finance_manager', 'sachets_manager', 'poubelles_manager'] },
    { id: 'abonne_space', label: 'Espace Abonné Exclusif', rolesAllowed: ['abonne'] },
    { id: 'eboueur_space', label: 'Espace Mission Éboueur Exclusif', rolesAllowed: ['eboueur'] },
    { id: 'admin_settings_screens', label: 'Paramètres: Options d\'Affichage / Rôles (Point 1)', rolesAllowed: ['admin'] },
    { id: 'admin_settings_pricing', label: 'Paramètres: Prix d\'Abonnement (Point 2)', rolesAllowed: ['admin'] },
    { id: 'admin_settings_accounts', label: 'Paramètres: Création de Comptes Agents (Point 3)', rolesAllowed: ['admin'] },
    { id: 'admin_settings_passwords', label: 'Paramètres: Mot de Passe Temporaire (Point 4)', rolesAllowed: ['admin'] }
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background pb-12 w-full max-w-full min-w-0 overflow-x-hidden" id="admin_settings_view">
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
          Création de Comptes
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
          Mots de Passe & Communes
        </button>
        <button
          id="tab_btn_supabase_sql"
          onClick={() => handleTabClick('supabase_sql')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'supabase_sql'
              ? 'bg-primary text-on-primary shadow-md'
              : 'text-emerald-400 hover:bg-background hover:text-emerald-300'
          }`}
        >
          <Database size={14} />
          Script SQL Supabase ⚡
        </button>
      </div>

      {/* TAB CONTENT 1: Screens Display options per role */}
      {activeTab === 'screens' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-4 animate-fade-in" id="screens_settings_card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-outline-variant/60 pb-3" id="screens_settings_header">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-black text-on-surface tracking-tight">Configuration des options d'affichage par rôle</h3>
              <p className="text-xs text-on-surface-variant">Configurez quels écrans ou menus s'affichent dans la barre latérale pour chaque rôle utilisateur.</p>
            </div>
            {isSupabaseConfigured && dbStatus === 'connected' ? (
              <span className="text-[10px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25 px-2.5 py-1 rounded-xl font-bold font-mono h-max w-max flex items-center gap-1">
                <Check size={10} /> CLOUD SYNC
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/25 px-2.5 py-1 rounded-xl font-bold font-mono h-max w-max flex items-center gap-1">
                ⚠️ LOCAL ONLY
              </span>
            )}
          </div>

          <div className="overflow-x-auto mt-2 border border-outline-variant rounded-2xl" id="screens_table_wrapper">
            <table className="w-full text-left border-collapse text-xs" id="screens_table">
              <thead>
                <tr className="bg-background border-b border-outline-variant text-on-surface-variant font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-4">Écran / Option de menu</th>
                  <th className="p-3 text-center">Admin 👑</th>
                  <th className="p-3 text-center">Bourgmestre 🏛️</th>
                  <th className="p-3 text-center">Agent 📋</th>
                  <th className="p-3 text-center">Finance 💰</th>
                  <th className="p-3 text-center">Sachets 🛍️</th>
                  <th className="p-3 text-center">Poubelles 🗑️</th>
                  <th className="p-3 text-center">Support 🎧</th>
                  <th className="p-3 text-center">Abonné 👤</th>
                  <th className="p-3 text-center">Éboueur 🚚</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {availableScreens.map((screen) => (
                  <tr key={screen.id} className="hover:bg-background/40 transition-colors">
                    <td className="p-3 pl-4 font-semibold text-on-surface flex flex-col gap-0.5">
                      <span>{screen.label}</span>
                      <span className="text-[10px] text-gray-500 font-mono font-medium">/{screen.id}</span>
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['admin'] || []).includes(screen.id)}
                        onChange={() => togglePermission('admin', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['bourgmestre'] || []).includes(screen.id)}
                        onChange={() => togglePermission('bourgmestre', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['agent'] || []).includes(screen.id)}
                        onChange={() => togglePermission('agent', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['finance_manager'] || []).includes(screen.id)}
                        onChange={() => togglePermission('finance_manager', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['sachets_manager'] || []).includes(screen.id)}
                        onChange={() => togglePermission('sachets_manager', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['poubelles_manager'] || []).includes(screen.id)}
                        onChange={() => togglePermission('poubelles_manager', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['support'] || []).includes(screen.id)}
                        onChange={() => togglePermission('support', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox"
                        checked={(rolePermissions['abonne'] || []).includes(screen.id)}
                        onChange={() => togglePermission('abonne', screen.id)}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center">
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-outline-variant/60 pb-3" id="pricing_settings_header">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-black text-on-surface tracking-tight">Modification des Tarifs d'Abonnement</h3>
              <p className="text-xs text-on-surface-variant">Modifiez le prix facturé mensuellement par ménage recensé pour l'abonnement d'évacuation des déchets.</p>
            </div>
            {isSupabaseConfigured && dbStatus === 'connected' ? (
              <span className="text-[10px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25 px-2.5 py-1 rounded-xl font-bold font-mono h-max w-max flex items-center gap-1">
                <Check size={10} /> CLOUD SYNC
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/25 px-2.5 py-1 rounded-xl font-bold font-mono h-max w-max flex items-center gap-1">
                ⚠️ LOCAL ONLY
              </span>
            )}
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
                  <option value="admin">Administrateur Système 👑</option>
                  <option value="bourgmestre">Bourgmestre / Autorité Communale 🏛️</option>
                  <option value="agent">Agent Recenseur 📋</option>
                  <option value="eboueur">Agent Éboueur (Chauffeur) 🚚</option>
                  <option value="finance_manager">Responsable Gestion Financière 💰</option>
                  <option value="sachets_manager">Responsable Gestion de Sachets 🛍️</option>
                  <option value="poubelles_manager">Responsable Poubelles & Éboueurs 🗑️</option>
                  <option value="support">Agent Support & Assistance 🎧</option>
                  <option value="abonne">Abonné (Bailleur) 👤</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="acc_commune">
                  Territoire de Gestion (Commune Assignée)
                </label>
                <select
                  id="acc_commune"
                  value={newAgentCommuneId}
                  onChange={(e) => setNewAgentCommuneId(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold"
                >
                  <option value="all">🌐 Toutes les communes (Global Admin / Superviseur Kinshasa)</option>
                  {communes.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏛️ Commune de {c.nom}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-on-surface-variant">
                  {newAgentCommuneId === 'all' 
                    ? "Cet utilisateur aura accès à toutes les données des 24 communes de Kinshasa."
                    : `Cet utilisateur sera strictement isolé sur la commune sélectionnée.`}
                </p>
              </div>

              {newAgentRole === 'eboueur' && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="acc_capacite">
                    Capacité du Camion Éboueur (Nombre de Sachets max)
                  </label>
                  <input 
                    type="number"
                    id="acc_capacite"
                    min="1"
                    max="50"
                    value={newAgentCapacite}
                    onChange={(e) => setNewAgentCapacite(parseInt(e.target.value) || 6)}
                    className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono font-bold"
                    placeholder="6"
                    required
                  />
                </div>
              )}

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

      {/* TAB CONTENT 4: Passwords Reset & Commune Assignment */}
      {activeTab === 'passwords' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-4 animate-fade-in" id="passwords_settings_card">
          <div className="flex flex-col gap-1" id="passwords_settings_header">
            <h3 className="text-base font-black text-on-surface tracking-tight">Gestion des Mots de Passe & Territoires Communaux</h3>
            <p className="text-xs text-on-surface-variant">Générez des mots de passe temporaires ou réassignez la commune de gestion de chaque administrateur ou agent.</p>
          </div>

          {/* Search Box */}
          <div className="relative mt-1" id="passwords_search_box">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
              <Search size={16} />
            </span>
            <input 
              type="text"
              placeholder="Rechercher par nom, téléphone, commune ou rôle..."
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
          <div className="flex flex-col gap-2 max-h-[30rem] overflow-y-auto pr-1 mt-2 border border-outline-variant rounded-2xl p-2 bg-background/20" id="users_pass_list">
            {filteredAgents.length === 0 ? (
              <p className="text-center text-xs text-on-surface-variant py-8">Aucun compte trouvé correspondant à votre recherche.</p>
            ) : (
              filteredAgents.map((agent) => {
                const isGlobal = agent.commune_id === 'all' || !agent.commune_id;
                return (
                  <div 
                    key={agent.id}
                    className="bg-surface border border-outline-variant/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-outline transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-primary font-bold text-sm border border-outline-variant shrink-0">
                        {agent.nom.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-on-surface">{agent.nom}</span>
                          <span className="text-[9px] bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                            {agent.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono font-medium">
                          Tél : {agent.telephone}
                        </span>
                        
                        {/* Commune tag & switcher */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                            isGlobal 
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {isGlobal ? <Globe size={11} /> : <Building2 size={11} />}
                            {isGlobal ? 'Global (24 communes)' : `Commune de ${agent.commune_nom || agent.commune_id}`}
                          </span>

                          <select
                            value={agent.commune_id || 'all'}
                            onChange={(e) => handleUpdateAgentCommune(agent.id, e.target.value)}
                            className="text-[10px] bg-background border border-outline-variant rounded-lg px-2 py-1 text-on-surface font-semibold focus:outline-none focus:border-primary cursor-pointer hover:border-primary/50 transition-colors"
                            title="Modifier le rattachement communal de cet utilisateur"
                          >
                            <option value="all">🌐 Toutes les communes (Global)</option>
                            {communes.map((c) => (
                              <option key={c.id} value={c.id}>
                                🏛️ {c.nom}
                              </option>
                            ))}
                          </select>
                        </div>

                        {agent.isTempPassword && (
                          <span className="text-[9px] bg-amber-500/15 text-amber-500 border border-amber-500/25 px-1.5 py-0.5 rounded w-max font-bold mt-1 uppercase tracking-wide">
                            ⚠️ MDP Temporaire Actif
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
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
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: Supabase SQL Script & Isolation Setup */}
      {activeTab === 'supabase_sql' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-5 animate-fade-in" id="supabase_sql_settings_card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-outline-variant/60 pb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                  <Database size={16} />
                </div>
                <h3 className="text-base font-black text-on-surface tracking-tight">Script SQL d'Isolation & d'Autonomie par Commune (Supabase)</h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Ce script SQL ajoute les colonnes <code className="text-primary font-mono font-bold">commune_id</code> et <code className="text-primary font-mono font-bold">commune_nom</code> à toutes les tables, garantissant que chaque administrateur communal ou bourgmestre ne gère que sa commune avec des données 100% étanches.
              </p>
            </div>

            <button
              id="btn_copy_sql"
              onClick={copySqlToClipboard}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shrink-0 active:scale-95 ${
                sqlCopied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-primary text-on-primary hover:opacity-90'
              }`}
            >
              {sqlCopied ? <CheckCheck size={16} /> : <Copy size={16} />}
              <span>{sqlCopied ? 'Script SQL Copié !' : 'Copier le Script SQL'}</span>
            </button>
          </div>

          {/* Guide d'utilisation en 3 étapes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-background/40 border border-outline-variant rounded-2xl p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[11px] font-black flex items-center justify-center font-mono">1</span>
                <span className="text-xs font-bold text-on-surface">Ouvrir Supabase</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-normal">
                Connectez-vous sur votre tableau de bord <strong className="text-on-surface">Supabase</strong> et cliquez sur <strong className="text-primary font-mono">SQL Editor</strong> dans le menu latéral gauche.
              </p>
            </div>

            <div className="bg-background/40 border border-outline-variant rounded-2xl p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[11px] font-black flex items-center justify-center font-mono">2</span>
                <span className="text-xs font-bold text-on-surface">Coller le Code</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-normal">
                Créez une <strong className="text-on-surface">New Query</strong>, collez l'intégralité du script SQL ci-dessous dans l'éditeur.
              </p>
            </div>

            <div className="bg-background/40 border border-outline-variant rounded-2xl p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-black flex items-center justify-center font-mono">3</span>
                <span className="text-xs font-bold text-on-surface">Exécuter (Run)</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-normal">
                Cliquez sur le bouton vert <strong className="text-emerald-400 font-mono">Run (▶)</strong>. Toutes les tables, index et publications Realtime seront configurés instantanément.
              </p>
            </div>
          </div>

          {/* Bloc SQL Affiché */}
          <div className="relative border border-outline-variant rounded-2xl overflow-hidden bg-[#0d1117]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                supabase_communal_isolation.sql
              </span>
              <button
                onClick={copySqlToClipboard}
                className="text-gray-300 hover:text-white flex items-center gap-1.5 text-[11px] font-bold bg-[#21262d] px-2.5 py-1 rounded-md border border-[#30363d] transition-all cursor-pointer"
              >
                {sqlCopied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {sqlCopied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-[#58a6ff] overflow-x-auto max-h-96 leading-relaxed select-all">
              <code>{SUPABASE_ISOLATION_SQL}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
