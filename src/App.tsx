import React, { useState, useEffect } from 'react';
import { Agent, Commune, Avenue, Parcelle, Abonne, Screen, PoubelleSignal, Eboueur, InboxMessage } from './types';
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

// Lucide Icons
import { LayoutDashboard, FileText, Users, BarChart3, User, LogOut, ArrowLeft, Plus, X, RefreshCw, Database, Compass, Trash2, Truck } from 'lucide-react';

export default function App() {
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
    return saved ? JSON.parse(saved) : null;
  });

  // 2. Active Screen state
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('hico_current_user');
    return saved ? 'dashboard' : 'login';
  });

  // 3. Drill-down Context states
  const [selectedCommuneId, setSelectedCommuneId] = useState<string | null>(null);
  const [selectedAvenueObj, setSelectedAvenueObj] = useState<Avenue | null>(null);

  // 4. local DB states with automatic migration to clean production state
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [avenues, setAvenues] = useState<Avenue[]>([]);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [abonnes, setAbonnes] = useState<Abonne[]>([]);

  // 4.2. Waste management and collector tracking states
  const [poubelleSignals, setPoubelleSignals] = useState<PoubelleSignal[]>(() => {
    const saved = localStorage.getItem('hico_poubelle_signals');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'sig-1',
        parcelle_id: 'p-demo-1',
        commune_id: 'c-gombe',
        avenue_id: 'ave-gombe-1',
        commune_nom: 'Gombe',
        avenue_nom: 'Boulevard du 30 Juin',
        numero_parcelle: '24',
        bailleur_nom: 'Papa Mavula',
        bailleur_telephone: '0821111111',
        status: 'pending',
        reported_at: new Date(Date.now() - 30 * 60000).toISOString()
      },
      {
        id: 'sig-2',
        parcelle_id: 'p-demo-2',
        commune_id: 'c-lemba',
        avenue_id: 'ave-lemba-1',
        commune_nom: 'Lemba',
        avenue_nom: 'Université',
        numero_parcelle: '112',
        bailleur_nom: 'Maman Sifa',
        bailleur_telephone: '0815555555',
        status: 'assigned',
        assigned_eboueur_id: 'eb-2',
        reported_at: new Date(Date.now() - 90 * 60000).toISOString()
      }
    ];
  });

  const [eboueurs, setEboueurs] = useState<Eboueur[]>(() => {
    const saved = localStorage.getItem('hico_eboueurs');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'eb-1',
        nom: 'Chauffeur Kabeya',
        telephone: '0892222222',
        latitude: -4.32111,
        longitude: 15.30555,
        status: 'idle',
        gps_active: true
      },
      {
        id: 'eb-2',
        nom: 'Chauffeur Mutombo',
        telephone: '0893333333',
        latitude: -4.35444,
        longitude: 15.31222,
        status: 'en_mission',
        gps_active: true
      },
      {
        id: 'eb-3',
        nom: 'Chauffeur Ngalula',
        telephone: '0894444444',
        latitude: -4.33999,
        longitude: 15.28999,
        status: 'idle',
        gps_active: false
      }
    ];
  });

  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>(() => {
    const saved = localStorage.getItem('hico_inbox_messages');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'msg-1',
        sender: 'Hico-Cleaning',
        content: 'Bienvenue sur votre espace de salubrité Hico-Cleaning ! Retrouvez ici vos factures, vos signalements de poubelles pleines et les alertes d\'assainissement.',
        sent_at: 'Hier, 14:00',
        read: false
      },
      {
        id: 'msg-2',
        sender: 'Autorités Urbaines',
        content: 'Directive Kinshasa Bopeto : Tous les bailleurs sont tenus de dégager les trottoirs devant leurs parcelles sous peine d\'amende administrative de l\'Hôtel de Ville.',
        sent_at: 'Hier, 09:30',
        read: false
      }
    ];
  });

  // Local Storage Synchronization for waste management
  useEffect(() => {
    localStorage.setItem('hico_poubelle_signals', JSON.stringify(poubelleSignals));
  }, [poubelleSignals]);

  useEffect(() => {
    localStorage.setItem('hico_eboueurs', JSON.stringify(eboueurs));
  }, [eboueurs]);

  useEffect(() => {
    localStorage.setItem('hico_inbox_messages', JSON.stringify(inboxMessages));
  }, [inboxMessages]);

  // Seeding Gombe demo structures to avoid blank dashboards
  useEffect(() => {
    if (communes.length > 0) {
      const hasGombeAve = avenues.some(a => a.commune_id === 'c-gombe');
      if (!hasGombeAve) {
        const demoAve: Avenue = {
          id: 'ave-gombe-1',
          commune_id: 'c-gombe',
          nom: 'Boulevard du 30 Juin',
          created_at: new Date().toISOString()
        };
        const demoAve2: Avenue = {
          id: 'ave-lemba-1',
          commune_id: 'c-lemba',
          nom: 'Université',
          created_at: new Date().toISOString()
        };
        setAvenues(prev => {
          const updated = [demoAve, demoAve2, ...prev];
          localStorage.setItem('hico_db_avenues', JSON.stringify(updated));
          return updated;
        });

        const demoParc: Parcelle = {
          id: 'p-demo-1',
          avenue_id: 'ave-gombe-1',
          numero_parcelle: '24',
          type_logement: 'maison_basse',
          presence_locataire: 'oui',
          nombre_menages: 7, // 7 households
          created_by: 'admin-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          latitude: -4.31234,
          longitude: 15.29876
        };
        const demoParc2: Parcelle = {
          id: 'p-demo-2',
          avenue_id: 'ave-lemba-1',
          numero_parcelle: '112',
          type_logement: 'appartement',
          presence_locataire: 'oui',
          nombre_menages: 4,
          created_by: 'admin-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          latitude: -4.35411,
          longitude: 15.31122
        };
        setParcelles(prev => {
          const updated = [demoParc, demoParc2, ...prev];
          localStorage.setItem('hico_db_parcelles', JSON.stringify(updated));
          return updated;
        });

        const demoAb: Abonne = {
          id: 'abonne-demo',
          parcelle_id: 'p-demo-1',
          nom_complet: 'Papa Mavula',
          telephone_principal: '0821111111',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setAbonnes(prev => {
          const updated = [demoAb, ...prev];
          localStorage.setItem('hico_db_abonnes', JSON.stringify(updated));
          return updated;
        });
      }
    }
  }, [communes, avenues]);

  // 5. Supabase connection feedback state
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error_missing_tables' | 'offline'>('loading');
  const [dbErrorMsg, setDbErrorMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  // Load from Supabase on mount with localStorage as reactive offline fallback
  const fetchAllData = async () => {
    if (!isSupabaseConfigured) {
      setDbStatus('offline');
      // Load from localStorage as fallback
      const savedCommunes = localStorage.getItem('hico_db_communes');
      const savedAvenues = localStorage.getItem('hico_db_avenues');
      const savedParcelles = localStorage.getItem('hico_db_parcelles');
      const savedAbonnes = localStorage.getItem('hico_db_abonnes');

      setCommunes(savedCommunes ? JSON.parse(savedCommunes) : INITIAL_COMMUNES);
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
        const { error: seedError } = await supabase.from('communes').insert(INITIAL_COMMUNES);
        if (!seedError) {
          activeCommunes = [...INITIAL_COMMUNES];
        }
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

      setCommunes(savedCommunes ? JSON.parse(savedCommunes) : INITIAL_COMMUNES);
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
    setCurrentScreen('dashboard');
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

  // ==========================================
  // GESTION DES DECHETS ET EBOUEURS HANDLERS
  // ==========================================
  const handleReportTrashFull = () => {
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
    const ave = avenues.find(a => a.id === parc.avenue_id);
    const com = communes.find(c => c.id === ave?.commune_id);

    // Create a new signal
    const newSignal: PoubelleSignal = {
      id: 'sig-' + Math.random().toString(36).substring(2, 11),
      parcelle_id: parc.id,
      commune_id: com?.id || 'c-gombe',
      avenue_id: ave?.id || 'ave-gombe-1',
      commune_nom: com?.nom || 'Gombe',
      avenue_nom: ave?.nom || 'Boulevard du 30 Juin',
      numero_parcelle: parc.numero_parcelle,
      bailleur_nom: ab.nom_complet,
      bailleur_telephone: ab.telephone_principal,
      status: 'pending',
      reported_at: new Date().toISOString()
    };

    setPoubelleSignals(prev => [newSignal, ...prev]);
  };

  const handleAssignEboueur = (signalId: string, eboueurId: string) => {
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
  };

  const handleCompleteMission = (signalId: string) => {
    let assignedEbId: string | undefined;

    setPoubelleSignals(prev => prev.map(sig => {
      if (sig.id === signalId) {
        assignedEbId = sig.assigned_eboueur_id;
        return {
          ...sig,
          status: 'completed',
          completed_at: new Date().toISOString()
        };
      }
      return sig;
    }));

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
      const currentEb = eboueurs.find(e => e.telephone === currentUser?.telephone || e.id === 'eboueur-demo');
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
  };

  const handleToggleEboueurGps = () => {
    const currentEb = eboueurs.find(e => e.telephone === currentUser?.telephone || e.id === 'eboueur-demo');
    if (!currentEb) return;

    setEboueurs(prev => prev.map(eb => {
      if (eb.id === currentEb.id) {
        const nextGpsState = !eb.gps_active;
        const newLat = nextGpsState ? eb.latitude + (Math.random() - 0.5) * 0.002 : eb.latitude;
        const newLng = nextGpsState ? eb.longitude + (Math.random() - 0.5) * 0.002 : eb.longitude;
        return {
          ...eb,
          gps_active: nextGpsState,
          latitude: newLat,
          longitude: newLng
        };
      }
      return eb;
    }));
  };

  const handleSendInboxMessage = (sender: string, content: string) => {
    const newMsg: InboxMessage = {
      id: 'msg-' + Math.random().toString(36).substring(2, 11),
      sender,
      content,
      sent_at: 'À l\'instant',
      read: false
    };
    setInboxMessages(prev => [newMsg, ...prev]);
  };

  const handleSimulateSignal = (parcelleId: string) => {
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
      id: 'sig-' + Math.random().toString(36).substring(2, 11),
      parcelle_id: parc.id,
      commune_id: com?.id || 'c-gombe',
      avenue_id: ave?.id || 'ave-gombe-1',
      commune_nom: com?.nom || 'Gombe',
      avenue_nom: ave?.nom || 'Boulevard du 30 Juin',
      numero_parcelle: parc.numero_parcelle,
      bailleur_nom: ab.nom_complet,
      bailleur_telephone: ab.telephone_principal,
      status: 'pending',
      reported_at: new Date().toISOString()
    };

    setPoubelleSignals(prev => [newSignal, ...prev]);
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
        <LoginForm onLoginSuccess={handleLogin} />
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
            </div>
          </header>

          {/* Desktop Sidebar Layout Wrapper */}
          <div className="flex flex-grow pt-16">
            
            {/* Desktop Left-Rail Navigation (visible on md+) */}
            <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-outline-variant bg-surface flex-col py-6 px-4 gap-2 z-30 shadow-xl">
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
                    onClick={() => setCurrentScreen('dechets_map')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold active:scale-[0.98] w-full text-left cursor-pointer ${
                      currentScreen === 'dechets_map'
                        ? 'bg-primary text-on-primary shadow-md shadow-primary/10 border border-outline-variant'
                        : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
                    }`}
                  >
                    <Trash2 size={18} />
                    <span>Poubelles & Éboueurs</span>
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
                  onBack={() => setCurrentScreen('dashboard')}
                  onAddCommuneToggle={() => setShowAddCommuneModal(true)}
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

              {currentScreen === 'commune_explorer' && (
                <CommuneExplorer 
                  communes={communes}
                  avenues={avenues}
                  parcelles={parcelles}
                  abonnes={abonnes}
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
                  />
                );
              })()}

              {currentScreen === 'eboueur_space' && (() => {
                const currentEb = eboueurs.find(e => e.telephone === currentUser?.telephone || e.id === 'eboueur-demo') || eboueurs[0];
                const myAssignedMissions = poubelleSignals.filter(s => s.assigned_eboueur_id === currentEb.id && s.status === 'assigned');
                const myCompletedMissions = poubelleSignals.filter(s => s.assigned_eboueur_id === currentEb.id && s.status === 'completed');

                return (
                  <EboueurSpaceView 
                    currentEboueur={currentEb}
                    assignedMissions={myAssignedMissions}
                    completedMissions={myCompletedMissions}
                    onToggleGps={handleToggleEboueurGps}
                    onCompleteMission={handleCompleteMission}
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
                />
              )}

            </main>
          </div>

          {/* 3. BottomNavBar visible only on screens smaller than md */}
          <BottomNavBar 
            currentScreen={currentScreen} 
            userRole={currentUser?.role}
            onScreenChange={(screenId) => {
              // Clear temporary selection indices when moving randomly through footer
              if (screenId !== 'avenues' && screenId !== 'recensement_form') {
                setSelectedCommuneId(null);
                setSelectedAvenueObj(null);
              }
              setCurrentScreen(screenId);
            }} 
          />

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

-- Insérer par défaut les 24 communes de Kinshasa si vides
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
ON CONFLICT (nom) DO NOTHING;`);
                          alert("Code SQL copié dans le presse-papiers !");
                        }}
                        className="px-3 py-1 bg-primary text-on-primary hover:opacity-90 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Copier le code SQL 📋
                      </button>
                    </div>
                    <pre className="p-4 bg-black rounded-b-xl border border-outline-variant text-[11px] text-[#10b981] font-mono overflow-x-auto max-h-[250px] leading-relaxed">
{`-- 1. Table des communes
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
  type_logement TEXT,
  presence_locataire TEXT,
  nombre_menages INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

-- Migration pour ajouter les colonnes GPS si existantes
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 4. Table des abonnés
CREATE TABLE IF NOT EXISTS abonnes (
  id TEXT PRIMARY KEY,
  parcelle_id TEXT REFERENCES parcelles(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  telephone_principal TEXT NOT NULL,
  telephone_secondaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}
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

        </div>
      )}
    </div>
  );
}

