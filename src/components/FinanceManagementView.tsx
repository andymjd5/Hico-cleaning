import React, { useState, useMemo } from 'react';
import { 
  Commune, 
  Avenue, 
  Parcelle, 
  Abonne, 
  Agent,
  SubscriptionPayment,
  StaffPayment,
  MaterialExpense,
  DisputeSignal
} from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  Wrench, 
  AlertTriangle, 
  Send, 
  Search, 
  Plus, 
  Check, 
  Calendar, 
  Building, 
  Phone, 
  UserPlus, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Bell, 
  X,
  CreditCard
} from 'lucide-react';

interface FinanceManagementViewProps {
  communes: Commune[];
  avenues: Avenue[];
  parcelles: Parcelle[];
  abonnes: Abonne[];
  agents: Agent[];
  payments: SubscriptionPayment[];
  staffPayments: StaffPayment[];
  expenses: MaterialExpense[];
  disputes: DisputeSignal[];
  onAddSubscriptionPayment: (payment: Omit<SubscriptionPayment, 'id'>) => void;
  onPayStaff: (payment: Omit<StaffPayment, 'id'>) => void;
  onAddExpense: (expense: Omit<MaterialExpense, 'id'>) => void;
  onSignalDispute: (dispute: Omit<DisputeSignal, 'id'>) => void;
  onResolveDispute: (disputeId: string) => void;
  onSendDisputeReminder: (disputeId: string) => void;
}

export default function FinanceManagementView({
  communes,
  avenues,
  parcelles,
  abonnes,
  agents,
  payments,
  staffPayments,
  expenses,
  disputes,
  onAddSubscriptionPayment,
  onPayStaff,
  onAddExpense,
  onSignalDispute,
  onResolveDispute,
  onSendDisputeReminder
}: FinanceManagementViewProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'receipts' | 'staff' | 'expenses' | 'disputes'>('dashboard');
  
  // Filtering & Search states
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartSearchQuery, setChartSearchQuery] = useState<string>('');

  // Modals / Form toggles
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showAddStaffPaymentModal, setShowAddStaffPaymentModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddDisputeModal, setShowAddDisputeModal] = useState(false);

  // Form State - Manual Payment
  const [newPayAbonneId, setNewPayAbonneId] = useState('');
  const [newPayAmount, setNewPayAmount] = useState('');
  const [newPayProvider, setNewPayProvider] = useState<'mpesa' | 'orange' | 'airtel'>('mpesa');
  const [newPayPhone, setNewPayPhone] = useState('');

  // Form State - Staff Payment
  const [newStaffId, setNewStaffId] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'agent' | 'eboueur' | 'staff'>('agent');
  const [newStaffCommuneId, setNewStaffCommuneId] = useState('');
  const [newStaffAmount, setNewStaffAmount] = useState('');
  const [newStaffNotes, setNewStaffNotes] = useState('');

  // Form State - Material Expense
  const [newExpLabel, setNewExpLabel] = useState('');
  const [newExpCommuneId, setNewExpCommuneId] = useState('global');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpNotes, setNewExpNotes] = useState('');

  // Form State - Dispute Signal
  const [newDispAbonneId, setNewDispAbonneId] = useState('');
  const [newDispAmount, setNewDispAmount] = useState('');
  const [newDispNotes, setNewDispNotes] = useState('');

  // Currency helper
  const currencySymbol = useMemo(() => {
    return localStorage.getItem('hico_subscription_currency') || '$';
  }, []);

  // Standard prices
  const getSubscriptionPrice = (commId: string) => {
    const savedCommunePrices = localStorage.getItem('hico_commune_prices');
    if (savedCommunePrices) {
      try {
        const prices = JSON.parse(savedCommunePrices);
        if (prices[commId] !== undefined) {
          return parseFloat(prices[commId]);
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('hico_subscription_price');
    return saved ? parseFloat(saved) : 1.0;
  };

  // Helper: Find full abonne / parcel info
  const abonneInfoMap = useMemo(() => {
    const map: Record<string, { abonne: Abonne; parcelle: Parcelle; avenue: Avenue; commune: Commune }> = {};
    abonnes.forEach(ab => {
      const parc = parcelles.find(p => p.id === ab.parcelle_id);
      if (parc) {
        const ave = avenues.find(a => a.id === parc.avenue_id);
        if (ave) {
          const com = communes.find(c => c.id === ave.commune_id);
          if (com) {
            map[ab.id] = { abonne: ab, parcelle: parc, avenue: ave, commune: com };
          }
        }
      }
    });
    return map;
  }, [abonnes, parcelles, avenues, communes]);

  // Financial calculations
  const stats = useMemo(() => {
    // Filter payments, staffPayments, and expenses based on selectedCommuneId
    const filteredPayments = selectedCommuneId === 'all' 
      ? payments 
      : payments.filter(p => p.commune_id === selectedCommuneId);

    const filteredStaffPayments = selectedCommuneId === 'all'
      ? staffPayments
      : staffPayments.filter(p => p.commune_id === selectedCommuneId);

    const filteredExpenses = selectedCommuneId === 'all'
      ? expenses
      : expenses.filter(p => p.commune_id === selectedCommuneId);

    const filteredDisputes = selectedCommuneId === 'all'
      ? disputes
      : disputes.filter(p => p.commune_id === selectedCommuneId);

    const totalIncome = filteredPayments.reduce((acc, curr) => acc + curr.montant, 0);
    const totalStaffPaid = filteredStaffPayments.reduce((acc, curr) => acc + curr.montant, 0);
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.montant, 0);
    const totalOutflow = totalStaffPaid + totalExpenses;
    const netBalance = totalIncome - totalOutflow;

    const activeDisputesCount = filteredDisputes.filter(d => d.status === 'active').length;
    const totalDisputedAmount = filteredDisputes
      .filter(d => d.status === 'active')
      .reduce((acc, curr) => acc + curr.montant_du, 0);

    return {
      totalIncome,
      totalStaffPaid,
      totalExpenses,
      totalOutflow,
      netBalance,
      activeDisputesCount,
      totalDisputedAmount
    };
  }, [payments, staffPayments, expenses, disputes, selectedCommuneId]);

  // Aggregate stats per commune for the chart
  const communeFinanceData = useMemo(() => {
    return communes.map(c => {
      const income = payments
        .filter(p => p.commune_id === c.id)
        .reduce((sum, curr) => sum + curr.montant, 0);

      const staffEx = staffPayments
        .filter(p => p.commune_id === c.id)
        .reduce((sum, curr) => sum + curr.montant, 0);

      const materialEx = expenses
        .filter(p => p.commune_id === c.id)
        .reduce((sum, curr) => sum + curr.montant, 0);

      const totalEx = staffEx + materialEx;
      const profit = income - totalEx;

      return {
        communeId: c.id,
        name: c.nom,
        income,
        expenses: totalEx,
        profit
      };
    });
  }, [communes, payments, staffPayments, expenses]);

  // Filtered commune finance data based on search
  const filteredCommuneFinanceData = useMemo(() => {
    if (!chartSearchQuery.trim()) return communeFinanceData;
    const query = chartSearchQuery.toLowerCase().trim();
    return communeFinanceData.filter(d => d.name.toLowerCase().includes(query));
  }, [communeFinanceData, chartSearchQuery]);

  // Maximum value for chart scaling
  const maxChartValue = useMemo(() => {
    let max = 100; // default min range
    filteredCommuneFinanceData.forEach(d => {
      if (d.income > max) max = d.income;
      if (d.expenses > max) max = d.expenses;
    });
    return max * 1.15; // 15% padding
  }, [filteredCommuneFinanceData]);

  // Filtered Lists for Tables
  const filteredPaymentsList = useMemo(() => {
    return payments.filter(p => {
      const matchesCommune = selectedCommuneId === 'all' || p.commune_id === selectedCommuneId;
      const query = searchQuery.toLowerCase();
      const matchesSearch = p.nom_complet.toLowerCase().includes(query) || 
                            p.telephone_payeur.includes(query) ||
                            p.id.toLowerCase().includes(query);
      return matchesCommune && matchesSearch;
    });
  }, [payments, selectedCommuneId, searchQuery]);

  const filteredStaffPaymentsList = useMemo(() => {
    return staffPayments.filter(p => {
      const matchesCommune = selectedCommuneId === 'all' || p.commune_id === selectedCommuneId;
      const query = searchQuery.toLowerCase();
      const matchesSearch = p.recipient_name.toLowerCase().includes(query) || 
                            p.recipient_role.toLowerCase().includes(query) ||
                            (p.notes && p.notes.toLowerCase().includes(query));
      return matchesCommune && matchesSearch;
    });
  }, [staffPayments, selectedCommuneId, searchQuery]);

  const filteredExpensesList = useMemo(() => {
    return expenses.filter(e => {
      const matchesCommune = selectedCommuneId === 'all' || e.commune_id === selectedCommuneId || e.commune_id === 'global';
      const query = searchQuery.toLowerCase();
      const matchesSearch = e.label.toLowerCase().includes(query) || 
                            (e.notes && e.notes.toLowerCase().includes(query));
      return matchesCommune && matchesSearch;
    });
  }, [expenses, selectedCommuneId, searchQuery]);

  const filteredDisputesList = useMemo(() => {
    return disputes.filter(d => {
      const matchesCommune = selectedCommuneId === 'all' || d.commune_id === selectedCommuneId;
      const query = searchQuery.toLowerCase();
      const matchesSearch = d.nom_complet.toLowerCase().includes(query) || 
                            d.telephone.includes(query);
      return matchesCommune && matchesSearch;
    });
  }, [disputes, selectedCommuneId, searchQuery]);

  // Potential Late Bailleurs List (Abonnes who have NOT paid and are not currently in dispute)
  const potentialLateBailleurs = useMemo(() => {
    return abonnes.filter(ab => {
      // Check if they have an active dispute
      const hasActiveDispute = disputes.some(d => d.abonne_id === ab.id && d.status === 'active');
      if (hasActiveDispute) return false;

      // Check if they made any payment recently (e.g. within last month)
      const hasPaid = payments.some(p => p.abonne_id === ab.id);
      return !hasPaid; // Simulates that they are unpaid/late
    });
  }, [abonnes, disputes, payments]);

  // Actions
  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayAbonneId || !newPayAmount) {
      alert("Veuillez sélectionner un abonné et saisir un montant.");
      return;
    }

    const info = abonneInfoMap[newPayAbonneId];
    if (!info) return;

    onAddSubscriptionPayment({
      abonne_id: newPayAbonneId,
      nom_complet: info.abonne.nom_complet,
      commune_id: info.commune.id,
      parcelle_id: info.parcelle.id,
      montant: parseFloat(newPayAmount),
      date_paiement: new Date().toISOString(),
      mode_paiement: newPayProvider,
      telephone_payeur: newPayPhone || info.abonne.telephone_principal,
      status: 'success'
    });

    // Reset
    setNewPayAbonneId('');
    setNewPayAmount('');
    setNewPayPhone('');
    setShowAddPaymentModal(false);
    alert("Paiement manuel enregistré avec succès !");
  };

  const handleAddStaffPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let recipientName = newStaffName;
    let recipientRole = newStaffRole;
    let communeId = newStaffCommuneId;

    if (newStaffId) {
      // Selected existing agent/eboueur
      const found = agents.find(a => a.id === newStaffId);
      if (found) {
        recipientName = found.nom;
        recipientRole = found.role === 'eboueur' ? 'eboueur' : 'agent';
        // Try to locate commune
        if (found.role === 'abonne' && found.parcelle_id) {
          const parc = parcelles.find(p => p.id === found.parcelle_id);
          const ave = avenues.find(a => a.id === parc?.avenue_id);
          communeId = ave?.commune_id || communes[0]?.id;
        } else {
          // Default to the selected commune in the form
          communeId = newStaffCommuneId || communes[0]?.id;
        }
      }
    }

    if (!recipientName || !newStaffAmount || !communeId) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    onPayStaff({
      recipient_id: newStaffId || 'staff-admin-' + Math.random().toString(36).substring(2, 7),
      recipient_name: recipientName,
      recipient_role: recipientRole,
      commune_id: communeId,
      montant: parseFloat(newStaffAmount),
      date_paiement: new Date().toISOString(),
      notes: newStaffNotes
    });

    // Reset
    setNewStaffId('');
    setNewStaffName('');
    setNewStaffAmount('');
    setNewStaffNotes('');
    setShowAddStaffPaymentModal(false);
    alert("Règlement de salaire enregistré avec succès !");
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpLabel || !newExpAmount) {
      alert("Veuillez saisir un libellé et un montant.");
      return;
    }

    onAddExpense({
      label: newExpLabel,
      commune_id: newExpCommuneId,
      montant: parseFloat(newExpAmount),
      date_depense: new Date().toISOString(),
      notes: newExpNotes
    });

    setNewExpLabel('');
    setNewExpAmount('');
    setNewExpNotes('');
    setShowAddExpenseModal(false);
    alert("Dépense enregistrée avec succès !");
  };

  const handleAddDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDispAbonneId) {
      alert("Veuillez sélectionner un abonné en retard.");
      return;
    }

    const info = abonneInfoMap[newDispAbonneId];
    if (!info) return;

    const amount = newDispAmount ? parseFloat(newDispAmount) : (info.parcelle.nombre_menages * getSubscriptionPrice(info.commune.id));

    onSignalDispute({
      abonne_id: newDispAbonneId,
      nom_complet: info.abonne.nom_complet,
      telephone: info.abonne.telephone_principal,
      commune_id: info.commune.id,
      parcelle_id: info.parcelle.id,
      montant_du: amount,
      date_constat: new Date().toISOString(),
      status: 'active',
      reminders_sent: 0,
      notes: newDispNotes
    });

    setNewDispAbonneId('');
    setNewDispAmount('');
    setNewDispNotes('');
    setShowAddDisputeModal(false);
    alert("Signalement de litige activé ! Le bailleur sera alerté.");
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background">
      
      {/* Page Header and Commune Filter */}
      <header className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col gap-1 z-10">
          <span className="text-[10px] bg-primary/20 text-indigo-400 font-extrabold uppercase px-2.5 py-1 rounded-full border border-primary/20 w-max tracking-wider">
            Administration financière 💳
          </span>
          <h2 className="text-2xl font-black text-on-surface tracking-tight mt-1">
            Gestion Financière & Litiges
          </h2>
          <p className="text-xs text-on-surface-variant font-medium">
            Règlements, salaires des éboueurs, dépenses de matériels et recouvrement des impayés.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          {/* Commune filter selection */}
          <div className="flex items-center gap-2 bg-background border border-outline-variant px-3 py-1.5 rounded-xl">
            <Building size={14} className="text-primary" />
            <select
              value={selectedCommuneId}
              onChange={(e) => setSelectedCommuneId(e.target.value)}
              className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-surface text-on-surface">Toutes les Communes</option>
              {communes.map(c => (
                <option key={c.id} value={c.id} className="bg-surface text-on-surface">{c.nom}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Finance Navigation Tabs */}
      <nav className="flex border-b border-outline-variant/50 gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'dashboard', label: 'Vue Globale & Analyses', icon: TrendingUp },
          { id: 'receipts', label: 'Règlements Abonnés', icon: DollarSign },
          { id: 'staff', label: 'Règlements Personnel', icon: Briefcase },
          { id: 'expenses', label: "Dépenses d'Outils", icon: Wrench },
          { id: 'disputes', label: 'Gestion des Litiges', icon: AlertTriangle }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-background/40'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.id === 'disputes' && disputes.filter(d => d.status === 'active').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-error animate-ping ml-1" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 1. FINANCIAL DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          
          {/* Stats Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Receipts */}
            <div className="bg-surface border border-outline-variant rounded-2xl p-4 md:p-5 shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-wider">Recettes d'Abonnés</span>
                <span className="text-xl font-black text-emerald-400 mt-1">
                  +{stats.totalIncome.toLocaleString()} {currencySymbol}
                </span>
                <span className="text-[9px] text-on-surface-variant">Paiements mobiles validés</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </div>

            {/* Paid Salaries */}
            <div className="bg-surface border border-outline-variant rounded-2xl p-4 md:p-5 shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-wider">Salaires Éboueurs/Staff</span>
                <span className="text-xl font-black text-indigo-400 mt-1">
                  -{stats.totalStaffPaid.toLocaleString()} {currencySymbol}
                </span>
                <span className="text-[9px] text-on-surface-variant">Réglements de salaires effectués</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Briefcase size={20} />
              </div>
            </div>

            {/* Material Expenses */}
            <div className="bg-surface border border-outline-variant rounded-2xl p-4 md:p-5 shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-wider">Dépenses Matériels</span>
                <span className="text-xl font-black text-amber-500 mt-1">
                  -{stats.totalExpenses.toLocaleString()} {currencySymbol}
                </span>
                <span className="text-[9px] text-on-surface-variant">Outils de salubrité et maintenance</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Wrench size={20} />
              </div>
            </div>

            {/* Net Profits / Treasury */}
            <div className={`bg-surface border rounded-2xl p-4 md:p-5 shadow-sm flex items-center justify-between ${
              stats.netBalance >= 0 ? 'border-emerald-500/30' : 'border-error/30'
            }`}>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-wider">Solde de Trésorerie</span>
                <span className={`text-xl font-black mt-1 ${stats.netBalance >= 0 ? 'text-primary' : 'text-error'}`}>
                  {stats.netBalance >= 0 ? '+' : ''}{stats.netBalance.toLocaleString()} {currencySymbol}
                </span>
                <span className="text-[9px] text-on-surface-variant">Bilan financier actuel</span>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                stats.netBalance >= 0 
                  ? 'bg-primary/10 border border-primary/20 text-primary' 
                  : 'bg-error/10 border border-error/20 text-error'
              }`}>
                <DollarSign size={20} />
              </div>
            </div>

          </section>

          {/* Dispute Warning Card */}
          {stats.activeDisputesCount > 0 && (
            <div className="bg-error/10 border border-error/30 rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-error shrink-0" size={24} />
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-xs font-black text-on-surface uppercase">Litiges Financiers Actifs ({stats.activeDisputesCount})</h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Un montant total de <strong className="text-error">{stats.totalDisputedAmount} {currencySymbol}</strong> d'abonnement est actuellement en souffrance. Veuillez envoyer des notifications de rappel ou entamer les recouvrements de litige.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('disputes')}
                className="bg-error text-white text-[10px] font-extrabold px-3.5 py-1.5 rounded-lg hover:bg-error/90 active:scale-95 cursor-pointer"
              >
                Gérer les litiges
              </button>
            </div>
          )}

          {/* SVG Analytical Charts Panel */}
          <section className="bg-surface border border-outline-variant rounded-3xl p-5 md:p-6 shadow-md overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                <FileText className="text-primary" size={16} />
                Analyse financière comparative par Commune ({currencySymbol})
              </h3>
              
              {/* Search input for communes in the chart/list */}
              <div className="flex items-center gap-2 bg-background border border-outline-variant px-3 py-1.5 rounded-xl w-full sm:w-64">
                <Search size={14} className="text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Rechercher une commune..."
                  value={chartSearchQuery}
                  onChange={(e) => setChartSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-on-surface focus:outline-none w-full"
                />
              </div>
            </div>

            {communeFinanceData.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic text-center py-12">Aucune donnée disponible.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* Responsive Custom SVG Bar Chart */}
                <div className="lg:col-span-8 min-w-0 w-full flex flex-col gap-4">
                  <div className="relative w-full h-[260px] bg-background/50 border border-outline-variant/60 rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
                    
                    {/* Grid Lines */}
                    <div className="absolute inset-x-0 top-4 bottom-14 flex flex-col justify-between px-4 pointer-events-none opacity-20">
                      <div className="border-b border-outline border-dashed w-full" />
                      <div className="border-b border-outline border-dashed w-full" />
                      <div className="border-b border-outline border-dashed w-full" />
                      <div className="border-b border-outline border-dashed w-full" />
                    </div>

                    {/* Chart Bars - Scrollable to fit all 24 communes gracefully */}
                    <div className="relative h-[180px] w-full overflow-x-auto overflow-y-hidden z-10 pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-outline-variant/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary/40">
                      {filteredCommuneFinanceData.length === 0 ? (
                        <div className="flex items-center justify-center w-full h-full text-xs text-on-surface-variant italic">
                          Aucun résultat pour "{chartSearchQuery}"
                        </div>
                      ) : (
                        <div className="flex items-end justify-start gap-4 pt-12 pb-2 min-w-max px-2 h-full">
                          {filteredCommuneFinanceData.map((d, index) => {
                            const incHeight = Math.max(8, (d.income / maxChartValue) * 110);
                            const expHeight = Math.max(8, (d.expenses / maxChartValue) * 110);
                            return (
                              <div key={d.communeId} className="flex flex-col items-center group w-[54px] shrink-0 relative">
                                
                                {/* Value tooltip on hover */}
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-black/90 border border-outline-variant text-[9px] py-1 px-1.5 rounded-lg flex flex-col gap-0.5 pointer-events-none transition-opacity text-center z-50 shadow-xl w-28 left-1/2 -translate-x-1/2">
                                  <span className="font-bold text-white truncate">{d.name}</span>
                                  <span className="text-emerald-400">Recettes: {d.income} {currencySymbol}</span>
                                  <span className="text-indigo-400 font-medium">Dépenses: {d.expenses} {currencySymbol}</span>
                                  <span className={d.profit >= 0 ? 'text-primary' : 'text-error'}>
                                    Net: {d.profit} {currencySymbol}
                                  </span>
                                </div>

                                <div className="flex items-end gap-1.5">
                                  {/* Income Bar (Green) */}
                                  <div 
                                    style={{ height: `${incHeight}px` }}
                                    className="w-3.5 bg-emerald-500 rounded-t-sm shadow-md transition-all hover:brightness-110"
                                  />
                                  {/* Expense Bar (Purple) */}
                                  <div 
                                    style={{ height: `${expHeight}px` }}
                                    className="w-3.5 bg-indigo-500 rounded-t-sm shadow-md transition-all hover:brightness-110"
                                  />
                                </div>
                                
                                <span 
                                  title={d.name}
                                  className="text-[9px] text-on-surface-variant font-black mt-2 truncate w-full text-center"
                                >
                                  {d.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 text-[10px] border-t border-outline-variant/30 pt-3 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-emerald-500 rounded" />
                        <span className="text-on-surface-variant">Recettes d'Abonnement</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-indigo-500 rounded" />
                        <span className="text-on-surface-variant">Dépenses totales (Éboueurs + Outils)</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Side list detailing totals per commune */}
                <div className="lg:col-span-4 min-w-0 w-full flex flex-col gap-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
                    Bilan par Commune {chartSearchQuery.trim() && `("${chartSearchQuery}")`}
                  </span>
                  
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-outline-variant/60 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredCommuneFinanceData.length === 0 ? (
                      <div className="text-xs text-on-surface-variant italic text-center py-8">Aucun bilan trouvé.</div>
                    ) : (
                      filteredCommuneFinanceData.map((d) => (
                        <div key={d.communeId} className="bg-background/40 border border-outline-variant/60 p-3 rounded-xl flex items-center justify-between gap-3 shrink-0">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-extrabold text-on-surface truncate">{d.name}</span>
                            <span className="text-[9px] text-on-surface-variant">Recettes: {d.income} {currencySymbol}</span>
                          </div>
                          <div className="text-right flex flex-col gap-0.5 shrink-0">
                            <span className="text-xs font-black text-indigo-400">-{d.expenses} {currencySymbol}</span>
                            <span className={`text-[10px] font-bold ${d.profit >= 0 ? 'text-emerald-400' : 'text-error'}`}>
                              {d.profit >= 0 ? '+' : ''}{d.profit} {currencySymbol}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </section>

        </div>
      )}

      {/* 2. SUBSCRIBER RECEIPTS TAB */}
      {activeTab === 'receipts' && (
        <div className="bg-surface border border-outline-variant rounded-3xl p-5 md:p-6 shadow-md flex flex-col gap-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="flex items-center gap-2 bg-background border border-outline-variant px-3 py-1.5 rounded-xl w-full sm:w-64">
                <Search size={14} className="text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Rechercher un règlement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none w-full"
                >
                </input>
              </div>
            </div>

            <button
              onClick={() => setShowAddPaymentModal(true)}
              className="bg-primary text-on-primary text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md hover:opacity-90"
            >
              <Plus size={14} />
              <span>Saisir Paiement Manuel</span>
            </button>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto border border-outline-variant/60 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-background/65 text-on-surface-variant border-b border-outline-variant/50">
                  <th className="p-3 font-extrabold">ID Paiement</th>
                  <th className="p-3 font-extrabold">Abonné (Bailleur)</th>
                  <th className="p-3 font-extrabold">Commune</th>
                  <th className="p-3 font-extrabold">Mode / Référence</th>
                  <th className="p-3 font-extrabold">Montant</th>
                  <th className="p-3 font-extrabold">Date de versement</th>
                  <th className="p-3 font-extrabold text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-medium">
                {filteredPaymentsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center italic text-on-surface-variant">Aucun règlement correspondant trouvé.</td>
                  </tr>
                ) : (
                  filteredPaymentsList.map((p) => {
                    const communeObj = communes.find(c => c.id === p.commune_id);
                    return (
                      <tr key={p.id} className="hover:bg-background/20 transition-colors">
                        <td className="p-3 text-[11px] font-mono text-primary font-bold">{p.id}</td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-on-surface">{p.nom_complet}</span>
                            <span className="text-[10px] text-on-surface-variant/80 font-mono">{p.telephone_payeur}</span>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-on-surface-variant">{communeObj?.nom || 'Commune Inconnue'}</td>
                        <td className="p-3 font-bold text-on-surface-variant">
                          <span className="uppercase tracking-wider text-[10px] bg-outline-variant/30 px-2 py-0.5 rounded border border-outline-variant/30 mr-1.5">
                            {p.mode_paimet || p.mode_paiement || 'M-Pesa'}
                          </span>
                        </td>
                        <td className="p-3 font-black text-emerald-400">+{p.montant} {currencySymbol}</td>
                        <td className="p-3 text-[10px] text-on-surface-variant">
                          {new Date(p.date_paiement).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded-full font-extrabold border border-emerald-500/20">
                            Succès ✔
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 3. STAFF SALARY PAYMENTS TAB */}
      {activeTab === 'staff' && (
        <div className="flex flex-col gap-6">
          
          {/* Quick payout information / list of agents unpaid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: pay form */}
            <div className="lg:col-span-1 bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
                <Briefcase className="text-primary" size={16} />
                Enregistrer un Règlement de Salaire
              </h3>

              <form onSubmit={handleAddStaffPaymentSubmit} className="flex flex-col gap-3">
                {/* Select Staff type or specific Agent */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Membre du Personnel</label>
                  <select
                    value={newStaffId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStaffId(val);
                      if (val) {
                        const found = agents.find(a => a.id === val);
                        if (found) {
                          setNewStaffName(found.nom);
                          setNewStaffRole(found.role === 'eboueur' ? 'eboueur' : 'agent');
                          // default amount
                          setNewStaffAmount(found.role === 'eboueur' ? '250' : '200');
                        }
                      } else {
                        setNewStaffName('');
                        setNewStaffRole('staff');
                        setNewStaffAmount('');
                      }
                    }}
                    className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">-- Autre Personnel Administratif (Saisie libre) --</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nom} ({a.role === 'eboueur' ? 'Chauffeur Éboueur' : a.role === 'agent' ? 'Recenseur' : a.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Free input name if other staff */}
                {!newStaffId && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Nom complet</label>
                    <input
                      type="text"
                      placeholder="Nom du membre administratif..."
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                      required={!newStaffId}
                    />
                  </div>
                )}

                {/* Role selection if administrative/free input */}
                {!newStaffId && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Rôle / Service</label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => {
                        setNewStaffRole(e.target.value as any);
                        if (e.target.value === 'staff') setNewStaffAmount('350');
                        else if (e.target.value === 'agent') setNewStaffAmount('200');
                        else setNewStaffAmount('250');
                      }}
                      className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="staff">Personnel Administratif (Superviseur, RH, etc.)</option>
                      <option value="agent">Agent Recenseur de terrain</option>
                      <option value="eboueur">Chauffeur Éboueur (Salubrité)</option>
                    </select>
                  </div>
                )}

                {/* Target Commune */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Assignation Commune</label>
                  <select
                    value={newStaffCommuneId}
                    onChange={(e) => setNewStaffCommuneId(e.target.value)}
                    className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    required
                  >
                    <option value="">Sélectionner une commune...</option>
                    {communes.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                {/* Amount to pay */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Montant du salaire ({currencySymbol})</label>
                  <input
                    type="number"
                    placeholder="ex. 250"
                    value={newStaffAmount}
                    onChange={(e) => setNewStaffAmount(e.target.value)}
                    className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                    required
                    min="1"
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Commentaires / Mois concerné</label>
                  <input
                    type="text"
                    placeholder="ex. Indemnité mensuelle Juillet 2026"
                    value={newStaffNotes}
                    onChange={(e) => setNewStaffNotes(e.target.value)}
                    className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-10 bg-primary text-on-primary rounded-xl font-bold text-xs mt-2 flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                >
                  <Briefcase size={14} />
                  <span>Régler le Salaire</span>
                </button>
              </form>
            </div>

            {/* Right side: list of payments */}
            <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-xs font-black text-on-surface uppercase tracking-wider">
                  Historique des Règlements Effectués
                </h3>
                
                {/* Search in staff pay list */}
                <div className="flex items-center gap-2 bg-background border border-outline-variant px-2.5 py-1 rounded-lg w-full sm:w-48">
                  <Search size={12} className="text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Chercher staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-[11px] text-on-surface focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-outline-variant/60 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-background/65 text-on-surface-variant border-b border-outline-variant/50">
                      <th className="p-3 font-extrabold">Employé</th>
                      <th className="p-3 font-extrabold">Rôle / Fonction</th>
                      <th className="p-3 font-extrabold font-semibold">Commune</th>
                      <th className="p-3 font-extrabold">Montant</th>
                      <th className="p-3 font-extrabold">Date de versement</th>
                      <th className="p-3 font-extrabold text-right">Justificatif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-medium">
                    {filteredStaffPaymentsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center italic text-on-surface-variant">Aucun versement de salaire enregistré.</td>
                      </tr>
                    ) : (
                      filteredStaffPaymentsList.map((p) => {
                        const comm = communes.find(c => c.id === p.commune_id);
                        return (
                          <tr key={p.id} className="hover:bg-background/20 transition-colors">
                            <td className="p-3">
                              <span className="font-extrabold text-on-surface">{p.recipient_name}</span>
                            </td>
                            <td className="p-3 text-[11px]">
                              <span className={`px-2 py-0.5 rounded font-extrabold uppercase text-[9px] ${
                                p.recipient_role === 'eboueur' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                  : p.recipient_role === 'agent'
                                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/15'
                              }`}>
                                {p.recipient_role === 'eboueur' ? 'Chauffeur éboueur' : p.recipient_role === 'agent' ? 'Recenseur' : 'Administratif'}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-on-surface-variant">{comm?.nom || 'Global'}</td>
                            <td className="p-3 font-black text-red-400">-{p.montant} {currencySymbol}</td>
                            <td className="p-3 text-[10px] text-on-surface-variant">
                              {new Date(p.date_paiement).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-2.5 py-0.5 rounded-full font-extrabold border border-indigo-500/20 whitespace-nowrap">
                                Transmis ✔
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 4. MATERIAL & OPERATION EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side form to log expense */}
            <div className="lg:col-span-1 bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
                <Wrench className="text-amber-500" size={16} />
                Enregistrer une Dépense (Outils/Maintenance)
              </h3>

              <form onSubmit={handleAddExpenseSubmit} className="flex flex-col gap-3">
                {/* Libelle label */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Libellé de la dépense</label>
                  <input
                    type="text"
                    placeholder="ex. Achat de 20 râteaux & pelles..."
                    value={newExpLabel}
                    onChange={(e) => setNewExpLabel(e.target.value)}
                    className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                {/* Associated Commune */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Commune Bénéficiaire</label>
                  <select
                    value={newExpCommuneId}
                    onChange={(e) => setNewExpCommuneId(e.target.value)}
                    className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="global">Administration Générale (Global)</option>
                    {communes.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Montant total ({currencySymbol})</label>
                  <input
                    type="number"
                    placeholder="ex. 120"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                    required
                    min="1"
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Commentaires additionnels</label>
                  <textarea
                    placeholder="Détails, fournisseur, devis, etc..."
                    value={newExpNotes}
                    onChange={(e) => setNewExpNotes(e.target.value)}
                    className="bg-background border border-outline-variant p-2.5 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary h-20 resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-10 bg-amber-600 text-white rounded-xl font-bold text-xs mt-2 flex items-center justify-center gap-1.5 hover:bg-amber-500 active:scale-95 transition-all cursor-pointer border border-amber-500/20"
                >
                  <Plus size={14} />
                  <span>Enregistrer la Dépense</span>
                </button>
              </form>
            </div>

            {/* Right side expenses history */}
            <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-xs font-black text-on-surface uppercase tracking-wider">
                  Journal Général des Dépenses Matérielles
                </h3>
                
                {/* Search expenses */}
                <div className="flex items-center gap-2 bg-background border border-outline-variant px-2.5 py-1 rounded-lg w-full sm:w-48">
                  <Search size={12} className="text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Filtrer les dépenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-[11px] text-on-surface focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Table list */}
              <div className="overflow-x-auto border border-outline-variant/60 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-background/65 text-on-surface-variant border-b border-outline-variant/50">
                      <th className="p-3 font-extrabold">Dépense / Objet</th>
                      <th className="p-3 font-extrabold">Commune affectée</th>
                      <th className="p-3 font-extrabold">Montant</th>
                      <th className="p-3 font-extrabold">Date d'achat</th>
                      <th className="p-3 font-extrabold text-right">Commentaire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-medium">
                    {filteredExpensesList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center italic text-on-surface-variant">Aucune dépense matérielle enregistrée.</td>
                      </tr>
                    ) : (
                      filteredExpensesList.map((e) => {
                        const commObj = communes.find(c => c.id === e.commune_id);
                        return (
                          <tr key={e.id} className="hover:bg-background/20 transition-colors">
                            <td className="p-3">
                              <span className="font-extrabold text-on-surface">{e.label}</span>
                            </td>
                            <td className="p-3 font-bold text-on-surface-variant">
                              {e.commune_id === 'global' ? 'Général (Global)' : (commObj?.nom || 'Commune')}
                            </td>
                            <td className="p-3 font-black text-amber-500">-{e.montant} {currencySymbol}</td>
                            <td className="p-3 text-[10px] text-on-surface-variant">
                              {new Date(e.date_depense).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-3 text-right max-w-xs truncate text-[10px] text-on-surface-variant italic">
                              {e.notes || 'N/A'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 5. DISPUTES & LATE PAYERS TAB */}
      {activeTab === 'disputes' && (
        <div className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Declare manual dispute */}
            <div className="lg:col-span-4 bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
                <AlertTriangle className="text-error" size={16} />
                Déclarer un Nouveau Litige de Non-Paiement
              </h3>

              {potentialLateBailleurs.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs text-on-surface-variant italic font-semibold">Tous les bailleurs abonnés sont à jour dans leurs cotisations ou ont déjà des dossiers de litiges ouverts ! Excellent taux de recouvrement !</p>
                </div>
              ) : (
                <form onSubmit={handleAddDisputeSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Abonné en Retard de Paiement</label>
                    <select
                      value={newDispAbonneId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewDispAbonneId(val);
                        if (val) {
                          const info = abonneInfoMap[val];
                          if (info) {
                            const expected = info.parcelle.nombre_menages * getSubscriptionPrice(info.commune.id);
                            setNewDispAmount(expected.toString());
                          }
                        } else {
                          setNewDispAmount('');
                        }
                      }}
                      className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                      required
                    >
                      <option value="">-- Sélectionner un bailleur --</option>
                      {potentialLateBailleurs.map(ab => {
                        const info = abonneInfoMap[ab.id];
                        return (
                          <option key={ab.id} value={ab.id}>
                            {ab.nom_complet} ({info?.commune.nom || 'Inconnu'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Expected amount */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Montant Impayé Reclamé ({currencySymbol})</label>
                    <input
                      type="number"
                      placeholder="Montant du litige..."
                      value={newDispAmount}
                      onChange={(e) => setNewDispAmount(e.target.value)}
                      className="bg-background border border-outline-variant px-3 py-2 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Motif / Notes</label>
                    <textarea
                      placeholder="ex. Redevance non réglée depuis 2 mois malgré plusieurs avertissements verbaux..."
                      value={newDispNotes}
                      onChange={(e) => setNewDispNotes(e.target.value)}
                      className="bg-background border border-outline-variant p-2.5 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary h-24 resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-10 bg-error text-white rounded-xl font-bold text-xs mt-2 flex items-center justify-center gap-1.5 hover:bg-error/90 active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    <AlertTriangle size={14} />
                    <span>Déclarer Litige Actif</span>
                  </button>
                </form>
              )}
            </div>

            {/* Right side: Active disputes database */}
            <div className="lg:col-span-8 bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="text-error" size={16} />
                  Base des Litiges & Commandes de Rappel de Recouvrement
                </h3>

                {/* Filter / Search inside disputes */}
                <div className="flex items-center gap-2 bg-background border border-outline-variant px-2.5 py-1 rounded-lg w-full sm:w-48">
                  <Search size={12} className="text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Filtrer litiges..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-[11px] text-on-surface focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredDisputesList.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic text-center py-16 bg-background/25 border border-outline-variant/40 rounded-xl">Aucun litige de non-paiement actif n'est enregistré dans le système.</p>
                ) : (
                  filteredDisputesList.map((d) => {
                    const info = abonneInfoMap[d.abonne_id];
                    const commObj = communes.find(c => c.id === d.commune_id);
                    const isResolved = d.status === 'resolved';

                    return (
                      <div 
                        key={d.id} 
                        className={`p-4 border rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                          isResolved 
                            ? 'bg-background/20 border-outline-variant/45 opacity-65' 
                            : 'bg-error/5 border-error/25 hover:border-error/40'
                        }`}
                      >
                        <div className="flex flex-col gap-1.5 max-w-md">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-xs text-on-surface">{d.nom_complet}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isResolved 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                                : 'bg-error/15 text-error border border-error/25 animate-pulse'
                            }`}>
                              {isResolved ? 'Résolu ✔' : 'Litige Actif 🚨'}
                            </span>
                            <span className="text-[10px] font-mono text-on-surface-variant bg-outline-variant/30 px-1.5 py-0.5 rounded">
                              {commObj?.nom || 'Commune'}
                            </span>
                          </div>

                          <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">
                            Parcelle N° {info?.parcelle.numero_parcelle || 'N/A'}, Avenue {info?.avenue.nom || 'N/A'}. 
                            {d.notes && <span className="block mt-1 text-on-surface-variant/80 italic">« {d.notes} »</span>}
                          </p>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-[10px] text-on-surface-variant mt-0.5 font-semibold">
                            <a href={`tel:${d.telephone}`} className="text-secondary flex items-center gap-1 hover:underline">
                              <Phone size={11} /> {d.telephone}
                            </a>
                            <span className="flex items-center gap-1">
                              <Calendar size={11} /> Constaté le {new Date(d.date_constat).toLocaleDateString('fr-FR')}
                            </span>
                            <span className="flex items-center gap-1 text-amber-500 font-extrabold">
                              <Bell size={11} /> {d.reminders_sent} rappel(s) envoyé(s)
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          {!isResolved ? (
                            <>
                              {/* Trigger Reminder */}
                              <button
                                onClick={() => {
                                  onSendDisputeReminder(d.id);
                                  alert(`Notification SMS & Alerte Système transmise au numéro ${d.telephone} du bailleur ${d.nom_complet}.`);
                                }}
                                className="h-9 px-3.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                              >
                                <Send size={11} />
                                <span>Envoyer Rappel</span>
                              </button>

                              {/* Resolve Dispute */}
                              <button
                                onClick={() => {
                                  if (confirm(`Confirmer que l'abonné ${d.nom_complet} a réglé son solde de ${d.montant_du} ${currencySymbol} ?`)) {
                                    onResolveDispute(d.id);
                                    alert("Litige résolu avec succès ! Un reçu d'abonnement a été émis.");
                                  }
                                }}
                                className="h-9 px-3.5 bg-[#10b981] hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                              >
                                <Check size={12} />
                                <span>Régler Solde (Résoudre)</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/10 px-2 py-1 rounded border border-emerald-900/20">
                              <CheckCircle2 size={13} />
                              <span>Dossier Résolu</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* MODAL: Saisir un paiement manuel abonne */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-[#000000]/80 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 w-full max-w-md flex flex-col gap-6 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <DollarSign size={16} /> Saisie de Paiement Manuel (Offline)
              </h3>
              <button 
                onClick={() => setShowAddPaymentModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddPaymentSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Abonné (Bailleur)</span>
                <select
                  value={newPayAbonneId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewPayAbonneId(val);
                    if (val) {
                      const info = abonneInfoMap[val];
                      if (info) {
                        const amount = info.parcelle.nombre_menages * getSubscriptionPrice(info.commune.id);
                        setNewPayAmount(amount.toString());
                        setNewPayPhone(info.abonne.telephone_principal);
                      }
                    }
                  }}
                  className="bg-black border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary w-full cursor-pointer"
                  required
                >
                  <option value="">Sélectionner l'abonné payeur...</option>
                  {abonnes.map(ab => {
                    const info = abonneInfoMap[ab.id];
                    return (
                      <option key={ab.id} value={ab.id}>
                        {ab.nom_complet} ({info?.commune.nom || 'Inconnu'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Montant perçu ({currencySymbol})</span>
                  <input
                    type="number"
                    value={newPayAmount}
                    onChange={(e) => setNewPayAmount(e.target.value)}
                    className="bg-black border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    required
                    min="1"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Mode de Paiement</span>
                  <select
                    value={newPayProvider}
                    onChange={(e) => setNewPayProvider(e.target.value as any)}
                    className="bg-black border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="mpesa">CASH / Espèces</option>
                    <option value="orange">Orange Money</option>
                    <option value="airtel">Airtel Money</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Téléphone de l'émetteur</span>
                <input
                  type="text"
                  placeholder="ex. 082 345 6789"
                  value={newPayPhone}
                  onChange={(e) => setNewPayPhone(e.target.value)}
                  className="bg-black border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-primary text-on-primary font-extrabold rounded-xl text-xs mt-2 flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              >
                <Check size={14} />
                <span>Confirmer l'Enregistrement</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
