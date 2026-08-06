import React, { useState, useMemo } from 'react';
import { 
  Commune, 
  Avenue, 
  Parcelle, 
  Abonne, 
  Agent, 
  Eboueur, 
  PoubelleSignal, 
  SubscriptionPayment, 
  DisputeSignal, 
  IncivismeIncident, 
  ConvocationCommunale 
} from '../types';
import { 
  Building2, 
  Landmark, 
  Users, 
  ShieldAlert, 
  AlertTriangle, 
  FileText, 
  Search, 
  Filter, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  Clock, 
  Shield, 
  ShieldCheck,
  FileCheck, 
  DollarSign, 
  Home, 
  UserX, 
  ExternalLink,
  ChevronRight,
  Eye,
  Send,
  Gavel,
  BadgeAlert,
  UserCheck,
  Building,
  Radio,
  FileSpreadsheet
} from 'lucide-react';

interface GestionCommunaleViewProps {
  communes: Commune[];
  avenues: Avenue[];
  parcelles: Parcelle[];
  abonnes: Abonne[];
  agents: Agent[];
  eboueurs: Eboueur[];
  poubelleSignals: PoubelleSignal[];
  payments: SubscriptionPayment[];
  disputes: DisputeSignal[];
  incidents: IncivismeIncident[];
  convocations: ConvocationCommunale[];
  onAddIncident?: (incident: Omit<IncivismeIncident, 'id' | 'date_incident' | 'statut'>) => void;
  onUpdateIncidentStatus?: (incidentId: string, statut: IncivismeIncident['statut'], decision?: string) => void;
  onIssueConvocation?: (convocation: Omit<ConvocationCommunale, 'id' | 'date_emission' | 'statut'>) => void;
  onUpdateConvocationStatus?: (convocationId: string, statut: ConvocationCommunale['statut'], observations?: string) => void;
  currentUser?: Agent | null;
  onCallPhone?: (target: { name: string; phone: string; roleDescription?: string }) => void;
}

export default function GestionCommunaleView({
  communes,
  avenues,
  parcelles,
  abonnes,
  agents,
  eboueurs,
  poubelleSignals,
  payments,
  disputes,
  incidents,
  convocations,
  onAddIncident,
  onUpdateIncidentStatus,
  onIssueConvocation,
  onUpdateConvocationStatus,
  currentUser,
  onCallPhone
}: GestionCommunaleViewProps) {
  // Selected Commune (Default to first or user's assigned commune)
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>(() => {
    if (currentUser?.commune_id && communes.some(c => c.id === currentUser.commune_id)) {
      return currentUser.commune_id;
    }
    return communes[0]?.id || 'c-gombe';
  });

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<
    'registre_bailleurs' | 'refus_paiement' | 'incivismes_menaces' | 'convocations_actes' | 'statistiques_salubrite'
  >('registre_bailleurs');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAvenueId, setSelectedAvenueId] = useState<string>('all');
  const [filterHousingType, setFilterHousingType] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'all' | 'a_jour' | 'en_retard' | 'refus'>('all');

  // Modals state
  const [selectedBailleurDetail, setSelectedBailleurDetail] = useState<{
    abonne: Abonne;
    parcelle: Parcelle;
    avenue: Avenue;
    commune: Commune;
  } | null>(null);

  const [isAddIncidentModalOpen, setIsAddIncidentModalOpen] = useState(false);
  const [isConvocationModalOpen, setIsConvocationModalOpen] = useState(false);
  const [targetBailleurForConvocation, setTargetBailleurForConvocation] = useState<{
    parcelle_id: string;
    numero_parcelle: string;
    avenue_nom: string;
    bailleur_nom: string;
    bailleur_telephone: string;
    incident_id?: string;
    defaultMotif?: string;
  } | null>(null);

  const [previewConvocation, setPreviewConvocation] = useState<ConvocationCommunale | null>(null);

  // New Incident Form State
  const [newIncidentData, setNewIncidentData] = useState({
    parcelle_id: '',
    type_infraction: 'menace_agent' as IncivismeIncident['type_infraction'],
    gravite: 'haute' as IncivismeIncident['gravite'],
    agent_victime_nom: '',
    agent_victime_role: 'Éboueur assainisseur',
    description: ''
  });

  // New Convocation Form State
  const [newConvocationData, setNewConvocationData] = useState({
    motif: '',
    date_comparution: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    heure_comparution: '10:00',
    lieu_comparution: 'Bureau du Bourgmestre - Département Hygiène & Salubrité Publique',
    officier_traitant: currentUser?.nom || 'Officier de Salubrité Publique',
    observations: ''
  });

  // Active Commune Object
  const currentCommune = useMemo(() => {
    return communes.find(c => c.id === selectedCommuneId) || communes[0] || { id: 'c-gombe', nom: 'Gombe', created_at: '' };
  }, [communes, selectedCommuneId]);

  // Filtered Avenues for Current Commune
  const communeAvenues = useMemo(() => {
    return avenues.filter(a => a.commune_id === currentCommune.id);
  }, [avenues, currentCommune.id]);

  const communeAvenueIds = useMemo(() => new Set(communeAvenues.map(a => a.id)), [communeAvenues]);

  // Filtered Parcelles for Current Commune
  const communeParcelles = useMemo(() => {
    return parcelles.filter(p => communeAvenueIds.has(p.avenue_id));
  }, [parcelles, communeAvenueIds]);

  const communeParcelleMap = useMemo(() => {
    const map = new Map<string, Parcelle>();
    communeParcelles.forEach(p => map.set(p.id, p));
    return map;
  }, [communeParcelles]);

  // Filtered Bailleurs / Abonnes for Current Commune
  const communeAbonnes = useMemo(() => {
    return abonnes.filter(ab => communeParcelleMap.has(ab.parcelle_id));
  }, [abonnes, communeParcelleMap]);

  // Dispute / Refusal map
  const disputeParcelleMap = useMemo(() => {
    const map = new Map<string, DisputeSignal>();
    disputes.filter(d => d.status === 'active').forEach(d => map.set(d.parcelle_id, d));
    return map;
  }, [disputes]);

  // Payment status calculation per parcel
  const parcelPaymentStatusMap = useMemo(() => {
    const map = new Map<string, 'a_jour' | 'en_retard' | 'refus'>();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    communeParcelles.forEach(p => {
      if (disputeParcelleMap.has(p.id)) {
        map.set(p.id, 'refus');
        return;
      }
      const parcelPayments = payments.filter(pay => pay.parcelle_id === p.id);
      const hasPaidThisMonth = parcelPayments.some(pay => {
        const d = new Date(pay.date_paiement);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      if (hasPaidThisMonth || parcelPayments.length > 0) {
        map.set(p.id, 'a_jour');
      } else {
        map.set(p.id, 'en_retard');
      }
    });

    return map;
  }, [communeParcelles, disputeParcelleMap, payments]);

  // Incidents for current commune
  const communeIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (inc.commune_id === currentCommune.id) return true;
      // Fallback matching by parcelle
      return communeParcelleMap.has(inc.parcelle_id);
    });
  }, [incidents, currentCommune.id, communeParcelleMap]);

  // Convocations for current commune
  const communeConvocations = useMemo(() => {
    return convocations.filter(con => {
      if (con.commune_id === currentCommune.id) return true;
      return communeParcelleMap.has(con.parcelle_id);
    });
  }, [convocations, currentCommune.id, communeParcelleMap]);

  // Enriched Bailleurs List
  const enrichedBailleurs = useMemo(() => {
    return communeAbonnes.map(ab => {
      const parcelle = communeParcelleMap.get(ab.parcelle_id) || parcelles.find(p => p.id === ab.parcelle_id);
      const avenue = parcelle ? avenues.find(a => a.id === parcelle.avenue_id) : undefined;
      const paymentStatus = parcelle ? (parcelPaymentStatusMap.get(parcelle.id) || 'en_retard') : 'en_retard';
      const dispute = parcelle ? disputeParcelleMap.get(parcelle.id) : undefined;
      const parcelIncidents = parcelle ? communeIncidents.filter(inc => inc.parcelle_id === parcelle.id) : [];
      const parcelConvocations = parcelle ? communeConvocations.filter(con => con.parcelle_id === parcelle.id) : [];
      const parcelSignals = parcelle ? poubelleSignals.filter(s => s.parcelle_id === parcelle.id) : [];

      return {
        abonne: ab,
        parcelle: parcelle || {
          id: ab.parcelle_id,
          avenue_id: '',
          numero_parcelle: 'N/A',
          type_logement: 'maison_basse' as const,
          presence_locataire: 'non' as const,
          nombre_menages: 1,
          created_by: '',
          created_at: '',
          updated_at: ''
        },
        avenue: avenue || { id: '', commune_id: currentCommune.id, nom: 'Avenue non répertoriée', created_at: '' },
        commune: currentCommune,
        paymentStatus,
        dispute,
        incidents: parcelIncidents,
        convocations: parcelConvocations,
        signals: parcelSignals
      };
    });
  }, [communeAbonnes, communeParcelleMap, parcelles, avenues, currentCommune, parcelPaymentStatusMap, disputeParcelleMap, communeIncidents, communeConvocations, poubelleSignals]);

  // Filtered Bailleurs for Search & Selectors
  const filteredBailleurs = useMemo(() => {
    return enrichedBailleurs.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.abonne.nom_complet.toLowerCase().includes(q);
        const matchPhone = (item.abonne.telephone_principal || '').includes(q);
        const matchParcel = (item.parcelle.numero_parcelle || '').toLowerCase().includes(q);
        const matchAvenue = (item.avenue.nom || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchParcel && !matchAvenue) return false;
      }

      // Avenue filter
      if (selectedAvenueId !== 'all' && item.avenue.id !== selectedAvenueId) {
        return false;
      }

      // Housing type filter
      if (filterHousingType !== 'all' && item.parcelle.type_logement !== filterHousingType) {
        return false;
      }

      // Payment filter
      if (filterPaymentStatus !== 'all' && item.paymentStatus !== filterPaymentStatus) {
        return false;
      }

      return true;
    });
  }, [enrichedBailleurs, searchQuery, selectedAvenueId, filterHousingType, filterPaymentStatus]);

  // Statistics calculation for the Bourgmestre overview
  const totalBailleurs = enrichedBailleurs.length;
  const totalMenages = enrichedBailleurs.reduce((acc, curr) => acc + (curr.parcelle.nombre_menages || 1), 0);
  const totalAJour = enrichedBailleurs.filter(b => b.paymentStatus === 'a_jour').length;
  const totalEnRetard = enrichedBailleurs.filter(b => b.paymentStatus === 'en_retard').length;
  const totalRefusPaiement = enrichedBailleurs.filter(b => b.paymentStatus === 'refus' || b.dispute).length;
  const totalIncidents = communeIncidents.length;
  const totalConvocations = communeConvocations.length;
  const tauxCouverture = totalBailleurs > 0 ? Math.round((totalAJour / totalBailleurs) * 100) : 0;

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = ["ID Abonné", "Nom Bailleur", "Téléphone", "Numéro Parcelle", "Avenue", "Commune", "Type Logement", "Ménages", "Statut Paiement", "Incivisme Signalé"];
    const rows = filteredBailleurs.map(b => [
      b.abonne.id,
      `"${b.abonne.nom_complet.replace(/"/g, '""')}"`,
      `"${b.abonne.telephone_principal}"`,
      `"${b.parcelle.numero_parcelle}"`,
      `"${b.avenue.nom}"`,
      `"${b.commune.nom}"`,
      b.parcelle.type_logement,
      b.parcelle.nombre_menages,
      b.paymentStatus,
      b.incidents.length > 0 ? `OUI (${b.incidents.length})` : 'NON'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `registre_communal_${currentCommune.nom.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* 🏛️ TOP BANNER: BOURGMESTRE & GESTION COMMUNALE */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
              <Landmark size={32} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Autorité Municipale
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  Hôtel de Ville • Salubrité Publique
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>Gestion Communale & Registre Bourgmestre</span>
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Supervision directe des abonnés bailleurs, contrôle des redevances d'assainissement, gestion des incivismes et protection des agents éboueurs de la Commune.
              </p>
            </div>
          </div>

          {/* Commune Selector for Multi-Commune View */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex flex-col gap-1 bg-surface/80 border border-outline-variant/60 p-2 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant px-2 flex items-center gap-1">
                <Building size={12} className="text-secondary" />
                <span>Commune sous juridiction :</span>
              </span>
              <select
                value={selectedCommuneId}
                onChange={(e) => setSelectedCommuneId(e.target.value)}
                className="bg-background text-on-surface font-extrabold text-xs px-3 py-1.5 rounded-xl border border-outline-variant focus:outline-none focus:border-secondary cursor-pointer"
              >
                {communes.map((com) => (
                  <option key={com.id} value={com.id}>
                    Commune de {com.nom}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-secondary/15 hover:bg-secondary/25 border border-secondary/40 text-secondary rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Exporter le registre de salubrité de la commune en format CSV / Excel"
            >
              <Download size={15} />
              <span>Exporter Registre</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📊 SUMMARY METRICS / STATISTIQUES COMMUNALES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Bailleurs */}
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bailleurs Recensés</span>
            <Users size={16} className="text-primary" />
          </div>
          <span className="text-2xl font-black text-on-surface font-mono">{totalBailleurs}</span>
          <span className="text-[10px] text-on-surface-variant">{communeAvenues.length} avenues actives</span>
        </div>

        {/* 2. Total Ménages */}
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ménages Desservis</span>
            <Home size={16} className="text-indigo-400" />
          </div>
          <span className="text-2xl font-black text-indigo-400 font-mono">{totalMenages}</span>
          <span className="text-[10px] text-on-surface-variant">~{totalMenages * 6} habitants</span>
        </div>

        {/* 3. À jour (Paiements) */}
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Règle (Payé)</span>
            <CheckCircle2 size={16} />
          </div>
          <span className="text-2xl font-black text-emerald-400 font-mono">{totalAJour}</span>
          <span className="text-[10px] text-emerald-500/80 font-bold">{tauxCouverture}% de conformité</span>
        </div>

        {/* 4. Refus de Paiement */}
        <div className={`p-4 rounded-2xl border flex flex-col gap-1.5 shadow-sm ${
          totalRefusPaiement > 0 ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'bg-surface border-outline-variant'
        }`}>
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Refus de Paiement</span>
            <UserX size={16} />
          </div>
          <span className="text-2xl font-black text-rose-400 font-mono">{totalRefusPaiement}</span>
          <span className="text-[10px] text-rose-300/80">Récalcitrants ciblés</span>
        </div>

        {/* 5. Menaces & Incivismes */}
        <div className={`p-4 rounded-2xl border flex flex-col gap-1.5 shadow-sm ${
          totalIncidents > 0 ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-surface border-outline-variant'
        }`}>
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Menaces Agents</span>
            <ShieldAlert size={16} />
          </div>
          <span className="text-2xl font-black text-amber-400 font-mono">{totalIncidents}</span>
          <span className="text-[10px] text-amber-300/80">Incidents signalés</span>
        </div>

        {/* 6. Convocations Émises */}
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-[11px] font-bold uppercase tracking-wider">Convocations</span>
            <Gavel size={16} />
          </div>
          <span className="text-2xl font-black text-secondary font-mono">{totalConvocations}</span>
          <span className="text-[10px] text-on-surface-variant">Actes communaux</span>
        </div>
      </div>

      {/* 🧭 NAVIGATION TABS (5 MODULES) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-outline-variant/60">
        <button
          type="button"
          onClick={() => setActiveTab('registre_bailleurs')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'registre_bailleurs'
              ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:bg-surface hover:text-on-surface'
          }`}
        >
          <Building2 size={16} />
          <span>Registre Général des Bailleurs ({enrichedBailleurs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('refus_paiement')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'refus_paiement'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-on-surface-variant hover:bg-surface hover:text-on-surface'
          }`}
        >
          <UserX size={16} />
          <span>Refus de Paiement & Impayés ({totalRefusPaiement + totalEnRetard})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incivismes_menaces')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'incivismes_menaces'
              ? 'bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-600/20'
              : 'text-on-surface-variant hover:bg-surface hover:text-on-surface'
          }`}
        >
          <ShieldAlert size={16} />
          <span>Menaces & Incivismes envers les Agents ({totalIncidents})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('convocations_actes')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'convocations_actes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-on-surface-variant hover:bg-surface hover:text-on-surface'
          }`}
        >
          <Gavel size={16} />
          <span>Convocations & PV Communaux ({totalConvocations})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('statistiques_salubrite')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'statistiques_salubrite'
              ? 'bg-secondary text-on-secondary shadow-md'
              : 'text-on-surface-variant hover:bg-surface hover:text-on-surface'
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>Statistiques & Rapport Bourgmestre</span>
        </button>
      </div>

      {/* 🔍 FILTER BAR FOR REGISTER & REFUSAL LISTS */}
      {(activeTab === 'registre_bailleurs' || activeTab === 'refus_paiement') && (
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher bailleur, téléphone, N° parcelle, avenue..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-secondary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            )}
          </div>

          {/* Avenue Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedAvenueId}
              onChange={(e) => setSelectedAvenueId(e.target.value)}
              className="px-3 py-2 bg-background border border-outline-variant rounded-xl text-xs text-on-surface font-medium focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="all">Toutes les avenues ({communeAvenues.length})</option>
              {communeAvenues.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>

            {/* Housing Type */}
            <select
              value={filterHousingType}
              onChange={(e) => setFilterHousingType(e.target.value)}
              className="px-3 py-2 bg-background border border-outline-variant rounded-xl text-xs text-on-surface font-medium focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="all">Tous types logements</option>
              <option value="maison_basse">Maison Basse</option>
              <option value="appartement">Immeuble / Appartement</option>
            </select>

            {/* Payment Filter */}
            {activeTab === 'registre_bailleurs' && (
              <select
                value={filterPaymentStatus}
                onChange={(e) => setFilterPaymentStatus(e.target.value as any)}
                className="px-3 py-2 bg-background border border-outline-variant rounded-xl text-xs text-on-surface font-medium focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value="all">Tous les statuts de paiement</option>
                <option value="a_jour">✅ En règle (Payé)</option>
                <option value="en_retard">⏳ En retard</option>
                <option value="refus">🚨 Refus de paiement</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* 📋 TAB 1: REGISTRE GÉNÉRAL DES BAILLEURS */}
      {activeTab === 'registre_bailleurs' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-on-surface-variant">
              Affichage de <strong className="text-on-surface font-mono">{filteredBailleurs.length}</strong> bailleurs recensés dans la Commune de {currentCommune.nom}
            </span>
          </div>

          {filteredBailleurs.length === 0 ? (
            <div className="p-12 rounded-3xl bg-surface border border-outline-variant text-center flex flex-col items-center gap-3">
              <Users size={36} className="text-on-surface-variant/40" />
              <span className="text-sm font-extrabold text-on-surface">Aucun bailleur ne correspond à ces critères</span>
              <p className="text-xs text-on-surface-variant max-w-sm">
                Modifiez vos filtres de recherche ou sélectionnez une autre avenue de la commune.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBailleurs.map((item) => {
                const isRefus = item.paymentStatus === 'refus' || item.dispute;
                const isLate = item.paymentStatus === 'en_retard';
                const hasIncidents = item.incidents.length > 0;

                return (
                  <div
                    key={item.abonne.id}
                    className={`p-4 rounded-2xl bg-surface border transition-all flex flex-col justify-between gap-3.5 shadow-sm hover:shadow-md ${
                      hasIncidents
                        ? 'border-amber-500/50 bg-amber-500/5'
                        : isRefus
                        ? 'border-rose-500/40 bg-rose-500/5'
                        : 'border-outline-variant hover:border-outline'
                    }`}
                  >
                    {/* Header: Bailleur & Parcel */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-on-surface flex items-center gap-1.5">
                            {item.abonne.nom_complet}
                          </span>
                          <span className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1">
                            <MapPin size={12} className="text-secondary shrink-0" />
                            <span>Parcelle N° {item.parcelle.numero_parcelle}, {item.avenue.nom}</span>
                          </span>
                        </div>

                        {/* Status badge */}
                        {isRefus ? (
                          <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0">
                            🚨 Refus Paiement
                          </span>
                        ) : isLate ? (
                          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0">
                            ⏳ En Retard
                          </span>
                        ) : (
                          <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0">
                            ✅ En Règle
                          </span>
                        )}
                      </div>

                      {/* Details specs */}
                      <div className="grid grid-cols-2 gap-2 bg-background/60 p-2.5 rounded-xl border border-outline-variant/40 text-[11px]">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-on-surface-variant">Logement :</span>
                          <span className="font-bold text-on-surface capitalize">
                            {item.parcelle.type_logement === 'appartement' ? 'Appartement' : 'Maison Basse'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-on-surface-variant">Ménages :</span>
                          <span className="font-bold text-on-surface font-mono">
                            {item.parcelle.nombre_menages || 1} ménage(s)
                          </span>
                        </div>
                        <div className="flex flex-col col-span-2">
                          <span className="text-[10px] text-on-surface-variant">Téléphone principal :</span>
                          <span className="font-bold text-secondary font-mono">
                            {item.abonne.telephone_principal}
                          </span>
                        </div>
                      </div>

                      {/* Threat or incident alert banner on card */}
                      {hasIncidents && (
                        <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[10.5px] text-amber-300 flex items-center gap-1.5">
                          <ShieldAlert size={14} className="shrink-0 text-amber-400" />
                          <span className="font-bold">
                            ⚠️ {item.incidents.length} incident(s) de menace / incivisme enregistré(s)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/40">
                      <div className="flex items-center gap-1">
                        {onCallPhone && item.abonne.telephone_principal && (
                          <button
                            type="button"
                            onClick={() => onCallPhone({
                              name: item.abonne.nom_complet,
                              phone: item.abonne.telephone_principal,
                              roleDescription: `Bailleur - Parcelle ${item.parcelle.numero_parcelle}, ${item.avenue.nom}`
                            })}
                            className="p-1.5 bg-surface hover:bg-surface-variant text-on-surface border border-outline-variant rounded-xl text-xs transition-all cursor-pointer"
                            title="Appeler le bailleur"
                          >
                            <Phone size={14} className="text-secondary" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setTargetBailleurForConvocation({
                              parcelle_id: item.parcelle.id,
                              numero_parcelle: item.parcelle.numero_parcelle,
                              avenue_nom: item.avenue.nom,
                              bailleur_nom: item.abonne.nom_complet,
                              bailleur_telephone: item.abonne.telephone_principal,
                              defaultMotif: isRefus ? 'Refus persistant de payer la redevance communale de salubrité' : 'Contrôle de conformité de salubrité'
                            });
                            setIsConvocationModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Émettre une convocation officielle de la Maison Communale"
                        >
                          <Gavel size={12} />
                          <span>Convoquer</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedBailleurDetail(item)}
                        className="px-3 py-1.5 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>Fiche Complète</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 🚨 TAB 2: REFUS DE PAIEMENT & IMPAYÉS */}
      {activeTab === 'refus_paiement' && (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <UserX size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm text-rose-300">
                  Registre des Bailleurs Réfractaires & Redevances Impayées
                </span>
                <span className="text-xs text-rose-300/80">
                  Conformément à l'Arrêté Urbain sur la Salubrité, ces parcelles s'exposent à des sommations et amendes communales.
                </span>
              </div>
            </div>

            <div className="bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/40 text-xs font-black text-rose-200">
              {totalRefusPaiement} Refus Actif(s) • {totalEnRetard} En Retard
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {enrichedBailleurs.filter(b => b.paymentStatus === 'refus' || b.paymentStatus === 'en_retard' || b.dispute).map((item) => (
              <div
                key={item.abonne.id}
                className="p-4 rounded-2xl bg-surface border border-rose-500/30 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <UserX size={20} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-on-surface">{item.abonne.nom_complet}</span>
                      <span className="text-xs bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-md font-mono">
                        Parcelle N° {item.parcelle.numero_parcelle} • {item.avenue.nom}
                      </span>
                      {item.dispute ? (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-md text-[10px] font-black">
                          Litige / Refus Formel : {item.dispute.montant_du.toLocaleString()} FC
                        </span>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          Redevance mensuelle non acquittée
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-on-surface-variant flex items-center gap-4 flex-wrap">
                      <span>Téléphone : <strong className="text-on-surface font-mono">{item.abonne.telephone_principal}</strong></span>
                      <span>Ménages : <strong className="text-on-surface">{item.parcelle.nombre_menages}</strong></span>
                      {item.dispute?.last_reminder_date && (
                        <span className="text-amber-400">
                          Dernier rappel : {new Date(item.dispute.last_reminder_date).toLocaleDateString('fr-FR')} ({item.dispute.reminders_sent} envois)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Municipal Enforcement Actions */}
                <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetBailleurForConvocation({
                        parcelle_id: item.parcelle.id,
                        numero_parcelle: item.parcelle.numero_parcelle,
                        avenue_nom: item.avenue.nom,
                        bailleur_nom: item.abonne.nom_complet,
                        bailleur_telephone: item.abonne.telephone_principal,
                        defaultMotif: `SOMMATION DE PAYER : Refus de paiement de la taxe communale d'évacuation des déchets (${item.dispute?.montant_du || 15000} FC)`
                      });
                      setIsConvocationModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Gavel size={14} />
                    <span>Mise en Demeure / Convocation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBailleurDetail(item)}
                    className="px-3 py-2 bg-surface hover:bg-surface-variant border border-outline-variant text-on-surface rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Eye size={14} />
                    <span>Détails</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚠️ TAB 3: MENACES, OUTRAGES & INCIVISMES ENVERS LES AGENTS */}
      {activeTab === 'incivismes_menaces' && (
        <div className="flex flex-col gap-4">
          <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldAlert size={24} />
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-black text-sm text-amber-300 uppercase tracking-wide">
                  Protection des Agents Éboueurs & Recenseurs (Police Municipale)
                </h3>
                <p className="text-xs text-amber-200/80 leading-relaxed max-w-2xl">
                  Enregistrement et traitement des cas d'agression, menaces verbales, intimidation ou obstruction des équipes Hico-Cleaning sur le terrain communal.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddIncidentModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 shrink-0"
            >
              <Plus size={16} />
              <span>Signaler une Menace / Incident</span>
            </button>
          </div>

          {/* Incidents List */}
          {communeIncidents.length === 0 ? (
            <div className="p-12 rounded-3xl bg-surface border border-outline-variant text-center flex flex-col items-center gap-3">
              <ShieldCheck size={36} className="text-emerald-400" />
              <span className="text-sm font-extrabold text-on-surface">Aucun incident ou menace signalé dans cette commune</span>
              <p className="text-xs text-on-surface-variant max-w-md">
                Les opérations d'assainissement et les passages d'éboueurs se déroulent sans entrave sécuritaire répertoriée.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {communeIncidents.map((incident) => {
                const isCritical = incident.gravite === 'critique' || incident.gravite === 'haute';

                return (
                  <div
                    key={incident.id}
                    className={`p-5 rounded-2xl bg-surface border flex flex-col gap-3.5 shadow-sm ${
                      isCritical ? 'border-rose-500/50 bg-rose-500/5' : 'border-amber-500/40 bg-amber-500/5'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline-variant/40 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          incident.gravite === 'critique'
                            ? 'bg-rose-600 text-white animate-pulse'
                            : incident.gravite === 'haute'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          Gravité {incident.gravite}
                        </span>

                        <span className="font-black text-xs text-on-surface">
                          {incident.type_infraction === 'menace_agent' && '🗣️ Menaces verbales / Intimidation envers un agent'}
                          {incident.type_infraction === 'agression_physique' && '🚨 Agression physique sur le terrain'}
                          {incident.type_infraction === 'obstruction_collecte' && '⛔ Obstruction au passage du camion poubelle'}
                          {incident.type_infraction === 'refus_paiement_recidive' && '❌ Récidive de refus de taxe communale'}
                          {incident.type_infraction === 'depot_sauvage' && '🗑️ Dépôt sauvage sur la voie publique'}
                        </span>

                        <span className="text-[10px] text-on-surface-variant font-mono">
                          • {new Date(incident.date_incident).toLocaleString('fr-FR')}
                        </span>
                      </div>

                      {/* Status */}
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase ${
                        incident.statut === 'sanctionne'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : incident.statut === 'convocation_emise'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : incident.statut === 'auditionne'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        Statut : {incident.statut.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Body Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-background/80 p-3.5 rounded-xl border border-outline-variant/40 text-xs">
                      {/* Parcelle & Bailleur */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant">Bailleur / Auteur :</span>
                        <span className="font-extrabold text-on-surface">{incident.bailleur_nom}</span>
                        <span className="text-on-surface-variant text-[11px]">
                          Parcelle N° {incident.numero_parcelle} • {incident.avenue_nom}
                        </span>
                        <span className="text-secondary font-mono text-[11px]">{incident.bailleur_telephone}</span>
                      </div>

                      {/* Victim Agent */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant">Agent victime :</span>
                        <span className="font-extrabold text-on-surface">
                          {incident.agent_victime_nom || 'Équipe de ramassage'}
                        </span>
                        <span className="text-on-surface-variant text-[11px]">
                          Fonction : {incident.agent_victime_role || 'Éboueur de zone'}
                        </span>
                      </div>

                      {/* Actions Taken */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant">Décision Bourgmestre :</span>
                        <span className="text-on-surface italic text-[11px]">
                          {incident.decision_bourgmestre || 'En attente d\'audition à la maison communale.'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="p-3 bg-surface-variant/30 rounded-xl text-xs text-on-surface leading-relaxed border border-outline-variant/30">
                      <strong>Rapport des faits :</strong> "{incident.description}"
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/40 flex-wrap">
                      <div className="flex items-center gap-2">
                        {incident.statut !== 'convocation_emise' && (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetBailleurForConvocation({
                                parcelle_id: incident.parcelle_id,
                                numero_parcelle: incident.numero_parcelle,
                                avenue_nom: incident.avenue_nom,
                                bailleur_nom: incident.bailleur_nom,
                                bailleur_telephone: incident.bailleur_telephone,
                                incident_id: incident.id,
                                defaultMotif: `OUTRAGE & MENACES ENVERS AGENT D'ASSAINISSEMENT : ${incident.description.substring(0, 80)}...`
                              });
                              setIsConvocationModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <Gavel size={13} />
                            <span>Émettre Convocation Officielle</span>
                          </button>
                        )}

                        {incident.statut === 'convocation_emise' && onUpdateIncidentStatus && (
                          <button
                            type="button"
                            onClick={() => {
                              const note = prompt("Saisissez la décision suite à l'audition (ex: Engagement écrit signé, amende réglée, avertissement) :");
                              if (note) {
                                onUpdateIncidentStatus(incident.id, 'auditionne', note);
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                          >
                            <UserCheck size={13} />
                            <span>Valider Audition / Clôturer</span>
                          </button>
                        )}
                      </div>

                      {onCallPhone && incident.bailleur_telephone && (
                        <button
                          type="button"
                          onClick={() => onCallPhone({
                            name: incident.bailleur_nom,
                            phone: incident.bailleur_telephone,
                            roleDescription: `Bailleur faisant l'objet d'un signalement d'incivisme`
                          })}
                          className="px-3 py-1.5 bg-surface hover:bg-surface-variant border border-outline-variant text-on-surface rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Phone size={13} className="text-secondary" />
                          <span>Joindre le Bailleur</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 📜 TAB 4: CONVOCATIONS & ACTES COMMUNAUX */}
      {activeTab === 'convocations_actes' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-on-surface-variant">
              Registre des Convocations Officielles de la Maison Communale ({communeConvocations.length})
            </span>
          </div>

          {communeConvocations.length === 0 ? (
            <div className="p-12 rounded-3xl bg-surface border border-outline-variant text-center flex flex-col items-center gap-3">
              <Gavel size={36} className="text-on-surface-variant/40" />
              <span className="text-sm font-extrabold text-on-surface">Aucune convocation émise pour le moment</span>
              <p className="text-xs text-on-surface-variant max-w-sm">
                Vous pouvez émettre des convocations officielles depuis le Registre des Bailleurs ou l'onglet Incivismes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communeConvocations.map((conv) => (
                <div
                  key={conv.id}
                  className="p-5 rounded-2xl bg-surface border border-indigo-500/30 flex flex-col justify-between gap-3.5 shadow-sm"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2 border-b border-outline-variant/40 pb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                          RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
                        </span>
                        <span className="font-extrabold text-sm text-on-surface">
                          Convocation N° {conv.id}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                        conv.statut === 'present'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : conv.statut === 'absent'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}>
                        {conv.statut}
                      </span>
                    </div>

                    <div className="bg-background/80 p-3 rounded-xl border border-outline-variant/30 text-xs flex flex-col gap-1">
                      <div>Destinataire : <strong className="text-on-surface">{conv.destinataire_nom}</strong></div>
                      <div>Lieu / Parcelle : <span className="text-on-surface-variant">Parcelle N° {conv.numero_parcelle}, {conv.avenue_nom}</span></div>
                      <div>Date d'audition : <strong className="text-secondary font-mono">{new Date(conv.date_comparution).toLocaleDateString('fr-FR')} à {conv.heure_comparution}</strong></div>
                      <div>Lieu : <span className="text-on-surface-variant">{conv.lieu_comparution}</span></div>
                      <div className="mt-1 pt-1 border-t border-outline-variant/30 text-[11px] italic text-on-surface-variant">
                        <strong>Motif :</strong> {conv.motif}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/40">
                    <button
                      type="button"
                      onClick={() => setPreviewConvocation(conv)}
                      className="px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer size={13} />
                      <span>Imprimer Acte A4</span>
                    </button>

                    {onUpdateConvocationStatus && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onUpdateConvocationStatus(conv.id, 'present', 'Comparution effectuée')}
                          className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10.5px] font-bold hover:bg-emerald-500/30 cursor-pointer"
                        >
                          Présent
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateConvocationStatus(conv.id, 'absent', 'Défaut de comparution')}
                          className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[10.5px] font-bold hover:bg-rose-500/30 cursor-pointer"
                        >
                          Absent
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📊 TAB 5: STATISTIQUES & RAPPORT BOURGMESTRE */}
      {activeTab === 'statistiques_salubrite' && (
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-3xl bg-surface border border-outline-variant flex flex-col gap-4 shadow-sm">
            <h3 className="text-base font-black text-on-surface flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-secondary" />
              <span>Bilan Synthétique d'Assainissement • Commune de {currentCommune.nom}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-background border border-outline-variant/60 flex flex-col gap-2">
                <span className="text-xs font-bold text-on-surface-variant">Taux Global de Couverture</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400 font-mono">{tauxCouverture}%</span>
                  <span className="text-xs text-on-surface-variant">des bailleurs conformes</span>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${tauxCouverture}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-outline-variant/60 flex flex-col gap-2">
                <span className="text-xs font-bold text-on-surface-variant">Densité des Incivismes</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400 font-mono">{totalIncidents}</span>
                  <span className="text-xs text-on-surface-variant">incidents / menaces</span>
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  {totalConvocations} convocations transmises aux officiers
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-outline-variant/60 flex flex-col gap-2">
                <span className="text-xs font-bold text-on-surface-variant">Impact Population Salubrité</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-400 font-mono">{(totalMenages * 6).toLocaleString()}</span>
                  <span className="text-xs text-on-surface-variant">citoyens protégés</span>
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  sur {communeAvenues.length} avenues quadrillées
                </span>
              </div>
            </div>

            {/* Avenues Performance Table */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-xs font-black uppercase text-on-surface-variant tracking-wider">
                Répartition Détaillée par Avenue ({communeAvenues.length} Avenues)
              </span>
              <div className="overflow-x-auto rounded-2xl border border-outline-variant">
                <table className="w-full text-left text-xs text-on-surface">
                  <thead className="bg-background text-[11px] uppercase font-bold text-on-surface-variant border-b border-outline-variant">
                    <tr>
                      <th className="p-3">Avenue</th>
                      <th className="p-3">Bailleurs Recensés</th>
                      <th className="p-3">Ménages</th>
                      <th className="p-3">En Règle</th>
                      <th className="p-3">Refus / Impayés</th>
                      <th className="p-3">Menaces / Incivismes</th>
                      <th className="p-3">Taux Conformité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 bg-surface">
                    {communeAvenues.map(ave => {
                      const aveBailleurs = enrichedBailleurs.filter(b => b.avenue.id === ave.id);
                      const aveMenages = aveBailleurs.reduce((acc, curr) => acc + curr.parcelle.nombre_menages, 0);
                      const avePayes = aveBailleurs.filter(b => b.paymentStatus === 'a_jour').length;
                      const aveRefus = aveBailleurs.filter(b => b.paymentStatus === 'refus' || b.paymentStatus === 'en_retard').length;
                      const aveIncidents = aveBailleurs.reduce((acc, curr) => acc + curr.incidents.length, 0);
                      const rate = aveBailleurs.length > 0 ? Math.round((avePayes / aveBailleurs.length) * 100) : 0;

                      return (
                        <tr key={ave.id} className="hover:bg-background/50 transition-colors">
                          <td className="p-3 font-extrabold text-on-surface">{ave.nom}</td>
                          <td className="p-3 font-mono">{aveBailleurs.length}</td>
                          <td className="p-3 font-mono">{aveMenages}</td>
                          <td className="p-3 text-emerald-400 font-mono font-bold">{avePayes}</td>
                          <td className="p-3 text-rose-400 font-mono font-bold">{aveRefus}</td>
                          <td className="p-3 text-amber-400 font-mono font-bold">{aveIncidents}</td>
                          <td className="p-3 font-mono font-black">
                            <span className={`px-2 py-0.5 rounded-md ${
                              rate >= 70 ? 'bg-emerald-500/15 text-emerald-400' : rate >= 40 ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-400'
                            }`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔎 MODAL: FICHE COMPLÈTE DU BAILLEUR */}
      {selectedBailleurDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-3xl p-6 max-w-2xl w-full flex flex-col gap-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-outline-variant pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-black text-lg">
                  {selectedBailleurDetail.abonne.nom_complet.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-black text-base text-on-surface">
                    {selectedBailleurDetail.abonne.nom_complet}
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    Bailleur Recensé • Commune de {selectedBailleurDetail.commune.nom}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBailleurDetail(null)}
                className="p-1.5 rounded-xl bg-background text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-background/80 p-4 rounded-2xl border border-outline-variant">
              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Numéro de Parcelle :</span>
                <div className="font-extrabold text-sm text-on-surface font-mono">
                  N° {selectedBailleurDetail.parcelle.numero_parcelle}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Avenue :</span>
                <div className="font-extrabold text-sm text-on-surface">
                  {selectedBailleurDetail.avenue.nom}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Téléphone Principal :</span>
                <div className="font-extrabold text-sm text-secondary font-mono">
                  {selectedBailleurDetail.abonne.telephone_principal}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Téléphone Secondaire :</span>
                <div className="font-medium text-xs text-on-surface font-mono">
                  {selectedBailleurDetail.abonne.telephone_secondaire || 'Aucun'}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Nombre de Ménages :</span>
                <div className="font-extrabold text-xs text-on-surface">
                  {selectedBailleurDetail.parcelle.nombre_menages} ménages déclarés
                </div>
              </div>

              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Type de Logement :</span>
                <div className="font-extrabold text-xs text-on-surface capitalize">
                  {selectedBailleurDetail.parcelle.type_logement}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Coordonnées GPS :</span>
                <div className="font-mono text-[11px] text-on-surface-variant">
                  {selectedBailleurDetail.parcelle.latitude ? `${selectedBailleurDetail.parcelle.latitude.toFixed(5)}, ${selectedBailleurDetail.parcelle.longitude?.toFixed(5)}` : 'Non géolocalisé'}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Statut Redevance :</span>
                <div className="font-extrabold text-xs">
                  {selectedBailleurDetail.paymentStatus === 'a_jour' ? (
                    <span className="text-emerald-400">✅ En règle</span>
                  ) : selectedBailleurDetail.paymentStatus === 'refus' ? (
                    <span className="text-rose-400">🚨 Refus de paiement</span>
                  ) : (
                    <span className="text-amber-300">⏳ En retard</span>
                  )}
                </div>
              </div>
            </div>

            {/* Past Ramassages */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase text-on-surface-variant tracking-wider">
                Derniers Ramassages Réalisés sur cette Parcelle
              </span>
              {selectedBailleurDetail.signals.length === 0 ? (
                <div className="p-3 bg-background/50 rounded-xl text-xs text-on-surface-variant italic border border-outline-variant/40">
                  Aucun historique de ramassage enregistré.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {selectedBailleurDetail.signals.slice(0, 5).map(sig => (
                    <div key={sig.id} className="p-2.5 bg-background rounded-xl text-xs flex justify-between items-center border border-outline-variant/40">
                      <span className="font-bold text-on-surface">
                        {sig.type_poubelle === 'biodegradable' ? '🌿 Biodégradable' : '🛢️ Non-biodégradable'}
                      </span>
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        {sig.completed_at ? new Date(sig.completed_at).toLocaleDateString('fr-FR') : 'Signalé'}
                      </span>
                      <span className="text-emerald-400 font-bold text-[11px]">
                        {sig.confirmation_abonne === 'confirme' ? 'Validé par bailleur' : sig.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Incidents on this parcel */}
            {selectedBailleurDetail.incidents.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  ⚠️ Historique des Menaces & Incivismes ({selectedBailleurDetail.incidents.length})
                </span>
                <div className="flex flex-col gap-1.5">
                  {selectedBailleurDetail.incidents.map(inc => (
                    <div key={inc.id} className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex flex-col gap-1 text-amber-300">
                      <div className="flex justify-between font-bold">
                        <span>{inc.type_infraction}</span>
                        <span className="font-mono text-[11px]">{new Date(inc.date_incident).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p className="text-[11px] text-amber-200">"{inc.description}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setSelectedBailleurDetail(null)}
                className="px-4 py-2 bg-background border border-outline-variant text-on-surface-variant rounded-xl text-xs font-bold hover:text-on-surface cursor-pointer"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetBailleurForConvocation({
                    parcelle_id: selectedBailleurDetail.parcelle.id,
                    numero_parcelle: selectedBailleurDetail.parcelle.numero_parcelle,
                    avenue_nom: selectedBailleurDetail.avenue.nom,
                    bailleur_nom: selectedBailleurDetail.abonne.nom_complet,
                    bailleur_telephone: selectedBailleurDetail.abonne.telephone_principal
                  });
                  setSelectedBailleurDetail(null);
                  setIsConvocationModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Gavel size={14} />
                <span>Émettre une Convocation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL: SIGNALER UN INCIVISME / MENACE SUR AGENT */}
      {isAddIncidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-3xl p-6 max-w-lg w-full flex flex-col gap-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <span className="text-sm font-black text-amber-400 flex items-center gap-2 uppercase">
                <ShieldAlert size={18} /> Signaler un Outrage / Menace sur Agent
              </span>
              <button
                type="button"
                onClick={() => setIsAddIncidentModalOpen(false)}
                className="text-xs font-bold text-on-surface-variant hover:text-on-surface p-1 rounded-lg bg-background"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newIncidentData.parcelle_id) {
                  alert("Veuillez sélectionner la parcelle ou le bailleur concerné.");
                  return;
                }
                if (!newIncidentData.description.trim()) {
                  alert("Veuillez rédiger la description précise de l'incident.");
                  return;
                }

                const targetBailleur = enrichedBailleurs.find(b => b.parcelle.id === newIncidentData.parcelle_id);
                if (!targetBailleur) return;

                if (onAddIncident) {
                  onAddIncident({
                    commune_id: currentCommune.id,
                    parcelle_id: targetBailleur.parcelle.id,
                    abonne_id: targetBailleur.abonne.id,
                    bailleur_nom: targetBailleur.abonne.nom_complet,
                    bailleur_telephone: targetBailleur.abonne.telephone_principal,
                    numero_parcelle: targetBailleur.parcelle.numero_parcelle,
                    avenue_nom: targetBailleur.avenue.nom,
                    type_infraction: newIncidentData.type_infraction,
                    gravite: newIncidentData.gravite,
                    agent_victime_nom: newIncidentData.agent_victime_nom || currentUser?.nom || 'Agent Hico',
                    agent_victime_role: newIncidentData.agent_victime_role,
                    description: newIncidentData.description.trim()
                  });
                }

                alert("🚨 Incident enregistré avec succès dans le registre municipal ! Le Bourgmestre et les services de salubrité ont été notifiés.");
                setIsAddIncidentModalOpen(false);
                setNewIncidentData({
                  parcelle_id: '',
                  type_infraction: 'menace_agent',
                  gravite: 'haute',
                  agent_victime_nom: '',
                  agent_victime_role: 'Éboueur assainisseur',
                  description: ''
                });
              }}
              className="flex flex-col gap-3 text-xs"
            >
              {/* Parcelle selector */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-on-surface">Bailleur / Parcelle incriminée :</label>
                <select
                  value={newIncidentData.parcelle_id}
                  onChange={(e) => setNewIncidentData({ ...newIncidentData, parcelle_id: e.target.value })}
                  required
                  className="p-2.5 bg-background border border-outline-variant rounded-xl text-on-surface focus:border-secondary focus:outline-none"
                >
                  <option value="">-- Sélectionner un bailleur dans la commune --</option>
                  {enrichedBailleurs.map(b => (
                    <option key={b.parcelle.id} value={b.parcelle.id}>
                      {b.abonne.nom_complet} (Parcelle N° {b.parcelle.numero_parcelle}, {b.avenue.nom})
                    </option>
                  ))}
                </select>
              </div>

              {/* Infraction type */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-on-surface">Type d'infraction :</label>
                  <select
                    value={newIncidentData.type_infraction}
                    onChange={(e) => setNewIncidentData({ ...newIncidentData, type_infraction: e.target.value as any })}
                    className="p-2 bg-background border border-outline-variant rounded-xl text-on-surface"
                  >
                    <option value="menace_agent">🗣️ Menace / Outrage sur agent</option>
                    <option value="agression_physique">🚨 Agression physique</option>
                    <option value="obstruction_collecte">⛔ Obstruction au ramassage</option>
                    <option value="refus_paiement_recidive">❌ Refus systématique de paiement</option>
                    <option value="depot_sauvage">🗑️ Dépôt sauvage d'ordures</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-on-surface">Niveau de Gravité :</label>
                  <select
                    value={newIncidentData.gravite}
                    onChange={(e) => setNewIncidentData({ ...newIncidentData, gravite: e.target.value as any })}
                    className="p-2 bg-background border border-outline-variant rounded-xl text-on-surface"
                  >
                    <option value="faible">Faible (Avertissement verbal)</option>
                    <option value="moyenne">Moyenne (Sommation)</option>
                    <option value="haute">Haute (Convocation Maison Communale)</option>
                    <option value="critique">Critique (Intervention PNC / Police)</option>
                  </select>
                </div>
              </div>

              {/* Victim name */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-on-surface">Nom de l'agent agressé :</label>
                  <input
                    type="text"
                    value={newIncidentData.agent_victime_nom}
                    onChange={(e) => setNewIncidentData({ ...newIncidentData, agent_victime_nom: e.target.value })}
                    placeholder="Ex: Éboueur Patrick Mbaya"
                    className="p-2 bg-background border border-outline-variant rounded-xl text-on-surface"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-on-surface">Fonction de l'agent :</label>
                  <input
                    type="text"
                    value={newIncidentData.agent_victime_role}
                    onChange={(e) => setNewIncidentData({ ...newIncidentData, agent_victime_role: e.target.value })}
                    placeholder="Ex: Éboueur chauffeur"
                    className="p-2 bg-background border border-outline-variant rounded-xl text-on-surface"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-on-surface">Description précise des faits & propos tenus :</label>
                <textarea
                  value={newIncidentData.description}
                  onChange={(e) => setNewIncidentData({ ...newIncidentData, description: e.target.value })}
                  placeholder="Décrivez ce qui s'est passé : menaces proférées, refus de laisser évacuer les sachets, violences verbales, etc..."
                  rows={3}
                  required
                  className="p-3 bg-background border border-outline-variant rounded-xl text-on-surface resize-none focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddIncidentModalOpen(false)}
                  className="px-4 py-2 bg-background border border-outline-variant text-on-surface-variant rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-md"
                >
                  Transmettre au Bourgmestre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📜 MODAL: ÉMETTRE UNE CONVOCATION OFFICIELLE */}
      {isConvocationModalOpen && targetBailleurForConvocation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-3xl p-6 max-w-lg w-full flex flex-col gap-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <span className="text-sm font-black text-indigo-400 flex items-center gap-2 uppercase">
                <Gavel size={18} /> Émettre une Convocation Communale
              </span>
              <button
                type="button"
                onClick={() => setIsConvocationModalOpen(false)}
                className="text-xs font-bold text-on-surface-variant hover:text-on-surface p-1 rounded-lg bg-background"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-xs flex flex-col gap-0.5 text-indigo-300">
              <span className="font-extrabold text-white">
                Bailleur : {targetBailleurForConvocation.bailleur_nom}
              </span>
              <span>
                Parcelle N° {targetBailleurForConvocation.numero_parcelle} • {targetBailleurForConvocation.avenue_nom} (Commune de {currentCommune.nom})
              </span>
              <span className="font-mono text-indigo-200">{targetBailleurForConvocation.bailleur_telephone}</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newConvocationData.motif.trim()) {
                  alert("Veuillez préciser le motif de la convocation.");
                  return;
                }

                if (onIssueConvocation) {
                  onIssueConvocation({
                    incident_id: targetBailleurForConvocation.incident_id,
                    commune_id: currentCommune.id,
                    commune_nom: currentCommune.nom,
                    parcelle_id: targetBailleurForConvocation.parcelle_id,
                    numero_parcelle: targetBailleurForConvocation.numero_parcelle,
                    avenue_nom: targetBailleurForConvocation.avenue_nom,
                    destinataire_nom: targetBailleurForConvocation.bailleur_nom,
                    destinataire_telephone: targetBailleurForConvocation.bailleur_telephone,
                    motif: newConvocationData.motif.trim(),
                    date_comparution: newConvocationData.date_comparution,
                    heure_comparution: newConvocationData.heure_comparution,
                    lieu_comparution: newConvocationData.lieu_comparution,
                    officier_traitant: newConvocationData.officier_traitant,
                    observations: newConvocationData.observations
                  });
                }

                alert(`📜 Convocation N° CONV-${Math.floor(1000 + Math.random() * 9000)} émise avec succès ! Un SMS de convocation est programmé pour le bailleur.`);
                setIsConvocationModalOpen(false);
              }}
              className="flex flex-col gap-3 text-xs"
            >
              {/* Motif */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-on-surface">Motif de la convocation :</label>
                <textarea
                  value={newConvocationData.motif || targetBailleurForConvocation.defaultMotif || ''}
                  onChange={(e) => setNewConvocationData({ ...newConvocationData, motif: e.target.value })}
                  placeholder="Ex: Refus de paiement de la redevance d'assainissement / Menaces sur agents recenseurs"
                  rows={2}
                  required
                  className="p-3 bg-background border border-outline-variant rounded-xl text-on-surface resize-none focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-on-surface">Date de comparution :</label>
                  <input
                    type="date"
                    value={newConvocationData.date_comparution}
                    onChange={(e) => setNewConvocationData({ ...newConvocationData, date_comparution: e.target.value })}
                    required
                    className="p-2 bg-background border border-outline-variant rounded-xl text-on-surface"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-on-surface">Heure :</label>
                  <input
                    type="time"
                    value={newConvocationData.heure_comparution}
                    onChange={(e) => setNewConvocationData({ ...newConvocationData, heure_comparution: e.target.value })}
                    required
                    className="p-2 bg-background border border-outline-variant rounded-xl text-on-surface"
                  />
                </div>
              </div>

              {/* Lieu */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-on-surface">Lieu d'audition :</label>
                <input
                  type="text"
                  value={newConvocationData.lieu_comparution}
                  onChange={(e) => setNewConvocationData({ ...newConvocationData, lieu_comparution: e.target.value })}
                  className="p-2 bg-background border border-outline-variant rounded-xl text-on-surface"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsConvocationModalOpen(false)}
                  className="px-4 py-2 bg-background border border-outline-variant text-on-surface-variant rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
                >
                  Émettre & Signer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖨️ PREVIEW PRINTABLE CONVOCATION (A4 STYLE) */}
      {previewConvocation && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-xl w-full flex flex-col gap-6 shadow-2xl relative font-serif">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div className="flex flex-col text-center w-full">
                <span className="text-xs font-bold tracking-widest uppercase">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</span>
                <span className="text-xs font-semibold">VILLE DE KINSHASA</span>
                <span className="text-sm font-black uppercase">COMMUNE DE {previewConvocation.commune_nom.toUpperCase()}</span>
                <span className="text-[11px] italic">Département de l'Hygiène, Salubrité Publique & Environnement</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewConvocation(null)}
                className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 font-sans text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-base font-black uppercase underline decoration-2 tracking-wide font-sans">
                LETTRE DE CONVOCATION OFFICIELLE
              </h2>
              <span className="text-xs font-mono font-bold text-slate-700">Réf : {previewConvocation.id}</span>
            </div>

            <div className="flex flex-col gap-2 text-xs leading-relaxed text-slate-800">
              <p>
                Il est ordonné au Citoyen / Bailleur <strong>{previewConvocation.destinataire_nom}</strong>, résidant ou propriétaire de la <strong>Parcelle N° {previewConvocation.numero_parcelle}</strong>, sise sur l'Avenue <strong>{previewConvocation.avenue_nom}</strong>, de se présenter impérativement devant l'autorité communale :
              </p>

              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl my-1 flex flex-col gap-1 font-sans">
                <div>📅 <strong>Date :</strong> {new Date(previewConvocation.date_comparution).toLocaleDateString('fr-FR')}</div>
                <div>⏰ <strong>Heure précise :</strong> {previewConvocation.heure_comparution}</div>
                <div>🏛️ <strong>Lieu :</strong> {previewConvocation.lieu_comparution}</div>
                <div>📋 <strong>Motif :</strong> {previewConvocation.motif}</div>
              </div>

              <p className="text-[11px] text-slate-600 italic">
                N.B. : En cas de non-comparution sans motif valable, les sanctions prévues par les règlements urbains d'assainissement et la saisine des services de police seront appliquées.
              </p>
            </div>

            <div className="flex justify-between items-end pt-6 border-t border-slate-300 font-sans text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Date d'émission :</span>
                <span className="font-bold">{new Date(previewConvocation.date_emission).toLocaleDateString('fr-FR')}</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500">Pour le Bourgmestre</span>
                <div className="w-24 h-12 border-b border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-400 italic">
                  [Sceau communal]
                </div>
                <span className="font-bold text-[11px] mt-1">{previewConvocation.officier_traitant}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 font-sans pt-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow hover:bg-slate-800"
              >
                <Printer size={14} />
                <span>Imprimer Acte</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewConvocation(null)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
