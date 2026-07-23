import React, { useState, useMemo } from 'react';
import { 
  Commune, 
  Avenue, 
  Parcelle, 
  SachetStock, 
  SachetDistribution,
  Agent,
  AgentDotation,
  AgentDotationLog
} from '../types';
import { 
  Package, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Search, 
  AlertTriangle, 
  Check, 
  MapPin, 
  Calendar, 
  User, 
  ShieldAlert,
  Info,
  Truck,
  Users
} from 'lucide-react';

interface SachetsManagementViewProps {
  communes: Commune[];
  avenues: Avenue[];
  parcelles: Parcelle[];
  agents: Agent[];
  stocks: SachetStock[];
  distributions: SachetDistribution[];
  agentDotations?: AgentDotation[];
  agentDotationLogs?: AgentDotationLog[];
  onReplenishStock: (communeId: string | null, bioQty: number, nonBioQty: number) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onDistributeSachets: (distribution: Omit<SachetDistribution, 'id'>) => boolean | Promise<boolean>;
  onDotationAgent?: (agentId: string, communeId: string, bioQty: number, nonBioQty: number, attribuePar: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
}

export default function SachetsManagementView({
  communes,
  avenues,
  parcelles,
  agents,
  stocks,
  distributions,
  agentDotations = [],
  agentDotationLogs = [],
  onReplenishStock,
  onDistributeSachets,
  onDotationAgent
}: SachetsManagementViewProps) {
  // Tabs: 'stocks' | 'replenish' | 'dotations' | 'distribute' | 'history'
  const [activeTab, setActiveTab] = useState<'stocks' | 'replenish' | 'dotations' | 'distribute' | 'history'>('stocks');
  const [historySubTab, setHistorySubTab] = useState<'distributions' | 'replenishments' | 'dotations'>('distributions');

  // Dotation Agent Form state
  const [dotCommuneId, setDotCommuneId] = useState(communes[0]?.id || '');
  const [dotAgentId, setDotAgentId] = useState('');
  const [dotBioQty, setDotBioQty] = useState<number>(20);
  const [dotNonBioQty, setDotNonBioQty] = useState<number>(20);
  const [dotAttribuePar, setDotAttribuePar] = useState('Direction Hico-Cleaning');
  const [dotSuccess, setDotSuccess] = useState(false);
  const [dotError, setDotError] = useState<string | null>(null);

  // Search State
  const [searchCommune, setSearchCommune] = useState('');

  // Replenish Form State
  const [repType, setRepType] = useState<'usine' | 'transfert'>('transfert');
  const [repCommuneId, setRepCommuneId] = useState(communes[0]?.id || '');
  const [repBioQty, setRepBioQty] = useState<number>(100);
  const [repNonBioQty, setRepNonBioQty] = useState<number>(100);
  const [repSuccess, setRepSuccess] = useState(false);
  const [repError, setRepError] = useState<string | null>(null);

  // Distribution Form State
  const [distCommuneId, setDistCommuneId] = useState(communes[0]?.id || '');
  const [distAvenueId, setDistAvenueId] = useState('');
  const [distParcelleId, setDistParcelleId] = useState('');
  const [distBioQty, setDistBioQty] = useState<number>(2); // Default 2 as requested: "le sachet poubelles en questions sera 2 par abonnés, l'un les poubelles dégradable et l'autre non dégradable."
  const [distNonBioQty, setDistNonBioQty] = useState<number>(2);
  const [distribuePar, setDistribuePar] = useState('');
  const [distNotes, setDistNotes] = useState('');
  const [distSuccess, setDistSuccess] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);

  // Auto filter avenues & parcelles based on selection
  const filteredAvenues = useMemo(() => {
    return avenues.filter(a => a.commune_id === distCommuneId);
  }, [avenues, distCommuneId]);

  // Set default avenue when commune changes
  React.useEffect(() => {
    if (filteredAvenues.length > 0) {
      setDistAvenueId(filteredAvenues[0].id);
    } else {
      setDistAvenueId('');
    }
  }, [filteredAvenues]);

  const filteredParcelles = useMemo(() => {
    return parcelles.filter(p => p.avenue_id === distAvenueId);
  }, [parcelles, distAvenueId]);

  // Set default parcelle when avenue changes
  React.useEffect(() => {
    if (filteredParcelles.length > 0) {
      setDistParcelleId(filteredParcelles[0].id);
    } else {
      setDistParcelleId('');
    }
  }, [filteredParcelles]);

  // Filter stocks by commune search query
  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      const commune = communes.find(c => c.id === stock.commune_id);
      return commune?.nom.toLowerCase().includes(searchCommune.toLowerCase());
    });
  }, [stocks, communes, searchCommune]);

  // Handle replenishment submission
  const handleReplenishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepError(null);
    setRepSuccess(false);

    const targetedCommuneId = repType === 'usine' ? null : repCommuneId;
    if (repType === 'transfert' && !targetedCommuneId) {
      setRepError("Veuillez sélectionner une commune.");
      return;
    }

    const res = await onReplenishStock(targetedCommuneId, repBioQty, repNonBioQty);
    
    if (res.success) {
      setRepSuccess(true);
      setTimeout(() => setRepSuccess(false), 3000);

      // Add to replenishment log
      const savedLogs = localStorage.getItem('hico_replenish_logs') || '[]';
      const logs = JSON.parse(savedLogs);
      const communeObj = communes.find(c => c.id === targetedCommuneId);
      
      logs.unshift({
        id: 'rep-' + Date.now(),
        commune_id: targetedCommuneId,
        commune_nom: repType === 'usine' ? '🏢 Dépôt Central (Usine)' : `🚚 Transfert -> ${communeObj?.nom || 'Inconnue'}`,
        biodegradable: repBioQty,
        non_biodegradable: repNonBioQty,
        type_operation: repType === 'usine' ? 'RÉCEPTION USINE' : 'TRANSFERT LOCAL',
        date: new Date().toISOString()
      });
      localStorage.setItem('hico_replenish_logs', JSON.stringify(logs));

      // Reset quantities
      setRepBioQty(100);
      setRepNonBioQty(100);
    } else {
      setRepError(res.error || "Une erreur est survenue lors du traitement.");
    }
  };

  // Get replenishment logs
  const replenishLogs = useMemo(() => {
    const savedLogs = localStorage.getItem('hico_replenish_logs');
    return savedLogs ? JSON.parse(savedLogs) : [];
  }, [repSuccess]);

  // Handle distribution submission
  const handleDistributionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDistError(null);

    if (!distCommuneId || !distAvenueId || !distParcelleId) {
      setDistError("Veuillez sélectionner une commune, une avenue et une parcelle valides.");
      return;
    }

    if (!distribuePar) {
      setDistError("Veuillez spécifier l'agent ou éboueur effectuant la distribution.");
      return;
    }

    // Verify stock availability
    const commStock = stocks.find(s => s.commune_id === distCommuneId);
    if (!commStock) {
      setDistError("Aucun stock n'est configuré pour cette commune.");
      return;
    }

    if (commStock.biodegradable < distBioQty) {
      setDistError(`Stock de sachets biodégradables insuffisant dans la commune (${commStock.biodegradable} restants).`);
      return;
    }

    if (commStock.non_biodegradable < distNonBioQty) {
      setDistError(`Stock de sachets non biodégradables insuffisant dans la commune (${commStock.non_biodegradable} restants).`);
      return;
    }

    const result = onDistributeSachets({
      parcelle_id: distParcelleId,
      avenue_id: distAvenueId,
      commune_id: distCommuneId,
      date_distribution: new Date().toISOString(),
      quantite_biodegradable: distBioQty,
      quantite_non_biodegradable: distNonBioQty,
      distribue_par: distribuePar,
      notes: distNotes
    });

    const handleSuccessState = (isSuccess: boolean) => {
      if (isSuccess) {
        setDistSuccess(true);
        setDistNotes('');
        setTimeout(() => setDistSuccess(false), 3000);
      } else {
        setDistError("Une erreur est survenue lors de la distribution.");
      }
    };

    if (result instanceof Promise) {
      result.then(handleSuccessState).catch(() => {
        setDistError("Une erreur est survenue lors de la distribution.");
      });
    } else {
      handleSuccessState(result);
    }
  };

  // Handle Dotation Submission (Commune Stock -> Agent/Éboueur Dotation)
  const handleDotationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDotError(null);
    setDotSuccess(false);

    if (!dotCommuneId || !dotAgentId) {
      setDotError("Veuillez sélectionner une commune et un agent/éboueur.");
      return;
    }

    if (dotBioQty <= 0 && dotNonBioQty <= 0) {
      setDotError("Veuillez saisir au moins une quantité positive à attribuer.");
      return;
    }

    const commStock = stocks.find(s => s.commune_id === dotCommuneId);
    if (!commStock) {
      setDotError("Aucun stock n'est disponible pour cette commune.");
      return;
    }

    if (commStock.biodegradable < dotBioQty) {
      setDotError(`Stock communal insuffisant pour les sachets biodégradables (${commStock.biodegradable} u en réserve).`);
      return;
    }

    if (commStock.non_biodegradable < dotNonBioQty) {
      setDotError(`Stock communal insuffisant pour les sachets non-dégradables (${commStock.non_biodegradable} u en réserve).`);
      return;
    }

    if (onDotationAgent) {
      const res = await onDotationAgent(dotAgentId, dotCommuneId, dotBioQty, dotNonBioQty, dotAttribuePar);
      if (res.success) {
        setDotSuccess(true);
        setTimeout(() => setDotSuccess(false), 3000);
      } else {
        setDotError(res.error || "Erreur lors de l'attribution de la dotation.");
      }
    } else {
      setDotSuccess(true);
      setTimeout(() => setDotSuccess(false), 3000);
    }
  };

  // Find central/global stock and filter local commune stocks
  const centralStock = useMemo(() => {
    return stocks.find(s => s.commune_id === null || s.id === 'stk-central');
  }, [stocks]);

  const communeStocks = useMemo(() => {
    return stocks.filter(s => s.commune_id !== null && s.id !== 'stk-central');
  }, [stocks]);

  // Total statistics helper (communes only)
  const totalStats = useMemo(() => {
    let totalBio = 0;
    let totalNonBio = 0;
    let alertsCount = 0;

    communeStocks.forEach(s => {
      totalBio += s.biodegradable;
      totalNonBio += s.non_biodegradable;
      if (s.biodegradable <= s.seuil_alerte || s.non_biodegradable <= s.seuil_alerte) {
        alertsCount++;
      }
    });

    return { totalBio, totalNonBio, alertsCount };
  }, [communeStocks]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background pb-12" id="sachets_management_view">
      
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant" id="sachets_title_container">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-surface text-secondary flex items-center justify-center border border-outline-variant">
            <Package size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-background font-sans leading-tight">Gestion des Sachets Poubelles</h2>
            <p className="text-xs text-on-surface-variant">Suivi du stock central, réapprovisionnement communal et distribution de sachets.</p>
          </div>
        </div>
        <span className="bg-secondary/20 text-indigo-400 text-xs px-3 py-1 rounded-full font-bold border border-secondary/25 uppercase tracking-wider font-mono">
          STOCKS & LOGISTIQUE 📦
        </span>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="sachets_stats_grid">
        {/* Card 1: Central Stock */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-secondary/15 text-indigo-400 border border-secondary/20">
            <Package size={22} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <span className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant">🏢 Stock Global (Dépôt Central)</span>
            <div className="flex items-center gap-4 mt-0.5">
              <div>
                <span className="text-[9px] text-emerald-400 font-bold uppercase block">Bio</span>
                <span className="text-sm font-black text-on-surface font-mono">{centralStock?.biodegradable ?? 0}</span>
              </div>
              <div className="border-l border-outline-variant h-6"></div>
              <div>
                <span className="text-[9px] text-indigo-400 font-bold uppercase block">Non-Bio</span>
                <span className="text-sm font-black text-on-surface font-mono">{centralStock?.non_biodegradable ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Communal Stock Sum */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/15">
            <MapPin size={22} />
          </div>
          <div className="flex-1">
            <span className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant">📍 Stocks des Communes (Total)</span>
            <div className="flex items-center gap-4 mt-0.5">
              <div>
                <span className="text-[9px] text-emerald-400 font-bold uppercase block">Bio</span>
                <span className="text-sm font-black text-on-surface font-mono">{totalStats.totalBio}</span>
              </div>
              <div className="border-l border-outline-variant h-6"></div>
              <div>
                <span className="text-[9px] text-indigo-400 font-bold uppercase block">Non-Bio</span>
                <span className="text-sm font-black text-on-surface font-mono">{totalStats.totalNonBio}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Alert Counts */}
        <div className={`border rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-all ${
          totalStats.alertsCount > 0 
            ? 'bg-amber-500/10 border-amber-500/25 text-amber-500' 
            : 'bg-surface border-outline-variant text-on-surface-variant'
        }`}>
          <div className={`p-3 rounded-xl ${
            totalStats.alertsCount > 0 
              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20' 
              : 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/15'
          }`}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Seuils Critiques Atteints</span>
            <div className="text-2xl font-black font-mono mt-0.5">
              {totalStats.alertsCount} {totalStats.alertsCount > 0 ? '⚠️' : '✅'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-surface p-1.5 rounded-2xl border border-outline-variant whitespace-nowrap scrollbar-none" id="sachets_tabs">
        <button
          onClick={() => setActiveTab('stocks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'stocks'
              ? 'bg-secondary text-white shadow-md'
              : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
          }`}
        >
          <Package size={14} />
          État des Stocks par Commune
        </button>

        <button
          onClick={() => setActiveTab('replenish')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'replenish'
              ? 'bg-secondary text-white shadow-md'
              : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
          }`}
        >
          <Plus size={14} />
          Réapprovisionnement
        </button>

        <button
          onClick={() => setActiveTab('dotations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'dotations'
              ? 'bg-secondary text-white shadow-md'
              : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
          }`}
        >
          <Truck size={14} />
          Dotations Éboueurs & Terrain
        </button>

        <button
          onClick={() => setActiveTab('distribute')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'distribute'
              ? 'bg-secondary text-white shadow-md'
              : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
          }`}
        >
          <ArrowDownLeft size={14} />
          Distribution aux Parcelles
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-secondary text-white shadow-md'
              : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
          }`}
        >
          <History size={14} />
          Historique des Opérations
        </button>
      </div>

      {/* ==================== TAB 1: STOCKS VIEW ==================== */}
      {activeTab === 'stocks' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-on-surface">Inventaire Général des Sachets</h3>
              <p className="text-xs text-on-surface-variant">Quantités disponibles dans les dépôts communaux pour approvisionner les abonnés.</p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-on-surface-variant/70 self-center h-full pointer-events-none" size={16} />
              <input
                type="text"
                placeholder="Rechercher une commune..."
                value={searchCommune}
                onChange={(e) => setSearchCommune(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-background border border-outline-variant rounded-xl text-on-surface text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
              />
            </div>
          </div>

          {/* Dépôt Central Info Banner */}
          <div className="bg-background/40 border border-outline-variant rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 text-indigo-400 flex items-center justify-center border border-secondary/20">
                <Package size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-on-surface">🏢 Hub d'Approvisionnement (Dépôt Central)</h4>
                <p className="text-[10px] text-on-surface-variant">C'est la réserve globale nationale d'où proviennent tous les sachets rechargés.</p>
              </div>
            </div>
            <div className="flex gap-6 pr-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase text-[#10b981] tracking-wider">Biodégradables (Dispo)</span>
                <span className="text-sm font-black text-on-surface font-mono">{centralStock?.biodegradable ?? 0} <span className="text-[10px] text-on-surface-variant">u</span></span>
              </div>
              <div className="border-l border-outline-variant h-8 self-center"></div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase text-indigo-400 tracking-wider">Non Dégradables (Dispo)</span>
                <span className="text-sm font-black text-on-surface font-mono">{centralStock?.non_biodegradable ?? 0} <span className="text-[10px] text-on-surface-variant">u</span></span>
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-outline-variant text-[10px] font-bold uppercase tracking-widest text-on-surface-variant select-none">
                  <th className="py-3.5 px-4 font-black">Commune</th>
                  <th className="py-3.5 px-4 font-black text-center">Dégradable (Vert)</th>
                  <th className="py-3.5 px-4 font-black text-center">Non Dégradable (Bleu)</th>
                  <th className="py-3.5 px-4 font-black text-center">Seuil Alerte</th>
                  <th className="py-3.5 px-4 font-black">Statut Stock</th>
                  <th className="py-3.5 px-4 font-black text-right">Dernière Recharge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-xs font-medium">
                {filteredStocks.map((stock) => {
                  const commune = communes.find(c => c.id === stock.commune_id);
                  const isCritBio = stock.biodegradable <= stock.seuil_alerte;
                  const isCritNonBio = stock.non_biodegradable <= stock.seuil_alerte;
                  const isCritOverall = isCritBio || isCritNonBio;

                  return (
                    <tr 
                      key={stock.id}
                      className={`hover:bg-background/40 transition-colors ${
                        isCritOverall ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      <td className="py-4 px-4 font-extrabold text-on-surface">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-secondary shrink-0" />
                          <span>{commune?.nom || 'Inconnue'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`font-bold font-mono px-2.5 py-1 rounded-lg ${
                          isCritBio 
                            ? 'bg-error/15 text-error border border-error/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                        }`}>
                          {stock.biodegradable} u
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`font-bold font-mono px-2.5 py-1 rounded-lg ${
                          isCritNonBio 
                            ? 'bg-error/15 text-error border border-error/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                        }`}>
                          {stock.non_biodegradable} u
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-bold text-on-surface-variant">
                        {stock.seuil_alerte} u
                      </td>
                      <td className="py-4 px-4">
                        {isCritOverall ? (
                          <span className="flex items-center gap-1 text-amber-500 font-extrabold text-[10px] uppercase tracking-wider bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded w-max">
                            <AlertTriangle size={11} /> Stock Critique
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[#10b981] font-extrabold text-[10px] uppercase tracking-wider bg-[#10b981]/15 border border-[#10b981]/20 px-2 py-0.5 rounded w-max">
                            <Check size={11} /> Optimal
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-on-surface-variant">
                        {stock.last_replenished 
                          ? new Date(stock.last_replenished).toLocaleDateString('fr-FR')
                          : 'Jamais'
                        }
                      </td>
                    </tr>
                  );
                })}

                {filteredStocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant italic">
                      Aucune commune ne correspond à votre recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: REPLENISH FORM ==================== */}
      {activeTab === 'replenish' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-5 animate-fade-in">
          <div>
            <h3 className="text-base font-black text-on-surface">Réapprovisionnement & Logistique des Sachets</h3>
            <p className="text-xs text-on-surface-variant">Gérez l'approvisionnement global : réceptionnez les lots d'usine ou transférez du stock vers les dépôts communaux.</p>
          </div>

          {/* Toggle Type d'Opération */}
          <div className="flex gap-2 p-1 bg-background rounded-xl border border-outline-variant max-w-md">
            <button
              type="button"
              onClick={() => { setRepType('transfert'); setRepError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                repType === 'transfert'
                  ? 'bg-secondary text-white shadow'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              🚚 Transfert vers une Commune
            </button>
            <button
              type="button"
              onClick={() => { setRepType('usine'); setRepError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                repType === 'usine'
                  ? 'bg-secondary text-white shadow'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              🏢 Réception d'Usine (Stock Central)
            </button>
          </div>

          {repError && (
            <div className="bg-error/15 border border-error/20 text-error p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{repError}</span>
            </div>
          )}

          <form onSubmit={handleReplenishSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-1">
            <div className="flex flex-col gap-4">
              {repType === 'transfert' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="rep_comm">
                      Commune bénéficiaire
                    </label>
                    <select
                      id="rep_comm"
                      value={repCommuneId}
                      onChange={(e) => setRepCommuneId(e.target.value)}
                      className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold"
                      required
                    >
                      {communes.map(c => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stock disponible au Central Hub */}
                  <div className="bg-indigo-500/[0.04] border border-indigo-500/15 p-4 rounded-2xl text-xs">
                    <span className="font-bold text-indigo-400 block mb-1.5">📦 Stock disponible au Dépôt Central :</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-on-surface-variant">
                      <div className="flex justify-between bg-background/50 p-2 rounded-lg border border-outline-variant/40">
                        <span>Biodégradables :</span>
                        <span className="font-bold text-emerald-400 font-mono">{centralStock?.biodegradable ?? 0} u</span>
                      </div>
                      <div className="flex justify-between bg-background/50 p-2 rounded-lg border border-outline-variant/40">
                        <span>Non Dégradables :</span>
                        <span className="font-bold text-indigo-400 font-mono">{centralStock?.non_biodegradable ?? 0} u</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-emerald-500/[0.04] border border-emerald-500/15 p-4 rounded-2xl flex items-start gap-3 text-xs">
                  <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 text-on-surface-variant">
                    <span className="font-bold text-on-surface text-emerald-400">Réception d'usine (Entrée de stock)</span>
                    Cette opération permet d'ajouter des sachets poubelles livrés directement par l'usine de production dans le Dépôt Central Global de Hico-Cleaning. C'est le point de départ de la chaîne de distribution.
                  </div>
                </div>
              )}

              <div className="bg-background/50 border border-outline-variant p-4 rounded-2xl flex items-start gap-3 text-xs">
                <Info size={16} className="text-secondary shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5 text-on-surface-variant">
                  <span className="font-bold text-on-surface">Règle de distribution Hico-Cleaning</span>
                  Chaque parcelle abonnée a droit à un lot de distribution régulier. S'assurer que les stocks communaux sont toujours supérieurs au seuil d'alerte pour ne pas interrompre les tournées d'éboueurs.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="rep_bio">
                    {repType === 'usine' ? "Sachets Biodégradables (+)" : "Sachets Biodégradables à transférer"}
                  </label>
                  <input
                    type="number"
                    id="rep_bio"
                    min="10"
                    step="10"
                    value={repBioQty}
                    onChange={(e) => setRepBioQty(parseInt(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono font-bold"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="rep_nonbio">
                    {repType === 'usine' ? "Sachets Non Dégradables (+)" : "Sachets Non Dégradables à transférer"}
                  </label>
                  <input
                    type="number"
                    id="rep_nonbio"
                    min="10"
                    step="10"
                    value={repNonBioQty}
                    onChange={(e) => setRepNonBioQty(parseInt(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                {repSuccess && (
                  <span className="text-xs text-[#10b981] font-bold self-center flex items-center gap-1 bg-[#10b981]/15 border border-[#10b981]/20 px-3 py-1.5 rounded-xl animate-fade-in">
                    <Check size={14} /> Opération effectuée avec succès !
                  </span>
                )}
                <button
                  type="submit"
                  className="px-6 h-11 bg-secondary text-white font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-2"
                >
                  <Plus size={16} /> 
                  {repType === 'usine' ? "Enregistrer la Réception Usine" : "Valider le Transfert vers la Commune"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ==================== TAB: DOTATIONS ÉBOUEURS ==================== */}
      {activeTab === 'dotations' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-6 animate-fade-in">
          <div>
            <h3 className="text-base font-black text-on-surface flex items-center gap-2">
              <Truck size={20} className="text-secondary" />
              <span>Dotations aux Éboueurs & Suivi des Sachets sur le Terrain</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Transférez les sachets du Stock Communal vers la dotation de l'éboueur (son camion) pour distribution directe aux abonnés.
            </p>
          </div>

          {/* Form Dotation */}
          <form onSubmit={handleDotationSubmit} className="bg-background/40 border border-outline-variant rounded-2xl p-5 flex flex-col gap-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <Plus size={16} />
              <span>Nouvelle Dotation de Sachets à un Agent Éboueur</span>
            </h4>

            {dotError && (
              <div className="bg-error/15 border border-error/20 text-error p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{dotError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Select Commune & Agent */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    1. Commune Réserve (Dépôt)
                  </label>
                  <select
                    value={dotCommuneId}
                    onChange={(e) => setDotCommuneId(e.target.value)}
                    className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-all font-bold"
                    required
                  >
                    {communes.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                {/* Info Stock Communal */}
                {(() => {
                  const commStock = stocks.find(s => s.commune_id === dotCommuneId);
                  return (
                    <div className="bg-secondary/10 border border-secondary/20 p-3 rounded-xl text-xs flex justify-between items-center">
                      <span className="text-on-surface-variant font-medium">Réserve Communale :</span>
                      <div className="flex gap-3 font-mono font-bold">
                        <span className="text-emerald-400">Bio: {commStock?.biodegradable ?? 0} u</span>
                        <span className="text-indigo-400">Non-Bio: {commStock?.non_biodegradable ?? 0} u</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    2. Agent / Éboueur Bénéficiaire
                  </label>
                  <select
                    value={dotAgentId}
                    onChange={(e) => setDotAgentId(e.target.value)}
                    className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-all font-bold"
                    required
                  >
                    <option value="">-- Choisir un éboueur / agent --</option>
                    {agents.filter(a => a.role === 'eboueur' || a.role === 'agent').map(a => (
                      <option key={a.id} value={a.id}>{a.nom} ({a.role === 'eboueur' ? 'Éboueur' : 'Agent'}) — {a.telephone}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column: Quantities & Validation */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Sachets Bio (Vert)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={dotBioQty}
                      onChange={(e) => setDotBioQty(parseInt(e.target.value) || 0)}
                      className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-all font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Sachets Non-Bio (Bleu)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={dotNonBioQty}
                      onChange={(e) => setDotNonBioQty(parseInt(e.target.value) || 0)}
                      className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-all font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Remis Par
                  </label>
                  <input
                    type="text"
                    value={dotAttribuePar}
                    onChange={(e) => setDotAttribuePar(e.target.value)}
                    className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-all font-medium"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  {dotSuccess && (
                    <span className="text-xs text-[#10b981] font-bold self-center flex items-center gap-1 bg-[#10b981]/15 border border-[#10b981]/20 px-3 py-1.5 rounded-xl">
                      <Check size={14} /> Dotation remise à l'éboueur avec succès !
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-6 h-11 bg-secondary text-white font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <Truck size={16} /> Confirmer la Dotation Agent
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Table: Etat des stocks en possession des éboueurs */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-2">
              <Users size={16} className="text-secondary" />
              <span>Stock de Sachets en Possession des Éboueurs sur le Terrain</span>
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-outline-variant text-[10px] font-bold uppercase tracking-widest text-on-surface-variant select-none">
                    <th className="py-3.5 px-4 font-black">Éboueur / Agent</th>
                    <th className="py-3.5 px-4 font-black">Commune Assignée</th>
                    <th className="py-3.5 px-4 font-black text-center">Stock Bio en Camion</th>
                    <th className="py-3.5 px-4 font-black text-center">Stock Non-Bio en Camion</th>
                    <th className="py-3.5 px-4 font-black text-center">Distribués aux Abonnés</th>
                    <th className="py-3.5 px-4 font-black">Statut Dotation</th>
                    <th className="py-3.5 px-4 font-black text-right">Dernière Dotation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 text-xs font-medium">
                  {agents.filter(a => a.role === 'eboueur' || a.role === 'agent').map((agent) => {
                    const dot = agentDotations.find(d => d.agent_id === agent.id);
                    const commune = communes.find(c => c.id === dot?.commune_id);

                    // Calculate total distributed by this agent to subscribers
                    const totalDistByAgent = distributions.filter(d => 
                      d.eboueur_id === agent.id || d.distribue_par.toLowerCase().includes(agent.nom.toLowerCase())
                    ).reduce((acc, d) => acc + d.quantite_biodegradable + d.quantite_non_biodegradable, 0);

                    const bioLeft = dot?.biodegradable ?? 0;
                    const nonBioLeft = dot?.non_biodegradable ?? 0;
                    const totalLeft = bioLeft + nonBioLeft;

                    return (
                      <tr key={agent.id} className="hover:bg-background/40 transition-colors">
                        <td className="py-4 px-4 font-extrabold text-on-surface">
                          <div className="flex flex-col">
                            <span>{agent.nom}</span>
                            <span className="text-[10px] font-mono text-on-surface-variant">{agent.telephone}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-semibold text-on-surface">
                          {commune?.nom || 'Non assigné'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`font-bold font-mono px-2.5 py-1 rounded-lg ${
                            bioLeft <= 5 
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                          }`}>
                            {bioLeft} u
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`font-bold font-mono px-2.5 py-1 rounded-lg ${
                            nonBioLeft <= 5 
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' 
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                          }`}>
                            {nonBioLeft} u
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold font-mono text-secondary">
                          {totalDistByAgent} u
                        </td>
                        <td className="py-4 px-4">
                          {totalLeft === 0 ? (
                            <span className="flex items-center gap-1 text-rose-400 font-extrabold text-[10px] uppercase tracking-wider bg-rose-500/15 border border-rose-500/20 px-2 py-0.5 rounded w-max">
                              🚨 Rupture Dotation
                            </span>
                          ) : totalLeft <= 10 ? (
                            <span className="flex items-center gap-1 text-amber-500 font-extrabold text-[10px] uppercase tracking-wider bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded w-max">
                              ⚠️ Stock Bas
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[#10b981] font-extrabold text-[10px] uppercase tracking-wider bg-[#10b981]/15 border border-[#10b981]/20 px-2 py-0.5 rounded w-max">
                              <Check size={11} /> Opérationnel
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-on-surface-variant">
                          {dot?.last_assigned 
                            ? new Date(dot.last_assigned).toLocaleDateString('fr-FR')
                            : 'Aucune'
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: DISTRIBUTE FORM ==================== */}
      {activeTab === 'distribute' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-5 animate-fade-in">
          <div>
            <h3 className="text-base font-black text-on-surface">Attribuer des Sachets Poubelles à un Abonné</h3>
            <p className="text-xs text-on-surface-variant">Enregistrez la remise physique des sachets poubelles biodegradables/non-dégradables au propriétaire ou aux locataires d'une parcelle.</p>
          </div>

          <form onSubmit={handleDistributionSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2" id="distribution_form">
            <div className="flex flex-col gap-4">
              {/* Filter selectors: Commune -> Avenue -> Parcelle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Commune
                  </label>
                  <select
                    value={distCommuneId}
                    onChange={(e) => setDistCommuneId(e.target.value)}
                    className="w-full h-10 px-2 bg-background border border-outline-variant rounded-xl text-on-surface text-xs focus:outline-none focus:border-primary transition-all font-bold"
                    required
                  >
                    {communes.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Avenue
                  </label>
                  <select
                    value={distAvenueId}
                    onChange={(e) => setDistAvenueId(e.target.value)}
                    className="w-full h-10 px-2 bg-background border border-outline-variant rounded-xl text-on-surface text-xs focus:outline-none focus:border-primary transition-all font-bold"
                    required
                    disabled={filteredAvenues.length === 0}
                  >
                    {filteredAvenues.map(a => (
                      <option key={a.id} value={a.id}>{a.nom}</option>
                    ))}
                    {filteredAvenues.length === 0 && (
                      <option value="">Aucune avenue</option>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    N° Parcelle
                  </label>
                  <select
                    value={distParcelleId}
                    onChange={(e) => setDistParcelleId(e.target.value)}
                    className="w-full h-10 px-2 bg-background border border-outline-variant rounded-xl text-on-surface text-xs focus:outline-none focus:border-primary transition-all font-bold"
                    required
                    disabled={filteredParcelles.length === 0}
                  >
                    {filteredParcelles.map(p => (
                      <option key={p.id} value={p.id}>N° {p.numero_parcelle} ({p.nombre_menages} ménages)</option>
                    ))}
                    {filteredParcelles.length === 0 && (
                      <option value="">Aucune parcelle</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="dist_bio">
                    Qte Biodégradable (Vert)
                  </label>
                  <input
                    type="number"
                    id="dist_bio"
                    min="0"
                    max="10"
                    value={distBioQty}
                    onChange={(e) => setDistBioQty(parseInt(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono font-bold"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="dist_nonbio">
                    Qte Non-Dégradable (Bleu)
                  </label>
                  <input
                    type="number"
                    id="dist_nonbio"
                    min="0"
                    max="10"
                    value={distNonBioQty}
                    onChange={(e) => setDistNonBioQty(parseInt(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="dist_by">
                  Distribué par (Agent ou Éboueur)
                </label>
                <select
                  id="dist_by"
                  value={distribuePar}
                  onChange={(e) => setDistribuePar(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold"
                  required
                >
                  <option value="">-- Sélectionnez un agent --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.nom}>{a.nom} ({a.role === 'eboueur' ? 'Éboueur' : 'Agent'})</option>
                  ))}
                  <option value="Direction Hico">Direction Hico-Cleaning</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="dist_notes">
                  Notes / Observations (Optionnel)
                </label>
                <input
                  type="text"
                  id="dist_notes"
                  value={distNotes}
                  onChange={(e) => setDistNotes(e.target.value)}
                  placeholder="Ex: Lot initial pour la parcelle, remis au gardien"
                  className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                />
              </div>

              <div className="flex flex-col gap-3 mt-2">
                {distError && (
                  <p className="text-xs text-error font-bold bg-error-container/15 border border-error/20 p-3 rounded-xl">
                    ❌ {distError}
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  {distSuccess && (
                    <span className="text-xs text-[#10b981] font-bold self-center flex items-center gap-1 bg-[#10b981]/15 border border-[#10b981]/20 px-3 py-1.5 rounded-xl">
                      <Check size={14} /> Distribution validée !
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-6 h-11 bg-secondary text-white font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <ArrowDownLeft size={16} /> Confirmer la Distribution
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ==================== TAB 4: HISTORY ==================== */}
      {activeTab === 'history' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col gap-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-on-surface">Historique Logistique</h3>
              <p className="text-xs text-on-surface-variant">Trace de toutes les entrées et sorties de sachets poubelles.</p>
            </div>

            {/* Sub-tabs toggle */}
            <div className="flex bg-background p-1 rounded-xl border border-outline-variant/60">
              <button
                onClick={() => setHistorySubTab('distributions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historySubTab === 'distributions'
                    ? 'bg-secondary text-white shadow'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Distributions Abonnés
              </button>
              <button
                onClick={() => setHistorySubTab('dotations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historySubTab === 'dotations'
                    ? 'bg-secondary text-white shadow'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Dotations Éboueurs
              </button>
              <button
                onClick={() => setHistorySubTab('replenishments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historySubTab === 'replenishments'
                    ? 'bg-secondary text-white shadow'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Réapprovisionnements Stock
              </button>
            </div>
          </div>

          {/* Subtab Content: Distributions list */}
          {historySubTab === 'distributions' ? (
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-outline-variant text-[10px] font-bold uppercase tracking-widest text-on-surface-variant select-none">
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">Commune / Avenue / Parcelle</th>
                    <th className="py-3 px-4 text-center">Dégradable (Vert)</th>
                    <th className="py-3 px-4 text-center">Non Dégradable (Bleu)</th>
                    <th className="py-3 px-4">Distribué Par</th>
                    <th className="py-3 px-4">Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 text-xs font-medium text-on-surface-variant">
                  {distributions.map((dist) => {
                    const commune = communes.find(c => c.id === dist.commune_id);
                    const avenue = avenues.find(a => a.id === dist.avenue_id);
                    const parcelle = parcelles.find(p => p.id === dist.parcelle_id);

                    return (
                      <tr key={dist.id} className="hover:bg-background/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          {new Date(dist.date_distribution).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-on-surface">
                          <div className="flex flex-col gap-0.5">
                            <span>{commune?.nom} — Av. {avenue?.nom}</span>
                            <span className="text-[10px] font-bold text-secondary">Parcelle N° {parcelle?.numero_parcelle} ({parcelle?.nombre_menages} ménages)</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold font-mono text-emerald-400">
                          {dist.quantite_biodegradable} bags
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold font-mono text-indigo-400">
                          {dist.quantite_non_biodegradable} bags
                        </td>
                        <td className="py-3.5 px-4 text-on-surface font-semibold">
                          <span className="flex items-center gap-1">
                            <User size={13} className="text-on-surface-variant" />
                            {dist.distribue_par}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 italic max-w-xs truncate">
                          {dist.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {distributions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center italic">
                        Aucune distribution de sachets poubelles enregistrée pour l'instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : historySubTab === 'dotations' ? (
            /* Subtab Content: Agent Dotations history */
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-outline-variant text-[10px] font-bold uppercase tracking-widest text-on-surface-variant select-none">
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">Agent Éboueur</th>
                    <th className="py-3 px-4">Commune Source</th>
                    <th className="py-3 px-4 text-center">Bio Remis</th>
                    <th className="py-3 px-4 text-center">Non-Bio Remis</th>
                    <th className="py-3 px-4">Attribué Par</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 text-xs font-medium text-on-surface-variant">
                  {agentDotationLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-background/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        {new Date(log.date).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-on-surface">
                        {log.agent_nom}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-secondary">
                        {log.commune_nom}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-emerald-400">
                        +{log.biodegradable} u
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-indigo-400">
                        +{log.non_biodegradable} u
                      </td>
                      <td className="py-3.5 px-4 text-on-surface font-medium">
                        {log.attribue_par}
                      </td>
                    </tr>
                  ))}

                  {agentDotationLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center italic">
                        Aucune dotation d'éboueur enregistrée pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Subtab Content: Replenishments list */
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-outline-variant text-[10px] font-bold uppercase tracking-widest text-on-surface-variant select-none">
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">Commune</th>
                    <th className="py-3 px-4 text-center">Dégradable Ajoutés</th>
                    <th className="py-3 px-4 text-center">Non-Dégradable Ajoutés</th>
                    <th className="py-3 px-4">Type Opération</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 text-xs font-medium text-on-surface-variant">
                  {replenishLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-background/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        {new Date(log.date).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-on-surface">
                        {log.commune_nom}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-emerald-400">
                        +{log.biodegradable}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-indigo-400">
                        +{log.non_biodegradable}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] uppercase font-bold tracking-widest border px-2 py-0.5 rounded ${
                          log.type_operation === 'RÉCEPTION USINE' 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' 
                            : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {log.type_operation || 'RECHARGE STOCK'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {replenishLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center italic">
                        Aucun réapprovisionnement de stock enregistré pour l'instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
