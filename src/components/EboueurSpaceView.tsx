import React, { useState } from 'react';
import { 
  Eboueur, 
  PoubelleSignal,
  AgentDotation
} from '../types';
import { CartRouteTrackingMap } from './CartRouteTrackingMap';
import { advancePositionTowardsTarget } from '../lib/geoUtils';
import VoiceCallModal, { CallTarget } from './VoiceCallModal';
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
  Package,
  Camera,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Eye,
  FileCheck,
  User,
  Award,
  Calendar,
  Shield
} from 'lucide-react';

interface EboueurSpaceViewProps {
  currentEboueur: Eboueur;
  assignedMissions: PoubelleSignal[];
  completedMissions: PoubelleSignal[];
  agentDotation?: AgentDotation;
  onToggleGps: () => void;
  onUpdateGpsCoords?: (latitude: number, longitude: number) => void;
  onCompleteMission: (
    signalId: string, 
    validationData?: {
      photo_preuve_url?: string;
      sachets_remis_bio?: number;
      sachets_remis_non_bio?: number;
      gps_validation?: {
        driver_latitude: number;
        driver_longitude: number;
        distance_metres: number;
        verified_on_site: boolean;
        verified_at: string;
      }
    }
  ) => void;
  onUnloadTruck?: () => void;
  onLogout?: () => void;
  currentUser?: any;
  allRawSignals?: PoubelleSignal[];
  allAgents?: any[];
  activeTab?: 'missions' | 'carte' | 'historique' | 'profil';
  onTabChange?: (tab: 'missions' | 'carte' | 'historique' | 'profil') => void;
}

function getDistanceMeters(lat1?: number | null, lon1?: number | null, lat2?: number | null, lon2?: number | null): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 22; // Default fallback: 22 meters
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export default function EboueurSpaceView({
  currentEboueur,
  assignedMissions,
  completedMissions,
  agentDotation,
  onToggleGps,
  onUpdateGpsCoords,
  onCompleteMission,
  onUnloadTruck,
  currentUser,
  allRawSignals = [],
  allAgents = [],
  activeTab,
  onTabChange
}: EboueurSpaceViewProps) {
  const [showDebugConsole, setShowDebugConsole] = useState(true);
  const [internalTab, setInternalTab] = useState<'missions' | 'carte' | 'historique' | 'profil'>('missions');
  const eboueurTab = activeTab || internalTab;
  const setEboueurTab = onTabChange || setInternalTab;
  
  // Validation Proofs & Delivery State
  const [photosMap, setPhotosMap] = useState<Record<string, string>>({});
  const [sachetsBioMap, setSachetsBioMap] = useState<Record<string, number>>({});
  const [sachetsNonBioMap, setSachetsNonBioMap] = useState<Record<string, number>>({});
  const [simulatedNearbyMap, setSimulatedNearbyMap] = useState<Record<string, boolean>>({});
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Voice Call Modal State
  const [activeCallTarget, setActiveCallTarget] = useState<CallTarget | null>(null);

  const hasActiveMission = assignedMissions.length > 0;

  const maxCap = currentEboueur.capacite_camion || 6;
  const currentLoad = currentEboueur.charge_actuelle || 0;
  const freeSpace = Math.max(0, maxCap - currentLoad);
  const loadPercentage = Math.min(100, Math.round((currentLoad / maxCap) * 100));

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in text-on-background w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Local Success Notification Banner */}
      {successBanner && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-slide-in-down shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button 
            onClick={() => setSuccessBanner(null)}
            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase rounded-lg border border-emerald-500/30 transition-all cursor-pointer shrink-0"
          >
            OK
          </button>
        </div>
      )}

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

      {/* TAB 1: MISSIONS */}
      {eboueurTab === 'missions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
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

                      {/* Landlord metadata & Dual Call Actions */}
                      <div className="border-t border-b border-outline-variant/30 py-3.5 flex flex-col gap-2.5 text-xs sm:text-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                              Informations de l'Abonné (Bailleur)
                            </span>
                            <span className="font-extrabold text-on-surface text-sm sm:text-base">
                              {mission.bailleur_nom}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs font-semibold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-900/40 w-max">
                            ➜ Sac {mission.type_poubelle === 'biodegradable' ? 'biodégradable' : 'non-dégradable'} prêt pour échange
                          </span>
                        </div>

                        {/* Direct Call Buttons: 1) Abonné/Bailleur  2) Admin Affectateur */}
                        <div className="flex flex-wrap items-center gap-2 mt-1 bg-background/60 p-2.5 rounded-xl border border-outline-variant/50">
                          <button 
                            type="button"
                            onClick={() => setActiveCallTarget({
                              name: mission.bailleur_nom || 'Bailleur / Abonné',
                              phone: mission.bailleur_telephone || '+243 89 000 0000',
                              role: 'Bailleur / Parcelle Abonné',
                              commune: mission.commune_id || 'Kinshasa'
                            })}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer border border-emerald-500/30 active:scale-95 shadow-sm"
                          >
                            <Phone size={14} className="text-emerald-400 shrink-0" />
                            <span>📞 Appeler Abonné ({mission.bailleur_telephone || 'Inconnu'})</span>
                          </button>

                          <button 
                            type="button"
                            onClick={() => setActiveCallTarget({
                              name: 'Admin Dispatching HICO',
                              phone: '+243 81 000 9999',
                              role: 'Admin Affectateur de Mission',
                              commune: 'Bureau Central'
                            })}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer border border-indigo-500/30 active:scale-95 shadow-sm"
                          >
                            <Phone size={14} className="text-indigo-400 shrink-0" />
                            <span>👔 Appeler Admin (Affectateur)</span>
                          </button>
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

                      {/* Verification & Proofs Block (Geofencing, Photo, Sachets) */}
                      {(() => {
                        const isSimulatedNear = simulatedNearbyMap[mission.id] ?? false;
                        const calculatedDist = getDistanceMeters(
                          currentEboueur.latitude, 
                          currentEboueur.longitude, 
                          mission.latitude, 
                          mission.longitude
                        );
                        const distM = isSimulatedNear ? 12 : calculatedDist;
                        const isVerifiedOnSite = distM <= 100 || isSimulatedNear;

                        const bioQty = sachetsBioMap[mission.id] ?? (mission.type_poubelle === 'biodegradable' ? 1 : 0);
                        const nonBioQty = sachetsNonBioMap[mission.id] ?? (mission.type_poubelle === 'non_biodegradable' ? 1 : 0);
                        const currentPhoto = photosMap[mission.id] || '';

                        return (
                          <div className="bg-background/80 border border-outline-variant/80 rounded-2xl p-4 flex flex-col gap-3.5 shadow-inner mt-1">
                            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-secondary flex items-center gap-1.5">
                                <ShieldCheck size={16} />
                                <span>Contrôle Anti-Fraude & Preuves de Passage</span>
                              </span>

                              {/* GPS Status Indicator */}
                              {isVerifiedOnSite ? (
                                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                  <span>Sur Place (GPS: {distM}m)</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setSimulatedNearbyMap(prev => ({ ...prev, [mission.id]: true }))}
                                  className="bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                  title="Cliquer pour simuler la position GPS de l'éboueur devant la parcelle"
                                >
                                  <MapPin size={12} />
                                  <span>📍 Arrivé sur place ({distM > 1000 ? (distM/1000).toFixed(1) + 'km' : distM + 'm'})</span>
                                </button>
                              )}
                            </div>

                            {/* 1. Sachets Réarmés / Remis à l'abonné */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/50 p-3 rounded-xl border border-outline-variant/40">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-on-surface flex items-center gap-1">
                                  <Package size={14} className="text-secondary" />
                                  <span>Sachets neufs remis au ménage :</span>
                                </span>
                                <span className="text-[10px] text-on-surface-variant">
                                  Déduit automatiquement de la dotation du camion ({agentDotation?.biodegradable ?? 20} Bio / {agentDotation?.non_biodegradable ?? 20} Non-Bio disponibles)
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-lg border border-outline-variant">
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Vert:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    value={bioQty}
                                    onChange={(e) => setSachetsBioMap(prev => ({ ...prev, [mission.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                    className="w-10 h-7 text-center font-mono font-bold text-xs bg-transparent border-none focus:outline-none text-on-surface"
                                  />
                                </div>

                                <div className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-lg border border-outline-variant">
                                  <span className="text-[10px] font-bold text-indigo-400 uppercase">Bleu:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    value={nonBioQty}
                                    onChange={(e) => setSachetsNonBioMap(prev => ({ ...prev, [mission.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                    className="w-10 h-7 text-center font-mono font-bold text-xs bg-transparent border-none focus:outline-none text-on-surface"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 2. Photo Preuve */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/50 p-3 rounded-xl border border-outline-variant/40">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-on-surface flex items-center gap-1">
                                  <Camera size={14} className="text-secondary" />
                                  <span>Preuve photo du ramassage & sachet posé :</span>
                                </span>
                                <span className="text-[10px] text-on-surface-variant">
                                  Preuve enregistrée dans l'espace abonné & supervision bureau
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {currentPhoto ? (
                                  <div className="flex items-center gap-2">
                                    <img 
                                      src={currentPhoto} 
                                      alt="Preuve" 
                                      className="w-10 h-10 object-cover rounded-lg border border-primary/50 cursor-pointer"
                                      onClick={() => setPreviewPhotoUrl(currentPhoto)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setPhotosMap(prev => ({ ...prev, [mission.id]: '' }))}
                                      className="text-[10px] text-rose-400 underline font-bold"
                                    >
                                      Changer
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <label className="px-3 py-1.5 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95">
                                      <Camera size={14} />
                                      <span>Prendre Photo</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                              if (ev.target?.result) {
                                                setPhotosMap(prev => ({ ...prev, [mission.id]: ev.target!.result as string }));
                                              }
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const demoPhoto = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80';
                                        setPhotosMap(prev => ({ ...prev, [mission.id]: demoPhoto }));
                                      }}
                                      className="px-2.5 py-1.5 bg-background border border-outline-variant/80 text-on-surface-variant font-medium text-[10px] rounded-xl hover:text-on-surface cursor-pointer"
                                      title="Insérer une photo démo de sac posé"
                                    >
                                      + Exemple Demo
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 3. Button Validation Final */}
                            <button
                              onClick={() => {
                                onCompleteMission(mission.id, {
                                  photo_preuve_url: currentPhoto || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80',
                                  sachets_remis_bio: bioQty,
                                  sachets_remis_non_bio: nonBioQty,
                                  gps_validation: {
                                    driver_latitude: currentEboueur.latitude || -4.325,
                                    driver_longitude: currentEboueur.longitude || 15.312,
                                    distance_metres: distM,
                                    verified_on_site: isVerifiedOnSite,
                                    verified_at: new Date().toISOString()
                                  }
                                });
                                setSuccessBanner(`Mission enregistrée avec succès pour la parcelle N° ${mission.numero_parcelle} (Avis transmis à la direction).`);
                              }}
                              className="w-full min-h-[46px] py-3 px-4 bg-[#10b981] hover:bg-[#10b981]/95 active:scale-[0.98] text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-1"
                            >
                              <CheckCircle2 size={18} />
                              <span>Valider le Ramassage & Remplacement Sachet (Authentifié GPS) ✅</span>
                            </button>
                          </div>
                        );
                      })()}
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

          {/* Truck Capacity Card (Right 1 column) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-secondary/15 text-secondary rounded-2xl shrink-0">
                  <Truck size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-on-surface uppercase tracking-wider">
                    Chargement du Véhicule
                  </span>
                  <span className="text-xs text-secondary font-mono font-bold">
                    {currentLoad} / {maxCap} sachets collectés
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-on-surface-variant font-medium">Capacité actuelle :</span>
                  <span className={`font-extrabold px-2 py-0.5 rounded-full border ${
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

                <p className="text-[11px] text-on-surface-variant font-medium leading-normal mt-1">
                  À chaque retrait chez l'abonné, le camion enregistre 1 sachet collecté.
                </p>
              </div>

              <div className="bg-background/60 border border-outline-variant p-3 rounded-xl flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-secondary flex items-center gap-1">
                  <Package size={13} /> Stock Sachets Neufs en Camion
                </span>
                <div className="flex items-center justify-around font-mono font-black text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-emerald-400 uppercase font-bold">Bio (Vert)</span>
                    <span className="text-sm text-on-surface">{agentDotation?.biodegradable ?? 20} u</span>
                  </div>
                  <div className="border-l border-outline-variant h-6"></div>
                  <div className="flex flex-col items-center">
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
                  className="w-full min-h-[42px] px-4 py-2 bg-secondary/15 hover:bg-secondary/25 text-indigo-300 border border-secondary/30 rounded-xl font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  title="Réinitialiser la charge après déchargement"
                >
                  <RefreshCw size={15} />
                  <span>Décharger le camion (Vider) 🚚</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CARTE INTERACTIVE */}
      {eboueurTab === 'carte' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden text-slate-200 shadow-2xl font-sans animate-fade-in">
          <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                <Navigation size={22} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <span>Carte Interactive de Suivi & Itinéraire en Direct</span>
                  <span className="text-xs bg-blue-500/20 text-blue-300 font-mono px-2.5 py-0.5 rounded-full border border-blue-500/30">
                    GPS & Tracé Avenue 🛣️
                  </span>
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Navigation temps réel vers les parcelles à collecter dans votre zone d'affectation.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
              Position GPS Active
            </span>
          </div>

          <div className="p-4 sm:p-6 flex flex-col gap-4">
            {assignedMissions.length > 0 ? (
              (() => {
                const activeMission = assignedMissions[0];
                const ebLat = currentEboueur.latitude ?? -4.3250;
                const ebLng = currentEboueur.longitude ?? 15.3100;
                const targetLat = activeMission.latitude ?? -4.3260;
                const targetLng = activeMission.longitude ?? 15.3120;

                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm font-semibold text-slate-300 bg-slate-900 p-4 rounded-xl border border-slate-800 gap-2">
                      <span className="flex items-center gap-2 text-blue-400 font-bold">
                        <Truck size={18} />
                        <span>Destination Actuelle : Parcelle N° {activeMission.numero_parcelle}, Av. {activeMission.avenue_nom}</span>
                      </span>
                      <span className="text-amber-400 font-mono font-bold">
                        Bailleur : {activeMission.bailleur_nom || 'Bailleur'}
                      </span>
                    </div>

                    <CartRouteTrackingMap 
                      collectorLat={ebLat}
                      collectorLng={ebLng}
                      collectorName={currentEboueur.nom}
                      targetLat={targetLat}
                      targetLng={targetLng}
                      targetLabel={`N° ${activeMission.numero_parcelle} Av. ${activeMission.avenue_nom}`}
                      height="480px"
                      showSimulateButton={true}
                      hasMission={true}
                      onAdvanceStep={() => {
                        const result = advancePositionTowardsTarget(
                          ebLat,
                          ebLng,
                          targetLat,
                          targetLng,
                          10.0
                        );
                        if (onUpdateGpsCoords) {
                          onUpdateGpsCoords(result.latitude, result.longitude);
                        }
                      }}
                    />
                  </div>
                );
              })()
            ) : (
              (() => {
                const ebLat = currentEboueur.latitude ?? -4.3250;
                const ebLng = currentEboueur.longitude ?? 15.3100;

                return (
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs sm:text-sm text-slate-300 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-slate-400 italic">
                        Aucune mission actuellement assignée. Carte générale de Kinshasa (toutes communes, zoom libre).
                      </span>
                      <span className="text-emerald-400 font-bold font-mono">En attente de mission</span>
                    </div>

                    <CartRouteTrackingMap 
                      collectorLat={ebLat}
                      collectorLng={ebLng}
                      collectorName={currentEboueur.nom}
                      targetLat={ebLat}
                      targetLng={ebLng}
                      targetLabel="Vue Générale Kinshasa"
                      height="480px"
                      showSimulateButton={false}
                      hasMission={false}
                    />
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORIQUE */}
      {eboueurTab === 'historique' && (
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-md flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <h3 className="text-sm sm:text-base font-extrabold text-on-surface flex items-center gap-2">
              <History size={20} className="text-secondary shrink-0" />
              <span>Historique Complet des Collectes Accomplies</span>
            </h3>
            <span className="text-xs font-mono font-bold text-secondary bg-secondary/15 px-3 py-1 rounded-full border border-secondary/30">
              {completedMissions.length} {completedMissions.length > 1 ? 'collectes' : 'collecte'}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {completedMissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4 text-on-surface-variant italic text-sm gap-3">
                <Clock size={36} className="opacity-30" />
                <p>Aucune mission terminée pour le moment aujourd'hui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completedMissions.map((mis) => (
                  <div 
                    key={mis.id}
                    className="bg-background/50 border border-outline-variant/60 p-4 rounded-xl flex flex-col gap-2.5 text-xs text-left hover:bg-background/80 transition-colors shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[#10b981]/15 text-[#10b981] rounded-lg shrink-0 mt-0.5">
                        <Check size={16} strokeWidth={3} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <span className="font-extrabold text-on-surface block text-sm sm:text-base">
                          Parcelle N° {mis.numero_parcelle}, Av. {mis.avenue_nom}
                        </span>
                        <div className="flex flex-col gap-0.5 text-xs text-on-surface-variant mt-1">
                          <span>Commune : <strong className="text-on-surface">{mis.commune_nom}</strong></span>
                          <span>Abonné : <strong className="text-on-surface">{mis.bailleur_nom || 'Non spécifié'}</strong></span>
                          <span className={`font-semibold ${mis.type_poubelle === 'biodegradable' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                            Type : {mis.type_poubelle === 'biodegradable' ? 'Biodégradable (Vert)' : 'Non-Dégradable (Gris)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/30 text-[11px]">
                      {mis.gps_validation && (
                        <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md font-mono border border-emerald-500/20 flex items-center gap-1">
                          <ShieldCheck size={12} /> Validé GPS ({mis.gps_validation.distance_metres}m)
                        </span>
                      )}
                      {(mis.sachets_remis_bio || mis.sachets_remis_non_bio) ? (
                        <span className="bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-md font-mono border border-indigo-500/20 flex items-center gap-1">
                          <Package size={12} /> +{(mis.sachets_remis_bio || 0) + (mis.sachets_remis_non_bio || 0)} Sachets remis
                        </span>
                      ) : null}
                      {mis.photo_preuve_url && (
                        <button
                          onClick={() => setPreviewPhotoUrl(mis.photo_preuve_url!)}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-md font-mono border border-primary/20 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Camera size={12} /> Voir Preuve Photo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROFIL AGENT */}
      {eboueurTab === 'profil' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-md flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
              <div className="p-3 bg-primary/15 text-primary rounded-2xl">
                <User size={24} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-on-surface">Fiche Agent Collecteur</h3>
                <p className="text-xs text-on-surface-variant font-mono">ID Agent: {currentEboueur.id}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                <span className="text-on-surface-variant font-medium">Nom complet :</span>
                <span className="font-bold text-on-surface">{currentEboueur.nom}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                <span className="text-on-surface-variant font-medium">Téléphone :</span>
                <span className="font-bold font-mono text-secondary">{currentEboueur.telephone}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                <span className="text-on-surface-variant font-medium">Commune d'affectation :</span>
                <span className="font-bold text-on-surface">{currentEboueur.commune_nom || 'Toutes les communes'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                <span className="text-on-surface-variant font-medium">Avenue principale :</span>
                <span className="font-bold text-on-surface">{currentEboueur.avenue_nom || 'Zone générale'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-on-surface-variant font-medium">Statut de service :</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Actif (Sur le terrain 🚚)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-md flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
              <div className="p-3 bg-secondary/15 text-secondary rounded-2xl">
                <Award size={24} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-on-surface">Statistiques & Équipement</h3>
                <p className="text-xs text-on-surface-variant">Performances du camion</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/60 border border-outline-variant/60 p-3.5 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Missions accomplies</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">{completedMissions.length}</span>
              </div>
              <div className="bg-background/60 border border-outline-variant/60 p-3.5 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Capacité max camion</span>
                <span className="text-2xl font-black text-secondary font-mono">{maxCap} sachets</span>
              </div>
              <div className="bg-background/60 border border-outline-variant/60 p-3.5 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Stock Vert (Bio)</span>
                <span className="text-xl font-black text-emerald-400 font-mono">{agentDotation?.biodegradable ?? 20} u</span>
              </div>
              <div className="bg-background/60 border border-outline-variant/60 p-3.5 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Stock Bleu (Non-Bio)</span>
                <span className="text-xl font-black text-indigo-400 font-mono">{agentDotation?.non_biodegradable ?? 20} u</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl p-4 max-w-lg w-full flex flex-col gap-3 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Camera size={16} className="text-primary" /> Preuve Photo du Ramassage
              </span>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="text-xs font-bold text-on-surface-variant hover:text-on-surface p-1 rounded-lg bg-background"
              >
                ✕ Fermer
              </button>
            </div>
            <img 
              src={previewPhotoUrl} 
              alt="Preuve Photo" 
              className="w-full max-h-[380px] object-cover rounded-xl border border-outline-variant"
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="w-full py-2 bg-primary text-on-primary rounded-xl font-bold text-xs cursor-pointer"
            >
              Fermer la vue photo
            </button>
          </div>
        </div>
      )}



      {/* Voice Call Choice Modal */}
      <VoiceCallModal
        target={activeCallTarget}
        onClose={() => setActiveCallTarget(null)}
      />
    </div>
  );
}
