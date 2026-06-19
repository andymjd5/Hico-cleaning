import { User, Shield, LogOut, Database, Phone } from 'lucide-react';
import { Agent } from '../types';

interface ProfilViewProps {
  currentAgent: Agent;
  onLogout: () => void;
  onResetDatabase: () => void;
  activeTheme: 'dark' | 'light';
  onChangeTheme: (theme: 'dark' | 'light') => void;
}

export default function ProfilView({
  currentAgent,
  onLogout,
  onResetDatabase,
  activeTheme,
  onChangeTheme
}: ProfilViewProps) {

  const handleResetClick = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser la base de données locale ? Toutes les parcelles créées lors de cette session seront annulées.")) {
      onResetDatabase();
      alert("Base de données réinitialisée aux valeurs d'origine !");
    }
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
