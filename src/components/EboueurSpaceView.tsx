import React, { useState } from 'react';
import { 
  Eboueur, 
  PoubelleSignal,
  AgentDotation
} from '../types';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Check, 
  Inbox, 
  History, 
  Radio, 
  Phone,
  Bug,
  Terminal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Package
} from 'lucide-react';

interface EboueurSpaceViewProps {
  currentEboueur: Eboueur;
  assignedMissions: PoubelleSignal[];
  completedMissions: PoubelleSignal[];
  agentDotation?: AgentDotation;
  onToggleGps: () => void;
  onUpdateGpsCoords?: (latitude: number, longitude: number) => void;
  onCompleteMission: (signalId: string) => void;
  onUnloadTruck?: () => void;
  onLogout?: () => void;
  currentUser?: any;
  allRawSignals?: PoubelleSignal[];
  allAgents?: any[];
}

export default function EboueurSpaceView({
  currentEboueur,
  assignedMissions,
  completedMissions,
  agentDotation,
  onToggleGps,
  onCompleteMission,
  onUnloadTruck,
  currentUser,
  allRawSignals = [],
  allAgents = []
}: EboueurSpaceViewProps) {
  const [showDebugConsole, setShowDebugConsole] = useState(true);
  const hasActiveMission = assignedMissions.length > 0;

  const maxCap = currentEboueur.capacite_camion || 6;
  const currentLoad = currentEboueur.charge_actuelle || 0;
  const freeSpace = Math.max(0, maxCap - currentLoad);
  const loadPercentage = Math.min(100, Math.round((currentLoad / maxCap) * 100));

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in text-on-background">
      
      {/* Welcome & GPS Status Card */}
      <header className="bg-surface border border-outline-variant rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 via-transparent to-primary/5 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 z-10 relative">
          
          {/* Driver identity */}
          <div className="flex flex-col gap-1.5 flex-grow">
            <span className="text-[10px] sm:text-xs bg-secondary/20 text-indigo-300 font-extrabold uppercase px-3 py-1 rounded-full border border-secondary/20 w-max tracking-wider">
              Espace Agent Éboueur 🚚
            </span>
            
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-on-surface tracking-tight mt-1">
              Bonjour, {currentEboueur.nom}
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant font-medium font-mono flex items-center gap-2">
              <span>Service de Collecte</span>
              <span>•</span>
              <span className="text-secondary font-bold">{currentEboueur.telephone}</span>
            </p>
          </div>

          {/* Real-time GPS Tracker Switch Card */}
          <div className="flex flex-col gap-2.5 shrink-0 w-full lg:w-auto">
            <div className="bg-background/80 border border-outline-variant/80 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div className={`w-3.5 h-3.5 rounded-full ${currentEboueur.gps_active ? 'bg-[#10b981]' : 'bg-error'}`} />
                  {currentEboueur.gps_active && (
                    <div className="absolute w-5 h-5 bg-[#10b981]/40 rounded-full animate-ping" />
                  )}
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-extrabold text-on-surface text-xs sm:text-sm">Traceur GPS Réel</span>
                  <span className="text-[10px] sm:text-xs text-on-surface-variant font-mono">
                    {currentEboueur.gps_active 
                      ? (currentEboueur.latitude === 0 && currentEboueur.longitude === 0
                        ? "Recherche de signal GPS réel..."
                        : `Position : ${currentEboueur.latitude.toFixed(5)}, ${currentEboueur.longitude.toFixed(5)}`
                      )
                      : 'GPS inactif'
                    }
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  const targetState = !currentEboueur.gps_active;
                  onToggleGps();
                  setTimeout(() => {
                    alert(targetState 
                      ? "Traceur GPS de service activé ! Votre position GPS réelle est diffusée en temps réel au centre."
                      : "Traceur GPS désactivé."
                    );
                  }, 50);
                }}
                className={`w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                  currentEboueur.gps_active 
                    ? 'bg-error hover:bg-error/90 text-white' 
                    : 'bg-[#10b981] hover:bg-[#10b981]/90 text-white'
                }`}
              >
                <Radio size={16} className={currentEboueur.gps_active ? 'animate-pulse' : ''} />
                <span>{currentEboueur.gps_active ? 'Désactiver le GPS' : 'Activer le GPS Réel'}</span>
              </button>
            </div>

            {currentEboueur.gps_active && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 sm:p-3 text-[10px] sm:text-xs text-emerald-300 leading-relaxed flex flex-col gap-1 max-w-lg">
                <p className="font-bold flex items-center gap-1.5">
                  <span>🛰️</span> Traceur GPS actif en arrière-plan
                </p>
                <p className="text-emerald-300/80">
                  Votre navigateur transmet périodiquement vos coordonnées géographiques réelles. Assurez-vous d'accorder l'autorisation de localisation à l'application.
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Truck Capacity & Cargo Load Card */}
      <div className="bg-surface border border-outline-variant rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-grow">
          <div className="p-3 bg-secondary/15 text-secondary rounded-2xl shrink-0">
            <Truck size={28} />
          </div>
          <div className="flex flex-col gap-1.5 flex-grow">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black text-on-surface uppercase tracking-wider">
                Chargement du Camion : <span className="text-secondary font-mono font-bold text-sm">{currentLoad} / {maxCap} sachets</span>
              </span>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                currentLoad >= maxCap 
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse'
                  : currentLoad >= maxCap * 0.7
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                {currentLoad >= maxCap 
                  ? '🚨 CAMION PLEIN' 
                  : `${freeSpace} place${freeSpace > 1 ? 's' : ''} libre${freeSpace > 1 ? 's' : ''}`
                }
              </span>
            </div>

            {/* Gauge progress bar */}
            <div className="w-full h-3 bg-background border border-outline-variant/60 rounded-full overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  currentLoad >= maxCap 
                    ? 'bg-rose-500' 
                    : currentLoad >= maxCap * 0.7 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${loadPercentage}%` }}
              />
            </div>

            <p className="text-[11px] text-on-surface-variant font-medium leading-normal">
              À chaque retrait effectué chez l'abonné, le camion enregistre 1 sachet collecté et lui remet 1 sachet de rechange neuf (décompté du stock communal).
            </p>
          </div>
        </div>

        {/* Dotation Sachets Neufs (Bio & Non-Bio) */}
        <div className="bg-background/60 border border-outline-variant p-3.5 rounded-2xl flex flex-col gap-2 shrink-0 min-w-[200px]">
          <span className="text-[10px] font-black uppercase tracking-wider text-secondary flex items-center gap-1">
            <Package size={14} /> Stock Sachets Neufs en Camion
          </span>
          <div className="flex items-center gap-3 font-mono font-black text-xs">
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-400 uppercase font-bold">Bio (Vert)</span>
              <span className="text-sm text-on-surface">{agentDotation?.biodegradable ?? 20} u</span>
            </div>
            <div className="border-l border-outline-variant h-6"></div>
            <div className="flex flex-col">
              <span className="text-[9px] text-indigo-400 uppercase font-bold">Non-Bio (Bleu)</span>
              <span className="text-sm text-on-surface">{agentDotation?.non_biodegradable ?? 20} u</span>
            </div>
          </div>
        </div>

        {currentLoad > 0 && onUnloadTruck && (
          <button
            onClick={() => {
              if (confirm(`Avez-vous déchargé les ${currentLoad} sachets de votre camion à la décharge principale ?`)) {
                onUnloadTruck();
              }
            }}
            className="shrink-0 min-h-[44px] px-4 py-2.5 bg-secondary/15 hover:bg-secondary/25 text-indigo-300 border border-secondary/30 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            title="Réinitialiser la charge après déchargement"
          >
            <RefreshCw size={15} />
            <span>Décharger le camion (Vider) 🚚</span>
          </button>
        )}
      </div>

      {/* Main dashboard panel: Active Mission vs History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Active Mission Panel (Left 2 columns) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-md flex-grow flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
              <h3 className="text-sm sm:text-base font-extrabold text-on-surface flex items-center gap-2">
                <Inbox size={20} className="text-secondary shrink-0" />
                <span>Mission(s) de Collecte Active(s)</span>
              </h3>
              {hasActiveMission && (
                <span className="text-xs bg-secondary/15 text-secondary border border-secondary/30 font-black px-2.5 py-1 rounded-full">
                  {assignedMissions.length} {assignedMissions.length > 1 ? 'missions à faire' : 'mission'}
                </span>
              )}
            </div>

            {hasActiveMission ? (
              <div className="flex flex-col gap-4 flex-grow">
                {assignedMissions.map((mission, idx) => (
                  <div key={mission.id} className="bg-background/40 border border-outline-variant rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                    {assignedMissions.length > 1 && (
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-md w-max border border-secondary/20">
                        Mission #{idx + 1}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-error/15 text-error rounded-xl shrink-0 mt-0.5">
                          <MapPin size={22} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider">
                            Adresse de ramassage :
                          </h4>
                          <p className="text-base sm:text-lg font-black text-primary">
                            Parcelle N° {mission.numero_parcelle}
                          </p>
                          <p className="text-xs sm:text-sm text-on-surface-variant font-medium leading-relaxed">
                            Avenue {mission.avenue_nom}, Commune de {mission.commune_nom}
                          </p>
                        </div>
                      </div>

                      <div className="self-start sm:self-auto shrink-0">
                        {mission.type_poubelle === 'biodegradable' ? (
                          <span className="inline-flex items-center text-[10px] sm:text-xs font-mono bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-full font-bold uppercase border border-emerald-500/20 whitespace-nowrap">
                            Biodégradable (Vert) 🟢
                          </span>
                        ) : mission.type_poubelle === 'non_biodegradable' ? (
                          <span className="inline-flex items-center text-[10px] sm:text-xs font-mono bg-indigo-500/15 text-indigo-400 px-3 py-1.5 rounded-full font-bold uppercase border border-indigo-500/20 whitespace-nowrap">
                            Non-Dégradable (Gris) ⚪
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] sm:text-xs font-mono bg-error/15 text-error px-3 py-1.5 rounded-full font-bold uppercase border border-error/20 whitespace-nowrap">
                            Poubelle Pleine 🚨
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Landlord metadata */}
                    <div className="border-t border-b border-outline-variant/30 py-3.5 flex flex-col gap-2 text-xs sm:text-sm">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Informations de l'Abonné (Bailleur)
                      </span>
                      <span className="font-extrabold text-on-surface text-sm sm:text-base">
                        {mission.bailleur_nom}
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                        <a 
                          href={`tel:${mission.bailleur_telephone}`}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl font-bold font-mono text-xs transition-colors cursor-pointer w-max border border-secondary/20"
                        >
                          <Phone size={14} />
                          <span>{mission.bailleur_telephone || 'Inconnu'}</span>
                        </a>
                        <span className="text-[10px] sm:text-xs font-semibold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-900/40 w-max">
                          ➜ Sac de rechange {mission.type_poubelle === 'biodegradable' ? 'biodégradable' : 'non-dégradable'} prêt pour échange
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-on-surface-variant pt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock size={13} /> Signalé à {mission.reported_at ? mission.reported_at.substring(11, 16) : 'N/A'}
                      </span>
                      <span className="font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5 text-xs">
                        <Navigation size={14} className="rotate-45" /> En attente de passage
                      </span>
                    </div>

                    {/* Validation Action */}
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          onCompleteMission(mission.id);
                          alert(`Félicitations ! Mission pour la parcelle N° ${mission.numero_parcelle} validée avec succès. La poubelle est enregistrée comme vidée.`);
                        }}
                        className="w-full min-h-[46px] py-3 px-4 bg-[#10b981] hover:bg-[#10b981]/95 active:scale-[0.98] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={18} />
                        <span>Marquer cette mission comme Terminée (Poubelle Vidée) ✅</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 gap-3 flex-grow bg-background/20 rounded-2xl border border-dashed border-outline-variant/40 min-h-[220px]">
                <Truck size={44} className="text-on-surface-variant/40" />
                <div className="flex flex-col gap-1 max-w-sm">
                  <h4 className="text-base font-bold text-on-surface">Aucune mission assignée</h4>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-normal">
                    Vous n'avez pas de collecte active. Restez en ligne avec votre GPS activé pour que le bureau vous transmette la prochaine adresse.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Panel (Right 1 column) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-md flex-grow flex flex-col min-h-[320px] max-h-[500px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2 mb-3 select-none">
              <History size={15} className="text-secondary" />
              <span>Historique de service ({completedMissions.length})</span>
            </h3>

            <div className="flex-grow overflow-y-auto flex flex-col gap-2.5 pr-1">
              {completedMissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-grow text-center py-12 px-4 text-on-surface-variant italic text-xs gap-2">
                  <Clock size={28} className="opacity-30" />
                  <p>Aucune mission terminée aujourd'hui.</p>
                </div>
              ) : (
                completedMissions.map((mis) => (
                  <div 
                    key={mis.id}
                    className="bg-background/40 border border-outline-variant/50 p-3 rounded-xl flex items-start gap-2.5 text-xs text-left hover:bg-background/60 transition-colors"
                  >
                    <div className="p-1.5 bg-[#10b981]/15 text-[#10b981] rounded-lg shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <span className="font-extrabold text-on-surface block truncate text-xs sm:text-sm">
                        N° {mis.numero_parcelle}, Av. {mis.avenue_nom}
                      </span>
                      <div className="flex flex-col gap-0.5 text-[11px] text-on-surface-variant mt-0.5">
                        <span>Commune : {mis.commune_nom}</span>
                        <span className={`font-semibold ${mis.type_poubelle === 'biodegradable' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                          Type : {mis.type_poubelle === 'biodegradable' ? 'Biodégradable (Vert)' : 'Non-Dégradable (Gris)'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#10b981] font-mono mt-1 font-semibold flex items-center gap-1">
                        <Clock size={11} /> Complété • Sac remplacé ✔
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Console de Diagnostic de Mission (Inspection & Debugging) */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden text-slate-200 shadow-2xl font-sans mt-2">
        {/* Header bar */}
        <div 
          onClick={() => setShowDebugConsole(!showDebugConsole)}
          className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-850 transition-colors select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Terminal size={18} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                <span>Console de Diagnostic des Missions</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Mode Inspecteur 🛠️
                </span>
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono">
                Inspecteur de correspondances d'identifiants, signaux bruts en base et statut du compte.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.reload();
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
              title="Rafraîchir l'application"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <div className="p-1 bg-slate-800 rounded-lg text-slate-400">
              {showDebugConsole ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </div>

        {/* Console Content */}
        {showDebugConsole && (
          <div className="p-4 sm:p-5 flex flex-col gap-4 bg-slate-950/90 text-xs font-mono">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Session Utilisateur</span>
                <span className="text-sm font-bold text-indigo-300 truncate block">
                  {currentUser?.nom || currentEboueur.nom}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">Rôle: {currentUser?.role || 'éboueur'}</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Identifiant Agent</span>
                <span className="text-xs font-bold text-slate-200 truncate block">{currentEboueur.id}</span>
                <span className="text-[10px] text-slate-500 block">Tél: {currentEboueur.telephone}</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Signaux Réseau</span>
                <span className="text-sm font-bold text-amber-400">
                  {allRawSignals.length} au total
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {allRawSignals.filter(s => s.status === 'assigned').length} assignés
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Mes Missions Filtrées</span>
                <span className="text-sm font-bold text-emerald-400">
                  {assignedMissions.length} active(s)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {completedMissions.length} terminée(s)
                </span>
              </div>
            </div>

            {/* Table of all active/assigned signals in system */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-slate-300 font-bold text-xs">
                <span className="flex items-center gap-1.5">
                  <Bug size={14} className="text-amber-400" />
                  <span>Signaux Assignés sur le Réseau ({allRawSignals.filter(s => s.status === 'assigned').length}) :</span>
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/60 max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-900">
                      <th className="p-2">ID Signal</th>
                      <th className="p-2">Adresse</th>
                      <th className="p-2">ID Éboueur Assigné</th>
                      <th className="p-2">Statut</th>
                      <th className="p-2">Affiché pour Vous ?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {allRawSignals.filter(s => s.status === 'assigned').length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                          Aucun signalement avec le statut "assigned" actuellement dans la base de données.
                        </td>
                      </tr>
                    ) : (
                      allRawSignals.filter(s => s.status === 'assigned').map((sig) => {
                        const isAssignedToThisEboueur = assignedMissions.some(m => m.id === sig.id);
                        const rawAssignedId = sig.assigned_eboueur_id || (sig as any).eboueur_assigne_id || (sig as any).eboueur_id || 'Aucun';

                        return (
                          <tr key={sig.id} className="hover:bg-slate-800/40">
                            <td className="p-2 text-indigo-300 font-mono">{sig.id.substring(0, 8)}...</td>
                            <td className="p-2 font-sans font-medium">N° {sig.numero_parcelle}, Av. {sig.avenue_nom}</td>
                            <td className="p-2 text-amber-300 font-mono">{rawAssignedId}</td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold">
                                {sig.status}
                              </span>
                            </td>
                            <td className="p-2">
                              {isAssignedToThisEboueur ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <Check size={13} /> OUI (Affiché)
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">
                                  Non (Pas assigné à vous)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-800/80 pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
              <span>
                💡 ASTUCE : Si un signalement est assigné à n'importe quel chauffeur ou agent, il sera immédiatement visible dans la liste des missions actives.
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
