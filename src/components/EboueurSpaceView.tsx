import React from 'react';
import { 
  Eboueur, 
  PoubelleSignal 
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
  Phone
} from 'lucide-react';

interface EboueurSpaceViewProps {
  currentEboueur: Eboueur;
  assignedMissions: PoubelleSignal[];
  completedMissions: PoubelleSignal[];
  onToggleGps: () => void;
  onUpdateGpsCoords?: (latitude: number, longitude: number) => void;
  onCompleteMission: (signalId: string) => void;
  onLogout?: () => void;
  currentUser?: any;
  allRawSignals?: PoubelleSignal[];
  allAgents?: any[];
}

export default function EboueurSpaceView({
  currentEboueur,
  assignedMissions,
  completedMissions,
  onToggleGps,
  onCompleteMission,
}: EboueurSpaceViewProps) {
  
  const hasActiveMission = assignedMissions.length > 0;

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

      {/* Main dashboard panel: Active Mission vs History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Active Mission Panel (Left 2 columns) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-md flex-grow flex flex-col gap-4">
            <h3 className="text-sm sm:text-base font-extrabold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-3">
              <Inbox size={20} className="text-secondary shrink-0" />
              <span>Mission de Collecte Active</span>
            </h3>

            {hasActiveMission ? (
              <div className="flex flex-col gap-4 flex-grow justify-between">
                <div className="bg-background/40 border border-outline-variant rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
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
                          Parcelle N° {assignedMissions[0].numero_parcelle}
                        </p>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-medium leading-relaxed">
                          Avenue {assignedMissions[0].avenue_nom}, Commune de {assignedMissions[0].commune_nom}
                        </p>
                      </div>
                    </div>

                    <div className="self-start sm:self-auto shrink-0">
                      {assignedMissions[0].type_poubelle === 'biodegradable' ? (
                        <span className="inline-flex items-center text-[10px] sm:text-xs font-mono bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-full font-bold uppercase border border-emerald-500/20 whitespace-nowrap">
                          Biodégradable (Vert) 🟢
                        </span>
                      ) : assignedMissions[0].type_poubelle === 'non_biodegradable' ? (
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
                      {assignedMissions[0].bailleur_nom}
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                      <a 
                        href={`tel:${assignedMissions[0].bailleur_telephone}`}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl font-bold font-mono text-xs transition-colors cursor-pointer w-max border border-secondary/20"
                      >
                        <Phone size={14} />
                        <span>{assignedMissions[0].bailleur_telephone}</span>
                      </a>
                      <span className="text-[10px] sm:text-xs font-semibold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-900/40 w-max">
                        ➜ Sac de rechange {assignedMissions[0].type_poubelle === 'biodegradable' ? 'biodégradable' : 'non-dégradable'} prêt pour échange
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-on-surface-variant pt-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock size={13} /> Signalé à {assignedMissions[0].reported_at.substring(11, 16)}
                    </span>
                    <span className="font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5 text-xs">
                      <Navigation size={14} className="rotate-45" /> En attente de passage
                    </span>
                  </div>
                </div>

                {/* Validation Action */}
                <div className="mt-2 sm:mt-4">
                  <button
                    onClick={() => {
                      onCompleteMission(assignedMissions[0].id);
                      alert("Félicitations ! Mission validée avec succès. La poubelle de cette adresse est enregistrée comme vidée.");
                    }}
                    className="w-full min-h-[50px] py-3.5 px-4 bg-[#10b981] hover:bg-[#10b981]/95 active:scale-[0.98] text-white font-black rounded-xl text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer"
                  >
                    <CheckCircle2 size={20} />
                    <span>Marquer la mission comme Terminée (Poubelle Vidée) ✅</span>
                  </button>
                </div>
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

    </div>
  );
}
