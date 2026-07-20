import React, { useState } from 'react';
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
  Play, 
  Check, 
  Inbox, 
  History, 
  Radio, 
  Phone,
  LogOut,
  Compass,
  HelpCircle,
  Info,
  Globe,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface EboueurSpaceViewProps {
  currentEboueur: Eboueur;
  assignedMissions: PoubelleSignal[];
  completedMissions: PoubelleSignal[];
  onToggleGps: () => void;
  onUpdateGpsCoords?: (latitude: number, longitude: number) => void;
  onCompleteMission: (signalId: string) => void;
  onLogout?: () => void;
}

export default function EboueurSpaceView({
  currentEboueur,
  assignedMissions,
  completedMissions,
  onToggleGps,
  onUpdateGpsCoords,
  onCompleteMission,
  onLogout
}: EboueurSpaceViewProps) {
  
  const [showExplanation, setShowExplanation] = useState(true);
  const [simulationActive, setSimulationActive] = useState(true);
  
  const hasActiveMission = assignedMissions.length > 0;

  // Coordinate adjustments for the Simulator
  const handleTeleport = (lat: number, lng: number) => {
    if (onUpdateGpsCoords) {
      onUpdateGpsCoords(lat, lng);
    }
  };

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!onUpdateGpsCoords) return;
    const step = 0.0015; // roughly 150 meters
    let newLat = currentEboueur.latitude;
    let newLng = currentEboueur.longitude;

    if (direction === 'up') newLat += step;
    if (direction === 'down') newLat -= step;
    if (direction === 'left') newLng -= step;
    if (direction === 'right') newLng += step;

    onUpdateGpsCoords(newLat, newLng);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background">
      
      {/* Welcome Header block */}
      <header className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="flex flex-col gap-1.5 flex-grow">
            <div className="flex items-center justify-between gap-4 w-full">
              <span className="text-[10px] bg-secondary/20 text-indigo-300 font-extrabold uppercase px-2.5 py-1 rounded-full border border-secondary/20 w-max tracking-wider">
                Espace Agent Éboueur 🚚
              </span>
              
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer border border-error/20"
                  title="Se déconnecter"
                >
                  <LogOut size={13} />
                  <span>Se déconnecter</span>
                </button>
              )}
            </div>
            
            <h2 className="text-2xl font-black text-on-surface tracking-tight mt-1.5">
              Bonjour, {currentEboueur.nom}
            </h2>
            <p className="text-xs text-on-surface-variant font-medium font-mono">
              Service de Collecte • {currentEboueur.telephone}
            </p>
          </div>

          {/* Real-time GPS Tracker Switch */}
          <div className="bg-background/80 border border-outline-variant p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 shadow-inner">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${currentEboueur.gps_active ? 'bg-[#10b981] animate-ping' : 'bg-error'}`} />
              <div className="flex flex-col text-xs pr-2">
                <span className="font-extrabold text-on-surface">GPS Tracker</span>
                <span className="text-[10px] text-on-surface-variant font-mono">
                  {currentEboueur.gps_active 
                    ? `Coordonnées : ${currentEboueur.latitude.toFixed(5)}, ${currentEboueur.longitude.toFixed(5)}` 
                    : 'GPS désactivé'
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
                    ? "Traceur GPS de service allumé ! Votre position en temps réel est transmise au centre de répartition."
                    : "Traceur GPS de service éteint."
                  );
                }, 50);
              }}
              className={`h-9 px-4 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                currentEboueur.gps_active 
                  ? 'bg-error text-white' 
                  : 'bg-[#10b981] text-white'
              }`}
            >
              <Radio size={14} className={currentEboueur.gps_active ? 'animate-pulse' : ''} />
              <span>{currentEboueur.gps_active ? 'Couper mon GPS' : 'Activer mon GPS'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* GPS Troubleshooting & Simulator Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface/40 border border-outline-variant/60 rounded-3xl p-5 md:p-6 shadow-lg">
        
        {/* Left Column: Pedagogical Explanations */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
            <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
              <HelpCircle size={18} className="text-primary animate-pulse" />
              Pourquoi mon GPS n'apparaît pas sur la carte de Kinshasa ?
            </h3>
          </div>

          <div className="flex flex-col gap-3 text-xs leading-relaxed text-on-surface-variant">
            <div className="bg-background/50 border border-outline-variant/50 p-3 rounded-2xl flex gap-2.5 items-start">
              <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-on-surface">1. Autorisation refusée par le navigateur</p>
                <p className="mt-1">
                  Si Chrome affiche l'alerte <span className="font-bold text-amber-400">"Autorisation d'accès GPS refusée"</span>, l'application ne peut pas lire votre position.
                </p>
                <p className="mt-1 font-semibold text-primary">
                  ➜ Solution : Cliquez sur le cadenas 🔒 à gauche de la barre d'adresse de votre navigateur et configurez "Position" (Location) sur "Autoriser", puis rechargez la page.
                </p>
              </div>
            </div>

            <div className="bg-background/50 border border-outline-variant/50 p-3 rounded-2xl flex gap-2.5 items-start">
              <Globe size={20} className="text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-on-surface">2. Vous n'êtes pas physiquement à Kinshasa</p>
                <p className="mt-1">
                  Le système est centré sur la ville de <span className="font-bold">Kinshasa (RDC)</span>. Si votre ordinateur/appareil est situé en Europe, au Canada ou ailleurs, votre GPS réel envoie vos coordonnées réelles. Votre camion se retrouve donc tracé à des milliers de kilomètres de la carte active !
                </p>
                <p className="mt-1 font-semibold text-secondary">
                  ➜ Solution : Utilisez le simulateur interactif à droite pour positionner instantanément votre camion à Kinshasa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Kinshasa Simulator */}
        <div className="flex flex-col gap-4 border-l border-dashed border-outline-variant/40 pl-0 md:pl-6">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
            <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
              <Compass size={18} className="text-secondary" />
              Simulateur GPS Virtuel (Kinshasa)
            </h3>
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${currentEboueur.gps_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-error/10 text-error border border-error/20'}`}>
              {currentEboueur.gps_active ? 'Prêt à simuler' : 'Activez le GPS d\'abord'}
            </span>
          </div>

          {!currentEboueur.gps_active ? (
            <div className="bg-background/20 border border-dashed border-outline-variant rounded-2xl p-6 flex flex-col items-center justify-center text-center flex-grow">
              <Radio size={32} className="text-error animate-pulse mb-2" />
              <p className="text-xs font-bold text-on-surface">GPS désactivé</p>
              <p className="text-[11px] text-on-surface-variant max-w-xs mt-1 leading-normal">
                Cliquez d'abord sur le bouton vert <span className="font-bold text-[#10b981]">"Activer mon GPS"</span> ci-dessus pour pouvoir simuler vos déplacements à Kinshasa !
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 flex-grow">
              
              {/* Teleport Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant">Téléportation rapide à Kinshasa</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleTeleport(-4.30307, 15.31215)}
                    className="h-8 bg-background border border-outline-variant hover:bg-surface-variant text-[10px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-on-surface"
                  >
                    <MapPin size={11} className="text-primary" />
                    <span>Gombe (Cent.)</span>
                  </button>
                  <button
                    onClick={() => handleTeleport(-4.34149, 15.28902)}
                    className="h-8 bg-background border border-outline-variant hover:bg-surface-variant text-[10px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-on-surface"
                  >
                    <MapPin size={11} className="text-secondary" />
                    <span>Bandalungwa</span>
                  </button>
                  <button
                    onClick={() => handleTeleport(-4.35418, 15.31502)}
                    className="h-8 bg-background border border-outline-variant hover:bg-surface-variant text-[10px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-on-surface"
                  >
                    <MapPin size={11} className="text-amber-500" />
                    <span>Kalamu</span>
                  </button>
                </div>
              </div>

              {/* D-Pad Arrow Controls for Driving the Truck */}
              <div className="flex flex-col gap-1.5 flex-grow">
                <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant">Conduire le camion manuellement (D-Pad)</span>
                
                <div className="flex items-center gap-6 bg-background/30 border border-outline-variant/60 rounded-2xl p-3 flex-grow">
                  
                  {/* Virtual D-Pad Circle */}
                  <div className="flex flex-col items-center justify-center relative w-24 h-24 bg-background border border-outline-variant rounded-full shadow-inner shrink-0 p-1">
                    {/* Up */}
                    <button
                      onClick={() => handleMove('up')}
                      className="absolute top-1 p-1.5 hover:bg-surface-variant text-on-surface rounded-lg transition-all active:scale-90 cursor-pointer"
                      title="Nord"
                    >
                      <ArrowUp size={16} />
                    </button>
                    {/* Left */}
                    <button
                      onClick={() => handleMove('left')}
                      className="absolute left-1 p-1.5 hover:bg-surface-variant text-on-surface rounded-lg transition-all active:scale-90 cursor-pointer"
                      title="Ouest"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    {/* Center Dot */}
                    <div className="w-4.5 h-4.5 bg-primary rounded-full animate-pulse" />
                    {/* Right */}
                    <button
                      onClick={() => handleMove('right')}
                      className="absolute right-1 p-1.5 hover:bg-surface-variant text-on-surface rounded-lg transition-all active:scale-90 cursor-pointer"
                      title="Est"
                    >
                      <ArrowRight size={16} />
                    </button>
                    {/* Down */}
                    <button
                      onClick={() => handleMove('down')}
                      className="absolute bottom-1 p-1.5 hover:bg-surface-variant text-on-surface rounded-lg transition-all active:scale-90 cursor-pointer"
                      title="Sud"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>

                  {/* Status & Help Text */}
                  <div className="flex flex-col gap-1 text-[10px] text-on-surface-variant">
                    <p className="font-extrabold text-on-surface">Position Actuelle :</p>
                    <p className="font-mono text-primary font-bold text-[11px]">Lat: {currentEboueur.latitude.toFixed(5)}</p>
                    <p className="font-mono text-primary font-bold text-[11px]">Lng: {currentEboueur.longitude.toFixed(5)}</p>
                    <p className="leading-normal mt-1 italic text-secondary font-medium">
                      ➜ Utilisez les flèches pour faire rouler le camion de ~150 mètres ! Allez ensuite sur l'onglet <span className="font-bold">"Poubelles & Éboueurs"</span> pour le voir bouger.
                    </p>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* Main dashboard panel: Active Mission vs History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Mission Panel (Left 2 columns) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-5 md:p-6 shadow-md flex-grow flex flex-col gap-4">
            <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-3">
              <Inbox size={20} className="text-secondary" />
              Mission de Collecte Active
            </h3>

            {hasActiveMission ? (
              <div className="flex flex-col gap-4 flex-grow justify-between">
                <div className="bg-background/40 border border-outline-variant rounded-2xl p-4 flex flex-col gap-3.5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-error/15 text-error rounded-xl shrink-0 mt-0.5">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-on-surface">
                          Adresse de ramassage :
                        </h4>
                        <p className="text-sm font-extrabold text-primary mt-1">
                          Parcelle N° {assignedMissions[0].numero_parcelle}
                        </p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Avenue {assignedMissions[0].avenue_nom}, Commune de {assignedMissions[0].commune_nom}
                        </p>
                      </div>
                    </div>

                    {assignedMissions[0].type_poubelle === 'biodegradable' ? (
                      <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full font-bold uppercase shrink-0 border border-emerald-500/20">
                        Biodégradable (Vert) 🟢
                      </span>
                    ) : assignedMissions[0].type_poubelle === 'non_biodegradable' ? (
                      <span className="text-[10px] font-mono bg-indigo-500/15 text-indigo-400 px-2.5 py-1 rounded-full font-bold uppercase shrink-0 border border-indigo-500/20">
                        Non-Dégradable (Gris) ⚪
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono bg-error/15 text-error px-2.5 py-1 rounded-full font-bold uppercase shrink-0 border border-error/20">
                        Poubelle Pleine 🚨
                      </span>
                    )}
                  </div>

                  {/* Landlord metadata */}
                  <div className="border-t border-b border-outline-variant/30 py-3 flex flex-col gap-1.5 text-xs">
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Informations de l'Abonné (Bailleur)
                    </span>
                    <span className="font-extrabold text-on-surface">{assignedMissions[0].bailleur_nom}</span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <a 
                        href={`tel:${assignedMissions[0].bailleur_telephone}`}
                        className="text-secondary font-mono flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Phone size={12} />
                        {assignedMissions[0].bailleur_telephone}
                      </a>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                        ➜ Sac de rechange {assignedMissions[0].type_poubelle === 'biodegradable' ? 'biodégradable' : 'non-dégradable'} prêt pour échange
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={11} /> Signalé à {assignedMissions[0].reported_at.substring(11, 16)}
                    </span>
                    <span className="font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                      <Navigation size={12} className="rotate-45" /> En attente de passage
                    </span>
                  </div>
                </div>

                {/* Validation Action */}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      onCompleteMission(assignedMissions[0].id);
                      alert("Félicitations ! Mission validée avec succès. La poubelle de cette adresse est enregistrée comme vidée.");
                    }}
                    className="w-full h-12 bg-[#10b981] hover:bg-[#10b981]/95 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <CheckCircle2 size={18} />
                    <span>Marquer la mission comme Terminée (Poubelle Vidée) ✅</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-12 gap-3 flex-grow bg-background/20 rounded-2xl border border-dashed border-outline-variant/40">
                <Truck size={40} className="text-on-surface-variant/40" />
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Aucune mission assignée</h4>
                  <p className="text-xs text-on-surface-variant max-w-xs mt-1 leading-normal">
                    Vous n'avez pas de collecte active. Restez en ligne avec votre GPS activé pour que le bureau vous transmette la prochaine adresse.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Panel (Right 1 column) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-md flex-grow flex flex-col h-[400px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2 mb-3 select-none">
              <History size={14} className="text-secondary" />
              Historique de service ({completedMissions.length})
            </h3>

            <div className="flex-grow overflow-y-auto flex flex-col gap-2 pr-1">
              {completedMissions.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic text-center py-16">
                  Aucune mission terminée aujourd'hui.
                </p>
              ) : (
                completedMissions.map((mis) => (
                  <div 
                    key={mis.id}
                    className="bg-background/40 border border-outline-variant/50 p-3 rounded-xl flex items-start gap-2.5 text-xs text-left"
                  >
                    <div className="p-1.5 bg-[#10b981]/15 text-[#10b981] rounded-lg shrink-0 mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <span className="font-extrabold text-on-surface block truncate">
                        N° {mis.numero_parcelle}, Av. {mis.avenue_nom}
                      </span>
                      <div className="flex flex-col gap-0.5 text-[10px] text-on-surface-variant mt-0.5">
                        <span>Commune : {mis.commune_nom}</span>
                        <span className={`font-semibold ${mis.type_poubelle === 'biodegradable' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                          Type : {mis.type_poubelle === 'biodegradable' ? 'Biodégradable (Vert)' : 'Non-Dégradable (Gris)'}
                        </span>
                      </div>
                      <span className="text-[9px] text-[#10b981] block font-mono mt-1 font-semibold flex items-center gap-0.5">
                        <Clock size={10} /> Complété • Sac remplacé ✔
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
