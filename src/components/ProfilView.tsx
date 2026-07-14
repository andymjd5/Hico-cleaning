import React, { useState } from 'react';
import { User, Shield, LogOut, Database, Phone, Key, Check, DollarSign, UserPlus } from 'lucide-react';
import { Agent, Screen } from '../types';

interface ProfilViewProps {
  currentAgent: Agent;
  onLogout: () => void;
  onResetDatabase: () => void;
  activeTheme: 'dark' | 'light';
  onChangeTheme: (theme: 'dark' | 'light') => void;
  onUpdatePassword: (newPassword: string) => void;
  onNavigate?: (screen: Screen) => void;
}

export default function ProfilView({
  currentAgent,
  onLogout,
  onResetDatabase,
  activeTheme,
  onChangeTheme,
  onUpdatePassword,
  onNavigate
}: ProfilViewProps) {
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  const getPermissions = () => {
    const customPermsRaw = localStorage.getItem('hico_role_permissions');
    if (!customPermsRaw) {
      return currentAgent.role === 'admin' 
        ? ['admin_settings_screens', 'admin_settings_pricing', 'admin_settings_accounts', 'admin_settings_passwords']
        : [];
    }
    try {
      const perms = JSON.parse(customPermsRaw);
      return perms[currentAgent.role] || [];
    } catch (e) {
      return [];
    }
  };

  const allowedScreens = getPermissions();

  const handleResetClick = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser la base de données locale ? Toutes les parcelles créées lors de cette session seront annulées.")) {
      onResetDatabase();
      alert("Base de données réinitialisée aux valeurs d'origine !");
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      alert("Veuillez saisir un mot de passe valide.");
      return;
    }
    onUpdatePassword(newPassword.trim());
    setNewPassword('');
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 4000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-on-background">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-surface text-primary flex items-center justify-center border border-outline-variant">
            <User size={18} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-on-background font-sans">Mon Profil Agent</h2>
        </div>
        <span className="bg-surface text-secondary text-xs px-3 py-1 rounded-full font-bold border border-secondary/25 uppercase tracking-wider font-mono">
          {currentAgent.role}
        </span>
      </div>

      {/* Identity Card styled like user badge */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-lg flex flex-col gap-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10" />

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center text-xl font-bold shadow-md shrink-0">
            {currentAgent.nom.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-on-surface leading-tight font-sans">
              {currentAgent.nom}
            </h3>
            <span className="text-xs text-on-surface-variant font-sans mt-0.5 animate-pulse">
              Hico-Cleaning • Agent Recenseur Actif
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant text-xs font-sans mt-1">
          <div className="flex justify-between items-center text-on-surface">
            <span className="text-on-surface-variant flex items-center gap-1.5 font-sans">
              <Phone size={14} className="text-on-surface-variant/60 shrink-0 font-sans" />
              Téléphone :
            </span>
            <span className="font-bold font-mono text-right">{currentAgent.telephone}</span>
          </div>

          <div className="flex justify-between items-center text-on-surface pb-1">
            <span className="text-on-surface-variant flex items-center gap-1.5 font-sans">
              <Shield size={14} className="text-on-surface-variant/60 shrink-0" />
              Rôle Applicatif :
            </span>
            <span className="font-bold capitalize text-right">{currentAgent.role}</span>
          </div>
        </div>
      </div>

      {/* 👑 Section Administration / Paramètres (visible only to authorized roles) */}
      {onNavigate && (allowedScreens.includes('admin_settings_screens') || 
                      allowedScreens.includes('admin_settings_pricing') || 
                      allowedScreens.includes('admin_settings_accounts') || 
                      allowedScreens.includes('admin_settings_passwords')) && (
        <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-lg flex flex-col gap-3" id="admin_profile_section">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-1.5 select-none flex items-center gap-1.5">
            👑 Administration & Paramètres
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed font-sans mb-1">
            Accédez directement aux modules de configuration et d'administration du système :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {allowedScreens.includes('admin_settings_screens') && (
              <button
                type="button"
                onClick={() => onNavigate('admin_settings_screens')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-background border border-outline-variant hover:border-primary text-on-surface text-xs font-semibold hover:text-primary transition-all cursor-pointer text-left"
              >
                <Shield size={14} className="text-primary shrink-0" />
                <span>Options d'Affichage / Rôles</span>
              </button>
            )}
            {allowedScreens.includes('admin_settings_pricing') && (
              <button
                type="button"
                onClick={() => onNavigate('admin_settings_pricing')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-background border border-outline-variant hover:border-primary text-on-surface text-xs font-semibold hover:text-primary transition-all cursor-pointer text-left"
              >
                <DollarSign size={14} className="text-primary shrink-0" />
                <span>Prix d'Abonnement</span>
              </button>
            )}
            {allowedScreens.includes('admin_settings_accounts') && (
              <button
                type="button"
                onClick={() => onNavigate('admin_settings_accounts')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-background border border-outline-variant hover:border-primary text-on-surface text-xs font-semibold hover:text-primary transition-all cursor-pointer text-left"
              >
                <UserPlus size={14} className="text-primary shrink-0" />
                <span>Création de Comptes Agents</span>
              </button>
            )}
            {allowedScreens.includes('admin_settings_passwords') && (
              <button
                type="button"
                onClick={() => onNavigate('admin_settings_passwords')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-background border border-outline-variant hover:border-primary text-on-surface text-xs font-semibold hover:text-primary transition-all cursor-pointer text-left"
              >
                <Key size={14} className="text-primary shrink-0" />
                <span>Mot de Passe Temporaire</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🔒 Section Mot de passe */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-lg flex flex-col gap-3" id="password_section_profile">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-1.5 select-none flex items-center gap-1">
          🔒 Sécurité & Mot de passe
        </h3>
        {currentAgent.isTempPassword && (
          <div className="p-3 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-start gap-2 text-xs text-amber-500 font-sans" id="temp_pass_alert">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">Mot de passe temporaire actif !</span>
              <span>Veuillez changer votre mot de passe immédiatement ci-dessous pour sécuriser votre accès permanent.</span>
            </div>
          </div>
        )}
        <p className="text-xs text-on-surface-variant leading-relaxed font-sans mb-1">
          Modifiez votre mot de passe pour sécuriser l'accès à votre espace de travail.
        </p>
        <form onSubmit={handlePasswordSubmit} className="flex gap-2" id="form_change_pass">
          <input
            type="password"
            id="input_new_pass_profile"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-grow h-10 px-3 bg-background border border-outline-variant rounded-xl text-on-surface text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans"
            required
          />
          <button
            type="submit"
            id="btn_submit_pass_profile"
            className="h-10 px-4 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
          >
            Mettre à jour
          </button>
        </form>
        {successMsg && (
          <p className="text-xs text-[#10b981] font-bold flex items-center gap-1.5 bg-[#10b981]/15 border border-[#10b981]/20 p-2.5 rounded-xl animate-fade-in" id="pass_success_msg">
            <Check size={14} /> Votre mot de passe a été mis à jour avec succès !
          </p>
        )}
      </div>

      {/* 🎨 Theme Selector Section */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-lg flex flex-col gap-3">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-1.5 select-none">
          🎨 Style de l'Application
        </h3>
        <p className="text-xs text-on-surface-variant leading-relaxed font-sans mb-1">
          Configurez l'apparence générale de l'application (Thème Blanc vs Thème Noir).
        </p>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <button
            type="button"
            onClick={() => onChangeTheme('dark')}
            className={`border rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTheme === 'dark'
                ? 'border-primary bg-primary/10 text-primary font-bold'
                : 'border-outline-variant bg-background text-on-surface-variant hover:border-outline'
            }`}
          >
            <span className="text-xl">🌙</span>
            <span className="text-xs font-bold tracking-wide">Thème Noir</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTheme('light')}
            className={`border rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTheme === 'light'
                ? 'border-primary bg-primary/15 text-primary font-bold shadow-sm'
                : 'border-outline-variant bg-background text-on-surface-variant hover:border-outline'
            }`}
          >
            <span className="text-xl">☀️</span>
            <span className="text-xs font-bold tracking-wide">Thème Blanc</span>
          </button>
        </div>
      </div>

      {/* System control block */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-lg flex flex-col gap-3">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-1 select-none">
          💾 Gestion des Données Locales
        </h3>
        <p className="text-xs text-on-surface-variant leading-relaxed font-sans font-medium">
          L'application Hico-Cleaning fonctionne selon un modèle d'architecture Web local-first de sorte à garantir des recensements robustes même sans réseau Internet sous-jacent.
        </p>

        {/* Reset button action */}
        <button
          onClick={handleResetClick}
          className="mt-2 w-full h-11 bg-transparent border border-error/35 text-error hover:bg-error/5 active:scale-95 transition-all rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Database size={14} />
          Réinitialiser aux valeurs d'origine
        </button>
      </div>

      {/* Logout button */}
      <button
        onClick={onLogout}
        className="w-full h-12 bg-error text-on-primary hover:opacity-90 active:scale-[0.98] transition-all rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
      >
        <LogOut size={16} />
        Se déconnecter de la session
      </button>
    </div>
  );
}
