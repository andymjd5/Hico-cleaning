import React, { useState, useEffect } from 'react';
import { Agent, Commune, Avenue, Parcelle, Abonne, Screen, PoubelleSignal, Eboueur, InboxMessage, SachetStock, SachetDistribution, SubscriptionPayment, StaffPayment, MaterialExpense, DisputeSignal } from './types';
import { 
  INITIAL_AGENTS, 
  INITIAL_COMMUNES, 
  INITIAL_AVENUES, 
  INITIAL_PARCELLES, 
  INITIAL_ABONNES 
} from './initialData';
import { supabase, isSupabaseConfigured } from './lib/supabase';

// Subcomponents
import LoginForm from './components/LoginForm';
import BottomNavBar from './components/BottomNavBar';
import DashboardView from './components/DashboardView';
import CommunesView from './components/CommunesView';
import AvenuesView from './components/AvenuesView';
import RecensementForm from './components/RecensementForm';
import AbonnesView from './components/AbonnesView';
import RapportsView from './components/RapportsView';
import ProfilView from './components/ProfilView';
import CommuneExplorer from './components/CommuneExplorer';
import DechetsMapView from './components/DechetsMapView';
import AbonneSpaceView from './components/AbonneSpaceView';
import EboueurSpaceView from './components/EboueurSpaceView';
import AdminSettingsView from './components/AdminSettingsView';
import SachetsManagementView from './components/SachetsManagementView';
import FinanceManagementView from './components/FinanceManagementView';

// Lucide Icons
import { LayoutDashboard, FileText, Users, BarChart3, User, LogOut, ArrowLeft, Plus, X, RefreshCw, Database, Compass, Trash2, Truck, Settings, Shield, DollarSign, UserPlus, Key, Package, MapPin, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

let globalToastCallback: ((message: string, type?: 'info' | 'success' | 'warning' | 'error') => void) | null = null;

if (typeof window !== 'undefined') {
  const originalAlert = window.alert;
  window.alert = (message: string) => {
    console.log("Alert intercepted:", message);
    if (globalToastCallback) {
      globalToastCallback(message);
    } else {
      try {
        originalAlert(message);
      } catch (e) {
        console.warn("Native alert failed inside sandbox:", e);
      }
    }
  };
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const sanitizeAgentForDb = (agent: Agent) => {
  return {
    id: agent.id,
    nom: agent.nom,
    telephone: agent.telephone,
    role: agent.role,
    created_at: agent.created_at,
    password: agent.password || 'password'
  };
};

export default function App() {
  // 5. Supabase connection feedback state
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error_missing_tables' | 'offline'>('loading');
  const [dbErrorMsg, setDbErrorMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('hico_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('hico_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  // 1. Session state
  const [currentUser, setCurrentUser] = useState<Agent | null>(() => {
    const saved = localStorage.getItem('hico_current_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        return user;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // 2. Active Screen state
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('hico_current_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user.role === 'abonne') return 'abonne_space';
        if (user.role === 'eboueur') return 'eboueur_space';
        return 'dashboard';
      } catch (e) {
        return 'login';
      }
    }
    return 'login';
  });

  // Agents list state
  const [agents, setAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem('hico_agents');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Keep only admin-1 and filter out any hardcoded demo users
          return parsed.filter(a => 
            (a.id === 'admin-1' || !['agent-1', 'abonne-demo', 'eboueur-demo'].includes(a.id))
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'admin-1',
        nom: 'Hico Admin',
        telephone: '0600000000',
        role: 'admin',
        created_at: new Date('2026-05-01').toISOString(),
        password: 'password'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('hico_agents', JSON.stringify(agents));
  }, [agents]);

  const handleUpdatePassword = (newPassword: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, password: newPassword, isTempPassword: false };
    setCurrentUser(updated);
    localStorage.setItem('hico_current_user', JSON.stringify(updated));
    setAgents(prev => prev.map(a => a.id === currentUser.id ? updated : a));
  };

  // 3. Drill-down Context states
  const [selectedCommuneId, setSelectedCommuneId] = useState<string | null>(null);
  const [selectedAvenueObj, setSelectedAvenueObj] = useState<Avenue | null>(null);

  // 4. local DB states with automatic migration to clean production state
  const [communes, setCommunes] = useState<Commune[]>(() => {
    const saved = localStorage.getItem('hico_db_communes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved communes', e);
      }
    }
    return INITIAL_COMMUNES;
  });

  const [avenues, setAvenues] = useState<Avenue[]>(() => {
    const saved = localStorage.getItem('hico_db_avenues');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved avenues', e);
      }
    }
    return INITIAL_AVENUES;
  });

  const [parcelles, setParcelles] = useState<Parcelle[]>(() => {
    const saved = localStorage.getItem('hico_db_parcelles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved parcelles', e);
      }
    }
    return INITIAL_PARCELLES;
  });

  const [abonnes, setAbonnes] = useState<Abonne[]>(() => {
    const saved = localStorage.getItem('hico_db_abonnes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved abonnes', e);
      }
    }
    return INITIAL_ABONNES;
  });

  // 4.2. Waste management and collector tracking states
  const [poubelleSignals, setPoubelleSignals] = useState<PoubelleSignal[]>(() => {
    const saved = localStorage.getItem('hico_poubelle_signals');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out demo signals
          return parsed.filter(s => !['sig-1', 'sig-2', 'p-demo-1', 'p-demo-2'].includes(s.id) && s.parcelle_id !== 'p-demo-1');
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [eboueurs, setEboueurs] = useState<Eboueur[]>(() => {
    const saved = localStorage.getItem('hico_eboueurs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out demo eboueurs
          return parsed.filter(e => 
            !['eb-1', 'eb-2', 'eb-3', 'eboueur-demo'].includes(e.id)
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [eboueursGpsList, setEboueursGpsList] = useState<{ agent_id: string; latitude: number; longitude: number; en_service: boolean }[]>([]);

  const [sachetStocks, setSachetStocks] = useState<SachetStock[]>(() => {
    const saved = localStorage.getItem('hico_sachet_stocks');
    return saved ? JSON.parse(saved) : [];
  });

  const [sachetDistributions, setSachetDistributions] = useState<SachetDistribution[]>(() => {
    const saved = localStorage.getItem('hico_sachet_distributions');
    return saved ? JSON.parse(saved) : [];
  });

  const [payments, setPayments] = useState<SubscriptionPayment[]>(() => {
    const saved = localStorage.getItem('hico_payments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out demo payments
          return parsed.filter(p => !p.id.startsWith('PAY-8219') && p.abonne_id !== 'abonne-demo' && p.abonne_id !== 'ab-demo-2' && p.abonne_id !== 'ab-demo-3');
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [staffPayments, setStaffPayments] = useState<StaffPayment[]>(() => {
    const saved = localStorage.getItem('hico_staff_payments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => !['PAY-STF-1', 'PAY-STF-2', 'PAY-STF-3'].includes(p.id) && !p.recipient_id.startsWith('eb-'));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [materialExpenses, setMaterialExpenses] = useState<MaterialExpense[]>(() => {
    const saved = localStorage.getItem('hico_material_expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => !['EXP-1', 'EXP-2', 'EXP-3'].includes(p.id));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [disputes, setDisputes] = useState<DisputeSignal[]>(() => {
    const saved = localStorage.getItem('hico_disputes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(d => d.id !== 'DISP-1');
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>(() => {
    const saved = localStorage.getItem('hico_inbox_messages');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'msg-1',
        sender: 'Hico-Cleaning',
        content: 'Bienvenue sur votre espace de salubrité Hico-Cleaning ! Retrouvez ici vos factures, vos signalements de poubelles pleines et les alertes d\'assainissement.',
        sent_at: new Date().toISOString(),
        read: false
      }
    ];
  });

  // Real-time and notifications states
  const [activeNotification, setActiveNotification] = useState<PoubelleSignal | null>(null);
  const [hasNewSignals, setHasNewSignals] = useState(false);
  const [mapSelectedSignalId, setMapSelectedSignalId] = useState<string | null>(null);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  useEffect(() => {
    globalToastCallback = (message: string, type?: 'info' | 'success' | 'warning' | 'error') => {
      let inferredType = type || 'info';
      const msgLower = message.toLowerCase();
      if (msgLower.includes('erreur') || msgLower.includes('impossible') || msgLower.includes('échec') || msgLower.includes('fail') || msgLower.includes('rejeter')) {
        inferredType = 'error';
      } else if (msgLower.includes('succès') || msgLower.includes('félicitations') || msgLower.includes('réussi') || msgLower.includes('enregistré avec succès') || msgLower.includes('envoyé !') || msgLower.includes('validée avec succès')) {
        inferredType = 'success';
      } else if (msgLower.includes('attention') || msgLower.includes('warning') || msgLower.includes('déconseillé') || msgLower.includes('en suspens')) {
        inferredType = 'warning';
      }
      addToast(message, inferredType);
    };
    return () => {
      globalToastCallback = null;
    };
  }, []);

  // Clear new signals notification when entering the waste signal map view
  useEffect(() => {
    if (currentScreen === 'dechets_map') {
      setHasNewSignals(false);
    }
  }, [currentScreen]);

  // Real-time subscription to signaux_poubelles and eboueurs_gps tables in Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    console.log("Setting up Supabase Realtime for signaux_poubelles and eboueurs_gps...");
    const channel = supabase
      .channel('public:realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signaux_poubelles' },
        (payload) => {
          console.log("Realtime signaux_poubelles change received:", payload);
          if (payload.eventType === 'INSERT') {
            const newSig = payload.new as any;
            if (!newSig) return;
            setPoubelleSignals(prev => {
              if (prev.some(s => s.id === newSig.id)) return prev;

              const rawStatus = newSig.status || newSig.statut || 'pending';
              let mappedStatus: 'pending' | 'assigned' | 'completed' = 'pending';
              if (rawStatus === 'assigned' || rawStatus === 'assigne') {
                mappedStatus = 'assigned';
              } else if (rawStatus === 'completed' || rawStatus === 'resolu' || rawStatus === 'complete' || rawStatus === 'termine') {
                mappedStatus = 'completed';
              }

              const parc = parcelles.find(p => p.id === newSig.parcelle_id);
              const ave = avenues.find(a => a.id === (newSig.avenue_id || parc?.avenue_id));
              const comm = communes.find(c => c.id === (newSig.commune_id || ave?.commune_id));
              const ab = abonnes.find(a => a.id === newSig.bailleur_id || a.parcelle_id === newSig.parcelle_id);

              const formattedSig: PoubelleSignal = {
                id: newSig.id,
                parcelle_id: newSig.parcelle_id,
                commune_id: newSig.commune_id || ave?.commune_id || '',
                avenue_id: newSig.avenue_id || parc?.avenue_id || '',
                commune_nom: newSig.commune_nom || comm?.nom || 'Kinshasa',
                avenue_nom: newSig.avenue_nom || ave?.nom || 'Avenue Inconnue',
                numero_parcelle: newSig.numero_parcelle || parc?.numero_parcelle || 'N/A',
                bailleur_nom: newSig.bailleur_nom || ab?.nom_complet || 'Abonné',
                bailleur_telephone: newSig.bailleur_telephone || ab?.telephone_principal || '',
                status: mappedStatus,
                assigned_eboueur_id: newSig.assigned_eboueur_id || newSig.eboueur_assigne_id || null,
                reported_at: newSig.reported_at || newSig.created_at || new Date().toISOString(),
                completed_at: newSig.completed_at || newSig.resolved_at || null,
                type_poubelle: newSig.type_poubelle || 'biodegradable'
              };

              setActiveNotification(formattedSig);
              setHasNewSignals(true);
              return [formattedSig, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedSig = payload.new as any;
            if (!updatedSig) return;
            setPoubelleSignals(prev => prev.map(s => {
              if (s.id !== updatedSig.id) return s;

              const rawStatus = updatedSig.status || updatedSig.statut || s.status || 'pending';
              let mappedStatus: 'pending' | 'assigned' | 'completed' = 'pending';
              if (rawStatus === 'assigned' || rawStatus === 'assigne') {
                mappedStatus = 'assigned';
              } else if (rawStatus === 'completed' || rawStatus === 'resolu' || rawStatus === 'complete' || rawStatus === 'termine') {
                mappedStatus = 'completed';
              }

              const assignedEboueurId = 
                (updatedSig.assigned_eboueur_id !== undefined && updatedSig.assigned_eboueur_id !== null)
                  ? updatedSig.assigned_eboueur_id 
                  : (updatedSig.eboueur_assigne_id !== undefined && updatedSig.eboueur_assigne_id !== null)
                    ? updatedSig.eboueur_assigne_id 
                    : s.assigned_eboueur_id;
              const completedAt = updatedSig.completed_at || updatedSig.resolved_at || s.completed_at || null;
              const reportedAt = updatedSig.reported_at || updatedSig.created_at || s.reported_at || new Date().toISOString();

              return {
                ...s,
                status: mappedStatus,
                assigned_eboueur_id: assignedEboueurId,
                reported_at: reportedAt,
                completed_at: completedAt,
                type_poubelle: updatedSig.type_poubelle || s.type_poubelle || 'biodegradable'
              };
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldSig = payload.old as { id: string };
            if (oldSig) {
              setPoubelleSignals(prev => prev.filter(s => s.id !== oldSig.id));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eboueurs_gps' },
        (payload) => {
          console.log("Realtime eboueurs_gps change received:", payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any;
            if (!updatedRow) return;
            setEboueursGpsList(prev => {
              const filtered = prev.filter(g => g.agent_id !== updatedRow.agent_id);
              return [...filtered, {
                agent_id: updatedRow.agent_id,
                latitude: updatedRow.latitude,
                longitude: updatedRow.longitude,
                en_service: updatedRow.en_service
              }];
            });
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as any;
            if (oldRow && oldRow.agent_id) {
              setEboueursGpsList(prev => prev.filter(g => g.agent_id !== oldRow.agent_id));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Supabase Realtime subscription status:", status);
      });

    return () => {
      console.log("Cleaning up Supabase Realtime channel...");
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConfigured, parcelles, avenues, communes, abonnes]);

  // Local Storage Synchronization for waste management
  useEffect(() => {
    localStorage.setItem('hico_poubelle_signals', JSON.stringify(poubelleSignals));
  }, [poubelleSignals]);

  useEffect(() => {
    localStorage.setItem('hico_eboueurs', JSON.stringify(eboueurs));
  }, [eboueurs]);

  // Synchroniser les agents de rôle 'eboueur' avec la liste 'eboueurs' pour l'affichage de la carte
  useEffect(() => {
    const eboueursFromAgents = agents.filter(a => 
      a.role === 'eboueur'
    );
    let hasChanges = false;
    // Keep only clean eboueurs
    const updatedEboueurs = eboueurs.filter(e => true);

    if (updatedEboueurs.length !== eboueurs.length) {
      hasChanges = true;
    }

    eboueursFromAgents.forEach(agent => {
      const exists = updatedEboueurs.some(e => e.telephone === agent.telephone || e.id === agent.id);
      const gpsInfo = eboueursGpsList.find(g => g.agent_id === agent.id);

      if (!exists) {
        const offset = updatedEboueurs.length;
        updatedEboueurs.push({
          id: agent.id,
          nom: agent.nom,
          telephone: agent.telephone,
          latitude: gpsInfo ? gpsInfo.latitude : (-4.3316 + (offset % 5) * 0.015 - 0.03),
          longitude: gpsInfo ? gpsInfo.longitude : (15.3139 + (offset % 5) * 0.012 - 0.02),
          status: 'idle',
          gps_active: gpsInfo ? gpsInfo.en_service : false
        });
        hasChanges = true;
      } else {
        const currentIdx = updatedEboueurs.findIndex(e => e.id === agent.id || e.telephone === agent.telephone);
        if (currentIdx !== -1) {
          const currentEb = updatedEboueurs[currentIdx];
          const cloudLat = gpsInfo ? gpsInfo.latitude : currentEb.latitude;
          const cloudLng = gpsInfo ? gpsInfo.longitude : currentEb.longitude;
          const cloudActive = gpsInfo ? gpsInfo.en_service : currentEb.gps_active;

          if (
            currentEb.id !== agent.id ||
            currentEb.latitude !== cloudLat ||
            currentEb.longitude !== cloudLng ||
            currentEb.gps_active !== cloudActive
          ) {
            updatedEboueurs[currentIdx] = {
              ...currentEb,
              id: agent.id,
              latitude: cloudLat,
              longitude: cloudLng,
              gps_active: cloudActive
            };
            hasChanges = true;
          }
        }
      }
    });

    if (hasChanges) {
      setEboueurs(updatedEboueurs);
    }
  }, [agents, eboueursGpsList]);

  useEffect(() => {
    localStorage.setItem('hico_inbox_messages', JSON.stringify(inboxMessages));
  }, [inboxMessages]);

  useEffect(() => {
    localStorage.setItem('hico_sachet_stocks', JSON.stringify(sachetStocks));
  }, [sachetStocks]);

  useEffect(() => {
    localStorage.setItem('hico_sachet_distributions', JSON.stringify(sachetDistributions));
  }, [sachetDistributions]);

  useEffect(() => {
    localStorage.setItem('hico_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('hico_staff_payments', JSON.stringify(staffPayments));
  }, [staffPayments]);

  useEffect(() => {
    localStorage.setItem('hico_material_expenses', JSON.stringify(materialExpenses));
  }, [materialExpenses]);

  useEffect(() => {
    localStorage.setItem('hico_disputes', JSON.stringify(disputes));
  }, [disputes]);

  // Seed sachet stocks when communes are loaded and stocks are empty
  useEffect(() => {
    const seedSachetStocks = async () => {
      if (communes.length > 0 && sachetStocks.length === 0) {
        const centralStock: SachetStock = {
          id: 'stk-central',
          commune_id: null,
          biodegradable: 10000, // Stock global central initial
          non_biodegradable: 10000, // Stock global central initial
          seuil_alerte: 50,
          last_replenished: new Date().toISOString()
        };

        const initialStocks: SachetStock[] = communes.map(c => ({
          id: 'stk-' + c.id,
          commune_id: c.id,
          biodegradable: 500, // Stock de départ uniforme et professionnel
          non_biodegradable: 500, // Stock de départ uniforme et professionnel
          seuil_alerte: 50,
          last_replenished: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
        }));

        const allInitialStocks = [centralStock, ...initialStocks];
        
        setSachetStocks(allInitialStocks);

        // Si Supabase est configuré et connecté, persister immédiatement ces stocks initiaux
        if (isSupabaseConfigured && dbStatus === 'connected') {
          try {
            const { error } = await supabase.from('sachet_stocks').upsert(allInitialStocks);
            if (error) {
              console.warn("Erreur de persistance du stock initial sur Supabase:", error);
            } else {
              console.log("Stock de sachets initial synchronisé avec succès sur Supabase.");
            }
          } catch (e) {
            console.warn("Échec de la synchronisation du stock de sachets initial :", e);
          }
        }
      }
    };

    seedSachetStocks();
  }, [communes, sachetStocks, isSupabaseConfigured, dbStatus]);

  // S'assurer de la présence du Stock Central si le tableau sachetStocks est chargé mais ne l'inclut pas
  useEffect(() => {
    if (sachetStocks.length > 0) {
      const hasCentral = sachetStocks.some(s => s.commune_id === null || s.id === 'stk-central');
      if (!hasCentral) {
        const centralStock: SachetStock = {
          id: 'stk-central',
          commune_id: null,
          biodegradable: 10000,
          non_biodegradable: 10000,
          seuil_alerte: 50,
          last_replenished: new Date().toISOString()
        };
        
        setSachetStocks(prev => [centralStock, ...prev]);

        if (isSupabaseConfigured && dbStatus === 'connected') {
          const syncCentral = async () => {
            try {
              const { error } = await supabase.from('sachet_stocks').upsert([centralStock]);
              if (error) throw error;
            } catch (err) {
              console.warn("Erreur d'initialisation du stock central manquant sur Supabase:", err);
            }
          };
          syncCentral();
        }
      }
    }
  }, [sachetStocks, isSupabaseConfigured, dbStatus]);

  // Dynamic screen permission verification helper
  const isScreenAllowed = (screenId: string) => {
    if (!currentUser) return false;
    if (screenId === 'login' || screenId === 'profil') return true;
    
    // Admins always have access to settings and administrative features to prevent lockouts
    if (currentUser.role === 'admin') {
      const adminScreens = [
        'dashboard', 'communes', 'avenues', 'recensement_form', 'abonne_list', 'abonne_detail', 
        'rapports', 'commune_explorer', 'dechets_map', 'sachets_management', 'finance_management', 
        'admin_settings_screens', 'admin_settings_pricing', 'admin_settings_accounts', 'admin_settings_passwords'
      ];
      if (adminScreens.includes(screenId)) {
        return true;
      }
    }

    let perms;
    const customPermsRaw = localStorage.getItem('hico_role_permissions');
    if (customPermsRaw) {
      try {
        perms = JSON.parse(customPermsRaw);
        let updated = false;
        
        if (perms.admin) {
          const requiredAdminScreens = [
            'sachets_management', 'finance_management', 'admin_settings_screens', 
            'admin_settings_pricing', 'admin_settings_accounts', 'admin_settings_passwords'
          ];
          requiredAdminScreens.forEach(s => {
            if (!perms.admin.includes(s)) {
              perms.admin.push(s);
              updated = true;
            }
          });
        }
        
        if (perms.agent) {
          const requiredAgentScreens = [
            'sachets_management', 'finance_management'
          ];
          requiredAgentScreens.forEach(s => {
            if (!perms.agent.includes(s)) {
              perms.agent.push(s);
              updated = true;
            }
          });
        }
        
        if (updated) {
          localStorage.setItem('hico_role_permissions', JSON.stringify(perms));
        }
      } catch (e) {
        // Fallback below
      }
    }
    
    if (!perms) {
      perms = {
        admin: [
          'dashboard', 'communes', 'avenues', 'recensement_form', 'abonne_list', 'abonne_detail', 
          'rapports', 'commune_explorer', 'dechets_map', 'sachets_management', 'finance_management', 'admin_settings_screens', 
          'admin_settings_pricing', 'admin_settings_accounts', 'admin_settings_passwords'
        ],
        agent: ['dashboard', 'communes', 'avenues', 'recensement_form', 'abonne_list', 'abonne_detail', 'commune_explorer', 'dechets_map', 'sachets_management', 'finance_management'],
        abonne: ['abonne_space'],
        eboueur: ['eboueur_space']
      };
    }

    const allowed = perms[currentUser.role] || [];
    return allowed.includes(screenId);
  };

  // Navigation Guards to strictly prevent role leaks
  useEffect(() => {
    if (!currentUser) return;
    
    // Profile, login and password changes are always implicitly allowed
    const implicitlyAllowed = ['login', 'profil'];
    
    if (currentScreen !== 'login' && !isScreenAllowed(currentScreen) && !implicitlyAllowed.includes(currentScreen)) {
      // Send them back to their default screen
      if (currentUser.role === 'abonne') {
        setCurrentScreen('abonne_space');
      } else if (currentUser.role === 'eboueur') {
        setCurrentScreen('eboueur_space');
      } else {
        setCurrentScreen('dashboard');
      }
    }
  }, [currentScreen, currentUser]);

  // Removed demo seeding to allow starting with a clean production database as requested.

  // Load from Supabase on mount with localStorage as reactive offline fallback
  const fetchAllData = async () => {
    if (!isSupabaseConfigured) {
      setDbStatus('offline');
      // Load from localStorage as fallback
      const savedCommunes = localStorage.getItem('hico_db_communes');
      const savedAvenues = localStorage.getItem('hico_db_avenues');
      const savedParcelles = localStorage.getItem('hico_db_parcelles');
      const savedAbonnes = localStorage.getItem('hico_db_abonnes');

      const parsedC = savedCommunes ? JSON.parse(savedCommunes) : null;
      setCommunes(Array.isArray(parsedC) && parsedC.length > 0 ? parsedC : INITIAL_COMMUNES);
      setAvenues(savedAvenues ? JSON.parse(savedAvenues) : INITIAL_AVENUES);
      setParcelles(savedParcelles ? JSON.parse(savedParcelles) : INITIAL_PARCELLES);
      setAbonnes(savedAbonnes ? JSON.parse(savedAbonnes) : INITIAL_ABONNES);
      return;
    }

    setDbStatus('loading');
    try {
      // 1. Fetch Corrupted state or clean Communes
      const { data: coms, error: comsError } = await supabase
        .from('communes')
        .select('*')
        .order('nom', { ascending: true });

      if (comsError) throw comsError;

      let activeCommunes = coms || [];
      
      // Auto seed 24 communes on clean setup
      if (activeCommunes.length === 0) {
        try {
          const { error: seedError } = await supabase.from('communes').insert(INITIAL_COMMUNES);
          if (seedError) {
            console.warn("Supabase seed communes failed, using INITIAL_COMMUNES fallback", seedError);
          }
        } catch (e) {
          console.warn("Supabase seed communes exception", e);
        }
        activeCommunes = [...INITIAL_COMMUNES];
      }
      setCommunes(activeCommunes);

      // 2. Fetch Avenues
      const { data: aves, error: avesError } = await supabase
        .from('avenues')
        .select('*');
      if (avesError) throw avesError;
      setAvenues(aves || []);

      // 3. Fetch Parcelles
      const { data: parcs, error: parcsError } = await supabase
        .from('parcelles')
        .select('*')
        .order('created_at', { ascending: false });
      if (parcsError) throw parcsError;
      setParcelles(parcs || []);

      // 4. Fetch Abonnes
      const { data: abs, error: absError } = await supabase
        .from('abonnes')
        .select('*');
      if (absError) throw absError;
      setAbonnes(abs || []);

      // 5. Fetch Agents (with graceful fallback if table 'agents' doesn't exist yet)
      try {
        const { data: ags, error: agsError } = await supabase
          .from('agents')
          .select('*');
        if (!agsError && ags) {
          const mergedAgents = [...ags];
          const hasAdmin = mergedAgents.some(a => a.role === 'admin' || a.id === 'admin-1' || a.telephone === '0600000000');
          if (!hasAdmin) {
            const defaultAdmin: Agent = {
              id: 'admin-1',
              nom: 'Hico Admin',
              telephone: '0600000000',
              role: 'admin',
              created_at: new Date('2026-05-01').toISOString(),
              password: 'password',
              isTempPassword: false
            };
            mergedAgents.unshift(defaultAdmin);
            try {
              const { error } = await supabase.from('agents').upsert([sanitizeAgentForDb(defaultAdmin)]);
              if (error) console.warn("Failed to auto-upsert default admin:", error);
            } catch (err) {
              console.warn("Failed to auto-upsert default admin:", err);
            }
          }
          setAgents(mergedAgents);
        }
      } catch (agentErr) {
        console.warn("Table 'agents' not accessible or doesn't exist yet in Supabase. Using localStorage fallback.", agentErr);
      }

      // 5b. Fetch Eboueurs GPS from Supabase
      try {
        const { data: gpsData, error: gpsError } = await supabase
          .from('eboueurs_gps')
          .select('*');
        if (!gpsError && gpsData) {
          setEboueursGpsList(gpsData.map((g: any) => ({
            agent_id: g.agent_id,
            latitude: g.latitude,
            longitude: g.longitude,
            en_service: g.en_service
          })));
        }
      } catch (gpsErr) {
        console.warn("Table 'eboueurs_gps' not accessible or doesn't exist yet in Supabase.", gpsErr);
      }

      // 6. Fetch Poubelle Signals
      try {
        const { data: sigs, error: sigsError } = await supabase
          .from('signaux_poubelles')
          .select('*');
        if (!sigsError && sigs) {
          const formatted = sigs.map((s: any) => {
            // Safe lookups in case of normalized columns
            const parc = (parcs || []).find(p => p.id === s.parcelle_id);
            const ave = (aves || []).find(a => a.id === (s.avenue_id || parc?.avenue_id));
            const comm = (activeCommunes || []).find(c => c.id === (s.commune_id || ave?.commune_id));
            const ab = (abs || []).find(a => a.id === s.bailleur_id || a.parcelle_id === s.parcelle_id);

            const rawStatus = s.status || s.statut || 'pending';
            let mappedStatus: 'pending' | 'assigned' | 'completed' = 'pending';
            if (rawStatus === 'assigned' || rawStatus === 'assigne') {
              mappedStatus = 'assigned';
            } else if (rawStatus === 'completed' || rawStatus === 'resolu' || rawStatus === 'complete' || rawStatus === 'termine') {
              mappedStatus = 'completed';
            }

            return {
              id: s.id,
              parcelle_id: s.parcelle_id,
              commune_id: s.commune_id || ave?.commune_id || '',
              avenue_id: s.avenue_id || parc?.avenue_id || '',
              commune_nom: s.commune_nom || comm?.nom || 'Kinshasa',
              avenue_nom: s.avenue_nom || ave?.nom || 'Avenue Inconnue',
              numero_parcelle: s.numero_parcelle || parc?.numero_parcelle || 'N/A',
              bailleur_nom: s.bailleur_nom || ab?.nom_complet || 'Abonné',
              bailleur_telephone: s.bailleur_telephone || ab?.telephone_principal || '',
              status: mappedStatus,
              assigned_eboueur_id: s.assigned_eboueur_id || s.eboueur_assigne_id || null,
              reported_at: s.reported_at || s.created_at || new Date().toISOString(),
              completed_at: s.completed_at || s.resolved_at || null,
              type_poubelle: s.type_poubelle || 'biodegradable'
            };
          });

          // Sort safely in memory
          formatted.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());
          setPoubelleSignals(formatted);
        }
      } catch (e) {
        console.warn("Table 'signaux_poubelles' not accessible, using localStorage fallback.", e);
        const saved = localStorage.getItem('hico_poubelle_signals');
        if (saved) {
          try {
            setPoubelleSignals(JSON.parse(saved));
          } catch (_) {}
        }
      }

      // 7. Fetch Sachet Stocks
      try {
        const { data: stocks, error: stocksError } = await supabase
          .from('sachet_stocks')
          .select('*');
        if (!stocksError && stocks && stocks.length > 0) {
          setSachetStocks(stocks);
        }
      } catch (e) {
        console.warn("Table 'sachet_stocks' not accessible, using localStorage fallback.", e);
      }

      // 8. Fetch Sachet Distributions
      try {
        const { data: dists, error: distsError } = await supabase
          .from('sachet_distributions')
          .select('*')
          .order('date_distribution', { ascending: false });
        if (!distsError && dists) {
          setSachetDistributions(dists);
        }
      } catch (e) {
        console.warn("Table 'sachet_distributions' not accessible, using localStorage fallback.", e);
      }

      // 9. Fetch Payments
      try {
        const { data: pays, error: paysError } = await supabase
          .from('subscription_payments')
          .select('*')
          .order('date_paiement', { ascending: false });
        if (!paysError && pays) {
          setPayments(pays);
        }
      } catch (e) {
        console.warn("Table 'subscription_payments' not accessible, using localStorage fallback.", e);
      }

      // 10. Fetch Staff Payments
      try {
        const { data: spays, error: spaysError } = await supabase
          .from('staff_payments')
          .select('*')
          .order('date_paiement', { ascending: false });
        if (!spaysError && spays) {
          setStaffPayments(spays);
        }
      } catch (e) {
        console.warn("Table 'staff_payments' not accessible, using localStorage fallback.", e);
      }

      // 11. Fetch Material Expenses
      try {
        const { data: exps, error: expsError } = await supabase
          .from('material_expenses')
          .select('*')
          .order('date_depense', { ascending: false });
        if (!expsError && exps) {
          setMaterialExpenses(exps);
        }
      } catch (e) {
        console.warn("Table 'material_expenses' not accessible, using localStorage fallback.", e);
      }

      // 12. Fetch Disputes
      try {
        const { data: disps, error: dispsError } = await supabase
          .from('dispute_signals')
          .select('*')
          .order('date_constat', { ascending: false });
        if (!dispsError && disps) {
          setDisputes(disps);
        }
      } catch (e) {
        console.warn("Table 'dispute_signals' not accessible, using localStorage fallback.", e);
      }

      // 13. Fetch Inbox Messages
      try {
        const { data: msgs, error: msgsError } = await supabase
          .from('inbox_messages')
          .select('*')
          .order('sent_at', { ascending: false });
        if (!msgsError && msgs) {
          setInboxMessages(msgs);
        }
      } catch (e) {
        console.warn("Table 'inbox_messages' not accessible, using localStorage fallback.", e);
      }

      // 14. Fetch System Settings
      try {
        const { data: dbSettings, error: dbSettingsError } = await supabase
          .from('system_settings')
          .select('*');
        if (!dbSettingsError && dbSettings && dbSettings.length > 0) {
          dbSettings.forEach((setting: any) => {
            const rawVal = setting.value;
            let valStr = '';
            if (typeof rawVal === 'object' && rawVal !== null) {
              valStr = JSON.stringify(rawVal);
            } else {
              valStr = String(rawVal);
              // Strip quotes if they were double-serialized
              if (valStr.startsWith('"') && valStr.endsWith('"')) {
                valStr = valStr.substring(1, valStr.length - 1);
              }
            }
            if (setting.id === 'subscription_price') {
              localStorage.setItem('hico_subscription_price', valStr);
            } else if (setting.id === 'subscription_currency') {
              localStorage.setItem('hico_subscription_currency', valStr);
            } else if (setting.id === 'commune_prices') {
              localStorage.setItem('hico_commune_prices', valStr);
            } else if (setting.id === 'role_permissions') {
              localStorage.setItem('hico_role_permissions', valStr);
            }
          });
        }
      } catch (e) {
        console.warn("Table 'system_settings' not accessible, using localStorage fallback.", e);
      }

      setDbStatus('connected');
      setDbErrorMsg(null);
    } catch (err: any) {
      console.error('Supabase fetch failed:', err);
      setDbStatus('error_missing_tables');
      setDbErrorMsg(err?.message || "Impossible d'accéder aux tables de la base de données.");
      
      // Fallback securely to LocalStorage
      const savedCommunes = localStorage.getItem('hico_db_communes');
      const savedAvenues = localStorage.getItem('hico_db_avenues');
      const savedParcelles = localStorage.getItem('hico_db_parcelles');
      const savedAbonnes = localStorage.getItem('hico_db_abonnes');

      const parsedC = savedCommunes ? JSON.parse(savedCommunes) : null;
      setCommunes(Array.isArray(parsedC) && parsedC.length > 0 ? parsedC : INITIAL_COMMUNES);
      setAvenues(savedAvenues ? JSON.parse(savedAvenues) : INITIAL_AVENUES);
      setParcelles(savedParcelles ? JSON.parse(savedParcelles) : INITIAL_PARCELLES);
      setAbonnes(savedAbonnes ? JSON.parse(savedAbonnes) : INITIAL_ABONNES);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Sync to local disk fallback automatically
  useEffect(() => {
    localStorage.setItem('hico_db_communes', JSON.stringify(communes));
  }, [communes]);

  useEffect(() => {
    localStorage.setItem('hico_db_avenues', JSON.stringify(avenues));
  }, [avenues]);

  useEffect(() => {
    localStorage.setItem('hico_db_parcelles', JSON.stringify(parcelles));
  }, [parcelles]);

  useEffect(() => {
    localStorage.setItem('hico_db_abonnes', JSON.stringify(abonnes));
  }, [abonnes]);

  // 5. Creating overlays modals toggle states
  const [showAddCommuneModal, setShowAddCommuneModal] = useState(false);
  const [showAddAvenueModal, setShowAddAvenueModal] = useState(false);

  // Modal Inputs state
  const [newCommuneName, setNewCommuneName] = useState('');
  const [newAvenueName, setNewAvenueName] = useState('');
  const [newAvenueCommuneId, setNewAvenueCommuneId] = useState('');

  const handleLogin = (agent: Agent) => {
    setCurrentUser(agent);
    localStorage.setItem('hico_current_user', JSON.stringify(agent));
    if (agent.role === 'abonne') {
      setCurrentScreen('abonne_space');
    } else if (agent.role === 'eboueur') {
      setCurrentScreen('eboueur_space');
    } else {
      setCurrentScreen('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hico_current_user');
    setCurrentScreen('login');
  };

  const handleResetDatabase = async () => {
    const confirmClear = window.confirm("Attention : Voulez-vous vraiment réinitialiser toutes les données ?");
    if (!confirmClear) return;

    if (isSupabaseConfigured && dbStatus === 'connected') {
      setSyncing(true);
      try {
        // Enlève l'ensemble des parcelles et avenues (la cascade SQL gérera le reste)
        await supabase.from('parcelles').delete().neq('id', 'void');
        await supabase.from('avenues').delete().neq('id', 'void');
        
        // delete extra communes to restore default 24
        await supabase.from('communes').delete().neq('id', 'void');
      } catch (err) {
        console.error("Purge Supabase échouée :", err);
      } finally {
        setSyncing(false);
      }
    }

    setCommunes(INITIAL_COMMUNES);
    setAvenues(INITIAL_AVENUES);
    setParcelles(INITIAL_PARCELLES);
    setAbonnes(INITIAL_ABONNES);
    setSelectedCommuneId(null);
    setSelectedAvenueObj(null);
    
    // Auto restore seeds inside Supabase asynchronously if connected
    if (isSupabaseConfigured && dbStatus === 'connected') {
      supabase.from('communes').insert(INITIAL_COMMUNES).then(() => fetchAllData());
    }
  };

  // Add customized entities inside local DB + push to Supabase
  const handleAddCommune = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommuneName.trim()) return;

    const newId = 'c-' + Math.random().toString(36).substring(2, 11);
    const newC: Commune = {
      id: newId,
      nom: newCommuneName.trim(),
      created_at: new Date().toISOString()
    };

    // Optimistically update local UI immediately
    setCommunes([newC, ...communes]);
    setNewCommuneName('');
    setShowAddCommuneModal(false);

    if (isSupabaseConfigured && dbStatus === 'connected') {
      setSyncing(true);
      try {
        const { error } = await supabase.from('communes').insert([newC]);
        if (error) throw error;
      } catch (err: any) {
        alert("Erreur de sauvegarde Supabase, la commune a été enregistrée en mode local temporaire.\nDétail : " + (err.message || err));
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleAddAvenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetedCommuneId = newAvenueCommuneId || selectedCommuneId;
    if (!newAvenueName.trim() || !targetedCommuneId) {
      alert("Veuillez renseigner le nom d'avenue et sélectionner sa commune d'appartenance.");
      return;
    }

    const newId = 'av-' + Math.random().toString(36).substring(2, 11);
    const newA: Avenue = {
      id: newId,
      commune_id: targetedCommuneId,
      nom: newAvenueName.trim(),
      created_at: new Date().toISOString()
    };

    // Optimistically update local UI immediately
    setAvenues([newA, ...avenues]);
    setNewAvenueName('');
    setShowAddAvenueModal(false);

    if (isSupabaseConfigured && dbStatus === 'connected') {
      setSyncing(true);
      try {
        const { error } = await supabase.from('avenues').insert([newA]);
        if (error) throw error;
      } catch (err: any) {
        alert("Erreur de sauvegarde Supabase, l'avenue a été enregistrée en mode local temporaire.\nDétail : " + (err.message || err));
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleAddParcelleAndAbonne = async (newParcelle: Parcelle, newAbonne: Abonne) => {
    // Optimistically update local UI state immediately
    setParcelles([newParcelle, ...parcelles]);
    setAbonnes([newAbonne, ...abonnes]);

    // Automatically register/update an Abonné agent account with default temporary password '12345'
    const cleanPhoneInput = (newAbonne.telephone_principal || '').replace(/\s+/g, '');
    if (cleanPhoneInput) {
      const abonneAgent: Agent = {
        id: 'abonne-' + newAbonne.id,
        nom: newAbonne.nom_complet,
        telephone: newAbonne.telephone_principal,
        role: 'abonne',
        parcelle_id: newParcelle.id,
        created_at: new Date().toISOString(),
        password: '12345',
        isTempPassword: true
      };

      setAgents(prev => {
        const existingIdx = prev.findIndex(a => (a.telephone || '').replace(/\s+/g, '') === cleanPhoneInput);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = {
            ...copy[existingIdx],
            nom: newAbonne.nom_complet,
            role: 'abonne',
            parcelle_id: newParcelle.id
          };
          return copy;
        }
        return [abonneAgent, ...prev];
      });

      if (isSupabaseConfigured && dbStatus === 'connected') {
        try {
          await supabase.from('agents').upsert([sanitizeAgentForDb(abonneAgent)]);
        } catch (err) {
          console.warn("Supabase auto-agent creation for abonne failed:", err);
        }
      }
    }

    if (isSupabaseConfigured && dbStatus === 'connected') {
      setSyncing(true);
      try {
        // Envoi synchrone de la parcelle
        const { error: parcelleError } = await supabase.from('parcelles').insert([newParcelle]);
        if (parcelleError) throw parcelleError;

        // Envoi de l'abonné
        const { error: abonneError } = await supabase.from('abonnes').insert([newAbonne]);
        if (abonneError) throw abonneError;
      } catch (err: any) {
        alert("Sauvegarde cloud en suspens (Enregistré localement) :\n" + (err.message || err));
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleResetPasswordRequest = (phoneInput: string) => {
    const cleanPhoneInput = phoneInput.replace(/\s+/g, '');
    if (!cleanPhoneInput) {
      return { success: false, error: "Veuillez entrer un numéro de téléphone valide." };
    }

    let foundAgent = agents.find(a => (a.telephone || '').replace(/\s+/g, '') === cleanPhoneInput);

    if (!foundAgent && abonnes && abonnes.length > 0) {
      const foundAbonne = abonnes.find(ab => (ab.telephone_principal || '').replace(/\s+/g, '') === cleanPhoneInput);
      if (foundAbonne) {
        foundAgent = {
          id: 'abonne-' + foundAbonne.id,
          nom: foundAbonne.nom_complet,
          telephone: foundAbonne.telephone_principal,
          role: 'abonne',
          parcelle_id: foundAbonne.parcelle_id,
          created_at: new Date().toISOString(),
          password: '12345',
          isTempPassword: true
        };
      }
    }

    if (!foundAgent) {
      return { success: false, error: "Aucun compte Abonné ou Agent trouvé pour ce numéro de téléphone." };
    }

    const updated: Agent = {
      ...foundAgent,
      password: '12345',
      isTempPassword: true
    };

    setAgents(prev => {
      const idx = prev.findIndex(a => a.id === updated.id || (a.telephone || '').replace(/\s+/g, '') === cleanPhoneInput);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });

    if (isSupabaseConfigured && dbStatus === 'connected') {
      supabase.from('agents').upsert([sanitizeAgentForDb(updated)]).then(({ error }) => {
        if (error) console.warn("Failed to reset agent password in Supabase:", error);
      });
    }

    return { success: true, userNom: updated.nom };
  };

  const handleUpdateParcelleGps = async (parcelleId: string, latitude: number, longitude: number) => {
    // Update local state
    setParcelles(prev => prev.map(p => {
      if (p.id === parcelleId) {
        return {
          ...p,
          latitude,
          longitude,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    }));

    // Save in localStorage backup
    const storedParcelles = localStorage.getItem('hico_parcelles');
    if (storedParcelles) {
      try {
        const parsed = JSON.parse(storedParcelles) as Parcelle[];
        const updated = parsed.map(p => p.id === parcelleId ? { ...p, latitude, longitude, updated_at: new Date().toISOString() } : p);
        localStorage.setItem('hico_parcelles', JSON.stringify(updated));
      } catch (err) {
        console.warn("localStorage update skipped or failed:", err);
      }
    }

    // Update Supabase in real time
    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        const { error } = await supabase
          .from('parcelles')
          .update({
            latitude,
            longitude,
            updated_at: new Date().toISOString()
          })
          .eq('id', parcelleId);
        
        if (error) {
          console.error("Erreur de mise à jour GPS Supabase:", error.message);
        } else {
          console.log(`GPS de la parcelle ${parcelleId} mis à jour avec succès dans Supabase.`);
        }
      } catch (err) {
        console.warn("Erreur d'envoi GPS à Supabase :", err);
      }
    }
  };

  const handleAddAgentSync = async (newAgent: Agent) => {
    setAgents(prev => {
      if (prev.some(a => a.id === newAgent.id)) return prev;
      return [...prev, newAgent];
    });

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        const { error } = await supabase.from('agents').insert([sanitizeAgentForDb(newAgent)]);
        if (error) throw error;
      } catch (err: any) {
        console.error("Supabase agent insert failed:", err);
        alert("Erreur lors de l'enregistrement du compte dans Supabase :\n" + (err.message || err));
      }
    }
  };

  const handleUpdateAgentSync = async (updatedAgent: Agent) => {
    setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
    if (currentUser && currentUser.id === updatedAgent.id) {
      setCurrentUser(updatedAgent);
      localStorage.setItem('hico_current_user', JSON.stringify(updatedAgent));
    }

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        const { error } = await supabase.from('agents').update(sanitizeAgentForDb(updatedAgent)).eq('id', updatedAgent.id);
        if (error) throw error;
      } catch (err: any) {
        console.warn("Supabase agent update failed:", err);
        alert("Erreur lors de la mise à jour du compte dans Supabase :\n" + (err.message || err));
      }
    }
  };

  const handleDeleteAgentSync = async (agentId: string) => {
    setAgents(prev => prev.filter(a => a.id !== agentId));

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        await supabase.from('agents').delete().eq('id', agentId);
      } catch (err) {
        console.warn("Supabase agent delete skipped or failed:", err);
      }
    }
  };

  // ==========================================
  // GESTION DES DECHETS ET EBOUEURS HANDLERS
  // ==========================================
  const handleReplenishStock = async (communeId: string | null, bioQty: number, nonBioQty: number): Promise<{ success: boolean; error?: string }> => {
    let errorMsg: string | undefined;
    let updatedStocksToSave: SachetStock[] = [];
    let success = false;

    setSachetStocks(prev => {
      const centralStock = prev.find(s => s.commune_id === null || s.id === 'stk-central');

      if (communeId !== null && communeId !== 'central') {
        if (!centralStock) {
          errorMsg = "Le stock central n'est pas initialisé.";
          return prev;
        }
        if (centralStock.biodegradable < bioQty) {
          errorMsg = `Stock central insuffisant en sachets biodégradables (${centralStock.biodegradable} disponibles, ${bioQty} requis).`;
          return prev;
        }
        if (centralStock.non_biodegradable < nonBioQty) {
          errorMsg = `Stock central insuffisant en sachets non dégradables (${centralStock.non_biodegradable} disponibles, ${nonBioQty} requis).`;
          return prev;
        }
      }

      success = true;

      const updated = prev.map(stock => {
        if (communeId === null || communeId === 'central') {
          if (stock.commune_id === null || stock.id === 'stk-central') {
            const newStock = {
              ...stock,
              biodegradable: stock.biodegradable + bioQty,
              non_biodegradable: stock.non_biodegradable + nonBioQty,
              last_replenished: new Date().toISOString()
            };
            updatedStocksToSave.push(newStock);
            return newStock;
          }
        } else {
          if (stock.commune_id === null || stock.id === 'stk-central') {
            const newStock = {
              ...stock,
              biodegradable: stock.biodegradable - bioQty,
              non_biodegradable: stock.non_biodegradable - nonBioQty,
              last_replenished: new Date().toISOString()
            };
            updatedStocksToSave.push(newStock);
            return newStock;
          }
          if (stock.commune_id === communeId) {
            const newStock = {
              ...stock,
              biodegradable: stock.biodegradable + bioQty,
              non_biodegradable: stock.non_biodegradable + nonBioQty,
              last_replenished: new Date().toISOString()
            };
            updatedStocksToSave.push(newStock);
            return newStock;
          }
        }
        return stock;
      });

      if (communeId !== null && communeId !== 'central' && !updated.some(s => s.commune_id === communeId)) {
        const newCommuneStock: SachetStock = {
          id: 'stk-' + communeId,
          commune_id: communeId,
          biodegradable: bioQty,
          non_biodegradable: nonBioQty,
          seuil_alerte: 50,
          last_replenished: new Date().toISOString()
        };
        updated.push(newCommuneStock);
        updatedStocksToSave.push(newCommuneStock);
      }

      return updated;
    });

    if (success && isSupabaseConfigured && dbStatus === 'connected' && updatedStocksToSave.length > 0) {
      try {
        const { error } = await supabase.from('sachet_stocks').upsert(updatedStocksToSave);
        if (error) throw error;
      } catch (err: any) {
        console.warn("Échec d'upsert Supabase de sachet_stocks :", err);
      }
    }

    return { success, error: errorMsg };
  };

  const handleDistributeSachets = async (distribution: Omit<SachetDistribution, 'id'>) => {
    let success = false;
    let updatedStock: SachetStock | null = null;
    setSachetStocks(prev => {
      const updated = prev.map(stock => {
        if (stock.commune_id === distribution.commune_id) {
          if (stock.biodegradable >= distribution.quantite_biodegradable && 
              stock.non_biodegradable >= distribution.quantite_non_biodegradable) {
            success = true;
            updatedStock = {
              ...stock,
              biodegradable: stock.biodegradable - distribution.quantite_biodegradable,
              non_biodegradable: stock.non_biodegradable - distribution.quantite_non_biodegradable
            };
            return updatedStock!;
          }
        }
        return stock;
      });
      return updated;
    });

    if (!success) return false;

    const newDist: SachetDistribution = {
      id: 'dist-' + Math.random().toString(36).substring(2, 11),
      ...distribution
    };
    setSachetDistributions(prev => [newDist, ...prev]);

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        if (updatedStock) {
          await supabase.from('sachet_stocks').upsert([updatedStock]);
        }
        await supabase.from('sachet_distributions').insert([newDist]);
      } catch (err) {
        console.warn("Supabase sachet distribution update failed:", err);
      }
    }
    return true;
  };

  // ==========================================
  // GESTION FINANCIERE & RECETTES & LITIGES HANDLERS
  // ==========================================
  const handleAddSubscriptionPayment = async (newPay: Omit<SubscriptionPayment, 'id'>) => {
    const pay: SubscriptionPayment = {
      ...newPay,
      id: 'PAY-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    };
    setPayments(prev => [pay, ...prev]);

    // If there is an active dispute for this abonne, let's mark it resolved
    setDisputes(prev => prev.map(d => {
      if (d.abonne_id === newPay.abonne_id && d.status === 'active') {
        return { ...d, status: 'resolved' };
      }
      return d;
    }));

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        await supabase.from('subscription_payments').insert([pay]);
        await supabase.from('dis_signals' /* dispute_signals fallback */);
      } catch (_) {}
      try {
        await supabase.from('dis_signals').update({ status: 'resolved' }).eq('abonne_id', newPay.abonne_id).eq('status', 'active');
      } catch (_) {}
      try {
        await supabase.from('dispute_signals').update({ status: 'resolved' }).eq('abonne_id', newPay.abonne_id).eq('status', 'active');
      } catch (_) {}
    }
  };

  const handlePayStaff = async (newPay: Omit<StaffPayment, 'id'>) => {
    const pay: StaffPayment = {
      ...newPay,
      id: 'PAY-STF-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    };
    setStaffPayments(prev => [pay, ...prev]);

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        await supabase.from('staff_payments').insert([pay]);
      } catch (err) {
        console.warn("Supabase staff_payments sync failed:", err);
      }
    }
  };

  const handleAddMaterialExpense = async (newExp: Omit<MaterialExpense, 'id'>) => {
    const exp: MaterialExpense = {
      ...newExp,
      id: 'EXP-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    };
    setMaterialExpenses(prev => [exp, ...prev]);

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        await supabase.from('material_expenses').insert([exp]);
      } catch (err) {
        console.warn("Supabase material_expenses sync failed:", err);
      }
    }
  };

  const handleSignalDispute = async (newDisp: Omit<DisputeSignal, 'id'>) => {
    const disp: DisputeSignal = {
      ...newDisp,
      id: 'DISP-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    };
    setDisputes(prev => [disp, ...prev]);

    // Send a real inbox notification warning the subscriber
    const msgContent = `[SIGNALEMENT DE LITIGE] Nous constatons un défaut de paiement de redevance de salubrité pour votre parcelle. Montant réclamé : ${newDisp.montant_du} FC / $. Veuillez régulariser d'urgence via l'application ou appeler le service recouvrement.`;
    await handleSendInboxMessage('Service Recouvrement (Hico)', msgContent);

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        await supabase.from('dispute_signals').insert([disp]);
      } catch (err) {
        console.warn("Supabase dispute_signals sync failed:", err);
      }
    }
  };

  const handleResolveDispute = async (disputeId: string) => {
    let resolvedDisp: DisputeSignal | undefined;
    const payId = 'PAY-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    let payObj: SubscriptionPayment | null = null;

    setDisputes(prev => prev.map(d => {
      if (d.id === disputeId) {
        resolvedDisp = { ...d, status: 'resolved' as const };
        // Record a payment first
        payObj = {
          id: payId,
          abonne_id: d.abonne_id,
          nom_complet: d.nom_complet,
          commune_id: d.commune_id,
          parcelle_id: d.parcelle_id,
          montant: d.montant_du,
          date_paiement: new Date().toISOString(),
          mode_paiement: 'mpesa',
          telephone_payeur: d.telephone,
          status: 'success'
        };
        setPayments(prevPayments => [payObj!, ...prevPayments]);

        // Mark dispute resolved
        return resolvedDisp!;
      }
      return d;
    }));

    // Send notification to user that they are paid up
    const updatedDispute = resolvedDisp || disputes.find(d => d.id === disputeId);
    if (updatedDispute) {
      const msgContent = `[LITIGE RÉSOLU] Merci ! Votre redevance de salubrité de ${updatedDispute.montant_du} a été réglée avec succès. Votre abonnement est réactivé.`;
      await handleSendInboxMessage('Service Recouvrement (Hico)', msgContent);
    }

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        if (payObj) {
          await supabase.from('subscription_payments').insert([payObj]);
        }
        await supabase.from('dispute_signals').update({ status: 'resolved' }).eq('id', disputeId);
      } catch (err) {
        console.warn("Supabase dispute resolution sync failed:", err);
      }
    }
  };

  const handleSendDisputeReminder = async (disputeId: string) => {
    let updatedDisp: DisputeSignal | null = null;
    setDisputes(prev => prev.map(d => {
      if (d.id === disputeId) {
        // Increment reminders_sent
        const reminders = d.reminders_sent + 1;
        
        // Push a warning to the user's inbox
        const msgContent = `[RAPPEL DE LITIGE N°${reminders}] Alerte de recouvrement ! Votre compte présente un solde impayé de ${d.montant_du}. Un SMS de sommation a été envoyé au ${d.telephone}. Veuillez régler sous 48h.`;
        handleSendInboxMessage('Service Recouvrement (Hico)', msgContent);

        updatedDisp = {
          ...d,
          reminders_sent: reminders,
          last_reminder_date: new Date().toISOString()
        };
        return updatedDisp!;
      }
      return d;
    }));

    if (isSupabaseConfigured && dbStatus === 'connected' && updatedDisp) {
      try {
        await supabase.from('dispute_signals').update(updatedDisp).eq('id', disputeId);
      } catch (err) {
        console.warn("Supabase dispute reminder sync failed:", err);
      }
    }
  };

  const safeInsertPoubelleSignal = async (newSignal: PoubelleSignal) => {
    if (!isSupabaseConfigured || dbStatus !== 'connected') return;

    // 1. Try to insert the full English object first
    try {
      const { error: err1 } = await supabase.from('signaux_poubelles').insert([newSignal]);
      if (!err1) {
        console.log("Supabase insert signal succeeded with English schema!");
        return;
      }
      console.warn("Full English insert failed, trying robust French fallback...", err1);
    } catch (e) {
      console.warn("Full English insert exception:", e);
    }

    // 2. Fallback: Map to strict French SQL Schema with a valid UUID format (or omitting id)
    try {
      const ab = abonnes.find(a => a.telephone_principal === newSignal.bailleur_telephone || a.nom_complet === newSignal.bailleur_nom);
      
      const frenchPayload: any = {
        id: newSignal.id,
        parcelle_id: newSignal.parcelle_id,
        bailleur_id: ab?.id || null,
        statut: 'en_attente',
        type_poubelle: newSignal.type_poubelle
      };

      // Try inserting with French columns (no id string, allowing DB to auto-generate UUID)
      const { error: err2 } = await supabase.from('signaux_poubelles').insert([frenchPayload]);
      if (!err2) {
        console.log("Robust French insert succeeded (omitted ID)!");
        return;
      }
      console.warn("Robust French insert failed, trying with UUID-compatible ID format...", err2);

      // 3. Last resort fallback: Generate a clean UUID format string if the column is UUID but not defaulting
      const cleanUuid = "00000000-0000-0000-0000-" + Math.random().toString(36).substring(2, 14).padEnd(12, '0');
      const lastResortPayload: any = {
        id: cleanUuid,
        parcelle_id: newSignal.parcelle_id,
        bailleur_id: ab?.id || null,
        statut: 'en_attente',
        type_poubelle: newSignal.type_poubelle
      };

      const { error: err3 } = await supabase.from('signaux_poubelles').insert([lastResortPayload]);
      if (err3) {
        // If type_poubelle is rejecting, try without it
        const strictPayload = { ...lastResortPayload };
        delete strictPayload.type_poubelle;
        await supabase.from('signaux_poubelles').insert([strictPayload]);
      }
      console.log("Last resort insert succeeded with UUID!");
    } catch (fallbackErr) {
      console.error("All Supabase insertion paths failed for the poubelle signal:", fallbackErr);
    }
  };

  const handleReportTrashFull = async (type_poubelle: 'biodegradable' | 'non_biodegradable') => {
    // Find active Abonne profile associated with the user
    const ab = abonnes.find(a => a.telephone_principal === currentUser?.telephone || a.id === 'abonne-demo');
    if (!ab) {
      alert("Erreur: Profil abonné de démonstration introuvable !");
      return;
    }
    const parc = parcelles.find(p => p.id === ab.parcelle_id);
    if (!parc) {
      alert("Erreur: Parcelle d'abonné introuvable !");
      return;
    }

    // Check if there is already an active signal for this specific type to avoid duplicates
    const alreadySignaled = poubelleSignals.some(
      s => s.parcelle_id === parc.id && 
           s.type_poubelle === type_poubelle && 
           s.status !== 'completed'
    );
    if (alreadySignaled) {
      alert(`Un signalement est déjà actif pour votre poubelle ${type_poubelle === 'biodegradable' ? 'biodégradable' : 'non-biodégradable'}.`);
      return;
    }

    const ave = avenues.find(a => a.id === parc.avenue_id);
    const com = communes.find(c => c.id === ave?.commune_id);

    // Create a new signal
    const newSignal: PoubelleSignal = {
      id: generateUUID(),
      parcelle_id: parc.id,
      commune_id: com?.id || 'c-gombe',
      avenue_id: ave?.id || 'ave-gombe-1',
      commune_nom: com?.nom || 'Gombe',
      avenue_nom: ave?.nom || 'Boulevard du 30 Juin',
      numero_parcelle: parc.numero_parcelle,
      bailleur_nom: ab.nom_complet,
      bailleur_telephone: ab.telephone_principal,
      status: 'pending',
      reported_at: new Date().toISOString(),
      type_poubelle: type_poubelle
    };

    setPoubelleSignals(prev => [newSignal, ...prev]);
    setActiveNotification(newSignal);
    setHasNewSignals(true);

    await safeInsertPoubelleSignal(newSignal);
  };

  const handleAssignEboueur = async (signalId: string, eboueurId: string) => {
    setPoubelleSignals(prev => prev.map(sig => {
      if (sig.id === signalId) {
        return {
          ...sig,
          status: 'assigned',
          assigned_eboueur_id: eboueurId
        };
      }
      return sig;
    }));

    setEboueurs(prev => prev.map(eb => {
      if (eb.id === eboueurId) {
        return {
          ...eb,
          status: 'en_mission'
        };
      }
      return eb;
    }));

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        // Try French column names first
        const { error } = await supabase
          .from('signaux_poubelles')
          .update({ statut: 'assigned', eboueur_assigne_id: eboueurId })
          .eq('id', signalId);
        
        if (error) {
          console.warn("French update failed, trying English update...", error);
          // Fallback to English
          await supabase
            .from('signaux_poubelles')
            .update({ status: 'assigned', assigned_eboueur_id: eboueurId })
            .eq('id', signalId);
        }
      } catch (err) {
        console.warn("Supabase handleAssignEboueur failed:", err);
      }
    }
  };

  const handleCompleteMission = async (signalId: string) => {
    let assignedEbId: string | undefined;
    let signalType: 'biodegradable' | 'non_biodegradable' = 'biodegradable';
    let parcelleId = '';
    let avenueId = '';
    let communeId = '';

    setPoubelleSignals(prev => prev.map(sig => {
      if (sig.id === signalId) {
        assignedEbId = sig.assigned_eboueur_id;
        signalType = sig.type_poubelle || 'biodegradable';
        parcelleId = sig.parcelle_id;
        avenueId = sig.avenue_id;
        communeId = sig.commune_id;
        return {
          ...sig,
          status: 'completed',
          completed_at: new Date().toISOString()
        };
      }
      return sig;
    }));

    // Find the name of the driver who completed the mission to log as distributor
    let driverNom = 'Chauffeur Éboueur';
    if (assignedEbId) {
      const ebObj = eboueurs.find(e => e.id === assignedEbId);
      if (ebObj) driverNom = ebObj.nom;
    } else {
      const currentEb = eboueurs.find(e => e.telephone === currentUser?.telephone);
      if (currentEb) driverNom = currentEb.nom;
    }

    // Auto distribute replacement sachet of that type during collection
    if (parcelleId && avenueId && communeId) {
      const isBio = signalType === 'biodegradable';
      await handleDistributeSachets({
        parcelle_id: parcelleId,
        avenue_id: avenueId,
        commune_id: communeId,
        date_distribution: new Date().toISOString(),
        quantite_biodegradable: isBio ? 1 : 0,
        quantite_non_biodegradable: isBio ? 0 : 1,
        distribue_par: driverNom,
        notes: `Remplacement de sac poubelle (${isBio ? 'biodégradable' : 'non-biodégradable'}) après ramassage.`
      });
    }

    if (assignedEbId) {
      setEboueurs(prev => prev.map(eb => {
        if (eb.id === assignedEbId) {
          return {
            ...eb,
            status: 'idle'
          };
        }
        return eb;
      }));
    } else {
      // Fallback matching current logged-in driver
      const currentEb = eboueurs.find(e => e.telephone === currentUser?.telephone);
      if (currentEb) {
        setEboueurs(prev => prev.map(eb => {
          if (eb.id === currentEb.id) {
            return {
              ...eb,
              status: 'idle'
            };
          }
          return eb;
        }));
      }
    }

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        // Try French column names first
        const { error } = await supabase
          .from('signaux_poubelles')
          .update({ statut: 'completed', resolved_at: new Date().toISOString() })
          .eq('id', signalId);
        
        if (error) {
          console.warn("French completion failed, trying English update...", error);
          // Fallback to English
          await supabase
            .from('signaux_poubelles')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', signalId);
        }
      } catch (err) {
        console.warn("Supabase handleCompleteMission failed:", err);
      }
    }
  };

  const syncEboueurGpsToSupabase = async (agentId: string, enService: boolean, lat: number, lng: number) => {
    if (!isSupabaseConfigured || dbStatus !== 'connected') return;
    try {
      // Check if row already exists
      const { data, error } = await supabase
        .from('eboueurs_gps')
        .select('id')
        .eq('agent_id', agentId);
        
      if (error) {
        console.warn("Error querying eboueurs_gps:", error);
        return;
      }
      
      if (data && data.length > 0) {
        // Update existing row
        const { error: updErr } = await supabase
          .from('eboueurs_gps')
          .update({
            latitude: lat,
            longitude: lng,
            en_service: enService,
            derniere_mise_a_jour: new Date().toISOString()
          })
          .eq('agent_id', agentId);
        if (updErr) console.warn("Error updating eboueurs_gps:", updErr);
      } else {
        // Insert new row
        const { error: insErr } = await supabase
          .from('eboueurs_gps')
          .insert([{
            agent_id: agentId,
            latitude: lat,
            longitude: lng,
            en_service: enService,
            derniere_mise_a_jour: new Date().toISOString()
          }]);
        if (insErr) console.warn("Error inserting eboueurs_gps:", insErr);
      }
    } catch (err) {
      console.warn("syncEboueurGpsToSupabase failed:", err);
    }
  };

  // Real Geolocation watching for the logged-in Éboueur when GPS is active
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'eboueur') return;
    
    const currentEb = eboueurs.find(e => e.telephone === currentUser.telephone);
    if (!currentEb || !currentEb.gps_active) {
      return;
    }

    if (!navigator.geolocation) {
      console.warn("La géolocalisation n'est pas supportée par votre navigateur.");
      addToast("La géolocalisation n'est pas supportée par votre appareil ou navigateur.", "error");
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const latitude = Number(position.coords.latitude.toFixed(8));
      const longitude = Number(position.coords.longitude.toFixed(8));
      setEboueurs(prev => prev.map(eb => {
        if (eb.telephone === currentUser.telephone) {
          return {
            ...eb,
            latitude,
            longitude
          };
        }
        return eb;
      }));
      syncEboueurGpsToSupabase(currentUser.id, true, latitude, longitude);
    };

    let watchId: number;

    const handleError = (error: GeolocationPositionError) => {
      console.warn("Erreur de suivi GPS réel :", error.message);
      let errorMsg = "Erreur de signal GPS réel.";
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = "Autorisation GPS refusée. Veuillez autoriser l'accès à la localisation.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMsg = "Signal GPS indisponible ou faible.";
      } else if (error.code === error.TIMEOUT) {
        errorMsg = "Le délai d'attente pour obtenir votre position GPS réelle a expiré.";
      }
      addToast(errorMsg, "warning");
      
      if ((error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) && watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };

    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [currentUser, eboueurs.find(e => e.telephone === currentUser?.telephone)?.gps_active]);

  const handleToggleEboueurGps = () => {
    if (!currentUser || currentUser.role !== 'eboueur') return;
    const currentEb = eboueurs.find(e => e.telephone === currentUser.telephone);
    if (!currentEb) return;

    const nextGpsState = !currentEb.gps_active;

    setEboueurs(prev => prev.map(eb => {
      if (eb.id === currentEb.id) {
        return {
          ...eb,
          gps_active: nextGpsState
        };
      }
      return eb;
    }));

    // Instantly sync off state or current coordinates
    syncEboueurGpsToSupabase(currentEb.id, nextGpsState, currentEb.latitude, currentEb.longitude);

    if (nextGpsState) {
      if (navigator.geolocation) {
        // Fetch initial position immediately upon turning GPS on
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = Number(position.coords.latitude.toFixed(8));
            const longitude = Number(position.coords.longitude.toFixed(8));
            setEboueurs(prev => prev.map(eb => {
              if (eb.id === currentEb.id) {
                return {
                  ...eb,
                  latitude,
                  longitude
                };
              }
              return eb;
            }));
            syncEboueurGpsToSupabase(currentEb.id, true, latitude, longitude);
          },
          (err) => {
            console.warn("Position initiale indisponible par GPS réel :", err.message);
            let errorMsg = "Position GPS initiale indisponible.";
            if (err.code === err.PERMISSION_DENIED) {
              errorMsg = "Autorisation de localisation refusée.";
            }
            addToast(errorMsg, "warning");
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        addToast("La géolocalisation n'est pas supportée par votre navigateur.", "error");
      }
    }
  };

  const handleUpdateEboueurGpsCoords = (latitude: number, longitude: number) => {
    if (!currentUser || currentUser.role !== 'eboueur') return;
    setEboueurs(prev => prev.map(eb => {
      if (eb.telephone === currentUser.telephone) {
        return {
          ...eb,
          latitude,
          longitude
        };
      }
      return eb;
    }));
    const currentEb = eboueurs.find(e => e.telephone === currentUser.telephone);
    const active = currentEb ? currentEb.gps_active : true;
    syncEboueurGpsToSupabase(currentUser.id, active, latitude, longitude);
  };

  const handleSendInboxMessage = async (sender: string, content: string) => {
    const newMsg: InboxMessage = {
      id: 'msg-' + Math.random().toString(36).substring(2, 11),
      sender,
      content,
      sent_at: new Date().toISOString(),
      read: false
    };
    setInboxMessages(prev => [newMsg, ...prev]);

    if (isSupabaseConfigured && dbStatus === 'connected') {
      try {
        await supabase.from('inbox_messages').insert([newMsg]);
      } catch (err) {
        console.warn("Supabase inbox_messages insert failed:", err);
      }
    }
  };

  const handleSimulateSignal = async (parcelleId: string, typePoubelle?: 'biodegradable' | 'non_biodegradable') => {
    const parc = parcelles.find(p => p.id === parcelleId);
    if (!parc) return;
    const ab = abonnes.find(a => a.parcelle_id === parcelleId) || {
      id: 'ab-sim-' + Math.random().toString(36).substring(2, 7),
      nom_complet: 'Bailleur Anonyme',
      telephone_principal: '0812345678'
    };
    const ave = avenues.find(a => a.id === parc.avenue_id);
    const com = communes.find(c => c.id === ave?.commune_id);

    const newSignal: PoubelleSignal = {
      id: generateUUID(),
      parcelle_id: parc.id,
      commune_id: com?.id || 'c-gombe',
      avenue_id: ave?.id || 'ave-gombe-1',
      commune_nom: com?.nom || 'Gombe',
      avenue_nom: ave?.nom || 'Boulevard du 30 Juin',
      numero_parcelle: parc.numero_parcelle,
      bailleur_nom: ab.nom_complet,
      bailleur_telephone: ab.telephone_principal,
      status: 'pending',
      reported_at: new Date().toISOString(),
      type_poubelle: typePoubelle
    };

    setPoubelleSignals(prev => [newSignal, ...prev]);
    setActiveNotification(newSignal);
    setHasNewSignals(true);

    await safeInsertPoubelleSignal(newSignal);
  };

  // Switch between back hierarchy safely
  const handlePageBack = () => {
    if (currentScreen === 'avenues') {
      setCurrentScreen('communes');
    } else if (currentScreen === 'recensement_form') {
      setCurrentScreen('avenues');
    } else {
      setCurrentScreen('dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background text-on-background">
      
      {/* 1. Login View State */}
      {currentScreen === 'login' ? (
        <LoginForm 
          onLoginSuccess={handleLogin} 
          agents={agents}
          abonnes={abonnes}
          onRegisterAgent={handleAddAgentSync}
          onResetPasswordRequest={handleResetPasswordRequest}
        />
      ) : (
        /* 2. Logged User Layout Shell */
        <div className="flex flex-col min-h-screen">
          
          {/* Top Status Header styled exactly like Bento design */}
          <header className="fixed top-0 left-0 w-full bg-surface h-16 border-b border-outline-variant flex items-center justify-between px-4 z-40 shadow-lg md:px-8">
            <div className="flex items-center gap-3">
              {currentScreen !== 'dashboard' && (
                <button 
                  onClick={handlePageBack}
                  className="text-on-surface-variant hover:text-on-surface hover:bg-background transition-colors rounded-full p-1.5 active:scale-95 duration-100 cursor-pointer"
                >
                  <ArrowLeft size={20} className="text-primary" />
                </button>
              )}
              {/* Circular green emblem icon perfectly matching Image 3 header */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-lg shadow-md shadow-primary/20">
                  H
                </div>
                <h1 className="text-xl font-medium tracking-tight text-on-surface font-sans leading-none">
                  Hico-Cleaning
                </h1>
              </div>
            </div>

            {/* Profile icon + Supabase database status pill */}
            <div className="flex items-center gap-3">
              {/* Dynamic Supabase Status Badge */}
              <div className="flex items-center gap-1.5">
                {dbStatus === 'connected' && (
                  <button 
                    onClick={() => {
                      alert("Votre application est connectée en temps réel à Supabase !");
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25 rounded-md text-[10px] font-bold font-mono transition-all animate-pulse"
                    title="Connecté en temps réel à la base Supabase"
                  >
                    <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full"></span>
                    <span className="hidden xs:inline">Supabase</span>
                  </button>
                )}
                {dbStatus === 'loading' && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-bold font-mono animate-pulse">
                    <RefreshCw size={10} className="animate-spin" />
                    <span className="hidden xs:inline">Sync...</span>
                  </div>
                )}
                {dbStatus === 'error_missing_tables' && (
                  <button 
                    onClick={() => setShowSqlGuide(true)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-error/15 text-error border border-error/20 rounded-md text-[10px] font-bold font-mono hover:bg-error/25 transition-all cursor-pointer"
                    title="Cliquez pour afficher les instructions de création des tables SQL"
                  >
                    <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span>
                    <span>SQL Requis ⚙️</span>
                  </button>
                )}
                {dbStatus === 'offline' && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/15 text-yellow-500 border border-yellow-500/20 rounded-md text-[10px] font-bold font-mono">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                    <span className="hidden xs:inline">Local / Offline</span>
                  </div>
                )}
              </div>

              {syncing && (
                <div className="text-primary animate-spin" title="Synchronisation active avec le Cloud...">
                  <RefreshCw size={14} />
                </div>
              )}

              <span className="hidden sm:inline text-xs font-semibold text-on-surface-variant">
                {currentUser?.nom}
              </span>
              <button 
                onClick={() => setCurrentScreen('profil')}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  currentScreen === 'profil' 
                    ? 'bg-primary text-on-primary ring-2 ring-primary/30' 
                    : 'bg-surface hover:bg-background text-primary border border-outline-variant'
                }`}
                title="Mon Profil"
              >
                <User size={18} />
              </button>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 h-9 px-3 bg-error/10 hover:bg-error/20 text-error rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border border-error/20"
                title="Se déconnecter"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </header>

          {/* Desktop Sidebar Layout Wrapper */}
          <div className="flex flex-grow pt-16">
            
            {/* Desktop Left-Rail Navigation (visible on md+) */}
            <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-outline-variant bg-surface flex-col py-6 px-4 gap-2 z-30 shadow-xl overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-outline-variant/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary/40">
              <div className="text-xs font-bold text-on-surface-variant opacity-80 uppercase tracking-widest mb-4 px-3 select-none">
                Menu Principal
              </div>
              
              {/* === ABONNE EXCLUSIVE MENU === */}
              {currentUser?.role === 'abonne' && (
                <button 
                  onClick={() => setCurrentScreen('abonne_space')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                    currentScreen === 'abonne_space'
                      ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                      : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                  }`}
                >
                  <Trash2 size={18} />
                  <span>Mon Espace Abonné</span>
                </button>
              )}

              {/* === EBOUEUR EXCLUSIVE MENU === */}
              {currentUser?.role === 'eboueur' && (
                <button 
                  onClick={() => setCurrentScreen('eboueur_space')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                    currentScreen === 'eboueur_space'
                      ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                      : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                  }`}
                >
                  <Truck size={18} />
                  <span>Missions Éboueur</span>
                </button>
              )}

              {/* === ADMIN & AGENT MENU === */}
              {currentUser?.role !== 'abonne' && currentUser?.role !== 'eboueur' && (
                <>
                  {/* Dashboard tab */}
                  <button 
                    onClick={() => setCurrentScreen('dashboard')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                      currentScreen === 'dashboard'
                        ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                        : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                    }`}
                  >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </button>

                  {/* Recensement pathway (Communes / Avenues index) */}
                  <button 
                    onClick={() => setCurrentScreen('communes')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                      currentScreen === 'communes' || currentScreen === 'avenues' || currentScreen === 'recensement_form'
                        ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                        : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                    }`}
                  >
                    <FileText size={18} />
                    <span>Recensement</span>
                  </button>

                  {/* Abonnés tab */}
                  <button 
                    onClick={() => setCurrentScreen('abonne_list')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                      currentScreen === 'abonne_list' || currentScreen === 'abonne_detail'
                        ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                        : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                    }`}
                  >
                    <Users size={18} />
                    <span>Abonnés</span>
                  </button>

                  {/* Explorateur GPS tab */}
                  <button 
                    onClick={() => setCurrentScreen('commune_explorer')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                      currentScreen === 'commune_explorer'
                        ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                        : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                    }`}
                  >
                    <Compass size={18} />
                    <span>Explorateur GPS</span>
                  </button>

                  {/* Waste Signals Map View */}
                  <button 
                    onClick={() => {
                      setCurrentScreen('dechets_map');
                      setHasNewSignals(false);
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                      currentScreen === 'dechets_map'
                        ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                        : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 size={18} />
                      <span>Poubelles & Éboueurs</span>
                    </div>
                    {hasNewSignals && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-sm shadow-red-500/50"></span>
                      </span>
                    )}
                  </button>

                  {/* Rapports tab */}
                  <button 
                    onClick={() => setCurrentScreen('rapports')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                      currentScreen === 'rapports'
                        ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                        : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                    }`}
                  >
                    <BarChart3 size={18} />
                    <span>Rapports</span>
                  </button>

                  {/* Sachets management tab */}
                  {isScreenAllowed('sachets_management') && (
                    <button 
                      onClick={() => setCurrentScreen('sachets_management')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                        currentScreen === 'sachets_management'
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                          : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                      }`}
                    >
                      <Package size={18} />
                      <span>Gestion de Sachets</span>
                    </button>
                  )}

                  {/* Finance management tab */}
                  {isScreenAllowed('finance_management') && (
                    <button 
                      onClick={() => setCurrentScreen('finance_management')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                        currentScreen === 'finance_management'
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                          : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                      }`}
                    >
                      <DollarSign size={18} />
                      <span>Gestion Financière</span>
                    </button>
                  )}

                  {/* Settings section header */}
                  {(isScreenAllowed('admin_settings_screens') || 
                    isScreenAllowed('admin_settings_pricing') || 
                    isScreenAllowed('admin_settings_accounts') || 
                    isScreenAllowed('admin_settings_passwords')) && (
                    <div className="text-xs font-black text-on-surface-variant/70 uppercase tracking-widest mt-5 mb-2 px-4 select-none">
                      Paramètres Système
                    </div>
                  )}

                  {isScreenAllowed('admin_settings_screens') && (
                    <button 
                      onClick={() => setCurrentScreen('admin_settings_screens')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                        currentScreen === 'admin_settings_screens'
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                          : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                      }`}
                    >
                      <Shield size={18} />
                      <span>Configuration Rôles</span>
                    </button>
                  )}

                  {isScreenAllowed('admin_settings_pricing') && (
                    <button 
                      onClick={() => setCurrentScreen('admin_settings_pricing')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                        currentScreen === 'admin_settings_pricing'
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                          : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                      }`}
                    >
                      <DollarSign size={18} />
                      <span>Prix d'Abonnement</span>
                    </button>
                  )}

                  {isScreenAllowed('admin_settings_accounts') && (
                    <button 
                      onClick={() => setCurrentScreen('admin_settings_accounts')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                        currentScreen === 'admin_settings_accounts'
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                          : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                      }`}
                    >
                      <UserPlus size={18} />
                      <span>Création de Comptes</span>
                    </button>
                  )}

                  {isScreenAllowed('admin_settings_passwords') && (
                    <button 
                      onClick={() => setCurrentScreen('admin_settings_passwords')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                        currentScreen === 'admin_settings_passwords'
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                          : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                      }`}
                    >
                      <Key size={18} />
                      <span>Mot de Passe Temporaire</span>
                    </button>
                  )}
                </>
              )}

              {/* Profile tab */}
              <button 
                onClick={() => setCurrentScreen('profil')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                  currentScreen === 'profil'
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                    : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                }`}
              >
                <User size={18} />
                <span>
                  {currentUser?.role === 'abonne' ? 'Mon Profil Abonné' : currentUser?.role === 'eboueur' ? 'Mon Profil Éboueur' : 'Profil Recenseur'}
                </span>
              </button>

              {/* Quick logout anchor at the bottom of the sidebar */}
              <div className="mt-auto pt-4 border-t border-outline-variant">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-error bg-error-container/10 hover:bg-error-container/20 transition-all font-sans text-sm font-bold w-full text-left cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </aside>

            {/* Main view container block tailored responsively for viewport sizes */}
            <main className="flex-grow px-4 md:px-8 py-6 pb-28 md:pb-12 md:pl-[18rem] transition-all">
              
              {/* SCREEN SWITCHER */}
              {currentScreen === 'dashboard' && (
                <DashboardView 
                  communes={communes}
                  avenues={avenues}
                  parcelles={parcelles}
                  abonnes={abonnes}
                  onNavigate={setCurrentScreen}
                  onAddCommuneToggle={() => setShowAddCommuneModal(true)}
                  onAddAvenueToggle={() => {
                    if (communes.length > 0) {
                      setNewAvenueCommuneId(communes[0].id);
                    }
                    setShowAddAvenueModal(true);
                  }}
                />
              )}

              {currentScreen === 'communes' && (
                <CommunesView 
                  communes={communes}
                  avenues={avenues}
                  onSelectCommune={(commId) => {
                    setSelectedCommuneId(commId);
                    setCurrentScreen('avenues');
                  }}
                  onSelectAvenueDirectly={(commId, ave) => {
                    setSelectedCommuneId(commId);
                    setSelectedAvenueObj(ave);
                    setCurrentScreen('recensement_form');
                  }}
                  onBack={() => setCurrentScreen('dashboard')}
                  onAddCommuneToggle={() => setShowAddCommuneModal(true)}
                  onAddAvenueToggle={(commId) => {
                    setNewAvenueCommuneId(commId);
                    setShowAddAvenueModal(true);
                  }}
                />
              )}

              {currentScreen === 'avenues' && selectedCommuneId && (() => {
                const communeObj = communes.find(c => c.id === selectedCommuneId);
                return communeObj ? (
                  <AvenuesView 
                    avenues={avenues}
                    communes={communes}
                    selectedCommuneId={selectedCommuneId}
                    onSelectAvenue={(ave) => {
                      setSelectedAvenueObj(ave);
                      setCurrentScreen('recensement_form');
                    }}
                    onBack={() => setCurrentScreen('communes')}
                    onAddAvenueToggle={() => {
                      setNewAvenueCommuneId(selectedCommuneId);
                      setShowAddAvenueModal(true);
                    }}
                  />
                ) : (
                  <div className="text-center py-8">Erreur de chargement de la commune.</div>
                );
              })()}

              {currentScreen === 'recensement_form' && selectedCommuneId && selectedAvenueObj && (() => {
                const communeObj = communes.find(c => c.id === selectedCommuneId);
                return communeObj ? (
                  <RecensementForm 
                    commune={communeObj}
                    avenue={selectedAvenueObj}
                    existingParcelles={parcelles}
                    onAddParcelleAndAbonne={handleAddParcelleAndAbonne}
                    onBack={() => setCurrentScreen('avenues')}
                    onFinish={() => {
                      setSelectedAvenueObj(null);
                      setCurrentScreen('dashboard');
                    }}
                  />
                ) : (
                  <div className="text-center py-8">Erreur de chargement.</div>
                );
              })()}

              {currentScreen === 'abonne_list' && (
                <AbonnesView 
                  abonnes={abonnes}
                  parcelles={parcelles}
                  communes={communes}
                  avenues={avenues}
                />
              )}

              {currentScreen === 'rapports' && (
                <RapportsView 
                  communes={communes}
                  avenues={avenues}
                  parcelles={parcelles}
                  abonnes={abonnes}
                />
              )}

              {currentScreen === 'sachets_management' && (
                <SachetsManagementView 
                  communes={communes}
                  avenues={avenues}
                  parcelles={parcelles}
                  agents={agents}
                  stocks={sachetStocks}
                  distributions={sachetDistributions}
                  onReplenishStock={handleReplenishStock}
                  onDistributeSachets={handleDistributeSachets}
                />
              )}

              {currentScreen === 'finance_management' && (
                <FinanceManagementView 
                  communes={communes}
                  avenues={avenues}
                  parcelles={parcelles}
                  abonnes={abonnes}
                  agents={agents}
                  payments={payments}
                  staffPayments={staffPayments}
                  expenses={materialExpenses}
                  disputes={disputes}
                  onAddSubscriptionPayment={handleAddSubscriptionPayment}
                  onPayStaff={handlePayStaff}
                  onAddExpense={handleAddMaterialExpense}
                  onSignalDispute={handleSignalDispute}
                  onResolveDispute={handleResolveDispute}
                  onSendDisputeReminder={handleSendDisputeReminder}
                />
              )}

              {currentScreen === 'commune_explorer' && (
                <CommuneExplorer 
                  communes={communes}
                  avenues={avenues}
                  parcelles={parcelles}
                  abonnes={abonnes}
                  onUpdateParcelleGps={handleUpdateParcelleGps}
                />
              )}

              {currentScreen === 'dechets_map' && (
                <DechetsMapView 
                  signals={poubelleSignals}
                  eboueurs={eboueurs}
                  communes={communes}
                  avenues={avenues}
                  parcelles={parcelles}
                  abonnes={abonnes}
                  onAssignMission={handleAssignEboueur}
                  onSimulateSignal={handleSimulateSignal}
                  initialSelectedSignalId={mapSelectedSignalId}
                  onSelectSignalId={setMapSelectedSignalId}
                />
              )}

              {currentScreen === 'abonne_space' && (() => {
                const ab = abonnes.find(a => a.telephone_principal === currentUser?.telephone || a.id === 'abonne-demo');
                const defaultCommune: Commune = communes.find(c => c.id === 'c-gombe') || { id: 'c-gombe', nom: 'Gombe', created_at: '' };
                const defaultAvenue: Avenue = avenues.find(a => a.id === 'ave-gombe-1') || { id: 'ave-gombe-1', commune_id: 'c-gombe', nom: 'Boulevard du 30 Juin', created_at: '' };
                const defaultParcelle: Parcelle = parcelles.find(p => p.id === 'p-demo-1') || {
                  id: 'p-demo-1',
                  avenue_id: 'ave-gombe-1',
                  numero_parcelle: '24',
                  type_logement: 'maison_basse',
                  presence_locataire: 'oui',
                  nombre_menages: 7,
                  created_by: 'admin-1',
                  created_at: '',
                  updated_at: '',
                  latitude: -4.31234,
                  longitude: 15.29876
                };

                const userAbonne = ab || {
                  id: 'abonne-demo',
                  parcelle_id: 'p-demo-1',
                  nom_complet: currentUser?.nom || 'Papa Mavula',
                  telephone_principal: currentUser?.telephone || '0821111111',
                  created_at: '',
                  updated_at: ''
                };

                const userParcelle = parcelles.find(p => p.id === userAbonne.parcelle_id) || defaultParcelle;
                const userAvenue = avenues.find(a => a.id === userParcelle.avenue_id) || defaultAvenue;
                const userCommune = communes.find(c => c.id === userAvenue.commune_id) || defaultCommune;

                return (
                  <AbonneSpaceView 
                    currentAbonne={userAbonne}
                    currentParcelle={userParcelle}
                    commune={userCommune}
                    avenue={userAvenue}
                    activeSignals={poubelleSignals}
                    onReportTrashFull={handleReportTrashFull}
                    messages={inboxMessages}
                    onSendMessage={handleSendInboxMessage}
                    onRecordOnlinePayment={async (amount, provider, phone) => {
                      // Add payment directly to receipts registry
                      const pay: SubscriptionPayment = {
                        id: 'PAY-ONL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
                        abonne_id: userAbonne.id,
                        nom_complet: userAbonne.nom_complet,
                        commune_id: userCommune.id,
                        parcelle_id: userParcelle.id,
                        montant: amount,
                        date_paiement: new Date().toISOString(),
                        mode_paiement: provider,
                        telephone_payeur: phone,
                        status: 'success'
                      };
                      setPayments(prev => [pay, ...prev]);

                      // Auto-resolve any active dispute if there is one
                      setDisputes(prev => prev.map(d => {
                        if (d.abonne_id === userAbonne.id && d.status === 'active') {
                          return { ...d, status: 'resolved' };
                        }
                        return d;
                      }));

                      if (isSupabaseConfigured && dbStatus === 'connected') {
                        try {
                          await supabase.from('subscription_payments').insert([pay]);
                        } catch (_) {}
                        try {
                          await supabase.from('dis_signals').update({ status: 'resolved' }).eq('abonne_id', userAbonne.id).eq('status', 'active');
                        } catch (_) {}
                        try {
                          await supabase.from('dispute_signals').update({ status: 'resolved' }).eq('abonne_id', userAbonne.id).eq('status', 'active');
                        } catch (_) {}
                      }
                    }}
                    onLogout={handleLogout}
                  />
                );
              })()}

              {currentScreen === 'eboueur_space' && (() => {
                const cleanPhoneNum = (num: string) => {
                  if (!num) return '';
                  const cleaned = num.replace(/[\s\-\.\(\)\+]/g, '');
                  // DRC and global telephone suffix match (last 8 digits is extremely robust)
                  return cleaned.length >= 8 ? cleaned.slice(-8) : cleaned;
                };
                const currentEb = eboueurs.find(e => 
                  (currentUser?.id && e.id === currentUser.id) ||
                  (e.telephone && currentUser?.telephone && cleanPhoneNum(e.telephone) === cleanPhoneNum(currentUser.telephone)) ||
                  (e.nom && currentUser?.nom && e.nom.trim().toLowerCase() === currentUser.nom.trim().toLowerCase())
                ) || {
                  id: currentUser?.id || 'temp-eboueur',
                  nom: currentUser?.nom || 'Éboueur de service',
                  telephone: currentUser?.telephone || '',
                  latitude: -4.3316,
                  longitude: 15.3139,
                  status: 'idle' as const,
                  gps_active: false
                };

                const isMissionAssignedToMe = (sig: PoubelleSignal, statusCheck: 'assigned' | 'completed') => {
                  if (!sig || sig.status !== statusCheck) {
                    return false;
                  }

                  const assignedId = (
                    sig.assigned_eboueur_id || 
                    (sig as any).eboueur_assigne_id || 
                    (sig as any).eboueur_id || 
                    ''
                  ).toString().trim().toLowerCase();

                  if (!assignedId) {
                    // Mission status is assigned/completed but no driver ID was specified -> display in space
                    return true;
                  }

                  // 1. Direct ID matches
                  const currentUserId = (currentUser?.id || '').toString().trim().toLowerCase();
                  const currentEbId = (currentEb.id || '').toString().trim().toLowerCase();

                  if (currentUserId && assignedId === currentUserId) return true;
                  if (currentEbId && assignedId === currentEbId) return true;

                  // 2. Direct Name matches (fuzzy/substring, space-agnostic)
                  const userNom = (currentUser?.nom || '').trim().toLowerCase();
                  const currentEbNom = (currentEb.nom || '').trim().toLowerCase();
                  const cleanAssignedId = assignedId.replace(/\s+/g, '');
                  const cleanUserNom = userNom.replace(/\s+/g, '');
                  const cleanEbNom = currentEbNom.replace(/\s+/g, '');

                  if (cleanAssignedId && (cleanAssignedId === cleanUserNom || cleanAssignedId === cleanEbNom)) return true;
                  if (userNom && (userNom.includes(assignedId) || assignedId.includes(userNom))) return true;
                  if (currentEbNom && (currentEbNom.includes(assignedId) || assignedId.includes(currentEbNom))) return true;

                  // 3. Direct Phone matches
                  const userPhoneClean = cleanPhoneNum(currentUser?.telephone);
                  const currentEbPhoneClean = cleanPhoneNum(currentEb.telephone);
                  const assignedPhoneClean = cleanPhoneNum(assignedId);

                  if (userPhoneClean && assignedPhoneClean && assignedPhoneClean === userPhoneClean) return true;
                  if (currentEbPhoneClean && assignedPhoneClean && assignedPhoneClean === currentEbPhoneClean) return true;

                  // 4. Look up database records (agents & eboueurs) by assignedId
                  const matchedAgent = agents.find(a => a.id.trim().toLowerCase() === assignedId) || 
                                       eboueurs.find(e => e.id.trim().toLowerCase() === assignedId);

                  if (matchedAgent) {
                    const agentPhoneClean = cleanPhoneNum(matchedAgent.telephone);
                    const agentNomClean = (matchedAgent.nom || '').trim().toLowerCase();
                    const cleanAgentNom = agentNomClean.replace(/\s+/g, '');

                    if (userPhoneClean && agentPhoneClean && agentPhoneClean === userPhoneClean) return true;
                    if (currentEbPhoneClean && agentPhoneClean && agentPhoneClean === currentEbPhoneClean) return true;
                    if (cleanAgentNom && (cleanAgentNom === cleanUserNom || cleanAgentNom === cleanEbNom)) return true;
                    if (userNom && (userNom.includes(agentNomClean) || agentNomClean.includes(userNom))) return true;
                    if (currentEbNom && (currentEbNom.includes(agentNomClean) || agentNomClean.includes(currentEbNom))) return true;
                  }

                  return false;
                };

                let myAssignedMissions = poubelleSignals.filter(s => isMissionAssignedToMe(s, 'assigned'));
                let myCompletedMissions = poubelleSignals.filter(s => isMissionAssignedToMe(s, 'completed'));

                // Safety fallback: if filtering produces 0 assigned missions, but there ARE assigned signals in system
                if (myAssignedMissions.length === 0) {
                  myAssignedMissions = poubelleSignals.filter(s => s.status === 'assigned');
                }
                if (myCompletedMissions.length === 0) {
                  myCompletedMissions = poubelleSignals.filter(s => s.status === 'completed');
                }

                return (
                  <EboueurSpaceView 
                    currentEboueur={currentEb}
                    assignedMissions={myAssignedMissions}
                    completedMissions={myCompletedMissions}
                    onToggleGps={handleToggleEboueurGps}
                    onUpdateGpsCoords={handleUpdateEboueurGpsCoords}
                    onCompleteMission={handleCompleteMission}
                    onLogout={handleLogout}
                    currentUser={currentUser}
                    allRawSignals={poubelleSignals}
                    allAgents={agents}
                  />
                );
              })()}

              {currentScreen === 'profil' && currentUser && (
                <ProfilView 
                  currentAgent={currentUser}
                  onLogout={handleLogout}
                  onResetDatabase={handleResetDatabase}
                  activeTheme={theme}
                  onChangeTheme={setTheme}
                  onUpdatePassword={handleUpdatePassword}
                  onNavigate={setCurrentScreen}
                />
              )}

              {(currentScreen === 'admin_settings' || 
                currentScreen === 'admin_settings_screens' || 
                currentScreen === 'admin_settings_pricing' || 
                currentScreen === 'admin_settings_accounts' || 
                currentScreen === 'admin_settings_passwords') && (
                <AdminSettingsView 
                  agents={agents}
                  onAddAgent={handleAddAgentSync}
                  onUpdateAgent={handleUpdateAgentSync}
                  onDeleteAgent={handleDeleteAgentSync}
                  defaultTab={
                    currentScreen === 'admin_settings_screens' ? 'screens' :
                    currentScreen === 'admin_settings_pricing' ? 'pricing' :
                    currentScreen === 'admin_settings_accounts' ? 'accounts' :
                    currentScreen === 'admin_settings_passwords' ? 'passwords' : 'screens'
                  }
                  onTabChange={(tab) => {
                    const screenMap = {
                      screens: 'admin_settings_screens' as Screen,
                      pricing: 'admin_settings_pricing' as Screen,
                      accounts: 'admin_settings_accounts' as Screen,
                      passwords: 'admin_settings_passwords' as Screen
                    };
                    setCurrentScreen(screenMap[tab]);
                  }}
                  communes={communes}
                  isSupabaseConfigured={isSupabaseConfigured}
                  dbStatus={dbStatus}
                  supabase={supabase}
                />
              )}

            </main>
          </div>

          {/* 3. BottomNavBar visible only on screens smaller than md */}
          <BottomNavBar 
            currentScreen={currentScreen} 
            userRole={currentUser?.role}
            hasNewSignals={hasNewSignals}
            onScreenChange={(screenId) => {
              // Clear temporary selection indices when moving randomly through footer
              if (screenId !== 'avenues' && screenId !== 'recensement_form') {
                setSelectedCommuneId(null);
                setSelectedAvenueObj(null);
              }
              setCurrentScreen(screenId);
            }} 
          />

          {/* Real-time Notification Popup for Waste Signals (Alerte Poubelle Pleine) */}
          {activeNotification && (
            <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 max-w-sm w-[calc(100vw-2rem)] bg-gradient-to-br from-red-600/95 to-red-950/95 backdrop-blur-md border border-red-500/30 rounded-2xl shadow-[0_12px_40px_rgba(239,68,68,0.35)] p-4 text-white z-50 animate-slide-in-up hover:scale-[1.02] transition-transform duration-200">
              <div className="flex items-start gap-3">
                {/* Flashing light icon */}
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center bg-red-600 rounded-xl shadow-lg border border-red-400/20">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60"></span>
                  <Trash2 size={18} className="animate-bounce" />
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-300 flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></span>
                      Alerte Poubelle Pleine !
                    </span>
                    <button 
                      onClick={() => setActiveNotification(null)}
                      className="text-white/70 hover:text-white hover:bg-white/10 p-1 rounded-full transition-all cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <p className="text-xs font-semibold leading-tight text-white mb-2 line-clamp-3">
                    Une poubelle <span className="underline decoration-red-400 font-extrabold">{activeNotification.type_poubelle === 'biodegradable' ? 'biodégradable' : 'non-biodégradable'}</span> est signalée pleine par <span className="font-extrabold">{activeNotification.bailleur_nom}</span> !
                  </p>
                  
                  <div className="bg-black/25 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-red-200 flex flex-col gap-0.5 mb-3 border border-red-500/10">
                    <div className="truncate">📍 <strong className="text-white">Parcelle:</strong> N° {activeNotification.numero_parcelle}</div>
                    <div className="truncate">🛣️ <strong className="text-white">Avenue:</strong> {activeNotification.avenue_nom}</div>
                    <div className="truncate">🏢 <strong className="text-white">Commune:</strong> {activeNotification.commune_nom}</div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setActiveNotification(null)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/15 text-[10px] font-bold uppercase rounded-md tracking-wider transition-all cursor-pointer"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => {
                        // Switch to the map screen
                        setCurrentScreen('dechets_map');
                        // Center the map on this signal
                        setMapSelectedSignalId(activeNotification.id);
                        // Clear notification popup
                        setActiveNotification(null);
                        // Also clear the new signal indicator since we are navigating to see it
                        setHasNewSignals(false);
                      }}
                      className="px-3 py-1 bg-white text-red-950 hover:bg-white/95 text-[10px] font-bold uppercase rounded-md tracking-wider transition-all flex items-center gap-1 shadow-md cursor-pointer active:scale-95 duration-75"
                    >
                      <MapPin size={10} />
                      Voir sur la carte 📍
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================== */}
          {/*   MODALS OVERLAYS (Ajout commune/av) */}
          {/* ==================================== */}

          {/* A. COMMUNE MODAL */}
          {showAddCommuneModal && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-200">
              <div className="bg-surface border border-outline-variant rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up text-on-surface">
                <div className="bg-background px-5 py-4 border-b border-outline-variant flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Créer une commune</h3>
                  <button onClick={() => setShowAddCommuneModal(false)} className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleAddCommune} className="p-5 flex flex-col gap-4 font-sans">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="modal_comm_name">
                      Nom de la commune *
                    </label>
                    <input 
                      type="text" 
                      id="modal_comm_name"
                      required
                      value={newCommuneName}
                      onChange={(e) => setNewCommuneName(e.target.value)}
                      placeholder="Ex: Kalamu, Bandalungwa..."
                      className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary mt-1 transition-colors"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setNewCommuneName('');
                        setShowAddCommuneModal(false);
                      }}
                      className="px-4 py-2 bg-transparent border border-outline-variant text-xs font-bold uppercase tracking-wider rounded-full text-on-surface-variant hover:text-on-surface hover:bg-outline-variant/30 h-10 transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2 bg-primary text-on-primary hover:opacity-90 text-xs font-bold uppercase tracking-wider rounded-full h-10 shadow-md transition-colors cursor-pointer"
                    >
                      Créer commune
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* B. AVENUE MODAL */}
          {showAddAvenueModal && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-surface border border-outline-variant rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up text-on-surface">
                <div className="bg-background px-5 py-4 border-b border-outline-variant flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Créer une avenue</h3>
                  <button onClick={() => setShowAddAvenueModal(false)} className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="p-5 font-sans">
                  {communes.length === 0 ? (
                    <div className="flex flex-col gap-4 text-center py-4">
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        Pour ajouter une avenue, vous devez d'abord créer la commune correspondante.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddAvenueModal(false);
                          setShowAddCommuneModal(true);
                        }}
                        className="w-full h-11 bg-primary text-on-primary rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-outline-variant"
                      >
                        Créer une commune d'abord
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleAddAvenue} className="flex flex-col gap-4">
                      {/* Select corresponding Commune */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="modal_ave_comm">
                          Commune d'appartenance *
                        </label>
                        <select
                          id="modal_ave_comm"
                          required
                          value={newAvenueCommuneId}
                          onChange={(e) => setNewAvenueCommuneId(e.target.value)}
                          className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary mt-1 cursor-pointer transition-colors"
                        >
                          <option value="" className="bg-surface text-on-surface">-- Sélectionnez --</option>
                          {communes.map((comm) => (
                            <option key={comm.id} value={comm.id} className="bg-surface text-on-surface">
                              {comm.nom}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="modal_ave_name">
                          Nom de l'avenue *
                        </label>
                        <input 
                          type="text" 
                          id="modal_ave_name"
                          required
                          value={newAvenueName}
                          onChange={(e) => setNewAvenueName(e.target.value)}
                          placeholder="Ex: Av. Kabambare, 5ème Rue..."
                          className="w-full h-11 px-3.5 bg-background border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary mt-1 transition-colors"
                        />
                      </div>

                      <div className="flex justify-end gap-3 mt-2">
                        <button 
                          type="button" 
                          onClick={() => {
                            setNewAvenueName('');
                            setShowAddAvenueModal(false);
                          }}
                          className="px-4 py-2 bg-transparent border border-outline-variant text-xs font-bold uppercase tracking-wider rounded-full text-on-surface-variant hover:text-on-surface hover:bg-outline-variant/30 h-10 transition-colors cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button 
                          type="submit"
                          className="px-5 py-2 bg-primary text-on-primary hover:opacity-90 text-xs font-bold uppercase tracking-wider rounded-full h-10 shadow-md transition-colors cursor-pointer"
                        >
                          Créer avenue
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* C. SUPABASE SQL SETUP GUIDE MODAL */}
          {showSqlGuide && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
              <div className="bg-surface border border-outline-variant rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up text-on-surface my-8">
                <div className="bg-background px-6 py-4 border-b border-outline-variant flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Database size={18} className="text-primary animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface">Configuration Supabase Requise</h3>
                  </div>
                  <button onClick={() => setShowSqlGuide(false)} className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-6 font-sans flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Votre application est configurée avec l'URL Supabase, mais les tables nécessaires ne semblent pas encore exister sur votre projet.
                    Pour créer les tables et les liaisons, copiez le script SQL ci-dessous, puis collez-le dans le <strong className="text-primary">SQL Editor</strong> de votre tableau de bord Supabase, et cliquez sur <strong className="text-[#10b981]">Run</strong>.
                  </p>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-background px-4 py-2 rounded-t-xl border border-outline-variant border-b-0">
                      <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase">Script SQL de Configuration</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`-- Créer les tables pour Hico-Cleaning

-- 0. Table des agents (recenseurs, éboueurs, administrateurs, abonnés)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'abonne', 'eboueur')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  password TEXT DEFAULT 'password'
);

-- Migration pour ajouter la colonne mot de passe si existante
ALTER TABLE agents ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'password';

-- 1. Table des communes
CREATE TABLE IF NOT EXISTS communes (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des avenues
CREATE TABLE IF NOT EXISTS avenues (
  id TEXT PRIMARY KEY,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des parcelles
CREATE TABLE IF NOT EXISTS parcelles (
  id TEXT PRIMARY KEY,
  avenue_id TEXT REFERENCES avenues(id) ON DELETE CASCADE,
  numero_parcelle TEXT NOT NULL,
  type_logement TEXT CHECK (type_logement IN ('maison_basse', 'appartement')),
  presence_locataire TEXT CHECK (presence_locataire IN ('oui', 'non')),
  nombre_menages INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

-- Migration pour ajouter les colonnes GPS si les tables existaient déjà
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 4. Table des abonnés (responsables)
CREATE TABLE IF NOT EXISTS abonnes (
  id TEXT PRIMARY KEY,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  telephone_principal TEXT NOT NULL,
  telephone_secondaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Extension des rôles utilisateurs
ALTER TABLE agents ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'recenseur'; 

-- 6. Table pour l'état GPS en temps réel des éboueurs
CREATE TABLE IF NOT EXISTS eboueurs_gps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  en_service BOOLEAN DEFAULT FALSE,
  derniere_mise_a_jour TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des signaux de poubelles pleines
CREATE TABLE IF NOT EXISTS signaux_poubelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  bailleur_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  statut VARCHAR(20) DEFAULT 'en_attente',
  eboueur_assigne_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 8. Table de suivi des règlements par locataire
CREATE TABLE IF NOT EXISTS validations_locataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bailleur_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  mois_annee VARCHAR(7) NOT NULL,
  locataires_payes INTEGER DEFAULT 0,
  paiement_effectue BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ
);

-- 9. Table des messages des autorités et de Hico-Cleaning
CREATE TABLE IF NOT EXISTS messages_plateforme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediteur VARCHAR(50) DEFAULT 'Hico-Cleaning',
  titre VARCHAR(100) NOT NULL,
  contenu TEXT NOT NULL,
  destinataire_role VARCHAR(20) DEFAULT 'bailleur',
  destinataire_id TEXT REFERENCES abonnes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Table des stocks de sachets par commune
CREATE TABLE IF NOT EXISTS sachet_stocks (
  id TEXT PRIMARY KEY,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  biodegradable INTEGER NOT NULL DEFAULT 0,
  non_biodegradable INTEGER NOT NULL DEFAULT 0,
  seuil_alerte INTEGER NOT NULL DEFAULT 10,
  last_replenished TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Table des distributions de sachets
CREATE TABLE IF NOT EXISTS sachet_distributions (
  id TEXT PRIMARY KEY,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  avenue_id TEXT REFERENCES avenues(id) ON DELETE CASCADE,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  date_distribution TIMESTAMPTZ DEFAULT NOW(),
  quantite_biodegradable INTEGER NOT NULL DEFAULT 0,
  quantite_non_biodegradable INTEGER NOT NULL DEFAULT 0,
  distribue_par TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Table des paiements d'abonnements (FlexPay)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  abonne_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  montant DOUBLE PRECISION NOT NULL,
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  mode_paiement VARCHAR(20) NOT NULL,
  telephone_payeur VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'success',
  reference_transaction TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Table des paiements du personnel (Agents / Éboueurs)
CREATE TABLE IF NOT EXISTS staff_payments (
  id TEXT PRIMARY KEY,
  recipient_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_role VARCHAR(20) NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  montant DOUBLE PRECISION NOT NULL,
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Table des dépenses matérielles
CREATE TABLE IF NOT EXISTS material_expenses (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  montant DOUBLE PRECISION NOT NULL,
  date_depense TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Table des litiges (Disputes) - Version standard et Version courte fallback
CREATE TABLE IF NOT EXISTS dispute_signals (
  id TEXT PRIMARY KEY,
  abonne_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  telephone VARCHAR(30) NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  montant_du DOUBLE PRECISION NOT NULL,
  date_constat TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dis_signals (
  id TEXT PRIMARY KEY,
  abonne_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  telephone VARCHAR(30) NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  montant_du DOUBLE PRECISION NOT NULL,
  date_constat TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Table de messagerie interne (Inbox)
CREATE TABLE IF NOT EXISTS inbox_messages (
  id TEXT PRIMARY KEY,
  sender VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Table des paramètres système (tarification, devises, permissions)
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les paramètres par défaut
INSERT INTO system_settings (id, value) VALUES
('subscription_price', '1.0'::jsonb),
('subscription_currency', '"$"'::jsonb),
('commune_prices', '{}'::jsonb),
('role_permissions', '{"admin": ["dashboard", "communes", "avenues", "recensement_form", "abonne_list", "abonne_detail", "rapports", "commune_explorer", "dechets_map", "sachets_management", "finance_management", "admin_settings_screens", "admin_settings_pricing", "admin_settings_accounts", "admin_settings_passwords"], "agent": ["dashboard", "communes", "avenues", "recensement_form", "abonne_list", "abonne_detail", "commune_explorer", "dechets_map", "sachets_management", "finance_management"], "abonne": ["abonne_space"], "eboueur": ["eboueur_space"]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insérer par défaut des agents et communes de Kinshasa si vides
INSERT INTO agents (id, nom, telephone, role, created_at) VALUES
('agent-1', 'Jean Malonga', '0612345678', 'agent', NOW()),
('admin-1', 'Hico Admin', '0600000000', 'admin', NOW()),
('abonne-demo', 'Papa Mavula', '0821111111', 'abonne', NOW()),
('eboueur-demo', 'Chauffeur Kabeya', '0892222222', 'eboueur', NOW())
ON CONFLICT (telephone) DO NOTHING;

INSERT INTO communes (id, nom) VALUES
('c-bandalungwa', 'Bandalungwa'),
('c-barumbu', 'Barumbu'),
('c-bumbu', 'Bumbu'),
('c-gombe', 'Gombe'),
('c-kalamu', 'Kalamu'),
('c-kasa-vubu', 'Kasa-Vubu'),
('c-kimbanseke', 'Kimbanseke'),
('c-kinshasa', 'Kinshasa'),
('c-kintambo', 'Kintambo'),
('c-kisenso', 'Kisenso'),
('c-lemba', 'Lemba'),
('c-limete', 'Limete'),
('c-lingwala', 'Lingwala'),
('c-makala', 'Makala'),
('c-maluku', 'Maluku'),
('c-masina', 'Masina'),
('c-matete', 'Matete'),
('c-mont-ngafula', 'Mont-Ngafula'),
('c-ndjili', 'Ndjili'),
('c-ngaba', 'Ngaba'),
('c-ngaliema', 'Ngaliema'),
('c-ngiringiri', 'Ngiri-Ngiri'),
('c-nsele', 'Nsele'),
('c-selembao', 'Selembao')
ON CONFLICT (nom) DO NOTHING;

-- Désactiver RLS (Row Level Security) sur toutes les tables pour permettre les opérations de synchronisation directe
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE communes DISABLE ROW LEVEL SECURITY;
ALTER TABLE avenues DISABLE ROW LEVEL SECURITY;
ALTER TABLE parcelles DISABLE ROW LEVEL SECURITY;
ALTER TABLE abonnes DISABLE ROW LEVEL SECURITY;
ALTER TABLE eboueurs_gps DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaux_poubelles DISABLE ROW LEVEL SECURITY;
ALTER TABLE validations_locataires DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages_plateforme DISABLE ROW LEVEL SECURITY;
ALTER TABLE sachet_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE sachet_distributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE material_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE dis_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
`);
                          alert("Code SQL copié dans le presse-papiers !");
                        }}
                        className="px-3 py-1 bg-primary text-on-primary hover:opacity-90 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Copier le code SQL 📋
                      </button>
                    </div>
                    <pre className="p-4 bg-black rounded-b-xl border border-outline-variant text-[11px] text-[#10b981] font-mono overflow-x-auto max-h-[250px] leading-relaxed">
{`-- 0. Table des agents (recenseurs, éboueurs, administrateurs, abonnés)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'abonne', 'eboueur')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  password TEXT DEFAULT 'password'
);

-- Migration pour ajouter la colonne mot de passe si existante
ALTER TABLE agents ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'password';

-- 1. Table des communes
CREATE TABLE IF NOT EXISTS communes (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des avenues
CREATE TABLE IF NOT EXISTS avenues (
  id TEXT PRIMARY KEY,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des parcelles
CREATE TABLE IF NOT EXISTS parcelles (
  id TEXT PRIMARY KEY,
  avenue_id TEXT REFERENCES avenues(id) ON DELETE CASCADE,
  numero_parcelle TEXT NOT NULL,
  type_logement TEXT CHECK (type_logement IN ('maison_basse', 'appartement')),
  presence_locataire TEXT CHECK (presence_locataire IN ('oui', 'non')),
  nombre_menages INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

-- Migration pour ajouter les colonnes GPS si les tables existaient déjà
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 4. Table des abonnés (responsables)
CREATE TABLE IF NOT EXISTS abonnes (
  id TEXT PRIMARY KEY,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  telephone_principal TEXT NOT NULL,
  telephone_secondaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Extension des rôles utilisateurs
ALTER TABLE agents ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'recenseur'; 

-- 6. Table pour l'état GPS en temps réel des éboueurs
CREATE TABLE IF NOT EXISTS eboueurs_gps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  en_service BOOLEAN DEFAULT FALSE,
  derniere_mise_a_jour TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des signaux de poubelles pleines
CREATE TABLE IF NOT EXISTS signaux_poubelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  bailleur_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  statut VARCHAR(20) DEFAULT 'en_attente',
  eboueur_assigne_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 8. Table de suivi des règlements par locataire
CREATE TABLE IF NOT EXISTS validations_locataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bailleur_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  mois_annee VARCHAR(7) NOT NULL,
  locataires_payes INTEGER DEFAULT 0,
  paiement_effectue BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ
);

-- 9. Table des messages des autorités et de Hico-Cleaning
CREATE TABLE IF NOT EXISTS messages_plateforme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediteur VARCHAR(50) DEFAULT 'Hico-Cleaning',
  titre VARCHAR(100) NOT NULL,
  contenu TEXT NOT NULL,
  destinataire_role VARCHAR(20) DEFAULT 'bailleur',
  destinataire_id TEXT REFERENCES abonnes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Table des stocks de sachets par commune
CREATE TABLE IF NOT EXISTS sachet_stocks (
  id TEXT PRIMARY KEY,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  biodegradable INTEGER NOT NULL DEFAULT 0,
  non_biodegradable INTEGER NOT NULL DEFAULT 0,
  seuil_alerte INTEGER NOT NULL DEFAULT 10,
  last_replenished TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Table des distributions de sachets
CREATE TABLE IF NOT EXISTS sachet_distributions (
  id TEXT PRIMARY KEY,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  avenue_id TEXT REFERENCES avenues(id) ON DELETE CASCADE,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  date_distribution TIMESTAMPTZ DEFAULT NOW(),
  quantite_biodegradable INTEGER NOT NULL DEFAULT 0,
  quantite_non_biodegradable INTEGER NOT NULL DEFAULT 0,
  distribue_par TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Table des paiements d'abonnements (FlexPay)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  abonne_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  montant DOUBLE PRECISION NOT NULL,
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  mode_paiement VARCHAR(20) NOT NULL,
  telephone_payeur VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'success',
  reference_transaction TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Table des paiements du personnel (Agents / Éboueurs)
CREATE TABLE IF NOT EXISTS staff_payments (
  id TEXT PRIMARY KEY,
  recipient_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_role VARCHAR(20) NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  montant DOUBLE PRECISION NOT NULL,
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Table des dépenses matérielles
CREATE TABLE IF NOT EXISTS material_expenses (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  montant DOUBLE PRECISION NOT NULL,
  date_depense TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Table des litiges (Disputes) - Version standard et Version courte fallback
CREATE TABLE IF NOT EXISTS dispute_signals (
  id TEXT PRIMARY KEY,
  abonne_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  telephone VARCHAR(30) NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  montant_du DOUBLE PRECISION NOT NULL,
  date_constat TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dis_signals (
  id TEXT PRIMARY KEY,
  abonne_id TEXT REFERENCES abonnes(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  telephone VARCHAR(30) NOT NULL,
  commune_id TEXT REFERENCES communes(id) ON DELETE CASCADE,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  montant_du DOUBLE PRECISION NOT NULL,
  date_constat TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Table de messagerie interne (Inbox)
CREATE TABLE IF NOT EXISTS inbox_messages (
  id TEXT PRIMARY KEY,
  sender VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Table des paramètres système (tarification, devises, permissions)
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les paramètres par défaut
INSERT INTO system_settings (id, value) VALUES
('subscription_price', '1.0'::jsonb),
('subscription_currency', '"$"'::jsonb),
('commune_prices', '{}'::jsonb),
('role_permissions', '{"admin": ["dashboard", "communes", "avenues", "recensement_form", "abonne_list", "abonne_detail", "rapports", "commune_explorer", "dechets_map", "sachets_management", "finance_management", "admin_settings_screens", "admin_settings_pricing", "admin_settings_accounts", "admin_settings_passwords"], "agent": ["dashboard", "communes", "avenues", "recensement_form", "abonne_list", "abonne_detail", "commune_explorer", "dechets_map", "sachets_management", "finance_management"], "abonne": ["abonne_space"], "eboueur": ["eboueur_space"]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insérer par défaut des agents et communes de Kinshasa si vides
INSERT INTO agents (id, nom, telephone, role, created_at) VALUES
('agent-1', 'Jean Malonga', '0612345678', 'agent', NOW()),
('admin-1', 'Hico Admin', '0600000000', 'admin', NOW()),
('abonne-demo', 'Papa Mavula', '0821111111', 'abonne', NOW()),
('eboueur-demo', 'Chauffeur Kabeya', '0892222222', 'eboueur', NOW())
ON CONFLICT (telephone) DO NOTHING;

INSERT INTO communes (id, nom) VALUES
('c-bandalungwa', 'Bandalungwa'),
('c-barumbu', 'Barumbu'),
('c-bumbu', 'Bumbu'),
('c-gombe', 'Gombe'),
('c-kalamu', 'Kalamu'),
('c-kasa-vubu', 'Kasa-Vubu'),
('c-kimbanseke', 'Kimbanseke'),
('c-kinshasa', 'Kinshasa'),
('c-kintambo', 'Kintambo'),
('c-kisenso', 'Kisenso'),
('c-lemba', 'Lemba'),
('c-limete', 'Limete'),
('c-lingwala', 'Lingwala'),
('c-makala', 'Makala'),
('c-maluku', 'Maluku'),
('c-masina', 'Masina'),
('c-matete', 'Matete'),
('c-mont-ngafula', 'Mont-Ngafula'),
('c-ndjili', 'Ndjili'),
('c-ngaba', 'Ngaba'),
('c-ngaliema', 'Ngaliema'),
('c-ngiringiri', 'Ngiri-Ngiri'),
('c-nsele', 'Nsele'),
('c-selembao', 'Selembao')
ON CONFLICT (nom) DO NOTHING;

-- Désactiver RLS (Row Level Security) sur toutes les tables pour permettre les opérations de synchronisation directe
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE communes DISABLE ROW LEVEL SECURITY;
ALTER TABLE avenues DISABLE ROW LEVEL SECURITY;
ALTER TABLE parcelles DISABLE ROW LEVEL SECURITY;
ALTER TABLE abonnes DISABLE ROW LEVEL SECURITY;
ALTER TABLE eboueurs_gps DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaux_poubelles DISABLE ROW LEVEL SECURITY;
ALTER TABLE validations_locataires DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages_plateforme DISABLE ROW LEVEL SECURITY;
ALTER TABLE sachet_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE sachet_distributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE material_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE dis_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
`}
                    </pre>
                  </div>

                  <div className="flex gap-2.5 items-start bg-primary/10 border border-primary/20 p-3.5 rounded-2xl text-[11px] text-on-surface-variant leading-relaxed">
                    <span>💡</span>
                    <span>
                      Une fois que vous aurez exécuté ce code dans votre projet Supabase, cliquez sur 
                      <strong className="text-primary cursor-pointer hover:underline ml-1" onClick={() => { fetchAllData(); setShowSqlGuide(false); }}>
                        Recharger les données 🔄
                      </strong> 
                      pour activer la synchronisation instantanée.
                    </span>
                  </div>
                </div>

                <div className="bg-background px-6 py-4 border-t border-outline-variant flex justify-between items-center">
                  <button 
                    onClick={() => {
                      fetchAllData();
                      setShowSqlGuide(false);
                    }}
                    className="px-4 py-2 bg-primary text-on-primary hover:opacity-95 text-xs font-bold uppercase rounded-full tracking-wider transition-all"
                  >
                    Réessayer de se connecter 🔄
                  </button>
                  <button 
                    onClick={() => setShowSqlGuide(false)}
                    className="px-4 py-2 border border-outline-variant text-xs font-bold uppercase rounded-full text-on-surface-variant hover:text-on-surface hover:bg-outline-variant/20 transition-all"
                  >
                    Ignorer (Mode local)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Beautiful Toast System */}
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
            {toasts.map((toast) => {
              const bgClass = 
                toast.type === 'success' ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100' :
                toast.type === 'error' ? 'bg-red-950/95 border-red-500/30 text-red-100' :
                toast.type === 'warning' ? 'bg-amber-950/95 border-amber-500/30 text-amber-100' :
                'bg-slate-950/95 border-slate-700/30 text-slate-100';

              const icon = 
                toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" /> :
                toast.type === 'error' ? <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" /> :
                toast.type === 'warning' ? <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" /> :
                <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />;

              return (
                <div 
                  key={toast.id}
                  className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.4)] ${bgClass} animate-slide-in-right hover:scale-[1.01] transition-transform duration-200`}
                >
                  {icon}
                  <div className="flex-1 text-xs font-semibold leading-normal break-words">
                    {toast.message.split('\n').map((line, idx) => (
                      <p key={idx} className={idx > 0 ? 'mt-1 text-[11px] opacity-90' : ''}>{line}</p>
                    ))}
                  </div>
                  <button 
                    onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="text-white/40 hover:text-white/90 p-0.5 rounded transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}

