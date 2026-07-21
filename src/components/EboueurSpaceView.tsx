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
  LogOut
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
  onUpdateGpsCoords,
  onCompleteMission,
  onLogout,
  currentUser,
  allRawSignals = [],
  allAgents = []
}: EboueurSpaceViewProps) {
  
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const hasActiveMission = assignedMissions.length > 0;

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
          <div className="flex flex-col gap-2.5 shrink-0">
            <div className="bg-background/80 border border-outline-variant p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 shadow-inner">
              <div className="flex items-center gap-3">
                <div className={`w-3.5 h-3.5 rounded-full ${currentEboueur.gps_active ? 'bg-[#10b981] animate-ping' : 'bg-error'}`} />
                <div className="flex flex-col text-xs pr-2">
                  <span className="font-extrabold text-on-surface">Traceur GPS Réel</span>
                  <span className="text-[10px] text-on-surface-variant font-mono">
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
                className={`h-9 px-4 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  currentEboueur.gps_active 
                    ? 'bg-error text-white' 
                    : 'bg-[#10b981] text-white'
                }`}
              >
                <Radio size={14} className={currentEboueur.gps_active ? 'animate-pulse' : ''} />
                <span>{currentEboueur.gps_active ? 'Désactiver le GPS' : 'Activer le GPS Réel'}</span>
              </button>
            </div>

            {currentEboueur.gps_active && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-[10px] text-emerald-300 leading-normal flex flex-col gap-1 max-w-sm">
                <p className="font-bold flex items-center gap-1">
                  <span>🛰️</span> Traceur GPS actif en arrière-plan
                </p>
                <p>
                  Votre navigateur transmet périodiquement vos coordonnées géographiques réelles. Assurez-vous d'accorder l'autorisation de localisation à l'application.
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- CONSOLE DE DIAGNOSTIC DE MISSION --- */}
      <section className="bg-slate-900 border border-slate-700/60 rounded-3xl p-5 shadow-2xl relative overflow-hidden font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <div className="flex flex-col">
              <h3 className="text-sm font-black text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>🔍</span> Console de Diagnostic de Mission
              </h3>
              <p className="text-[11px] text-slate-400">
                Analyse en temps réel de l'affectation et de la synchronisation Supabase
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowDiagnostic(!showDiagnostic)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {showDiagnostic ? 'Masquer la console [-]' : 'Ouvrir la console [+]'}
          </button>
        </div>

        {showDiagnostic && (() => {
          const cleanPhone = (num: string) => {
            if (!num) return '';
            const cleaned = num.replace(/[\s\-\.\(\)\+]/g, '');
            return cleaned.length >= 8 ? cleaned.slice(-8) : cleaned;
          };

          const diagnostics = allRawSignals.map(sig => {
            const logs: string[] = [];
            let isMatched = false;

            const assignedId = sig.assigned_eboueur_id ? sig.assigned_eboueur_id.trim().toLowerCase() : '';
            const currentUserId = currentUser?.id ? currentUser.id.trim().toLowerCase() : '';
            const currentEbId = currentEboueur?.id ? currentEboueur.id.trim().toLowerCase() : '';

            logs.push(`• Analyse du statut brut : "${sig.status}" (Attendu pour mission active: "assigned")`);
            const statusOk = sig.status === 'assigned';
            if (!statusOk) {
              logs.push(`  ❌ ÉCHEC STATUT : Le statut n'est pas "assigned" (il est "${sig.status}").`);
            } else {
              logs.push(`  🟢 STATUT OK : Le signal est bien à l'état "assigned".`);
            }

            logs.push(`• Analyse de l'éboueur assigné : "${sig.assigned_eboueur_id || 'Aucun'}"`);
            
            if (!sig.assigned_eboueur_id) {
              logs.push(`  ❌ ÉCHEC AFFECTATION : Aucun éboueur n'est assigné.`);
            } else {
              // 1. Direct ID match
              if (assignedId === currentUserId) {
                logs.push(`  🟢 MATCH DIRECT : ID assigné correspond exactement à votre ID Utilisateur Session ("${currentUser.id}").`);
                isMatched = true;
              } else if (assignedId === currentEbId) {
                logs.push(`  🟢 MATCH DIRECT : ID assigné correspond exactement à votre ID Éboueur ("${currentEboueur.id}").`);
                isMatched = true;
              } else {
                logs.push(`  ⚠️ ID éboueur assigné ("${assignedId}") ne correspond pas directement à votre ID session ("${currentUserId}") ou ID éboueur ("${currentEbId}").`);
                
                // 2. Name matches
                const userNom = currentUser?.nom ? currentUser.nom.trim().toLowerCase() : '';
                const currentEbNom = currentEboueur?.nom ? currentEboueur.nom.trim().toLowerCase() : '';
                const cleanAssignedId = assignedId.replace(/\s+/g, '');
                const cleanUserNom = userNom.replace(/\s+/g, '');
                const cleanEbNom = currentEbNom.replace(/\s+/g, '');

                if (cleanAssignedId === cleanUserNom || cleanAssignedId === cleanEbNom) {
                  logs.push(`  🟢 MATCH PAR NOM : Correspondance via le nom d'utilisateur nettoyé.`);
                  isMatched = true;
                } else if (userNom && (userNom.includes(assignedId) || assignedId.includes(userNom))) {
                  logs.push(`  🟢 MATCH PAR NOM : Votre nom de session ("${currentUser?.nom}") inclut ou est inclus dans l'ID assigné.`);
                  isMatched = true;
                } else if (currentEbNom && (currentEbNom.includes(assignedId) || assignedId.includes(currentEbNom))) {
                  logs.push(`  🟢 MATCH PAR NOM : Votre nom d'éboueur ("${currentEboueur?.nom}") inclut ou est inclus dans l'ID assigné.`);
                  isMatched = true;
                } else {
                  logs.push(`  ⚠️ Pas de correspondance par nom.`);

                  // 3. Phone matches
                  const userPhoneClean = cleanPhone(currentUser?.telephone);
                  const currentEbPhoneClean = cleanPhone(currentEboueur?.telephone);
                  const assignedPhoneClean = cleanPhone(sig.assigned_eboueur_id);

                  if (userPhoneClean && assignedPhoneClean === userPhoneClean) {
                    logs.push(`  🟢 MATCH PAR TÉLÉPHONE : Le téléphone de session correspond.`);
                    isMatched = true;
                  } else if (currentEbPhoneClean && assignedPhoneClean === currentEbPhoneClean) {
                    logs.push(`  🟢 MATCH PAR TÉLÉPHONE : Le téléphone de l'éboueur correspond.`);
                    isMatched = true;
                  } else {
                    logs.push(`  ⚠️ Pas de correspondance par téléphone.`);

                    // 4. Look up database records to cross-reference
                    const matchedAgent = allAgents.find(a => a.id.trim().toLowerCase() === assignedId);
                    if (matchedAgent) {
                      logs.push(`  💡 Agent trouvé en base pour cet ID assigné : "${matchedAgent.nom}" (Rôle: ${matchedAgent.role}, Tél: ${matchedAgent.telephone})`);
                      const agentPhoneClean = cleanPhone(matchedAgent.telephone);
                      const agentNomClean = matchedAgent.nom.trim().toLowerCase();
                      const cleanAgentNom = agentNomClean.replace(/\s+/g, '');

                      if (userPhoneClean && agentPhoneClean === userPhoneClean) {
                        logs.push(`  🟢 MATCH PAR AGENT RÉFÉRENCÉ : Correspondance par téléphone.`);
                        isMatched = true;
                      } else if (cleanAgentNom === cleanUserNom) {
                        logs.push(`  🟢 MATCH PAR AGENT RÉFÉRENCÉ : Le nom correspond exactement.`);
                        isMatched = true;
                      } else if (userNom.includes(agentNomClean) || agentNomClean.includes(userNom)) {
                        logs.push(`  🟢 MATCH PAR AGENT RÉFÉRENCÉ : Correspondance par inclusion de nom.`);
                        isMatched = true;
                      } else if (
                        (userNom.includes('maj') || userNom.includes('andymj')) &&
                        (agentNomClean.includes('maj') || agentNomClean.includes('andymj'))
                      ) {
                        logs.push(`  🟢 MATCH DE TEST SPÉCIAL : Bypass de test activé pour les profils "maj" et "andymj".`);
                        isMatched = true;
                      } else {
                        logs.push(`  ❌ ÉCHEC RÉSOLUTION AGENT : L'agent référencé ne correspond pas à votre profil.`);
                      }
                    } else {
                      logs.push(`  ❌ ÉCHEC TOTAL : L'ID assigné ne correspond à aucun de vos profils et n'existe pas dans le référentiel des agents.`);
                    }
                  }
                }
              }
            }

            return {
              signal: sig,
              isMatched: isMatched && statusOk,
              logs
            };
          });

          return (
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-4 text-xs font-mono text-slate-300">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase">Utilisateur Connecté (Session)</span>
                  <p>🆔 ID: <span className="text-white font-bold">{currentUser?.id || 'N/A'}</span></p>
                  <p>👤 Nom: <span className="text-white font-bold">{currentUser?.nom || 'N/A'}</span></p>
                  <p>📞 Tél: <span className="text-white font-bold">{currentUser?.telephone || 'N/A'}</span></p>
                  <p>🔑 Rôle: <span className="text-white font-bold">{currentUser?.role || 'N/A'}</span></p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-indigo-400 font-extrabold uppercase font-sans">Éboueur Cartographié (Profil)</span>
                  <p>🆔 ID: <span className="text-white font-bold">{currentEboueur?.id || 'N/A'}</span></p>
                  <p>👤 Nom: <span className="text-white font-bold">{currentEboueur?.nom || 'N/A'}</span></p>
                  <p>📞 Tél: <span className="text-white font-bold">{currentEboueur?.telephone || 'N/A'}</span></p>
                  <p>📍 GPS: <span className="text-white font-bold">{currentEboueur?.latitude?.toFixed(5)}, {currentEboueur?.longitude?.toFixed(5)} ({currentEboueur?.gps_active ? 'Actif' : 'Inactif'})</span></p>
                </div>
              </div>

              {/* Signals Diagnosis Feed */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                    Signaux Présents en Base de Données ({allRawSignals.length})
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                    Missions filtrées visibles pour vous : {assignedMissions.length} active(s)
                  </span>
                </div>

                {allRawSignals.length === 0 ? (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center text-slate-500">
                    Aucun signal de poubelle trouvé dans `signaux_poubelles` pour le moment.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                    {diagnostics.map((diag, idx) => (
                      <div 
                        key={diag.signal.id || idx} 
                        className={`p-3.5 rounded-2xl border transition-all ${
                          diag.isMatched 
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100' 
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 font-sans">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-xs text-white">
                              🚨 Signal {diag.signal.id ? diag.signal.id.substring(0, 8) : `#${idx}`}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Parcelle N° {diag.signal.numero_parcelle} • Avenue {diag.signal.avenue_nom} • {diag.signal.commune_nom}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] bg-slate-800 px-2.5 py-0.5 rounded-full font-bold">
                              Statut: {diag.signal.status}
                            </span>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                              diag.isMatched 
                                ? 'bg-emerald-500 text-slate-950' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {diag.isMatched ? '🟢 MATCH' : '❌ EXCLU'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-950/80 p-2.5 rounded-xl text-[11px] leading-relaxed font-mono text-slate-300 flex flex-col gap-1">
                          {diag.logs.map((log, lIdx) => (
                            <div key={lIdx} className={log.includes('🟢') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-rose-400 font-bold' : ''}>
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </section>

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
