import React, { useState, useMemo } from 'react';
import { 
  Parcelle, 
  Abonne, 
  PoubelleSignal, 
  InboxMessage, 
  Commune, 
  Avenue 
} from '../types';
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Check, 
  Users, 
  Info, 
  Mail, 
  MessageSquare, 
  Send, 
  Building, 
  DollarSign, 
  ShieldCheck, 
  PhoneCall, 
  ArrowRight,
  LogOut,
  RotateCcw
} from 'lucide-react';
import { initiateMobileMoneyPayment, checkFlexPayStatus } from '../lib/flexpay';

interface AbonneSpaceViewProps {
  currentAbonne: Abonne;
  currentParcelle: Parcelle;
  commune: Commune;
  avenue: Avenue;
  activeSignals: PoubelleSignal[];
  onReportTrashFull: (type_poubelle: 'biodegradable' | 'non_biodegradable') => void;
  onResetSignals?: () => void;
  onCancelSignal?: (signalId: string) => void;
  messages: InboxMessage[];
  onSendMessage: (sender: string, content: string) => void;
  onRecordOnlinePayment?: (amount: number, provider: 'mpesa' | 'orange' | 'airtel', phone: string) => void;
  onLogout?: () => void;
}

export default function AbonneSpaceView({
  currentAbonne,
  currentParcelle,
  commune,
  avenue,
  activeSignals,
  onReportTrashFull,
  onResetSignals,
  onCancelSignal,
  messages,
  onSendMessage,
  onRecordOnlinePayment,
  onLogout
}: AbonneSpaceViewProps) {
  // Navigation active tab for Subscriber interface
  const [activeTab, setActiveTab] = useState<'signalement' | 'redevance' | 'inbox'>('signalement');

  // Unread messages count for badge indicator
  const unreadCount = useMemo(() => {
    return messages.filter(m => !m.read).length;
  }, [messages]);

  // Check if there's an active alert for biodegradable or non-biodegradable trash
  const bioSignal = useMemo(() => {
    return activeSignals.find(s => s.parcelle_id === currentParcelle.id && s.type_poubelle === 'biodegradable' && s.status !== 'completed');
  }, [activeSignals, currentParcelle]);

  const nonBioSignal = useMemo(() => {
    return activeSignals.find(s => s.parcelle_id === currentParcelle.id && s.type_poubelle === 'non_biodegradable' && s.status !== 'completed');
  }, [activeSignals, currentParcelle]);

  // Households paid validation state
  // Stores household indexes (0-based) that are validated
  const [validatedHouseholds, setValidatedHouseholds] = useState<Record<number, boolean>>(() => {
    // By default, let's validate only the first 1 or 2 to make them do the checks for the interactive experience!
    return { 0: true }; 
  });

  // Support feedback message
  const [feedbackText, setFeedbackText] = useState('');
  
  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'mpesa' | 'orange' | 'airtel'>('mpesa');
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState(currentAbonne.telephone_principal);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'waiting_pin' | 'success'>('form');
  const [currentReference, setCurrentReference] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [isSimulated, setIsSimulated] = useState(false);
  
  // Dynamic subscription status state
  const [subscriptionPaidUntil, setSubscriptionPaidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2); // Expiré il y a 2 jours pour forcer l'usage du paiement!
    return d.toLocaleDateString('fr-FR');
  });

  const householdCount = currentParcelle.nombre_menages;
  const subscriptionPricePerHousehold = useMemo(() => {
    if (commune && commune.id) {
      const savedCommunePrices = localStorage.getItem('hico_commune_prices');
      if (savedCommunePrices) {
        try {
          const prices = JSON.parse(savedCommunePrices);
          if (prices[commune.id] !== undefined) {
            return parseFloat(prices[commune.id]);
          }
        } catch (e) {
          console.error("Error parsing commune prices", e);
        }
      }
    }
    const saved = localStorage.getItem('hico_subscription_price');
    return saved ? parseFloat(saved) : 1.0;
  }, [commune]);

  const currencySymbol = useMemo(() => {
    return localStorage.getItem('hico_subscription_currency') || '$';
  }, []);

  const totalAmountDue = householdCount * subscriptionPricePerHousehold;

  // Calculate validated amount
  const validatedCount = useMemo(() => {
    return Object.values(validatedHouseholds).filter(Boolean).length;
  }, [validatedHouseholds]);

  const amountValidated = validatedCount * subscriptionPricePerHousehold;
  const canPay = validatedCount === householdCount;

  // Toggle household payment validation status
  const handleToggleHousehold = (index: number) => {
    setValidatedHouseholds(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    onSendMessage('Moi (Bailleur)', feedbackText.trim());
    setFeedbackText('');
    alert("Message envoyé avec succès au support Hico-Cleaning !");
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    
    const reference = 'HICO-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    setCurrentReference(reference);

    const currency = currencySymbol === '$' ? 'USD' : 'CDF';

    try {
      const res = await initiateMobileMoneyPayment({
        phone: paymentPhoneNumber,
        amount: totalAmountDue,
        currency: currency,
        operator: selectedPaymentProvider,
        reference: reference
      });

      setIsProcessingPayment(false);
      setIsSimulated(!!res.isSimulated);
      setPaymentMessage(res.message || '');
      setPaymentStep('waiting_pin');
    } catch (err: any) {
      console.error(err);
      setIsProcessingPayment(false);
      alert("Erreur lors de l'initiation du paiement.");
    }
  };

  const handleCheckStatus = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await checkFlexPayStatus(currentReference);
      setIsProcessingPayment(false);
      
      if (res.success && res.status === 'SUCCESS') {
        setPaymentStep('success');
        setPaymentSuccess(true);
        
        if (onRecordOnlinePayment) {
          onRecordOnlinePayment(totalAmountDue, selectedPaymentProvider, paymentPhoneNumber);
        }
        
        // Update subscription date to next month
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setSubscriptionPaidUntil(nextMonth.toLocaleDateString('fr-FR'));
      } else {
        alert("Paiement non encore détecté ou en cours. Veuillez valider le code PIN sur votre téléphone puis réessayez.");
      }
    } catch (err) {
      console.error(err);
      setIsProcessingPayment(false);
      alert("Impossible de vérifier le statut. Veuillez réessayer.");
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background pb-20 sm:pb-6">
      
      {/* Welcome & Info Bento Header */}
      <header className="bg-surface border border-outline-variant rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="flex flex-col gap-1.5 flex-grow">
            <span className="text-[10px] bg-primary/20 text-indigo-400 font-extrabold uppercase px-2.5 py-1 rounded-full border border-primary/20 w-max tracking-wider">
              Espace Abonné Actif 👤
            </span>
            
            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight mt-1">
              Bonjour, {currentAbonne.nom_complet}
            </h2>
            <p className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5">
              <Building size={14} className="text-primary shrink-0" />
              <span>Parcelle N° {currentParcelle.numero_parcelle}, Avenue {avenue.nom}, Commune de {commune.nom}</span>
            </p>
          </div>

          <div className="bg-background/80 border border-outline-variant p-3.5 rounded-2xl flex items-center gap-3 shrink-0">
            <div className={`w-3.5 h-3.5 rounded-full ${paymentSuccess ? 'bg-[#10b981]' : 'bg-error'} animate-pulse`} />
            <div className="flex flex-col text-xs">
              <span className="font-bold text-on-surface-variant">Statut Mensuel</span>
              <span className={`font-black uppercase tracking-wider ${paymentSuccess ? 'text-[#10b981]' : 'text-error'}`}>
                {paymentSuccess ? 'Abonnement Réglé ✔' : 'À Renouveler ⏳'}
              </span>
              <span className="text-[10px] text-on-surface-variant opacity-80 font-medium">
                Dû jusqu'au : {subscriptionPaidUntil}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Top Navigation Tabs Bar */}
      <nav className="flex items-center gap-2 p-1.5 bg-surface border border-outline-variant rounded-2xl shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('signalement')}
          className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'signalement'
              ? 'bg-primary text-white shadow-md'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-background/50'
          }`}
        >
          <Trash2 size={16} />
          <span>Signalement Poubelles</span>
        </button>

        <button
          onClick={() => setActiveTab('redevance')}
          className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'redevance'
              ? 'bg-[#10b981] text-white shadow-md'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-background/50'
          }`}
        >
          <CreditCard size={16} />
          <span>Redevance de Salubrité</span>
        </button>

        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap relative ${
            activeTab === 'inbox'
              ? 'bg-secondary text-white shadow-md'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-background/50'
          }`}
        >
          <Mail size={16} />
          <span>Boîte de Réception</span>
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-extrabold bg-rose-500 text-white rounded-full border border-white/20 animate-pulse shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
      </nav>

      {/* TAB 1: SIGNALEMENT POUBELLES */}
      {activeTab === 'signalement' && (
        <section className="bg-surface border border-outline-variant rounded-2xl p-5 md:p-6 shadow-md flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                <Trash2 className="text-primary" size={20} />
                Signalement Poubelles Remplies
              </h3>

              {(bioSignal || nonBioSignal) && onResetSignals && (
                <button
                  onClick={() => {
                    if (confirm("Voulez-vous réinitialiser et effacer ces alertes enregistrées pour en envoyer de nouvelles ?")) {
                      onResetSignals();
                    }
                  }}
                  className="text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                  title="Réinitialiser les alertes locales"
                >
                  <RotateCcw size={12} />
                  <span>Réinitialiser alertes</span>
                </button>
              )}
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              Vos poubelles sont pleines ? Signalez séparément vos sachets poubelles biodégradables (déchets organiques) et non-biodégradables (plastiques, verres, métaux) pour optimiser le ramassage logistique et la distribution de nouveaux sachets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* POUBELLE BIODEGRADABLE */}
            <div className="bg-background/40 border border-outline-variant/60 rounded-2xl p-4 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase text-emerald-400 tracking-wider">Biodégradable (Vert)</span>
                </div>
                {bioSignal && onCancelSignal && (
                  <button
                    onClick={() => onCancelSignal(bioSignal.id)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                  >
                    Annuler
                  </button>
                )}
              </div>

              {bioSignal ? (
                <div className="flex flex-col gap-2 py-2">
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle size={16} className="animate-bounce" />
                    <span className="text-xs font-black">
                      {bioSignal.status === 'pending' ? 'En attente' : 'Éboueur en route'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-on-surface-variant leading-snug">
                    {bioSignal.status === 'pending' 
                      ? 'Signal enregistré, en attente de collecte.' 
                      : 'Un agent se dirige vers votre parcelle.'}
                  </p>
                  <span className="text-[9px] font-bold text-on-surface-variant/70 uppercase">
                    Signalé à {bioSignal.reported_at.substring(11, 16)}
                  </span>
                </div>
              ) : (
                <div className="py-3 flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Poubelle vide ✔</span>
                  <p className="text-[10px] text-on-surface-variant leading-snug">
                    Sachet vide ou en cours d'utilisation.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  onReportTrashFull('biodegradable');
                  alert("Signal envoyé ! Les éboueurs ont été alertés de la mission de collecte biodégradable.");
                }}
                disabled={!!bioSignal}
                className={`w-full h-10 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer ${
                  bioSignal 
                    ? 'bg-outline-variant/25 text-on-surface-variant/40 cursor-not-allowed border border-outline-variant/10' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500/20 shadow-md shadow-emerald-900/10'
                }`}
              >
                <Trash2 size={14} />
                <span>{bioSignal ? 'Transmis' : 'Signaler Pleine'}</span>
              </button>
            </div>

            {/* POUBELLE NON-BIODEGRADABLE */}
            <div className="bg-background/40 border border-outline-variant/60 rounded-2xl p-4 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider">Non-Dégradable (Gris)</span>
                </div>
                {nonBioSignal && onCancelSignal && (
                  <button
                    onClick={() => onCancelSignal(nonBioSignal.id)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                  >
                    Annuler
                  </button>
                )}
              </div>

              {nonBioSignal ? (
                <div className="flex flex-col gap-2 py-2">
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle size={16} className="animate-bounce" />
                    <span className="text-xs font-black">
                      {nonBioSignal.status === 'pending' ? 'En attente' : 'Éboueur en route'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-on-surface-variant leading-snug">
                    {nonBioSignal.status === 'pending' 
                      ? 'Signal enregistré, en attente de collecte.' 
                      : 'Un agent se dirige vers votre parcelle.'}
                  </p>
                  <span className="text-[9px] font-bold text-on-surface-variant/70 uppercase">
                    Signalé à {nonBioSignal.reported_at.substring(11, 16)}
                  </span>
                </div>
              ) : (
                <div className="py-3 flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Poubelle vide ✔</span>
                  <p className="text-[10px] text-on-surface-variant leading-snug">
                    Sachet vide ou en cours d'utilisation.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  onReportTrashFull('non_biodegradable');
                  alert("Signal envoyé ! Les éboueurs ont été alertés de la mission de collecte non-dégradable.");
                }}
                disabled={!!nonBioSignal}
                className={`w-full h-10 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer ${
                  nonBioSignal 
                    ? 'bg-outline-variant/25 text-on-surface-variant/40 cursor-not-allowed border border-outline-variant/10' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500/20 shadow-md shadow-indigo-900/10'
                }`}
              >
                <Trash2 size={14} />
                <span>{nonBioSignal ? 'Transmis' : 'Signaler Pleine'}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: REDEVANCE DE SALUBRITÉ */}
      {activeTab === 'redevance' && (
        <section className="bg-surface border border-outline-variant rounded-2xl p-5 md:p-6 shadow-md flex flex-col gap-5 animate-fade-in">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <CreditCard className="text-[#10b981]" size={20} />
              Redevance de Salubrité ({subscriptionPricePerHousehold}{currencySymbol}/ménage)
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Le tarif réglementé est fixé à <strong>{subscriptionPricePerHousehold}{currencySymbol} par ménage</strong> par mois. Validez manuellement les ménages/locataires qui ont réglé leur part pour débloquer le bouton de paiement.
            </p>
          </div>

          {/* Subscriber stats calculator */}
          <div className="bg-background/50 border border-outline-variant/60 rounded-2xl p-4 grid grid-cols-3 gap-2 sm:gap-4 items-center">
            <div className="text-center">
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-on-surface-variant block">Ménages totaux</span>
              <div className="text-base sm:text-xl font-black text-on-surface mt-1 flex items-center justify-center gap-1">
                <Users size={15} className="text-primary shrink-0" />
                <span>{householdCount}</span>
              </div>
            </div>

            <div className="text-center border-x border-outline-variant/40 px-1">
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-on-surface-variant block">Contributions</span>
              <div className="text-base sm:text-xl font-black text-[#10b981] mt-1">
                {validatedCount} / {householdCount}
              </div>
            </div>

            <div className="text-center">
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-on-surface-variant block">Solde Global</span>
              <div className="text-base sm:text-xl font-black text-secondary mt-1 flex items-center justify-center">
                <DollarSign size={15} className="shrink-0" />
                <span>{amountValidated}/{totalAmountDue}</span>
              </div>
            </div>
          </div>

          {/* Households Checklist */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant px-1">
              Validation des contributions des ménages
            </span>
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
              {Array.from({ length: householdCount }).map((_, i) => {
                const isChecked = !!validatedHouseholds[i];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleToggleHousehold(i)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isChecked 
                        ? 'bg-[#10b981]/10 border-[#10b981]/30 text-on-surface' 
                        : 'bg-background/25 border-outline-variant/40 hover:bg-background/50 text-on-surface-variant'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">
                        {i === 0 ? `Ménage Principal (Bailleur)` : `Ménage Locataire N° ${i}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[10px]">{subscriptionPricePerHousehold} {currencySymbol}</span>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-[#10b981] border-[#10b981] text-white' : 'border-outline-variant/80 bg-background'
                      }`}>
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Button & Conditions warning */}
          <div className="flex flex-col gap-2 mt-1">
            {!canPay && (
              <p className="text-[10px] text-error bg-error/10 border border-error/20 p-2.5 rounded-xl font-bold flex items-start gap-1.5 leading-relaxed">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>Réglez la contribution de tous les ménages pour activer le bouton de renouvellement d'abonnement. ({validatedCount}/{householdCount} validés)</span>
              </p>
            )}

            <button
              onClick={() => {
                if (canPay) setShowCheckoutModal(true);
              }}
              disabled={!canPay}
              className={`w-full h-11 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
                canPay 
                  ? 'bg-[#10b981] text-white hover:bg-[#10b981]/90 border border-[#10b981]/25' 
                  : 'bg-outline-variant/30 text-on-surface-variant/40 cursor-not-allowed border border-outline-variant/10'
              }`}
            >
              <CreditCard size={16} />
              <span>Payer l'abonnement ({totalAmountDue} {currencySymbol})</span>
            </button>
          </div>
        </section>
      )}

      {/* TAB 3: BOÎTE DE RÉCEPTION */}
      {activeTab === 'inbox' && (
        <section className="bg-surface border border-outline-variant rounded-2xl p-5 md:p-6 shadow-md flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="text-secondary" size={20} />
              <h3 className="text-base font-extrabold text-on-surface">
                Boîte de Réception & Directives Urbaines
              </h3>
            </div>
            <span className="text-[10px] bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full font-extrabold border border-secondary/20">
              {unreadCount} Non lus
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List of Messages inside inbox */}
            <div className="lg:col-span-2 flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic text-center py-8">Aucun message pour le moment.</p>
              ) : (
                messages.map((msg) => {
                  const isAuthority = msg.sender === 'Autorités Urbaines';
                  return (
                    <div 
                      key={msg.id}
                      className={`p-4 border rounded-xl flex flex-col gap-1.5 text-xs transition-colors bg-background/35 border-outline-variant/50 relative`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className={`font-black uppercase tracking-wider text-[9px] px-2 py-0.5 rounded ${
                          isAuthority ? 'bg-error/15 text-error border border-error/25' : 'bg-secondary/15 text-secondary border border-secondary/25'
                        }`}>
                          {msg.sender}
                        </span>
                        <div className="flex items-center gap-2">
                          {!msg.read && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Non lu" />
                          )}
                          <span className="text-[9px] text-on-surface-variant font-mono">
                            {msg.sent_at}
                          </span>
                        </div>
                      </div>
                      <p className="text-on-surface font-medium leading-relaxed mt-1">
                        {msg.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form to message Hico-Cleaning */}
            <div className="lg:col-span-1 bg-background/50 border border-outline-variant/60 p-4 rounded-xl flex flex-col gap-3">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} className="text-secondary" />
                Contacter le Support
              </h4>
              
              <form onSubmit={handleSendFeedback} className="flex flex-col gap-2.5">
                <textarea
                  placeholder="Posez une question à l'administration de Hico-Cleaning..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full bg-background border border-outline-variant rounded-xl p-2.5 text-xs h-28 focus:outline-none focus:border-secondary text-on-surface resize-none leading-relaxed"
                  required
                />
                <button
                  type="submit"
                  className="w-full h-10 bg-secondary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Send size={12} />
                  <span>Envoyer le Message</span>
                </button>
              </form>
            </div>

          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-outline-variant/80 p-2 sm:hidden z-50 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('signalement')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'signalement' ? 'text-primary font-bold scale-105' : 'text-on-surface-variant opacity-70'
          }`}
        >
          <Trash2 size={20} />
          <span className="text-[10px]">Signalement</span>
        </button>

        <button
          onClick={() => setActiveTab('redevance')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'redevance' ? 'text-[#10b981] font-bold scale-105' : 'text-on-surface-variant opacity-70'
          }`}
        >
          <CreditCard size={20} />
          <span className="text-[10px]">Redevance</span>
        </button>

        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all relative ${
            activeTab === 'inbox' ? 'text-secondary font-bold scale-105' : 'text-on-surface-variant opacity-70'
          }`}
        >
          <Mail size={20} />
          <span className="text-[10px]">Messages</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 right-2 w-4 h-4 text-[9px] font-extrabold bg-rose-500 text-white rounded-full flex items-center justify-center border border-white animate-pulse shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ============================== */}
      {/* CHECKOUT MODAL MOBILE MONEY */}
      {/* ============================== */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-[#000000]/80 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-6 shadow-2xl text-white">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <CreditCard size={16} /> Règlement Mobile Money
              </h3>
              <button 
                onClick={() => {
                  if (!isProcessingPayment) {
                    setShowCheckoutModal(false);
                    setPaymentSuccess(false);
                    setPaymentStep('form');
                    setCurrentReference('');
                    setPaymentMessage('');
                  }
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {paymentStep === 'success' || paymentSuccess ? (
              <div className="text-center py-6 flex flex-col items-center gap-4 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] flex items-center justify-center">
                  <Check className="w-8 h-8" strokeWidth={3.5} />
                </div>
                <div>
                  <h4 className="text-lg font-black">Paiement Reçu !</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                    Votre abonnement de redevance de salubrité a été renouvelé avec succès pour un mois.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setPaymentSuccess(false);
                    setPaymentStep('form');
                    setCurrentReference('');
                    setPaymentMessage('');
                  }}
                  className="mt-2 w-full h-10 bg-white text-black font-extrabold rounded-xl text-xs hover:bg-gray-200"
                >
                  Fermer
                </button>
              </div>
            ) : paymentStep === 'waiting_pin' ? (
              <div className="flex flex-col gap-4 py-2 text-center items-center">
                <div className="relative flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-secondary animate-spin" />
                  <Clock className="w-6 h-6 text-secondary absolute" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-secondary">En attente de votre validation</h4>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">Référence : {currentReference}</p>
                </div>

                <div className="text-xs bg-white/5 border border-white/5 rounded-2xl p-4 text-left leading-relaxed text-gray-300 w-full flex flex-col gap-2">
                  <p className="font-semibold text-center text-white text-[11px] mb-1">
                    📥 Instructions de paiement
                  </p>
                  <p className="text-[11px] text-center text-secondary font-semibold">
                    {paymentMessage}
                  </p>
                  <div className="border-t border-white/5 my-1" />
                  <p className="text-[10px]">
                    1. Un message flash (push USSD) de votre opérateur ({selectedPaymentProvider.toUpperCase()}) a été envoyé à votre téléphone <strong>{paymentPhoneNumber}</strong>.
                  </p>
                  <p className="text-[10px]">
                    2. Saisissez votre code PIN secret pour confirmer la transaction de <strong>{totalAmountDue} {currencySymbol === '$' ? 'USD' : 'CDF'}</strong>.
                  </p>
                  <p className="text-[10px]">
                    3. Une fois le code PIN saisi, cliquez sur le bouton ci-dessous pour valider votre abonnement.
                  </p>
                </div>

                {isSimulated && (
                  <div className="text-[9px] bg-amber-500/10 border border-amber-500/25 text-amber-400 p-2 rounded-xl text-left w-full leading-normal">
                    <strong>Mode Simulation :</strong> Aucun frais réel ne sera débité. Cliquez sur "Vérifier" pour valider l'abonnement.
                  </div>
                )}

                <button
                  onClick={handleCheckStatus}
                  disabled={isProcessingPayment}
                  className="w-full h-11 bg-white text-black font-extrabold rounded-xl text-xs mt-2 flex items-center justify-center gap-1.5 hover:bg-gray-200 cursor-pointer disabled:opacity-40"
                >
                  {isProcessingPayment ? (
                    <>
                      <Clock size={14} className="animate-spin" />
                      <span>Vérification en cours...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>Vérifier le statut du paiement</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setPaymentStep('form')}
                  disabled={isProcessingPayment}
                  className="text-[10px] text-gray-400 hover:text-white font-bold transition-colors mt-1"
                >
                  Retour / Corriger le numéro
                </button>
              </div>
            ) : (
              <form onSubmit={handleProcessCheckout} className="flex flex-col gap-4">
                <div className="text-center bg-white/5 border border-white/5 p-3.5 rounded-2xl flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Montant global dû</span>
                  <span className="text-2xl font-black text-secondary">{totalAmountDue} {currencySymbol}</span>
                  <span className="text-[9px] text-gray-400">Pour les {householdCount} ménages recensés</span>
                </div>

                {/* Operator Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Opérateur Telecom</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentProvider('mpesa')}
                      className={`h-11 rounded-xl border flex flex-col items-center justify-center text-[10px] font-bold ${
                        selectedPaymentProvider === 'mpesa' 
                          ? 'bg-orange-600/25 border-orange-600 text-orange-400' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span>M-PESA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentProvider('orange')}
                      className={`h-11 rounded-xl border flex flex-col items-center justify-center text-[10px] font-bold ${
                        selectedPaymentProvider === 'orange' 
                          ? 'bg-orange-500/25 border-orange-500 text-orange-400' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span>ORANGE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentProvider('airtel')}
                      className={`h-11 rounded-xl border flex flex-col items-center justify-center text-[10px] font-bold ${
                        selectedPaymentProvider === 'airtel' 
                          ? 'bg-red-600/25 border-red-600 text-red-400' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span>AIRTEL</span>
                    </button>
                  </div>
                </div>

                {/* Phone input */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Numéro de téléphone payeur</span>
                  <input
                    type="text"
                    value={paymentPhoneNumber}
                    onChange={(e) => setPaymentPhoneNumber(e.target.value)}
                    placeholder="081 234 5678"
                    className="h-10 bg-black border border-white/10 px-3 rounded-xl text-xs text-white focus:outline-none focus:border-secondary w-full"
                    required
                  />
                </div>

                <div className="text-[9px] text-gray-400 flex items-start gap-1 p-2 bg-white/5 rounded-xl border border-white/5 leading-normal mt-1">
                  <ShieldCheck size={14} className="text-secondary shrink-0" />
                  <span>Transaction sécurisée. Hico-Cleaning chiffre toutes les sessions de facturation.</span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full h-11 bg-white text-black font-extrabold rounded-xl text-xs mt-2 flex items-center justify-center gap-1.5 hover:bg-gray-200 cursor-pointer disabled:opacity-40"
                >
                  {isProcessingPayment ? (
                    <>
                      <Clock size={14} className="animate-spin" />
                      <span>Validation en cours...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={14} />
                      <span>Valider le Paiement</span>
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
