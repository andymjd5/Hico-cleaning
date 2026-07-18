import React, { useState, useMemo } from 'react';
import { Commune, Avenue, Parcelle, Abonne } from '../types';
import { 
  Building2, 
  MapPin, 
  Map as MapLucide, 
  Users, 
  Compass, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  ExternalLink,
  Phone,
  Layers,
  Table,
  Filter,
  Check,
  MapIcon,
  Layers3,
  SlidersHorizontal,
  Info,
  RefreshCw,
  Navigation,
  AlertTriangle
} from 'lucide-react';

interface CommuneExplorerProps {
  communes: Commune[];
  avenues: Avenue[];
  parcelles: Parcelle[];
  abonnes: Abonne[];
  onUpdateParcelleGps?: (parcelleId: string, latitude: number, longitude: number) => Promise<void> | void;
}

type ExplorerViewMode = 'accordion' | 'table';

export default function CommuneExplorer({
  communes,
  avenues,
  parcelles,
  abonnes,
  onUpdateParcelleGps
}: CommuneExplorerProps) {
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ExplorerViewMode>('table'); // Default to table as requested
  
  // GPS Update States
  const [updatingParcelleId, setUpdatingParcelleId] = useState<string | null>(null);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);

  const handleLiveUpdateGps = (parcelleId: string) => {
    if (!onUpdateParcelleGps) return;
    setUpdatingParcelleId(parcelleId);
    setGpsStatusMessage("Recherche du signal GPS de haute précision...");

    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas prise en charge par cet appareil.");
      setUpdatingParcelleId(null);
      setGpsStatusMessage(null);
      return;
    }

    let bestPos: GeolocationPosition | null = null;
    let attempts = 0;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        attempts++;
        const currentAccuracy = position.coords.accuracy;
        setGpsStatusMessage(`Précision : ±${currentAccuracy.toFixed(1)}m (Recherche...)`);
        
        if (!bestPos || currentAccuracy < bestPos.coords.accuracy) {
          bestPos = position;
        }

        // If very high accuracy reached (<= 8 meters), save immediately!
        if (currentAccuracy <= 8) {
          navigator.geolocation.clearWatch(watchId);
          onUpdateParcelleGps(parcelleId, position.coords.latitude, position.coords.longitude);
          setUpdatingParcelleId(null);
          setGpsStatusMessage(null);
          alert(`🎯 Position GPS de haute précision enregistrée ! (±${currentAccuracy.toFixed(1)} mètres)`);
        }
      },
      (error) => {
        console.warn("watchPosition failed, trying standard fallback...", error);
        
        if (bestPos) {
          navigator.geolocation.clearWatch(watchId);
          onUpdateParcelleGps(parcelleId, bestPos.coords.latitude, bestPos.coords.longitude);
          setUpdatingParcelleId(null);
          setGpsStatusMessage(null);
          return;
        }

        // Fallback
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            onUpdateParcelleGps(parcelleId, fallbackPos.coords.latitude, fallbackPos.coords.longitude);
            setUpdatingParcelleId(null);
            setGpsStatusMessage(null);
            alert(`📍 Position GPS enregistrée ! (Précision : ±${fallbackPos.coords.accuracy.toFixed(1)}m)`);
          },
          (err) => {
            let msg = "Erreur de géolocalisation.";
            if (err.code === err.PERMISSION_DENIED) {
              msg = "Autorisation d'accès GPS refusée.";
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              msg = "Signal GPS indisponible ou désactivé.";
            } else if (err.code === err.TIMEOUT) {
              msg = "Délai d'attente dépassé.";
            }
            alert(`⚠️ Impossible de mettre à jour le GPS : ${msg}`);
            setUpdatingParcelleId(null);
            setGpsStatusMessage(null);
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
        navigator.geolocation.clearWatch(watchId);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Timeout fallback (8.5 seconds)
    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      setUpdatingParcelleId((currentId) => {
        if (currentId === parcelleId) {
          if (bestPos) {
            onUpdateParcelleGps(parcelleId, bestPos.coords.latitude, bestPos.coords.longitude);
            alert(`📍 Position GPS optimale enregistrée ! (Précision : ±${bestPos.coords.accuracy.toFixed(1)}m)`);
          } else {
            alert("⚠️ La recherche GPS a expiré sans obtenir de signal précis. Veuillez réessayer dans un endroit dégagé.");
          }
        }
        return null;
      });
      setGpsStatusMessage(null);
    }, 8500);
  };
  
  // Accordion mode states
  const [searchAvenueQuery, setSearchAvenueQuery] = useState('');
  const [expandedAvenues, setExpandedAvenues] = useState<Record<string, boolean>>({});

  // Table mode states & filters
  const [selectedAvenueFilterId, setSelectedAvenueFilterId] = useState<string>('');
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [onlyWithGps, setOnlyWithGps] = useState(false);

  const selectedCommune = useMemo(() => {
    return communes.find(c => c.id === selectedCommuneId);
  }, [communes, selectedCommuneId]);

  // All avenues for the selected commune
  const communeAvenues = useMemo(() => {
    if (!selectedCommuneId) return [];
    return avenues.filter(a => a.commune_id === selectedCommuneId);
  }, [avenues, selectedCommuneId]);

  // Filtered avenues for the accordion view
  const filteredAvenues = useMemo(() => {
    return communeAvenues.filter(a => 
      searchAvenueQuery === '' || a.nom.toLowerCase().includes(searchAvenueQuery.toLowerCase())
    );
  }, [communeAvenues, searchAvenueQuery]);

  // Gather and assemble all parcels and subscribers for the selected commune
  const communeParcellesList = useMemo(() => {
    if (!selectedCommuneId) return [];
    
    const avenueMap = new Map(communeAvenues.map(a => [a.id, a.nom]));
    
    const results = [];
    for (const parcelle of parcelles) {
      if (avenueMap.has(parcelle.avenue_id)) {
        const avenueNom = avenueMap.get(parcelle.avenue_id) || "";
        const bailleur = abonnes.find(ab => ab.parcelle_id === parcelle.id);
        results.push({
          parcelle,
          avenueNom,
          bailleur
        });
      }
    }
    return results;
  }, [selectedCommuneId, communeAvenues, parcelles, abonnes]);

  // Filtered rows for the interactive table view
  const filteredTableRows = useMemo(() => {
    return communeParcellesList.filter(row => {
      // 1. Filter by specific avenue
      if (selectedAvenueFilterId && row.parcelle.avenue_id !== selectedAvenueFilterId) {
        return false;
      }
      
      // 2. Filter by GPS coordinates existence
      if (onlyWithGps && (row.parcelle.latitude == null || row.parcelle.longitude == null)) {
        return false;
      }
      
      // 3. Search query filter
      if (searchTableQuery.trim() !== '') {
        const q = searchTableQuery.toLowerCase();
        const bailleurMatch = row.bailleur 
          ? row.bailleur.nom_complet.toLowerCase().includes(q) || 
            row.bailleur.telephone_principal.includes(q) ||
            (row.bailleur.telephone_secondaire && row.bailleur.telephone_secondaire.includes(q))
          : false;
        const avenueMatch = row.avenueNom.toLowerCase().includes(q);
        const parcelNumMatch = row.parcelle.numero_parcelle.toString().includes(q);
        
        if (!bailleurMatch && !avenueMatch && !parcelNumMatch) {
          return false;
        }
      }
      
      return true;
    });
  }, [communeParcellesList, selectedAvenueFilterId, onlyWithGps, searchTableQuery]);

  // Compute stats for selected commune
  const communeStats = useMemo(() => {
    if (!selectedCommuneId) return { avenuesCount: 0, parcellesCount: 0, ownersCount: 0, withGpsCount: 0 };
    
    const communeAvenueIds = communeAvenues.map(a => a.id);
    const communeParcelles = parcelles.filter(p => communeAvenueIds.includes(p.avenue_id));
    const communeParcelleIds = communeParcelles.map(p => p.id);
    const communeAbonnes = abonnes.filter(ab => communeParcelleIds.includes(ab.parcelle_id));
    const withGps = communeParcelles.filter(p => p.latitude != null && p.longitude != null);

    return {
      avenuesCount: communeAvenueIds.length,
      parcellesCount: communeParcelles.length,
      ownersCount: communeAbonnes.length,
      withGpsCount: withGps.length
    };
  }, [selectedCommuneId, communeAvenues, parcelles, abonnes]);

  const toggleAvenueExpand = (avenueId: string) => {
    setExpandedAvenues(prev => ({
      ...prev,
      [avenueId]: !prev[avenueId]
    }));
  };

  // Get data for a specific avenue (used in accordion view)
  const getAvenueData = (avenueId: string) => {
    const avenueParcelles = parcelles.filter(p => p.avenue_id === avenueId);
    return avenueParcelles.map(parcelle => {
      const bailleur = abonnes.find(ab => ab.parcelle_id === parcelle.id);
      return {
        parcelle,
        bailleur
      };
    });
  };

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant p-5 md:p-6 shadow-lg animate-fade-in text-on-surface">
      
      {/* Title block */}
      <header className="flex flex-col gap-2 pb-5 mb-5 border-b border-outline-variant/40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-secondary/15 rounded-xl text-secondary">
            <Compass size={24} className="animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Explorateur GPS & Communes</h2>
            <p className="text-xs text-on-surface-variant font-medium">
              Consultation des parcelles, bailleurs et relevés géolocalisés par commune de Kinshasa
            </p>
          </div>
        </div>
      </header>

      {/* Select Commune Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left Side: Select dropdown */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Sélectionner une Commune *
          </label>
          <div className="relative">
            <select
              value={selectedCommuneId}
              onChange={(e) => {
                setSelectedCommuneId(e.target.value);
                setSearchAvenueQuery('');
                setExpandedAvenues({});
                setSelectedAvenueFilterId('');
                setSearchTableQuery('');
              }}
              className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer appearance-none"
            >
              <option value="" disabled>-- Choisir une commune --</option>
              {communes.map((comm) => (
                <option key={comm.id} value={comm.id}>
                  {comm.nom}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-on-surface-variant">
              <ChevronDown size={18} />
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant italic mt-1 leading-relaxed">
            Sélectionnez l'une des 24 communes pour interroger en temps réel les informations et parcelles enregistrées.
          </p>
        </div>

        {/* Right Side: Quick Stats Bento */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="p-3 bg-background border border-outline-variant/50 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start text-on-surface-variant mb-1">
              <Layers size={16} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Avenues</span>
            </div>
            <div>
              <div className="text-xl font-black text-on-surface">{communeStats.avenuesCount}</div>
              <p className="text-[9px] text-on-surface-variant">avenues enregistrées</p>
            </div>
          </div>

          <div className="p-3 bg-background border border-outline-variant/50 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start text-primary mb-1">
              <Building2 size={16} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Parcelles</span>
            </div>
            <div>
              <div className="text-xl font-black text-primary">{communeStats.parcellesCount}</div>
              <p className="text-[9px] text-on-surface-variant">parcelles recensées</p>
            </div>
          </div>

          <div className="p-3 bg-background border border-outline-variant/50 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start text-[#10b981] mb-1">
              <Users size={16} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Bailleurs</span>
            </div>
            <div>
              <div className="text-xl font-black text-[#10b981]">{communeStats.ownersCount}</div>
              <p className="text-[9px] text-on-surface-variant">responsables abonnés</p>
            </div>
          </div>

          <div className="p-3 bg-background border border-outline-variant/50 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start text-secondary mb-1">
              <MapPin size={16} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">GPS Validés</span>
            </div>
            <div>
              <div className="text-xl font-black text-secondary">{communeStats.withGpsCount}</div>
              <p className="text-[9px] text-on-surface-variant">points géolocalisés</p>
            </div>
          </div>

        </div>

      </div>

      {/* Segmented control view toggle */}
      {selectedCommune && (
        <div className="flex border-b border-outline-variant/50 pb-4 mb-5 items-center justify-between gap-4 flex-wrap">
          <div className="flex p-1 bg-background border border-outline-variant rounded-xl gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Table size={14} />
              <span>Tableau Filtrable 📊</span>
            </button>
            <button
              onClick={() => setViewMode('accordion')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'accordion'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <MapLucide size={14} />
              <span>Vue par Avenue 🗂️</span>
            </button>
          </div>

          <div className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
            <Info size={14} className="text-secondary" />
            <span>Note : Les <strong>Occupants</strong> affichés représentent uniquement les <strong>bailleurs</strong> (propriétaires).</span>
          </div>
        </div>
      )}

      {/* Selected Commune Main content */}
      {selectedCommune ? (
        <div className="flex flex-col gap-4">
          
          {/* VIEW MODE 1: FILTERABLE TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              
              {/* Filter Panel */}
              <div className="p-4 bg-background/50 border border-outline-variant/60 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                  <SlidersHorizontal size={14} className="text-secondary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Filtres de recherche</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* Dropdown to filter by Avenue */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
                      Filtrer par Avenue
                    </label>
                    <div className="relative">
                      <select
                        value={selectedAvenueFilterId}
                        onChange={(e) => setSelectedAvenueFilterId(e.target.value)}
                        className="w-full h-10 pl-3 pr-8 bg-background border border-outline-variant rounded-xl text-xs font-semibold text-on-surface focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="">Toutes les avenues ({communeAvenues.length})</option>
                        {communeAvenues.map((ave) => (
                          <option key={ave.id} value={ave.id}>
                            Avenue {ave.nom}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-on-surface-variant">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  {/* General Search Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
                      Nom, N° Parcelle, Téléphone
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTableQuery}
                        onChange={(e) => setSearchTableQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 bg-background border border-outline-variant rounded-xl text-xs font-semibold text-on-surface focus:outline-none focus:border-secondary"
                      />
                      <Search size={14} className="absolute left-3 text-on-surface-variant" />
                    </div>
                  </div>

                  {/* Checkbox: only with GPS coordinates */}
                  <div className="flex items-center h-10">
                    <label className="relative flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={onlyWithGps}
                        onChange={(e) => setOnlyWithGps(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-9 h-5 bg-outline-variant/60 rounded-full peer peer-focus:ring-2 peer-focus:ring-secondary/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-outline-variant/30 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant peer-checked:text-secondary flex items-center gap-1 transition-colors">
                        <MapPin size={12} /> Uniquement avec GPS
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Data Table Statistics */}
              <div className="flex justify-between items-center px-1 text-xs text-on-surface-variant">
                <span>
                  Résultats : <strong>{filteredTableRows.length}</strong> parcelles trouvées
                </span>
                {(selectedAvenueFilterId || searchTableQuery || onlyWithGps) && (
                  <button
                    onClick={() => {
                      setSelectedAvenueFilterId('');
                      setSearchTableQuery('');
                      setOnlyWithGps(false);
                    }}
                    className="text-xs text-secondary font-bold hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>

              {/* Responsive table */}
              <div className="border border-outline-variant rounded-2xl bg-background/20 overflow-hidden shadow-sm">
                
                {/* Desktop and Tablet table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-on-surface">
                    <thead>
                      <tr className="bg-background border-b border-outline-variant font-bold uppercase tracking-wider text-[10px] text-on-surface-variant">
                        <th className="px-5 py-3.5">Adresse Complète</th>
                        <th className="px-5 py-3.5">Bailleur (Propriétaire)</th>
                        <th className="px-5 py-3.5">Coordonnées GPS</th>
                        <th className="px-5 py-3.5">Type & Ménages</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {filteredTableRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-on-surface-variant italic font-medium">
                            Aucune parcelle ne correspond à vos filtres de recherche pour la commune de {selectedCommune.nom}.
                          </td>
                        </tr>
                      ) : (
                        filteredTableRows.map((row) => {
                          const { parcelle, avenueNom, bailleur } = row;
                          const hasGps = parcelle.latitude != null && parcelle.longitude != null;
                          return (
                            <tr key={parcelle.id} className="hover:bg-background/40 transition-colors">
                              {/* Address column */}
                              <td className="px-5 py-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-extrabold text-primary text-sm">
                                    N° {parcelle.numero_parcelle}
                                  </span>
                                  <span className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1">
                                    <MapLucide size={11} className="shrink-0" />
                                    Avenue {avenueNom}
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant opacity-85">
                                    Commune de {selectedCommune.nom}
                                  </span>
                                </div>
                              </td>

                              {/* Owner / Bailleur column */}
                              <td className="px-5 py-4">
                                {bailleur ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-extrabold text-on-surface text-sm">
                                      {bailleur.nom_complet}
                                    </span>
                                    <span className="text-[11px] text-on-surface-variant font-mono flex items-center gap-1">
                                      <Phone size={11} className="shrink-0 text-[#10b981]" />
                                      {bailleur.telephone_principal}
                                    </span>
                                    {bailleur.telephone_secondaire && (
                                      <span className="text-[10px] text-on-surface-variant font-mono pl-4">
                                        Secondaire : {bailleur.telephone_secondaire}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-error font-bold italic flex items-center gap-1 bg-error/10 px-2 py-1 rounded-lg w-max">
                                    ⚠️ Non identifié
                                  </span>
                                )}
                              </td>

                              {/* GPS Coordinates column */}
                              <td className="px-5 py-4">
                                {hasGps ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="font-mono text-xs text-[#10b981] font-bold bg-[#10b981]/10 px-2.5 py-1 rounded-lg border border-[#10b981]/15 w-max flex items-center gap-1">
                                      <MapPin size={12} />
                                      {parcelle.latitude?.toFixed(6)}, {parcelle.longitude?.toFixed(6)}
                                    </span>
                                    <span className="text-[10px] text-[#10b981] font-semibold pl-1">
                                      Point vérifié ✔
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-on-surface-variant italic text-[11px] opacity-60">
                                    Non renseignées
                                  </span>
                                )}
                              </td>

                              {/* Parcel details column */}
                              <td className="px-5 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/15 rounded-full font-bold uppercase tracking-wider w-max">
                                    {parcelle.type_logement === 'maison_basse' ? 'Maison Basse' : 'Appartement'}
                                  </span>
                                  <div className="text-[11px] text-on-surface-variant font-medium">
                                    Ménages : <strong className="text-secondary">{parcelle.nombre_menages}</strong>
                                    {parcelle.type_logement === 'maison_basse' && (
                                      <>
                                        <span className="mx-1">|</span>
                                        Locataires : <strong>{parcelle.presence_locataire === 'oui' ? 'Oui' : 'Non'}</strong>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Action buttons */}
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  {onUpdateParcelleGps && (
                                    <button
                                      type="button"
                                      disabled={updatingParcelleId !== null}
                                      onClick={() => handleLiveUpdateGps(parcelle.id)}
                                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer ${
                                        updatingParcelleId === parcelle.id
                                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse'
                                          : hasGps
                                          ? 'bg-primary/10 hover:bg-primary/25 text-primary border border-primary/20'
                                          : 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/20 font-extrabold shadow-sm'
                                      }`}
                                    >
                                      {updatingParcelleId === parcelle.id ? (
                                        <>
                                          <RefreshCw size={12} className="animate-spin" />
                                          <span className="text-[10px]">{gpsStatusMessage || 'Recherche...'}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Compass size={12} />
                                          <span>{hasGps ? 'Mettre à jour GPS 📍' : 'Prélèvement GPS 📍'}</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                  {hasGps && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${parcelle.latitude},${parcelle.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary bg-secondary/15 hover:bg-secondary/25 border border-secondary/20 px-3 py-1.5 rounded-xl transition-all"
                                    >
                                      <span>Carte</span>
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view cards (displays instead of tables on smaller viewports) */}
                <div className="md:hidden flex flex-col divide-y divide-outline-variant/40">
                  {filteredTableRows.length === 0 ? (
                    <div className="text-center py-10 text-on-surface-variant italic text-xs">
                      Aucune parcelle trouvée.
                    </div>
                  ) : (
                    filteredTableRows.map((row) => {
                      const { parcelle, avenueNom, bailleur } = row;
                      const hasGps = parcelle.latitude != null && parcelle.longitude != null;
                      return (
                        <div key={parcelle.id} className="p-4 flex flex-col gap-3 bg-surface">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-primary">
                                Parcelle N° {parcelle.numero_parcelle}
                              </span>
                              <span className="text-xs text-on-surface-variant font-bold flex items-center gap-1">
                                <MapLucide size={12} /> Av. {avenueNom}
                              </span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-bold uppercase">
                              {parcelle.type_logement === 'maison_basse' ? 'M. Basse' : 'Appt'}
                            </span>
                          </div>

                          {/* Bailleur info card */}
                          <div className="bg-background/60 p-3 rounded-xl border border-outline-variant/40 flex flex-col gap-1 text-xs">
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                              Bailleur
                            </span>
                            {bailleur ? (
                              <>
                                <span className="font-extrabold text-on-surface">{bailleur.nom_complet}</span>
                                <span className="font-mono text-on-surface-variant flex items-center gap-1">
                                  <Phone size={11} className="text-[#10b981]" />
                                  {bailleur.telephone_principal}
                                </span>
                              </>
                            ) : (
                              <span className="text-error italic">Bailleur non identifié ⚠️</span>
                            )}
                          </div>

                          {/* Households and tenants */}
                          <div className="text-[11px] text-on-surface-variant">
                            Ménages : <strong className="text-secondary">{parcelle.nombre_menages}</strong>
                            {parcelle.type_logement === 'maison_basse' && (
                              <>
                                <span className="mx-1.5">|</span>
                                Locataires : <strong>{parcelle.presence_locataire === 'oui' ? 'Oui' : 'Non'}</strong>
                              </>
                            )}
                          </div>

                          {/* GPS Section */}
                          <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-2.5 mt-1">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <MapPin size={12} className={hasGps ? 'text-[#10b981]' : 'text-on-surface-variant opacity-40'} />
                                {hasGps ? (
                                  <span className="font-mono text-[10px] text-[#10b981] font-bold">
                                    {parcelle.latitude?.toFixed(5)}, {parcelle.longitude?.toFixed(5)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-on-surface-variant italic">Pas de coordonnées GPS</span>
                                )}
                              </div>
                              {hasGps && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${parcelle.latitude},${parcelle.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary bg-secondary/15 px-2.5 py-1 rounded-lg border border-secondary/25"
                                >
                                  <span>Itinéraire</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>

                            {onUpdateParcelleGps && (
                              <button
                                type="button"
                                disabled={updatingParcelleId !== null}
                                onClick={() => handleLiveUpdateGps(parcelle.id)}
                                className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                                  updatingParcelleId === parcelle.id
                                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/35 animate-pulse'
                                    : hasGps
                                    ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-[#10b981] border-emerald-500/20 font-extrabold'
                                }`}
                              >
                                {updatingParcelleId === parcelle.id ? (
                                  <>
                                    <RefreshCw size={11} className="animate-spin" />
                                    <span>{gpsStatusMessage || 'Recherche GPS...'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Compass size={11} />
                                    <span>{hasGps ? 'Mettre à jour position GPS 📍' : 'Prélèvement GPS de la parcelle 📍'}</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>
          )}

          {/* VIEW MODE 2: ACCORDION VIEW BY AVENUE */}
          {viewMode === 'accordion' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              
              {/* Search input for avenues */}
              <div className="flex items-center gap-3 bg-background border border-outline-variant/60 rounded-xl px-3 py-2 w-full max-w-md">
                <Search size={16} className="text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Rechercher une avenue de cette commune..."
                  value={searchAvenueQuery}
                  onChange={(e) => setSearchAvenueQuery(e.target.value)}
                  className="bg-transparent border-none text-xs w-full focus:outline-none text-on-surface placeholder-on-surface-variant/70"
                />
              </div>

              {/* Avenues accordion stack */}
              <div className="flex flex-col gap-3.5 mt-2">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider border-l-3 border-secondary pl-2 mb-1">
                  Avenues de la commune de {selectedCommune.nom} ({filteredAvenues.length})
                </h3>

                {filteredAvenues.length === 0 ? (
                  <div className="text-center py-10 bg-background/40 border border-dashed border-outline-variant/60 rounded-2xl text-xs text-on-surface-variant">
                    Aucune avenue enregistrée correspondant à votre recherche.
                  </div>
                ) : (
                  filteredAvenues.map((ave) => {
                    const avenueData = getAvenueData(ave.id);
                    const isExpanded = !!expandedAvenues[ave.id];
                    const countGpsOnAvenue = avenueData.filter(item => item.parcelle.latitude != null).length;

                    return (
                      <div 
                        key={ave.id}
                        className="border border-outline-variant rounded-2xl bg-background/25 overflow-hidden transition-all shadow-sm"
                      >
                        {/* Header bar of Avenue accordion */}
                        <button
                          onClick={() => toggleAvenueExpand(ave.id)}
                          className="w-full px-4 py-3.5 flex justify-between items-center bg-background hover:bg-outline-variant/10 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <MapLucide size={16} className="text-on-surface-variant" />
                            <div>
                              <span className="text-sm font-bold text-on-surface">Avenue {ave.nom}</span>
                              <span className="text-[10px] ml-2 px-2 py-0.5 bg-outline-variant/30 rounded-full font-semibold text-on-surface-variant">
                                {avenueData.length} parcelles
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {countGpsOnAvenue > 0 && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-secondary/10 text-secondary border border-secondary/25 px-2 py-0.5 rounded-full font-bold">
                                <MapPin size={10} />
                                {countGpsOnAvenue} GPS
                              </span>
                            )}
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </button>

                        {/* Content expanded */}
                        {isExpanded && (
                          <div className="p-4 border-t border-outline-variant bg-surface animate-fade-in flex flex-col gap-3">
                            {avenueData.length === 0 ? (
                              <p className="text-xs text-on-surface-variant italic py-2 text-center">
                                Aucune parcelle n'a encore été recensée sur cette avenue.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {avenueData.map(({ parcelle, bailleur }) => {
                                  const hasGps = parcelle.latitude != null && parcelle.longitude != null;
                                  return (
                                    <div 
                                      key={parcelle.id}
                                      className="border border-outline-variant/70 rounded-xl p-3 bg-background/50 flex flex-col justify-between gap-3 shadow-sm hover:border-secondary/50 transition-all"
                                    >
                                      <div>
                                        {/* Header info */}
                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                          <span className="text-sm font-black text-primary">
                                            Parcelle N° {parcelle.numero_parcelle}
                                          </span>
                                          <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold uppercase tracking-wider">
                                            {parcelle.type_logement === 'maison_basse' ? 'Maison Basse' : 'Appartement'}
                                          </span>
                                        </div>

                                        {/* Owner / occupant details */}
                                        {bailleur ? (
                                          <div className="flex flex-col gap-1 text-xs">
                                            <div className="font-bold text-on-surface flex items-center gap-1.5 mt-1">
                                              <span className="text-on-surface-variant font-normal">Bailleur :</span>
                                              {bailleur.nom_complet}
                                            </div>
                                            <div className="text-on-surface-variant font-mono flex items-center gap-1">
                                              <Phone size={11} />
                                              {bailleur.telephone_principal}
                                              {bailleur.telephone_secondaire && ` / ${bailleur.telephone_secondaire}`}
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-error italic">Bailleur non identifié ⚠️</p>
                                        )}

                                        {/* Households & tenants info */}
                                        <div className="text-[11px] text-on-surface-variant mt-1.5 flex flex-wrap gap-2">
                                          <span>Ménages : <strong className="text-secondary">{parcelle.nombre_menages}</strong></span>
                                          {parcelle.type_logement === 'maison_basse' && (
                                            <>
                                              <span className="text-outline-variant">|</span>
                                              <span>Locataires : <strong>{parcelle.presence_locataire === 'oui' ? 'Oui' : 'Non'}</strong></span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* GPS Action footer */}
                                      <div className="border-t border-outline-variant/30 pt-2.5 mt-1 flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5">
                                            <MapPin size={14} className={hasGps ? 'text-[#10b981]' : 'text-on-surface-variant opacity-40'} />
                                            {hasGps ? (
                                              <span className="font-mono text-[10px] text-[#10b981] font-bold">
                                                {parcelle.latitude?.toFixed(5)}, {parcelle.longitude?.toFixed(5)}
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-on-surface-variant font-medium italic">
                                                Aucune position GPS
                                              </span>
                                            )}
                                          </div>

                                          {hasGps && (
                                            <a
                                              href={`https://www.google.com/maps/search/?api=1&query=${parcelle.latitude},${parcelle.longitude}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary hover:underline py-1 px-2 bg-secondary/10 border border-secondary/20 rounded-lg transition-all"
                                            >
                                              <span>Itinéraire</span>
                                              <ExternalLink size={10} />
                                            </a>
                                          )}
                                        </div>

                                        {onUpdateParcelleGps && (
                                          <button
                                            type="button"
                                            disabled={updatingParcelleId !== null}
                                            onClick={() => handleLiveUpdateGps(parcelle.id)}
                                            className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all active:scale-[0.97] disabled:opacity-50 cursor-pointer ${
                                              updatingParcelleId === parcelle.id
                                                ? 'bg-amber-500/20 text-amber-500 border-amber-500/35 animate-pulse'
                                                : hasGps
                                                ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-[#10b981] border-emerald-500/20 font-extrabold'
                                            }`}
                                          >
                                            {updatingParcelleId === parcelle.id ? (
                                              <>
                                                <RefreshCw size={11} className="animate-spin" />
                                                <span>{gpsStatusMessage || 'Recherche...'}</span>
                                              </>
                                            ) : (
                                              <>
                                                <Compass size={11} />
                                                <span>{hasGps ? 'Mettre à jour GPS 📍' : 'Prélèvement GPS 📍'}</span>
                                              </>
                                            )}
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
                      </div>
                    );
                  })
                )}

              </div>

            </div>
          )}

        </div>
      ) : (
        <div className="text-center py-16 bg-background/30 border border-dashed border-outline-variant rounded-3xl flex flex-col items-center gap-4 max-w-xl mx-auto my-8 p-6 shadow-sm">
          <div className="p-4 bg-secondary/10 rounded-full text-secondary animate-pulse">
            <Compass size={40} className="text-secondary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-bold text-on-surface">Explorateur GPS & Recensement</h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
              Veuillez sélectionner l'une des 24 communes de Kinshasa dans le menu déroulant ci-dessus pour interroger en temps réel les avenues, les parcelles géolocalisées et les responsables abonnés.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
