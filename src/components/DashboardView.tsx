import React, { useState } from 'react';
import { 
  Users, 
  Home, 
  Map, 
  Milestone, 
  Building2, 
  PlusCircle, 
  FolderPlus, 
  Search, 
  MapPin, 
  ArrowRight,
  AlertTriangle,
  Trash2,
  Truck,
  CheckCircle2,
  Clock,
  Navigation
} from 'lucide-react';
import { Commune, Avenue, Parcelle, Abonne, Screen, PoubelleSignal, Eboueur } from '../types';

interface DashboardViewProps {
  communes: Commune[];
  avenues: Avenue[];
  parcelles: Parcelle[];
  abonnes: Abonne[];
  signals?: PoubelleSignal[];
  eboueurs?: Eboueur[];
  onAssignMission?: (signalId: string, eboueurId: string, options?: { is_partiel?: boolean; partiel_note?: string }) => void;
  onNavigate: (screen: Screen) => void;
  onAddCommuneToggle: () => void;
  onAddAvenueToggle: () => void;
}

export default function DashboardView({
  communes,
  avenues,
  parcelles,
  abonnes,
  signals = [],
  eboueurs = [],
  onAssignMission,
  onNavigate,
  onAddCommuneToggle,
  onAddAvenueToggle
}: DashboardViewProps) {
  const [selectedEboueurs, setSelectedEboueurs] = useState<Record<string, string>>({});
  
  // Calculate dynamic stats purely from live data
  const totalCommunes = communes.length; 
  const totalAvenues = avenues.length;
  const totalParcelles = parcelles.length;
  
  // Custom reducer for real households
  const totalMenages = parcelles.reduce((sum, p) => sum + p.nombre_menages, 0);

  // Exact live abonne count
  const totalAbonnes = abonnes.length;

  // Active Signals (Poubelles pleines non encore complètement ramassées)
  const activeSignals = signals.filter(s => s.status !== 'completed');
  const pendingCount = signals.filter(s => s.status === 'pending').length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background">
      {/* Title block */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-on-background font-sans">
          Tableau de Bord
        </h2>
        <p className="text-sm text-on-surface-variant leading-relaxed font-sans">
          Vue d'ensemble des données de recensement et des alertes de collecte en temps réel.
        </p>
      </div>

      {/* Bento Grid: Stats Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Highlight Card: Abonnés */}
        <div className="col-span-2 md:col-span-2 bg-surface border border-outline-variant rounded-3xl p-6 flex items-center justify-between shadow-xl relative overflow-hidden group hover:border-[#10b981]/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-[#10b981]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="flex flex-col gap-1.5 z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#10b981] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              Abonnés Actifs
            </span>
            <span className="text-3xl font-extrabold text-on-surface tracking-tight md:text-4xl font-sans mt-1">
              {totalAbonnes.toLocaleString('fr-FR')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-background border border-outline-variant flex items-center justify-center z-10 text-primary group-hover:bg-[#10b981] group-hover:text-white group-hover:border-[#10b981] transition-all duration-350 shadow-sm shrink-0">
            <Users size={22} strokeWidth={2.2} />
          </div>
        </div>

        {/* Highlight Card: Alertes Poubelles Pleines */}
        <div 
          onClick={() => onNavigate('dechets_map')}
          className="col-span-2 md:col-span-2 bg-gradient-to-br from-red-950/20 via-surface to-surface border border-red-500/30 rounded-3xl p-6 flex items-center justify-between shadow-xl relative overflow-hidden group hover:border-red-500/60 transition-all duration-300 cursor-pointer"
        >
          <div className="flex flex-col gap-1.5 z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              Poubelles Pleines (Alertes)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-red-500 tracking-tight md:text-4xl font-sans mt-1">
                {activeSignals.length}
              </span>
              {pendingCount > 0 && (
                <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {pendingCount} à assigner
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center z-10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all duration-350 shadow-sm shrink-0">
            <AlertTriangle size={22} strokeWidth={2.2} className="animate-bounce" />
          </div>
        </div>

        {/* Ménages */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 justify-between hover:border-outline hover:bg-surface/80 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Ménages
            </span>
            <div className="w-8 h-8 rounded-lg bg-background border border-outline-variant flex items-center justify-center text-[#10b981]">
              <Home size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-on-surface font-sans">
            {totalMenages.toLocaleString('fr-FR')}
          </span>
        </div>

        {/* Parcelles */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 justify-between hover:border-outline hover:bg-surface/80 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Parcelles
            </span>
            <div className="w-8 h-8 rounded-lg bg-background border border-outline-variant flex items-center justify-center text-[#10b981]">
              <Building2 size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-on-surface font-sans">
            {totalParcelles.toLocaleString('fr-FR')}
          </span>
        </div>

        {/* Avenues */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 justify-between hover:border-outline hover:bg-surface/80 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Avenues
            </span>
            <div className="w-8 h-8 rounded-lg bg-background border border-outline-variant flex items-center justify-center text-[#10b981]">
              <Milestone size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-on-surface font-sans">
            {totalAvenues.toLocaleString('fr-FR')}
          </span>
        </div>

        {/* Communes */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 justify-between hover:border-outline hover:bg-surface/80 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Communes
            </span>
            <div className="w-8 h-8 rounded-lg bg-background border border-outline-variant flex items-center justify-center text-[#10b981]">
              <Map size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-on-surface font-sans">
            {totalCommunes.toLocaleString('fr-FR')}
          </span>
        </div>
      </section>

      {/* SECTION EXCLUSIVE: Alertes & Collectes en Attente avec Assignation */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <h3 className="text-on-surface font-bold text-sm md:text-base tracking-tight uppercase">
              Alertes Poubelles Pleines & Assignation
            </h3>
            {activeSignals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-red-500/20 text-red-400 border border-red-500/30">
                {activeSignals.length} en cours
              </span>
            )}
          </div>
          <button 
            onClick={() => onNavigate('dechets_map')}
            className="text-xs font-bold text-primary hover:text-on-background flex items-center gap-1 cursor-pointer transition-colors"
          >
            Carte interactive
            <ArrowRight size={14} />
          </button>
        </div>

        {activeSignals.length === 0 ? (
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-2 font-sans shadow-md">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <span className="font-bold text-on-surface text-sm">Aucune alerte de poubelle pleine</span>
            <span>Toutes les poubelles signalées ont été collectées ou aucune alerte n'est en attente.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSignals.map((sig) => {
              const assignedEb = eboueurs.find(e => 
                e.id === sig.assigned_eboueur_id || 
                e.id === (sig as any).eboueur_assigne_id
              );
              const isBiodegradable = sig.type_poubelle === 'biodegradable';

              return (
                <div 
                  key={sig.id}
                  className="bg-surface border border-outline-variant/80 rounded-2xl p-4 flex flex-col gap-3 shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-outline-variant/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border ${
                        isBiodegradable 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                          : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                      }`}>
                        {isBiodegradable ? '🟢 Biodégradable' : '🟣 Non-Biodégradable'}
                      </span>
                      <span className="text-[11px] font-mono text-on-surface-variant flex items-center gap-1">
                        <Clock size={12} />
                        {sig.reported_at ? sig.reported_at.substring(11, 16) : 'Récemment'}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      sig.status === 'assigned'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                    }`}>
                      {sig.status === 'assigned' ? 'Éboueur en route' : 'En attente d\'éboueur'}
                    </span>
                  </div>

                  {/* Parcel details */}
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                      <MapPin size={15} className="text-red-400 shrink-0" />
                      Parcelle N° {sig.numero_parcelle} — {sig.avenue_nom}, {sig.commune_nom}
                    </span>
                    <p className="text-xs text-on-surface-variant font-sans">
                      Abonné : <strong className="text-on-surface">{sig.bailleur_nom}</strong> ({sig.bailleur_telephone})
                    </p>
                  </div>

                  {/* Éboueur Assignment controls */}
                  <div className="mt-1 pt-3 border-t border-outline-variant/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    {sig.status === 'assigned' ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-950/40 p-2 rounded-xl border border-amber-500/20 flex-1">
                        <Truck size={16} className="shrink-0 animate-pulse" />
                        <span className="truncate">Mission assignée à : {assignedEb?.nom || 'Éboueur'} ({assignedEb?.telephone || '08...'})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <select
                          value={selectedEboueurs[sig.id] || (eboueurs[0]?.id || '')}
                          onChange={(e) => setSelectedEboueurs({ ...selectedEboueurs, [sig.id]: e.target.value })}
                          className="bg-background border border-outline-variant text-on-surface text-xs rounded-xl px-3 py-2 flex-1 font-semibold focus:outline-none focus:border-primary"
                        >
                          {eboueurs.map(e => {
                            const cap = e.capacite_camion || 6;
                            const load = e.charge_actuelle || 0;
                            const activeCount = signals.filter(s => s.status === 'assigned' && (s.assigned_eboueur_id === e.id || (s as any).eboueur_assigne_id === e.id)).length;
                            const freeSlots = Math.max(0, cap - load - activeCount);
                            return (
                              <option key={e.id} value={e.id}>
                                🚛 {e.nom} ({e.telephone}) — {freeSlots > 0 ? `${freeSlots}/${cap} places libres 🔋` : '🚨 CAMION PLEIN (0 place)'}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          onClick={() => {
                            const ebId = selectedEboueurs[sig.id] || eboueurs[0]?.id;
                            const targetEb = eboueurs.find(e => e.id === ebId);

                            if (!targetEb) {
                              alert("Veuillez sélectionner un éboueur à assigner.");
                              return;
                            }

                            const cap = targetEb.capacite_camion || 6;
                            const load = targetEb.charge_actuelle || 0;
                            const activeCount = signals.filter(s => s.status === 'assigned' && (s.assigned_eboueur_id === targetEb.id || (s as any).eboueur_assigne_id === targetEb.id)).length;
                            const freeSlots = Math.max(0, cap - load - activeCount);

                            if (freeSlots <= 0) {
                              alert(`🚨 CAMION PLEIN !\n\nLe véhicule de M. ${targetEb.nom} est actuellement PLEIN (${load}/${cap} sachets chargés).\n\nL'éboueur doit d'abord décharger son camion au centre d'enfouissement avant de recevoir de nouvelles missions.`);
                              return;
                            }

                            // Check if this parcel has multiple pending signals
                            const parcelSignals = signals.filter(s => s.parcelle_id === sig.parcelle_id && s.status === 'pending');
                            if (parcelSignals.length > 1 && freeSlots === 1) {
                              const proceedPartiel = confirm(`⚠️ CAPACITÉ DE CAMION LIMITÉE !\n\nL'abonné a ${parcelSignals.length} poubelles en attente, mais le camion de M. ${targetEb.nom} n'a plus qu'1 SEULE PLACE libre.\n\nVoulez-vous effectuer un PASSAGE PARTIEL (1ère poubelle ramassée maintenant, la 2ème plus tard) ?`);
                              if (proceedPartiel && onAssignMission) {
                                onAssignMission(sig.id, ebId, {
                                  is_partiel: true,
                                  partiel_note: '1er sachet enlevé, le second sera collecté lors de la prochaine rotation.'
                                });
                              }
                              return;
                            }

                            if (onAssignMission) {
                              onAssignMission(sig.id, ebId);
                            }
                          }}
                          className="bg-primary text-on-primary hover:bg-primary/90 px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all shrink-0"
                        >
                          <Truck size={14} />
                          <span>Assigner</span>
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => onNavigate('dechets_map')}
                      className="p-2 rounded-xl bg-background hover:bg-surface border border-outline-variant/60 text-on-surface-variant hover:text-on-surface text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Voir la localisation sur la carte"
                    >
                      <Navigation size={14} />
                      <span className="hidden sm:inline">Carte</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Actions Rapides Section */}
      <section className="flex flex-col gap-3 mt-1">
        <h3 className="text-on-surface-variant font-bold text-xs uppercase tracking-widest select-none">Actions Rapides</h3>
        
        {/* Core button step 1 */}
        <button 
          onClick={() => onNavigate('communes')}
          className="w-full min-h-[52px] bg-primary text-on-primary rounded-2xl flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold shadow-lg hover:opacity-95 active:scale-[0.98] transition-all duration-150 cursor-pointer group border border-outline-variant"
        >
          <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Commencer un recensement
        </button>

        {/* Sub grid choices */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            onClick={onAddCommuneToggle}
            className="min-h-[48px] bg-surface border border-outline-variant text-on-surface hover:bg-background/80 rounded-xl flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
          >
            <FolderPlus size={16} className="text-[#10b981]" />
            Ajouter une commune
          </button>
          <button 
            onClick={onAddAvenueToggle}
            className="min-h-[48px] bg-surface border border-outline-variant text-on-surface hover:bg-background/80 rounded-xl flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
          >
            <Milestone size={16} className="text-[#10b981]" />
            Ajouter une avenue
          </button>
          <button 
            onClick={() => onNavigate('abonne_list')}
            className="min-h-[48px] bg-surface border border-outline-variant text-on-surface hover:bg-background/80 rounded-xl flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
          >
            <Search size={16} className="text-primary" />
            Consulter les abonnés
          </button>
        </div>
      </section>

      {/* Recent Activity lists */}
      <section className="flex flex-col gap-3 mt-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-on-surface-variant font-bold text-xs uppercase tracking-widest">Activité Récente</h3>
          <button 
            onClick={() => onNavigate('abonne_list')}
            className="text-xs font-bold text-primary hover:text-on-background flex items-center gap-1 cursor-pointer transition-colors"
          >
            Voir tout
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-2">
          {parcelles.length === 0 ? (
            <div className="bg-surface border border-outline-variant rounded-2xl p-6 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-1.5 font-sans shadow-md">
              <span className="text-xl">📍</span>
              <span className="font-bold text-on-surface">Aucune activité récente</span>
              <span>Les fiches de recensement validées apparaîtront ici en temps réel.</span>
            </div>
          ) : (
            parcelles.slice(0, 4).map((parcelle, index) => {
              // Find corresponding avenue and commune
              const avenueObj = avenues.find(a => a.id === parcelle.avenue_id);
              const communeObj = avenueObj ? communes.find(c => c.id === avenueObj.commune_id) : null;
              const correspondingAbonne = abonnes.find(ab => ab.parcelle_id === parcelle.id);

              let timestamp = '10:42';
              if (index === 1) timestamp = '09:15';
              if (index === 2) timestamp = 'Hier';
              if (index > 2) timestamp = 'Récemment';

              return (
                <div 
                  key={parcelle.id}
                  onClick={() => {
                    if (correspondingAbonne) {
                      onNavigate('abonne_list');
                    }
                  }}
                  className="bg-surface border border-outline-variant rounded-2xl p-4 flex items-center gap-4 hover:border-outline hover:bg-surface/80 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-background text-[#10b981] flex items-center justify-center shrink-0 border border-outline-variant group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all duration-200">
                    <MapPin size={18} />
                  </div>
                  
                  <div className="flex flex-col flex-grow">
                    <span className="text-sm font-bold text-on-surface leading-tight group-hover:text-primary transition-colors">
                      Parcelle N° {parcelle.numero_parcelle}
                    </span>
                    <span className="text-xs text-on-surface-variant mt-1 font-sans leading-relaxed">
                      {avenueObj?.nom || 'Avenue inconnue'}, Commune de {communeObj?.nom || 'Kinshasa'}
                    </span>
                    {correspondingAbonne && (
                      <span className="text-[11px] text-on-surface font-medium mt-1.5 inline-flex items-center gap-1 font-sans">
                        👤 {correspondingAbonne.nom_complet} • <span className="text-on-surface-variant font-mono">{correspondingAbonne.telephone_principal}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1.5 font-sans">
                    <span className="text-xs font-mono text-on-surface-variant">
                      {timestamp}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-indigo-500' : 'bg-transparent'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
