import React, { useState, useMemo, useEffect } from 'react';
import { 
  Parcelle, 
  Abonne, 
  PoubelleSignal, 
  InboxMessage, 
  Commune, 
  Avenue,
  Eboueur 
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
  RotateCcw,
  Camera,
  Package,
  AlertCircle,
  HelpCircle,
  FileText,
  Navigation,
  Volume2,
  Truck,
  BellRing
} from 'lucide-react';
import { initiateMobileMoneyPayment, checkFlexPayStatus, detectOperatorFromPhone } from '../lib/flexpay';
import { MPesaLogo, OrangeMoneyLogo, AirtelMoneyLogo, AfrimoneyLogo } from './OperatorLogos';
import { CartRouteTrackingMap } from './CartRouteTrackingMap';
import { getDistanceMeters, calculateCartETA, advancePositionTowardsTarget } from '../lib/geoUtils';
import VoiceCallModal, { CallTarget } from './VoiceCallModal';

interface AbonneSpaceViewProps {
  currentAbonne: Abonne;
  currentParcelle: Parcelle;
  commune: Commune;
  avenue: Avenue;
  activeSignals: PoubelleSignal[];
  eboueurs?: Eboueur[];
  onReportTrashFull: (type_poubelle: 'biodegradable' | 'non_biodegradable') => void;
  onModifySignalType?: (signalId: string, newType: 'biodegradable' | 'non_biodegradable') => void;
  onResetSignals?: () => void;
  onCancelSignal?: (signalId: string) => void;
  onConfirmReception?: (signalId: string, details?: { statut_evacuation?: 'succes' | 'echec'; statut_sachets?: 'recu' | 'non_recu' }) => void;
  onReportDispute?: (signalId: string, raison: string, details?: { statut_evacuation?: 'succes' | 'echec' | 'non_effectue'; statut_sachets?: 'recu' | 'non_recu'; confirmation_abonne?: 'conteste' | 'partiel' }) => void;
  messages: InboxMessage[];
  onSendMessage: (sender: string, content: string) => void;
  onMarkMessageAsRead?: (messageId: string) => void;
  onMarkAllMessagesAsRead?: () => void;
  onDeleteMessage?: (messageId: string) => void;
  onRecordOnlinePayment?: (amount: number, provider: 'mpesa' | 'orange' | 'airtel' | 'afrimoney', phone: string) => void;
  onLogout?: () => void;
  activeTab?: 'signalement' | 'redevance' | 'carte' | 'inbox';
}

export default function AbonneSpaceView({
  currentAbonne,
  currentParcelle,
  commune,
  avenue,
  activeSignals,
  eboueurs = [],
  onReportTrashFull,
  onModifySignalType,
  onResetSignals,
  onCancelSignal,
  onConfirmReception,
  onReportDispute,
  messages,
  onSendMessage,
  onMarkMessageAsRead,
  onMarkAllMessagesAsRead,
  onDeleteMessage,
  onRecordOnlinePayment,
  onLogout,
  activeTab: activeTabProp = 'signalement'
}: AbonneSpaceViewProps) {
  // Navigation active tab for Subscriber interface
  const [internalTab, setInternalTab] = useState<'signalement' | 'redevance' | 'carte' | 'inbox'>(activeTabProp);

  // Inbox filter state ('all' | 'unread' | 'read')
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Photo Proof & Dispute Modals
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [disputeModalSignalId, setDisputeModalSignalId] = useState<string | null>(null);
  const [disputeReasonText, setDisputeReasonText] = useState('');
  const [showConfirmedHistory, setShowConfirmedHistory] = useState(false);

  // Live Map Simulation & Arrival Audio Alert States
  const [simulatedPos, setSimulatedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [arrivalAlertTriggered, setArrivalAlertTriggered] = useState(false);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  // Web Audio Synthesizer for Collector Arrival Chime Alert
  const playArrivalAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const notes = [
        { freq: 523.25, time: 0, duration: 0.3 },   // C5
        { freq: 659.25, time: 0.2, duration: 0.3 }, // E5
        { freq: 783.99, time: 0.4, duration: 0.4 }, // G5
        { freq: 1046.50, time: 0.65, duration: 0.6 } // C6
      ];

      notes.forEach(({ freq, time, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

        gain.gain.setValueAtTime(0.4, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + duration + 0.05);
      });

      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') ctx.close().catch(() => {});
        } catch (_) {}
      }, 1500);
    } catch (err) {
      console.warn("Could not play arrival chime:", err);
    }
  };

  useEffect(() => {
    if (activeTabProp) {
      setInternalTab(activeTabProp);
    }
  }, [activeTabProp]);

  const activeTab = activeTabProp || internalTab;

  // Unread & Read messages count for badge indicator
  const unreadCount = useMemo(() => {
    return messages.filter(m => !m.read).length;
  }, [messages]);

  const readCount = useMemo(() => {
    return messages.filter(m => m.read).length;
  }, [messages]);

  // Check if there's an active alert for biodegradable or non-biodegradable trash
  const bioSignal = useMemo(() => {
    return activeSignals.find(s => s.parcelle_id === currentParcelle.id && s.type_poubelle === 'biodegradable' && s.status !== 'completed');
  }, [activeSignals, currentParcelle]);

  const nonBioSignal = useMemo(() => {
    return activeSignals.find(s => s.parcelle_id === currentParcelle.id && s.type_poubelle === 'non_biodegradable' && s.status !== 'completed');
  }, [activeSignals, currentParcelle]);

  // Active Signal & Assigned Collector for Subscriber parcel
  const activeSubscriberSignal = useMemo(() => {
    return activeSignals.find(s => s.parcelle_id === currentParcelle.id && s.status !== 'completed');
  }, [activeSignals, currentParcelle]);

  const assignedCollectorObj = useMemo(() => {
    if (!activeSubscriberSignal) return null;
    if (activeSubscriberSignal.assigned_eboueur_id) {
      return eboueurs.find(e => e.id === activeSubscriberSignal.assigned_eboueur_id) || null;
    }
    return null;
  }, [activeSubscriberSignal, eboueurs]);

  // Households paid validation state
  // Stores household indexes (0-based) that are validated
  const [validatedHouseholds, setValidatedHouseholds] = useState<Record<number, boolean>>(() => {
    // By default, let's validate only the first 1 or 2 to make them do the checks for the interactive experience!
    return { 0: true }; 
  });

  // Support feedback message
  const [feedbackText, setFeedbackText] = useState('');

  // ⏰ Late Signal Modal (>13h) State
  const [pendingLateSignalType, setPendingLateSignalType] = useState<'biodegradable' | 'non_biodegradable' | null>(null);
  const [forceLateMode, setForceLateMode] = useState<boolean>(false);

  const handleInitiateTrashFullReport = (type: 'biodegradable' | 'non_biodegradable') => {
    const currentHour = forceLateMode ? 14 : new Date().getHours();
    if (currentHour >= 13) {
      setPendingLateSignalType(type);
    } else {
      onReportTrashFull(type);
    }
  };
  
  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [activeCallTarget, setActiveCallTarget] = useState<CallTarget | null>(null);
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState(currentAbonne.telephone_principal);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'mpesa' | 'orange' | 'airtel' | 'afrimoney'>(() => {
    return detectOperatorFromPhone(currentAbonne.telephone_principal) || 'mpesa';
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePaymentPhoneChange = (val: string) => {
    setPaymentPhoneNumber(val);
    const detected = detectOperatorFromPhone(val);
    if (detected) {
      setSelectedPaymentProvider(detected);
    }
  };
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
      
      if (!res.success) {
        alert(res.message || "Erreur de paiement FlexPay.");
        return;
      }

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

      {/* TAB 1: SIGNALEMENT POUBELLES */}
      {activeTab === 'signalement' && (
        <section className="bg-surface border border-outline-variant rounded-2xl p-5 md:p-6 shadow-md flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                <Trash2 className="text-primary" size={20} />
                Signalement Poubelles Remplies
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setForceLateMode(!forceLateMode)}
                  className={`text-[10.5px] px-2.5 py-1 rounded-xl font-extrabold flex items-center gap-1 border transition-all cursor-pointer ${
                    forceLateMode 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm' 
                      : 'bg-surface-variant/30 text-on-surface-variant border-outline-variant/60 hover:text-on-surface'
                  }`}
                  title="Activer la simulation d'heure après 13h00 pour tester le message d'avertissement Hors-Délai"
                >
                  <Clock size={12} className={forceLateMode ? "text-amber-400 animate-pulse" : ""} />
                  <span>{forceLateMode ? '🧪 Mode Test >13h ACTIF' : '🧪 Tester Mode >13h'}</span>
                </button>

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
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>
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

              {bioSignal ? (() => {
                const assignedEb = eboueurs.find(e => 
                  e.id === bioSignal.assigned_eboueur_id || 
                  e.id === (bioSignal as any).eboueur_assigne_id
                );

                return (
                  <div className="flex flex-col gap-2.5 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Clock size={15} className="animate-pulse shrink-0" />
                        <span className="text-xs font-black">
                          {bioSignal.status === 'pending' ? 'Alerte transmise au bureau' : 'RDV de Passage Confirmé 🕒'}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-on-surface-variant/70 uppercase">
                        Signalé à {bioSignal.reported_at.substring(11, 16)}
                      </span>
                    </div>

                    {bioSignal.status === 'pending' ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex flex-col gap-1 text-[11px] text-on-surface-variant">
                        <p className="leading-snug">
                          Alerte reçue par le bureau de dispatching. Recherche d'un camion d'éboueur disponible à proximité...
                        </p>
                        {onModifySignalType && (
                          <button
                            onClick={() => {
                              if (confirm("Voulez-vous corriger le type de poubelle et la passer en Non-biodégradable (Gris) ?")) {
                                onModifySignalType(bioSignal.id, 'non_biodegradable');
                              }
                            }}
                            className="mt-1 text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded-lg font-bold flex items-center gap-1 w-max cursor-pointer hover:bg-indigo-500/25 transition-all"
                          >
                            <span>✏️ Erreur ? Passer en Non-Biodégradable</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl flex flex-col gap-2 text-xs">
                        <div className="flex justify-between items-center text-emerald-400 font-extrabold">
                          <span>Heure de passage estimée :</span>
                          <span className="text-sm bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30 font-mono">
                            {bioSignal.eta_appointment_time || '14h30'}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-emerald-200/90 leading-snug">
                          Éboueur en charge : <strong className="text-white">{assignedEb?.nom || 'Éboueur Hico'}</strong> ({assignedEb?.telephone || 'Contacté'})
                        </p>

                        {/* Call Actions: Éboueur vs Admin Affectateur */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-500/20">
                          <button
                            type="button"
                            onClick={() => setActiveCallTarget({
                              name: assignedEb?.nom || 'Éboueur de Zone',
                              phone: assignedEb?.telephone || '+243 89 000 0000',
                              role: 'Éboueur en Charge de Collecte',
                              commune: commune.nom
                            })}
                            className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[10.5px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                          >
                            <PhoneCall size={12} className="text-emerald-400 shrink-0" />
                            <span>📞 Appeler l'Éboueur</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCallTarget({
                              name: 'Admin Dispatching HICO',
                              phone: '+243 81 000 9999',
                              role: 'Admin Affectateur de Mission',
                              commune: 'Bureau Central'
                            })}
                            className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-[10.5px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                          >
                            <PhoneCall size={12} className="text-indigo-400 shrink-0" />
                            <span>👔 Appeler Admin (Affectateur)</span>
                          </button>
                        </div>

                        {bioSignal.is_partiel && (
                          <div className="mt-1 p-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-[10px] text-amber-300 font-bold flex items-start gap-1.5">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                            <span>Passage Partiel : {bioSignal.partiel_note || '1er sachet enlevé, le second suivra.'}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="py-3 flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Poubelle vide ✔</span>
                  <p className="text-[10px] text-on-surface-variant leading-snug">
                    Sachet vide ou en cours d'utilisation.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  handleInitiateTrashFullReport('biodegradable');
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

              {nonBioSignal ? (() => {
                const assignedEb = eboueurs.find(e => 
                  e.id === nonBioSignal.assigned_eboueur_id || 
                  e.id === (nonBioSignal as any).eboueur_assigne_id
                );

                return (
                  <div className="flex flex-col gap-2.5 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Clock size={15} className="animate-pulse shrink-0" />
                        <span className="text-xs font-black">
                          {nonBioSignal.status === 'pending' ? 'Alerte transmise au bureau' : 'RDV de Passage Confirmé 🕒'}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-on-surface-variant/70 uppercase">
                        Signalé à {nonBioSignal.reported_at.substring(11, 16)}
                      </span>
                    </div>

                    {nonBioSignal.status === 'pending' ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex flex-col gap-1 text-[11px] text-on-surface-variant">
                        <p className="leading-snug">
                          Alerte reçue par le bureau de dispatching. Recherche d'un camion d'éboueur disponible à proximité...
                        </p>
                        {onModifySignalType && (
                          <button
                            onClick={() => {
                              if (confirm("Voulez-vous corriger le type de poubelle et la passer en Biodégradable (Vert) ?")) {
                                onModifySignalType(nonBioSignal.id, 'biodegradable');
                              }
                            }}
                            className="mt-1 text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg font-bold flex items-center gap-1 w-max cursor-pointer hover:bg-emerald-500/25 transition-all"
                          >
                            <span>✏️ Erreur ? Passer en Biodégradable</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl flex flex-col gap-2 text-xs">
                        <div className="flex justify-between items-center text-indigo-400 font-extrabold">
                          <span>Heure de passage estimée :</span>
                          <span className="text-sm bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/30 font-mono">
                            {nonBioSignal.eta_appointment_time || '14h30'}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-indigo-200/90 leading-snug">
                          Éboueur en charge : <strong className="text-white">{assignedEb?.nom || 'Éboueur Hico'}</strong> ({assignedEb?.telephone || 'Contacté'})
                        </p>

                        {/* Call Actions: Éboueur vs Admin Affectateur */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-500/20">
                          <button
                            type="button"
                            onClick={() => setActiveCallTarget({
                              name: assignedEb?.nom || 'Éboueur de Zone',
                              phone: assignedEb?.telephone || '+243 89 000 0000',
                              role: 'Éboueur en Charge de Collecte',
                              commune: commune.nom
                            })}
                            className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[10.5px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                          >
                            <PhoneCall size={12} className="text-emerald-400 shrink-0" />
                            <span>📞 Appeler l'Éboueur</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCallTarget({
                              name: 'Admin Dispatching HICO',
                              phone: '+243 81 000 9999',
                              role: 'Admin Affectateur de Mission',
                              commune: 'Bureau Central'
                            })}
                            className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-[10.5px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                          >
                            <PhoneCall size={12} className="text-indigo-400 shrink-0" />
                            <span>👔 Appeler Admin (Affectateur)</span>
                          </button>
                        </div>

                        {nonBioSignal.is_partiel && (
                          <div className="mt-1 p-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-[10px] text-amber-300 font-bold flex items-start gap-1.5">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                            <span>Passage Partiel : {nonBioSignal.partiel_note || '1er sachet enlevé, le second suivra.'}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="py-3 flex flex-col gap-1">
                  <span className="text-xs font-bold text-on-surface">Poubelle vide ✔</span>
                  <p className="text-[10px] text-on-surface-variant leading-snug">
                    Sachet vide ou en cours d'utilisation.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  handleInitiateTrashFullReport('non_biodegradable');
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

          {/* Real-time GPS Tracking of Assigned Collector */}
          {(() => {
            const activeAssignedSig = (bioSignal?.status === 'assigned' ? bioSignal : null) || (nonBioSignal?.status === 'assigned' ? nonBioSignal : null);
            if (!activeAssignedSig) return null;

            const assignedEb = eboueurs.find(e => 
              e.id === activeAssignedSig.assigned_eboueur_id || 
              e.id === (activeAssignedSig as any).eboueur_assigne_id ||
              (e.nom && activeAssignedSig.assigned_eboueur_id && e.nom.toLowerCase().includes(activeAssignedSig.assigned_eboueur_id.toLowerCase()))
            ) || {
              id: 'eb-default',
              nom: 'Éboueur de Zone',
              telephone: '0890000000',
              latitude: currentParcelle.latitude ? currentParcelle.latitude + 0.0035 : -4.3316,
              longitude: currentParcelle.longitude ? currentParcelle.longitude - 0.0025 : 15.3139,
              status: 'en_mission' as const,
              gps_active: true
            };

            const ebLat = assignedEb.latitude ?? (currentParcelle.latitude ? currentParcelle.latitude + 0.0035 : -4.3316);
            const ebLng = assignedEb.longitude ?? (currentParcelle.longitude ? currentParcelle.longitude - 0.0025 : 15.3139);
            const houseLat = currentParcelle.latitude ?? -4.3316;
            const houseLng = currentParcelle.longitude ?? 15.3139;

            return (
              <div className="flex flex-col gap-3 mt-1 border-t border-outline-variant/40 pt-4 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-2">
                    <span>🚚 Suivi GPS du Déplacement de l'Éboueur</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveCallTarget({
                        name: assignedEb.nom || 'Éboueur de Zone',
                        phone: assignedEb.telephone || '+243 89 000 0000',
                        role: 'Éboueur de Zone',
                        commune: commune.nom
                      })}
                      className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <PhoneCall size={12} className="text-emerald-400" />
                      <span>Appeler l'éboueur</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCallTarget({
                        name: 'Admin Dispatching HICO',
                        phone: '+243 81 000 9999',
                        role: 'Admin Affectateur de Mission',
                        commune: 'Bureau Central'
                      })}
                      className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <PhoneCall size={12} className="text-indigo-400" />
                      <span>Appeler l'Admin (Affectateur)</span>
                    </button>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-2.5 py-0.5 rounded-full">
                      En route
                    </span>
                  </div>
                </div>

                <CartRouteTrackingMap 
                  collectorLat={ebLat}
                  collectorLng={ebLng}
                  collectorName={assignedEb.nom}
                  targetLat={houseLat}
                  targetLng={houseLng}
                  targetLabel={`Votre Parcelle N° ${currentParcelle.numero_parcelle}`}
                  height="260px"
                />
              </div>
            );
          })()}

          {/* Verification & Proofs of Recent Pickups Section */}
          <div className="border-t border-outline-variant/40 pt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                <ShieldCheck className="text-secondary" size={18} />
                <span>Traçabilité des Derniers Ramassages & Sachet Reçus</span>
              </h4>
              <p className="text-[11px] text-on-surface-variant">
                Consultez les preuves de passage de l'éboueur (Coordonnées GPS, Photo du bac/sachet déposé et recharge de sachets). Si vous n'avez pas été servi ou sachet non reçu, contestez directement.
              </p>
            </div>

            {(() => {
              const rawFiltered = activeSignals.filter(s => 
                s.status === 'completed' && 
                (s.parcelle_id === currentParcelle.id || (currentAbonne?.telephone_principal && s.bailleur_telephone && s.bailleur_telephone.replace(/\s+/g, '') === currentAbonne.telephone_principal.replace(/\s+/g, '')))
              );

              // 1. Deduplicate by unique signal ID and merge freshest status
              const uniqueSignalsMap = new Map<string, PoubelleSignal>();
              rawFiltered.forEach(s => {
                const existing = uniqueSignalsMap.get(s.id);
                if (!existing) {
                  uniqueSignalsMap.set(s.id, s);
                } else {
                  uniqueSignalsMap.set(s.id, {
                    ...existing,
                    ...s,
                    confirmation_abonne: (s.confirmation_abonne && s.confirmation_abonne !== 'en_attente') ? s.confirmation_abonne : existing.confirmation_abonne,
                    litige_abonne: s.litige_abonne || existing.litige_abonne,
                    litige_raison: s.litige_raison || existing.litige_raison,
                    statut_evacuation: s.statut_evacuation || existing.statut_evacuation,
                    statut_sachets: s.statut_sachets || existing.statut_sachets,
                    photo_preuve_url: s.photo_preuve_url || existing.photo_preuve_url
                  });
                }
              });

              // 2. Further deduplicate redundant pickup events for same parcel & trash type within same timeframe
              const seenCompositeKeys = new Set<string>();
              const allCompletedSignals: PoubelleSignal[] = [];
              const sorted = Array.from(uniqueSignalsMap.values()).sort((a, b) => {
                const timeA = new Date(a.completed_at || a.reported_at).getTime();
                const timeB = new Date(b.completed_at || b.reported_at).getTime();
                return timeB - timeA;
              });

              for (const sig of sorted) {
                const timeKey = (sig.completed_at || sig.reported_at || '').substring(0, 16);
                const compKey = `${sig.parcelle_id}_${sig.type_poubelle || 'bio'}_${timeKey}`;
                if (!seenCompositeKeys.has(compKey)) {
                  seenCompositeKeys.add(compKey);
                  allCompletedSignals.push(sig);
                }
              }

              const pendingSignals = allCompletedSignals.filter(s => s.confirmation_abonne !== 'confirme');
              const confirmedSignals = allCompletedSignals.filter(s => s.confirmation_abonne === 'confirme');

              const displayedSignals = showConfirmedHistory ? allCompletedSignals : pendingSignals;

              if (allCompletedSignals.length === 0) {
                return (
                  <div className="p-4 rounded-xl bg-background/30 border border-dashed border-outline-variant/40 text-center text-xs text-on-surface-variant italic">
                    Aucun historique de ramassage récent pour cette parcelle. Les preuves s'afficheront ici dès le passage de l'éboueur.
                  </div>
                );
              }

              if (pendingSignals.length === 0 && !showConfirmedHistory) {
                return (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center gap-2.5 text-center">
                    <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs">
                      <CheckCircle2 size={18} />
                      <span>Toutes vos attestations de ramassage et réceptions de sachets sont validées.</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant max-w-md">
                      Aucune prestation en attente de confirmation. Dès qu'une nouvelle collecte sera effectuée, la fiche de validation réapparaîtra ici.
                    </p>
                    {confirmedSignals.length > 0 && (
                      <button
                        onClick={() => setShowConfirmedHistory(true)}
                        className="mt-1 text-[11px] text-secondary hover:underline font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Voir l'historique des {confirmedSignals.length} ramassages validés</span>
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-3.5">
                  {showConfirmedHistory && (
                    <div className="flex justify-between items-center bg-surface/80 p-2.5 rounded-xl border border-outline-variant/40 text-xs">
                      <span className="font-extrabold text-on-surface">Historique complet ({allCompletedSignals.length} ramassages)</span>
                      <button
                        onClick={() => setShowConfirmedHistory(false)}
                        className="text-[11px] text-secondary hover:underline font-bold cursor-pointer"
                      >
                        Masquer les ramassages déjà validés
                      </button>
                    </div>
                  )}

                  {displayedSignals.map((sig) => {
                    const isBio = (sig.type_poubelle || 'biodegradable') === 'biodegradable';
                    const isFullyConfirmed = sig.confirmation_abonne === 'confirme';
                    const isPartiallyConfirmed = sig.confirmation_abonne === 'partiel';
                    const isDisputed = sig.litige_abonne || sig.confirmation_abonne === 'conteste';

                    return (
                      <div key={sig.id} className="p-4 rounded-2xl bg-background/60 border border-outline-variant/80 flex flex-col gap-3 shadow-sm">
                        {/* Header: Exact Trash Type & Pickup Timestamp */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline-variant/40 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`w-3 h-3 rounded-full ${isBio ? 'bg-emerald-400' : 'bg-indigo-400'} animate-pulse`} />
                            <span className="text-xs font-black text-on-surface">
                              {isBio ? '🌿 Ramassage Sachet Biodégradable (Vert)' : '🛢️ Ramassage Sachet Non-Biodégradable (Gris)'}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-mono bg-surface/70 px-2 py-0.5 rounded-md border border-outline-variant/40">
                              {sig.completed_at ? new Date(sig.completed_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Aujourd\'hui'}
                            </span>
                          </div>

                          {/* Overall Status Badge */}
                          {isFullyConfirmed ? (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5">
                              <CheckCircle2 size={13} /> Validé à 100% (Évacué + Sachets Reçus) ✔️
                            </span>
                          ) : isPartiallyConfirmed ? (
                            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5">
                              <Package size={13} /> Évacuation OK • Sachet manquant signalé
                            </span>
                          ) : isDisputed ? (
                            <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5">
                              <AlertCircle size={13} /> Non desservi / Litige transmis au bureau
                            </span>
                          ) : (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                              ⏳ En attente de votre validation
                            </span>
                          )}
                        </div>

                        {/* Dual Track Details (1. Waste evacuation status, 2. Target Sachet delivered, 3. GPS & Photo) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-surface/70 p-3 rounded-xl border border-outline-variant/40 text-[11px]">
                          {/* 1. Évacuation des Déchets */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                              <Trash2 size={13} className="text-secondary" />
                              <span>1. Évacuation Déchets</span>
                            </span>
                            {isFullyConfirmed || sig.statut_evacuation === 'succes' || (!isDisputed && !isPartiallyConfirmed) ? (
                              <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={12} /> {isFullyConfirmed ? 'Déchets évacués avec succès' : 'Signalé vidé par l\'éboueur'}
                              </span>
                            ) : (
                              <span className="font-extrabold text-rose-400 flex items-center gap-1">
                                <AlertTriangle size={12} /> Poubelle non évacuée
                              </span>
                            )}
                          </div>

                          {/* 2. Target Sachet Dotation (Showing ONLY the requested trash type) */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase font-bold text-on-surface-variant flex items-center gap-1">
                              <Package size={13} className={isBio ? "text-emerald-400" : "text-indigo-400"} />
                              <span>2. Recharge Sachet Neuf</span>
                            </span>
                            <span className="font-extrabold text-on-surface">
                              {isBio ? (
                                <strong className="text-emerald-400 font-mono">
                                  +{(sig.sachets_remis_bio ?? 1)} Sachet Vert (Bio)
                                </strong>
                              ) : (
                                <strong className="text-indigo-400 font-mono">
                                  +{(sig.sachets_remis_non_bio ?? 1)} Sachet Gris (Non-Bio)
                                </strong>
                              )}
                            </span>
                            <span className="text-[9.5px] text-on-surface-variant">
                              {isFullyConfirmed ? '✅ Sachet bien réceptionné' : isPartiallyConfirmed ? '❌ Non remis' : 'Remplacement de la poubelle'}
                            </span>
                          </div>

                          {/* 3. GPS on Site & Proof photo */}
                          <div className="flex flex-col justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-on-surface">GPS Contrôlé</span>
                                <span className="text-[9.5px] text-on-surface-variant font-mono">
                                  {sig.gps_validation ? `${sig.gps_validation.distance_metres}m du portail` : 'Confirmé sur place (12m)'}
                                </span>
                              </div>
                            </div>

                            {sig.photo_preuve_url && (
                              <button
                                onClick={() => setSelectedPhotoUrl(sig.photo_preuve_url!)}
                                className="mt-1 px-2 py-1 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors w-max"
                              >
                                <Camera size={11} /> Voir Photo Preuve
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dispute text notice if present */}
                        {sig.litige_abonne && sig.litige_raison && (
                          <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl text-[11px] text-rose-300 flex items-start gap-2">
                            <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <strong>Votre signalement :</strong>
                              <span className="italic">"{sig.litige_raison}"</span>
                              <span className="text-[10px] text-rose-400/80 mt-0.5">Alerte transmise en direct au superviseur pour régularisation immédiate.</span>
                            </div>
                          </div>
                        )}

                        {/* ACTION BUTTONS: Double Verification & Dispute Options */}
                        {!isFullyConfirmed && !isDisputed && !isPartiallyConfirmed && (
                          <div className="flex flex-col gap-2 pt-1 border-t border-outline-variant/40">
                            <div className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1.5">
                              <span>Validez votre prestation pour clôturer le passage :</span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {/* 1. Full Success Confirmation Button (Évacuation OK + Sachet Reçu) */}
                              <button
                                onClick={() => {
                                  if (onConfirmReception) {
                                    onConfirmReception(sig.id, {
                                      statut_evacuation: 'succes',
                                      statut_sachets: 'recu'
                                    });
                                    alert(`✅ Attestation enregistrée ! L'évacuation de votre sachet ${isBio ? 'biodégradable (Vert)' : 'non-dégradable (Gris)'} et la remise de votre nouveau sachet ont été validées avec succès.`);
                                  }
                                }}
                                className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                                title="Confirmer la bonne évacuation de vos ordures ET la réception de vos nouveaux sachets"
                              >
                                <CheckCircle2 size={14} />
                                <span>✅ Tout est parfait : Évacuation réussie & Sachet neuf reçu</span>
                              </button>

                              {/* 2. Evacuation OK but Sachet Missing */}
                              <button
                                onClick={() => {
                                  const reason = `Évacuation du sachet ${isBio ? 'biodégradable (Vert)' : 'non-biodégradable (Gris)'} effectuée mais NOUVEAU SACHET NON REMIS par l'éboueur.`;
                                  if (onReportDispute) {
                                    onReportDispute(sig.id, reason, {
                                      statut_evacuation: 'succes',
                                      statut_sachets: 'non_recu',
                                      confirmation_abonne: 'partiel'
                                    });
                                  }
                                  alert("⚠️ Signalement enregistré : Nous avons noté que l'évacuation a été faite mais que votre sachet neuf n'a pas été remis. L'administration va programmer une livraison de sachet.");
                                }}
                                className="text-[10.5px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                title="Signaler que les déchets ont été pris mais que l'éboueur n'a pas laissé de sachet neuf"
                              >
                                <Package size={13} />
                                <span>⚠️ Évacué mais sachet NON remis</span>
                              </button>

                              {/* 3. Not Served / Waste NOT Collected */}
                              <button
                                onClick={() => {
                                  const reason = `NON DESSERVI : La poubelle / le sachet ${isBio ? 'biodégradable' : 'non-biodégradable'} n'a PAS été évacué à mon portail.`;
                                  if (onReportDispute) {
                                    onReportDispute(sig.id, reason, {
                                      statut_evacuation: 'echec',
                                      statut_sachets: 'non_recu',
                                      confirmation_abonne: 'conteste'
                                    });
                                  }
                                  alert("🚨 Alerte d'urgence transmise immédiatement au superviseur ! Un agent vérifie la position de l'éboueur et reprogramme la collecte.");
                                }}
                                className="text-[10.5px] bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                title="Alerter que l'éboueur n'est pas passé ou n'a pas vidé la poubelle"
                              >
                                <AlertTriangle size={13} />
                                <span>🚨 Non desservi / Poubelle NON évacuée</span>
                              </button>

                              {/* 4. Custom Dispute Modal Trigger */}
                              <button
                                onClick={() => {
                                  setDisputeModalSignalId(sig.id);
                                  setDisputeReasonText('');
                                }}
                                className="text-[10.5px] bg-surface-variant/40 hover:bg-surface-variant text-on-surface-variant hover:text-on-surface border border-outline-variant/60 px-3 py-2 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>💬 Autre motif...</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
                if (canPay) {
                  const detected = detectOperatorFromPhone(paymentPhoneNumber);
                  if (detected) setSelectedPaymentProvider(detected);
                  setShowCheckoutModal(true);
                }
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

      {/* TAB CARTE & SUIVI EBOUEUR */}
      {activeTab === 'carte' && (
        <section className="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-md flex flex-col gap-5 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/40 pb-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                <Navigation className="text-primary rotate-45" size={20} />
                <span>Carte & Suivi du Déplacement de l'Éboueur en Direct</span>
              </h3>
              <p className="text-xs text-on-surface-variant font-medium">
                Suivi GPS en temps réel du chariot d'évacuation assigné à votre parcelle (N° {currentParcelle.numero_parcelle}, Av. {avenue.nom}).
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                playArrivalAlertSound();
                alert("🔔 Test du signal sonore d'arrivée effectué avec succès !");
              }}
              className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 self-start sm:self-auto shadow-sm active:scale-95"
            >
              <Volume2 size={16} className="animate-pulse text-amber-400" />
              <span>🔔 Tester l'Alerte Sonore</span>
            </button>
          </div>

          {!activeSubscriberSignal ? (
            <div className="bg-surface/80 border border-outline-variant/60 rounded-2xl p-8 sm:p-12 flex flex-col items-center text-center gap-4 my-2 shadow-inner">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center border border-primary/20 shadow-sm">
                <Trash2 size={32} />
              </div>

              <div className="flex flex-col gap-1.5 max-w-md">
                <h4 className="text-base font-black text-on-surface">Aucun Signalement Actif</h4>
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                  Vous n'avez actuellement aucun signalement de poubelle en cours pour votre parcelle. Pour suivre la position exacte et l'itinéraire de l'éboueur en temps réel sur la carte, effectuez d'abord un signalement de poubelle pleine.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInternalTab('signalement')}
                className="mt-3 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md hover:opacity-90 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 size={16} />
                <span>Signaler une Poubelle Pleine</span>
              </button>
            </div>
          ) : (
            (() => {
              const ebName = assignedCollectorObj?.nom || "Éboueur de Zone Assigné";
              
              const targetLat = currentParcelle.latitude ?? -4.3316;
              const targetLng = currentParcelle.longitude ?? 15.3139;

              const ebLat = assignedCollectorObj?.latitude ?? activeSubscriberSignal.latitude ?? (targetLat + 0.002);
              const ebLng = assignedCollectorObj?.longitude ?? activeSubscriberSignal.longitude ?? (targetLng - 0.002);

              const currentDistM = getDistanceMeters(ebLat, ebLng, targetLat, targetLng);
              const eta = calculateCartETA(currentDistM, 3.0);
              const isArrivedOrNear = currentDistM <= 50 || arrivalAlertTriggered;

              return (
                <div className="flex flex-col gap-4">
                  {/* Arrival Sound Notification Banner if collector is nearby */}
                  {isArrivedOrNear && (
                    <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border-2 border-amber-400 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-400 text-slate-950 rounded-full font-black text-lg shrink-0">
                          🔔
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-amber-300 uppercase tracking-wider">
                            L'Éboueur arrive devant votre parcelle !
                          </span>
                          <span className="text-xs text-slate-200 font-medium">
                            Signal sonore d'arrivée déclenché. Le chariot est à moins de 50 mètres de votre porte ({currentDistM}m). Veuillez préparer vos sachets.
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => playArrivalAlertSound()}
                        className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-extrabold text-xs shadow cursor-pointer shrink-0 transition-all active:scale-95"
                      >
                        🔊 Rejouer le Son
                      </button>
                    </div>
                  )}

                  {/* Info Bar */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
                        <Truck size={22} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-blue-400 flex items-center gap-2">
                          <span>Éboueur : {ebName}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                            🟢 Course Active
                          </span>
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setActiveCallTarget({
                              name: ebName,
                              phone: assignedCollectorObj?.telephone || '+243 89 000 0000',
                              role: 'Éboueur en Charge de Collecte',
                              commune: commune.nom
                            })}
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                          >
                            <PhoneCall size={11} />
                            <span>Appeler Éboueur</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCallTarget({
                              name: 'Admin Dispatching HICO',
                              phone: '+243 81 000 9999',
                              role: 'Admin Affectateur de Mission',
                              commune: 'Bureau Central'
                            })}
                            className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                          >
                            <PhoneCall size={11} />
                            <span>Appeler Admin</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Distance</span>
                        <span className="text-xs font-mono font-black text-amber-400">{currentDistM} m</span>
                      </div>
                      <div className="h-6 w-px bg-slate-800" />
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Arrivée estimée</span>
                        <span className="text-xs font-mono font-black text-emerald-400">{eta.formatted}</span>
                      </div>
                    </div>
                  </div>

                  {/* Leaflet Cart Route Map Component */}
                  <CartRouteTrackingMap
                    collectorLat={ebLat}
                    collectorLng={ebLng}
                    collectorName={ebName}
                    targetLat={targetLat}
                    targetLng={targetLng}
                    targetLabel={`Parcelle N° ${currentParcelle.numero_parcelle}`}
                    height="420px"
                    showSimulateButton={false}
                    hasMission={true}
                  />
                </div>
              );
            })()
          )}
        </section>
      )}

      {/* TAB 3: BOÎTE DE RÉCEPTION */}
      {activeTab === 'inbox' && (
        <section className="bg-surface border border-outline-variant rounded-2xl p-5 md:p-6 shadow-md flex flex-col gap-5 animate-fade-in">
          {/* Header with counters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-secondary/15 text-secondary rounded-xl border border-secondary/20 shrink-0">
                <Mail size={22} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-extrabold text-on-surface">
                  Boîte de Réception & Communications
                </h3>
                <p className="text-xs text-on-surface-variant font-medium">
                  Consultez vos messages reçus des autorités urbaines et de la société Hico-Cleaning.
                </p>
              </div>
            </div>

            {/* Counter breakdown & Mark All as Read */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-background border border-outline-variant/50 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs">
                <span className="text-rose-500 font-mono font-extrabold">{unreadCount}</span>
                <span className="text-on-surface-variant font-medium">Non lu(s)</span>
                <span className="text-outline-variant">|</span>
                <span className="text-emerald-500 font-mono font-extrabold">{readCount}</span>
                <span className="text-on-surface-variant font-medium">Lu(s)</span>
              </div>

              {unreadCount > 0 && onMarkAllMessagesAsRead && (
                <button
                  type="button"
                  onClick={onMarkAllMessagesAsRead}
                  className="px-3 py-1.5 bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  Tout marquer comme lu
                </button>
              )}

              {onDeleteMessage && messages.some(m => m.read) && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Voulez-vous vraiment supprimer tous les messages lus ?")) {
                      messages.filter(m => m.read).forEach(m => onDeleteMessage(m.id));
                    }
                  }}
                  className="px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error border border-error/30 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  title="Supprimer les messages lus de la boîte de réception"
                >
                  <Trash2 size={13} />
                  <span>Effacer les lus</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs (Tous, Non lus, Lus) */}
          <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
            <button
              type="button"
              onClick={() => setInboxFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                inboxFilter === 'all'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-background/80 hover:text-on-surface'
              }`}
            >
              Tous ({messages.length})
            </button>

            <button
              type="button"
              onClick={() => setInboxFilter('unread')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                inboxFilter === 'unread'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span>Non lus ({unreadCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setInboxFilter('read')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                inboxFilter === 'read'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>Lus ({readCount})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List of Messages inside inbox */}
            <div className="lg:col-span-2 flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
              {(() => {
                const filteredMessages = messages.filter(m => {
                  if (inboxFilter === 'unread') return !m.read;
                  if (inboxFilter === 'read') return m.read;
                  return true;
                });

                if (filteredMessages.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-on-surface-variant italic bg-background/40 border border-outline-variant/40 rounded-2xl">
                      {inboxFilter === 'unread' ? 'Aucun message non lu.' : inboxFilter === 'read' ? 'Aucun message lu.' : 'Aucun message dans votre boîte de réception.'}
                    </div>
                  );
                }

                return filteredMessages.map((msg) => {
                  const isAuthority = msg.sender === 'Autorités Urbaines';
                  const isUnread = !msg.read;

                  return (
                    <div 
                      key={msg.id}
                      onClick={() => {
                        if (isUnread && onMarkMessageAsRead) {
                          onMarkMessageAsRead(msg.id);
                        }
                      }}
                      className={`p-4 border rounded-2xl flex flex-col gap-2 text-xs transition-all relative ${
                        isUnread 
                          ? 'bg-amber-500/10 border-2 border-amber-500/50 shadow-md text-on-surface cursor-pointer hover:border-amber-400' 
                          : 'bg-surface/50 border-outline-variant/40 text-on-surface-variant opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`font-black uppercase tracking-wider text-[9px] px-2.5 py-1 rounded-lg ${
                            isAuthority ? 'bg-error/20 text-error border border-error/30' : 'bg-secondary/20 text-secondary border border-secondary/30'
                          }`}>
                            {msg.sender}
                          </span>

                          {/* Demarcation status badge */}
                          {isUnread ? (
                            <span className="text-[10px] bg-rose-500 text-white font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              <span>NOUVEAU - NON LU</span>
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={11} />
                              <span>MESSAGE LU</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {msg.sent_at}
                          </span>

                          {isUnread && onMarkMessageAsRead && (
                            <button
                              type="button"
                              onClick={() => onMarkMessageAsRead(msg.id)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-[10px] shadow transition-all cursor-pointer active:scale-95"
                              title="Marquer ce message comme lu"
                            >
                              Marquer lu
                            </button>
                          )}

                          {onDeleteMessage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Voulez-vous vraiment supprimer ce message ?")) {
                                  onDeleteMessage(msg.id);
                                }
                              }}
                              className="p-1.5 text-on-surface-variant/60 hover:text-error hover:bg-error/15 rounded-lg border border-transparent hover:border-error/30 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                              title="Supprimer ce message"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className={`leading-relaxed mt-1 ${isUnread ? 'font-bold text-on-surface text-sm' : 'font-medium text-on-surface-variant'}`}>
                        {msg.content}
                      </p>
                    </div>
                  );
                });
              })()}
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentProvider('mpesa')}
                      className={`h-14 rounded-xl border p-2 flex items-center justify-center transition-all ${
                        selectedPaymentProvider === 'mpesa' 
                          ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-500/10' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <MPesaLogo className="h-7 w-auto max-w-full" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentProvider('orange')}
                      className={`h-14 rounded-xl border p-2 flex items-center justify-center transition-all ${
                        selectedPaymentProvider === 'orange' 
                          ? 'bg-orange-950/40 border-orange-500 shadow-md shadow-orange-500/10' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <OrangeMoneyLogo className="h-7 w-auto max-w-full" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentProvider('airtel')}
                      className={`h-14 rounded-xl border p-2 flex items-center justify-center transition-all ${
                        selectedPaymentProvider === 'airtel' 
                          ? 'bg-red-950/40 border-red-600 shadow-md shadow-red-600/10' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <AirtelMoneyLogo className="h-7 w-auto max-w-full" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentProvider('afrimoney')}
                      className={`h-14 rounded-xl border p-2 flex items-center justify-center transition-all ${
                        selectedPaymentProvider === 'afrimoney' 
                          ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <AfrimoneyLogo className="h-7 w-auto max-w-full" />
                    </button>
                  </div>
                </div>

                {/* Phone input */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Numéro de téléphone payeur</span>
                    {detectOperatorFromPhone(paymentPhoneNumber) && (
                      <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Détecté: {detectOperatorFromPhone(paymentPhoneNumber)}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={paymentPhoneNumber}
                    onChange={(e) => handlePaymentPhoneChange(e.target.value)}
                    placeholder="ex: 0812345678 ou 0901234567"
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

      {/* PHOTO PREVIEW MODAL */}
      {selectedPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl p-4 max-w-lg w-full flex flex-col gap-3 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Camera size={16} className="text-primary" /> Preuve Photo du Ramassage
              </span>
              <button
                onClick={() => setSelectedPhotoUrl(null)}
                className="text-xs font-bold text-on-surface-variant hover:text-on-surface p-1 rounded-lg bg-background"
              >
                ✕ Fermer
              </button>
            </div>
            <img 
              src={selectedPhotoUrl} 
              alt="Preuve de ramassage" 
              className="w-full max-h-[380px] object-cover rounded-xl border border-outline-variant"
            />
            <button
              onClick={() => setSelectedPhotoUrl(null)}
              className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs cursor-pointer"
            >
              Fermer la vue photo
            </button>
          </div>
        </div>
      )}

      {/* DISPUTE SUBMISSION MODAL */}
      {disputeModalSignalId && (() => {
        const targetSig = activeSignals.find(s => s.id === disputeModalSignalId);
        const isBio = (targetSig?.type_poubelle || 'biodegradable') === 'biodegradable';

        const quickOptions = isBio ? [
          "Sachet vert (Bio) neuf non remis par l'éboueur",
          "Poubelle biodégradable (déchets organiques) NON évacuée / non vidée",
          "Chauffeur n'est pas venu du tout à mon portail (Non desservi)",
          "Passage validé sans remise de sachet vert",
          "Déchets renversés ou prestation incomplète"
        ] : [
          "Sachet gris (Non-bio) neuf non remis par l'éboueur",
          "Poubelle non-biodégradable (plastiques, verres) NON évacuée / non vidée",
          "Chauffeur n'est pas venu du tout à mon portail (Non desservi)",
          "Passage validé sans remise de sachet gris",
          "Déchets renversés ou prestation incomplète"
        ];

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface border border-outline-variant rounded-2xl p-5 max-w-md w-full flex flex-col gap-4 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-outline-variant pb-2.5">
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5 uppercase">
                  <AlertTriangle size={16} /> Signaler un Litige / Non Servi
                </span>
                <button
                  onClick={() => setDisputeModalSignalId(null)}
                  className="text-xs font-bold text-on-surface-variant hover:text-on-surface p-1 rounded-lg bg-background"
                >
                  ✕
                </button>
              </div>

              <div className="bg-surface-variant/30 p-2.5 rounded-xl text-xs flex flex-col gap-0.5 border border-outline-variant/50">
                <span className="font-bold text-on-surface">
                  {isBio ? '🌿 Signalement Sachet Biodégradable (Vert)' : '🛢️ Signalement Sachet Non-Biodégradable (Gris)'}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Parcelle N° {currentParcelle.numero_parcelle} • {targetSig?.avenue_nom || avenue.nom}
                </span>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Sélectionnez un motif fréquent ou décrivez la situation :
              </p>

              <div className="flex flex-col gap-1.5">
                {quickOptions.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setDisputeReasonText(chip)}
                    className={`text-[11px] px-3 py-2 rounded-xl border transition-all cursor-pointer text-left ${
                      disputeReasonText === chip
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500 font-bold'
                        : 'bg-background hover:bg-surface border-outline-variant/60 text-on-surface-variant'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <textarea
                value={disputeReasonText}
                onChange={(e) => setDisputeReasonText(e.target.value)}
                placeholder="Ou précisez les détails de la réclamation..."
                className="w-full h-20 p-3 bg-background border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-secondary font-sans resize-none"
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDisputeModalSignalId(null)}
                  className="px-4 py-2 bg-background border border-outline-variant text-on-surface-variant rounded-xl text-xs font-bold hover:text-on-surface cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (!disputeReasonText.trim()) {
                      alert("Veuillez choisir ou saisir la raison de votre contestation.");
                      return;
                    }

                    const isWasteNotDone = disputeReasonText.toLowerCase().includes('non évacuée') || 
                                           disputeReasonText.toLowerCase().includes('non vidé') || 
                                           disputeReasonText.toLowerCase().includes('pas venu') || 
                                           disputeReasonText.toLowerCase().includes('non desservi');

                    const isSachetMissing = disputeReasonText.toLowerCase().includes('sachet') || 
                                            disputeReasonText.toLowerCase().includes('remis');

                    if (onReportDispute) {
                      onReportDispute(disputeModalSignalId, disputeReasonText.trim(), {
                        statut_evacuation: isWasteNotDone ? 'echec' : 'succes',
                        statut_sachets: isSachetMissing ? 'non_recu' : 'recu',
                        confirmation_abonne: isWasteNotDone ? 'conteste' : 'partiel'
                      });
                    } else {
                      onSendMessage('Moi (Abonné)', `LITIGE SUR RAMASSAGE : ${disputeReasonText.trim()}`);
                    }
                    alert("🚨 Votre réclamation a bien été transmise en direct au superviseur et à l'administration Hico-Cleaning. Une alerte a été émise pour contrôle immédiat.");
                    setDisputeModalSignalId(null);
                    setDisputeReasonText('');
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <AlertTriangle size={14} />
                  <span>Transmettre au Superviseur</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ⏰ MODAL SIGNALEMENT HORS-DÉLAI (>13H) */}
      {pendingLateSignalType && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border-2 border-amber-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-scale-in">
            <div className="flex items-center gap-3.5 text-amber-400">
              <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                <Clock size={30} className="animate-pulse shrink-0" />
              </div>
              <div>
                <h3 className="text-base font-black text-on-surface">Signalement Hors-Délai (&gt;13h00)</h3>
                <span className="text-xs text-amber-400 font-extrabold uppercase tracking-wide">Avertissement Limite Horaire</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-xs leading-relaxed text-on-surface flex flex-col gap-2.5">
              <p>
                <strong className="text-amber-300 font-black">Attention :</strong> L'heure limite d'enregistrement des poubelles pour la tournée prioritaire du matin est fixée à <strong className="text-white underline">13h00</strong>.
              </p>
              <p>
                Votre alerte pour le sachet <strong className="text-amber-300 uppercase">{pendingLateSignalType === 'biodegradable' ? 'Biodégradable (Vert)' : 'Non-Biodégradable (Gris)'}</strong> sera transmise au bureau avec la mention spéciale :
              </p>
              <div className="bg-black/30 p-2.5 rounded-xl border border-amber-500/30 flex items-center justify-center gap-2 text-amber-300 font-mono font-black text-sm">
                <Clock size={16} /> <span>⏰ HORS DÉLAI (&gt;13h)</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-snug italic">
                L'équipe de dispatching tentera d'affecter un camion en tournée de rattrapage, sinon la collecte s'effectuera au tout premier passage de demain matin.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPendingLateSignalType(null)}
                className="flex-1 py-3 px-4 rounded-2xl border border-outline-variant text-xs font-extrabold text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 transition-all cursor-pointer active:scale-95"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onReportTrashFull(pendingLateSignalType);
                  setPendingLateSignalType(null);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-lg shadow-amber-900/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Compris, Valider</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📞 VOICE CALL MODAL */}
      <VoiceCallModal 
        target={activeCallTarget} 
        onClose={() => setActiveCallTarget(null)} 
      />

    </div>
  );
}
