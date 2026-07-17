import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Home, UserPlus, FileText, Check, Plus, MapPin, Navigation, RefreshCw, Smartphone, Laptop, Settings, HelpCircle, X, AlertTriangle } from 'lucide-react';
import { Commune, Avenue, Parcelle, Abonne } from '../types';

interface RecensementFormProps {
  commune: Commune;
  avenue: Avenue;
  existingParcelles: Parcelle[];
  onAddParcelleAndAbonne: (parcelle: Parcelle, abonne: Abonne) => void;
  onBack: () => void;
  onFinish: () => void;
}

export default function RecensementForm({
  commune,
  avenue,
  existingParcelles,
  onAddParcelleAndAbonne,
  onBack,
  onFinish
}: RecensementFormProps) {
  // Stepper internal progress
  const [step, setStep] = useState(1); // 1: Parcelle Info, 2: Responsable (Abonné), 3: Logement & Cond, 4: Révision & Validation, 5: Succès

  // Form Fields
  const [numeroParcelle, setNumeroParcelle] = useState('');
  const [nomResponsable, setNomResponsable] = useState('');
  const [phonePrincipal, setPhonePrincipal] = useState('');
  const [phoneSecondaire, setPhoneSecondaire] = useState('');
  const [typeLogement, setTypeLogement] = useState<'maison_basse' | 'appartement'>('maison_basse');
  const [presenceLocataire, setPresenceLocataire] = useState<'oui' | 'non'>('non');
  const [nombreMenages, setNombreMenages] = useState<number>(1);

  // GPS coordinates state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Help Modal State
  const [showGpsHelpModal, setShowGpsHelpModal] = useState(false);
  
  // Detect if mobile
  const isMobileDevice = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const [gpsHelpTab, setGpsHelpTab] = useState<'smartphone' | 'computer'>(isMobileDevice ? 'smartphone' : 'computer');

  // Retrieve high-accuracy GPS coordinates using Web Geolocation API (bridges to Android app frame)
  const handleGetGpsCoordinates = () => {
    setIsFetchingGps(true);
    setGpsError(null);
    
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas prise en charge par votre appareil ou navigateur.");
      setIsFetchingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsFetchingGps(false);
        setGpsError(null);
        setShowGpsHelpModal(false); // Close help modal if it succeeds
      },
      (error) => {
        console.error("Erreur de géolocalisation :", error);
        let msg = "Impossible de récupérer les coordonnées.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "L'accès à la localisation a été refusé. Veuillez autoriser l'accès GPS dans les permissions de votre navigateur ou appareil.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "La localisation GPS de l'appareil est désactivée ou introuvable. Veuillez activer le GPS.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Le délai d'attente pour obtenir la position GPS a expiré. Veuillez réessayer dans un endroit plus dégagé.";
        }
        setGpsError(msg);
        setIsFetchingGps(false);
        setShowGpsHelpModal(true); // Automatically open the help modal to guide them
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Errors state
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Helper validation
  const validateStep1 = (): boolean => {
    setErrorLocal(null);
    if (!numeroParcelle.trim()) {
      setErrorLocal("Le numéro de parcelle est obligatoire.");
      return false;
    }

    // Rule 5: Unique parcel number per avenue
    const exists = existingParcelles.some(
      (p) => 
        p.avenue_id === avenue.id && 
        p.numero_parcelle.toLowerCase().trim() === numeroParcelle.toLowerCase().trim()
    );
    if (exists) {
      setErrorLocal(`La parcelle N° ${numeroParcelle} existe déjà sur l'Avenue ${avenue.nom}.`);
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    setErrorLocal(null);
    if (!nomResponsable.trim()) {
      setErrorLocal("Le nom complet du responsable est obligatoire.");
      return false;
    }
    if (!phonePrincipal.trim()) {
      setErrorLocal("Le téléphone principal est obligatoire.");
      return false;
    }
    // Simple verification check of phone length (minimum 9 characters, maximum 15)
    const phoneDigits = phonePrincipal.replace(/\D/g, '');
    if (phoneDigits.length < 9) {
      setErrorLocal("Le numéro de téléphone principal doit contenir au moins 9 chiffres.");
      return false;
    }
    if (phoneSecondaire.trim() && phoneSecondaire.replace(/\D/g, '').length < 9) {
      setErrorLocal("Le numéro de téléphone secondaire doit contenir au moins 9 chiffres.");
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    setErrorLocal(null);
    if (nombreMenages < 1) {
      setErrorLocal("Le nombre de ménages doit être supérieur ou égal à 1 (Règle 6).");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    } else if (step === 3) {
      if (validateStep3()) setStep(4);
    }
  };

  const handlePrev = () => {
    if (step > 1 && step < 5) {
      setStep(step - 1);
    } else if (step === 1) {
      onBack();
    }
  };

  const handleSubmit = () => {
    setErrorLocal(null);

    // Final checks
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      return;
    }

    // Assemble Parcelle
    const newParcelleId = 'p-' + Math.random().toString(36).substring(2, 11);
    const newAbonneId = 'ab-' + Math.random().toString(36).substring(2, 11);

    const newParcelle: Parcelle = {
      id: newParcelleId,
      avenue_id: avenue.id,
      numero_parcelle: numeroParcelle.toUpperCase().trim(),
      type_logement: typeLogement,
      presence_locataire: typeLogement === 'maison_basse' ? presenceLocataire : null,
      nombre_menages: nombreMenages,
      created_by: 'Jean Malonga',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      latitude: latitude,
      longitude: longitude
    };

    const newAbonne: Abonne = {
      id: newAbonneId,
      parcelle_id: newParcelleId,
      nom_complet: nomResponsable.trim(),
      telephone_principal: phonePrincipal.trim(),
      telephone_secondaire: phoneSecondaire.trim() || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onAddParcelleAndAbonne(newParcelle, newAbonne);
    setStep(5); // Show success screen (Étape 9)
  };

  const handleResetForAnother = () => {
    setNumeroParcelle('');
    setNomResponsable('');
    setPhonePrincipal('');
    setPhoneSecondaire('');
    setTypeLogement('maison_basse');
    setPresenceLocataire('non');
    setNombreMenages(1);
    setLatitude(null);
    setLongitude(null);
    setGpsError(null);
    setErrorLocal(null);
    setStep(1);
  };

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant p-5 md:p-6 shadow-lg animate-fade-in pb-12 text-on-surface">
      {/* Context indicator */}
      <header className="flex flex-col gap-1 pb-4 mb-4 border-b border-outline-variant/40">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary font-sans uppercase tracking-wider">
          <span>{commune.nom}</span>
          <span className="text-outline-variant">/</span>
          <span>Avenue {avenue.nom}</span>
        </div>
        <h2 className="text-xl font-extrabold text-on-surface">
          {step === 5 ? 'Recensement Réussi' : 'Nouveau Recensement'}
        </h2>
      </header>

      {/* Stepper Status matching Material indicators */}
      {step < 5 && (
        <div className="flex items-center justify-between mb-6 px-1">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              {/* Node */}
              <div className="flex flex-col items-center">
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    step === s 
                      ? 'bg-secondary text-white ring-4 ring-[#cce5ff]' 
                      : step > s 
                        ? 'bg-primary text-on-primary' 
                        : 'bg-background text-on-surface-variant border border-outline-variant/60'
                  }`}
                >
                  {step > s ? <Check size={14} strokeWidth={3} /> : s}
                </div>
                <span className="text-[10px] font-medium text-on-surface-variant mt-1 hidden sm:inline">
                  {s === 1 ? 'Parcelle. N°' : s === 2 ? 'Responsable' : s === 3 ? 'Logement' : 'Révision'}
                </span>
              </div>
              {/* Link track line */}
              {s < 4 && (
                <div 
                  className={`flex-grow h-0.5 mx-2 transition-all duration-300 ${
                    step > s ? 'bg-primary' : 'bg-outline-variant/30'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Form Steps Body */}
      <div className="min-h-[220px]">
        {errorLocal && (
          <div className="bg-error-container border border-error/20 text-on-error-container rounded-lg p-3 text-xs font-sans font-semibold mb-4 animate-fade-in flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorLocal}</span>
          </div>
        )}

        {/* STEP 1: Parcelle Number */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide border-l-3 border-primary pl-2 mb-1">
              Renseignement de la Parcelle (Étape 5)
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface" htmlFor="num_parcelle">
                Numéro de Parcelle *
              </label>
              <input 
                id="num_parcelle"
                type="text"
                value={numeroParcelle}
                onChange={(e) => setNumeroParcelle(e.target.value)}
                className="w-full h-11 px-3 border border-outline-variant rounded bg-background text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary uppercase transition-colors"
                placeholder="Ex. 45B, 112, 10..."
                autoFocus
              />
              <p className="text-[11px] text-on-surface-variant font-sans">
                ⚠️ Ce numéro de parcelle doit être unique au sein de l'Avenue {avenue.nom} (Règle 5).
              </p>
            </div>

            {/* GPS Capture Block */}
            <div className="mt-2 p-4 bg-background/50 border border-outline-variant/60 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin size={18} className="text-secondary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Coordonnées GPS</span>
                  <button
                    type="button"
                    onClick={() => setShowGpsHelpModal(true)}
                    className="p-1 hover:bg-surface rounded-full text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    title="Guide d'activation du GPS"
                  >
                    <HelpCircle size={14} />
                  </button>
                </div>
                {latitude && longitude && (
                  <span className="text-[10px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Enregistré
                  </span>
                )}
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Afin de géolocaliser précisément cette parcelle dans les bases de données d'Hico-Cleaning, activez le GPS de votre appareil Android, puis cliquez sur le bouton ci-dessous.
              </p>

              {gpsError && (
                <div className="flex flex-col gap-2 p-2.5 bg-error/10 border border-error/20 rounded-xl">
                  <span className="text-xs text-error font-semibold">⚠️ {gpsError}</span>
                  <button
                    type="button"
                    onClick={() => setShowGpsHelpModal(true)}
                    className="self-start text-[10px] font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Settings size={12} className="animate-spin-slow" />
                    <span>Comment activer le GPS / les permissions ? 🛠️</span>
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <button
                  type="button"
                  onClick={handleGetGpsCoordinates}
                  disabled={isFetchingGps}
                  className="w-full sm:w-auto px-4 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 disabled:opacity-65 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 border border-outline-variant/40 cursor-pointer shadow-sm"
                >
                  {isFetchingGps ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Recherche GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={14} className="animate-pulse" />
                      <span>{latitude && longitude ? "Mettre à jour la position GPS 📍" : "Prélever la position GPS 📍"}</span>
                    </>
                  )}
                </button>

                {latitude && longitude && (
                  <button
                    type="button"
                    onClick={() => {
                      setLatitude(null);
                      setLongitude(null);
                      setGpsError(null);
                    }}
                    className="w-full sm:w-auto px-3 py-2 bg-transparent border border-outline-variant text-on-surface-variant hover:text-error hover:border-error/30 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {latitude && longitude && (
                <div className="grid grid-cols-2 gap-3 mt-1.5 p-3 bg-surface border border-outline-variant/50 rounded-xl font-mono text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">Latitude</span>
                    <span className="font-bold text-on-surface">{latitude.toFixed(7)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">Longitude</span>
                    <span className="font-bold text-on-surface">{longitude.toFixed(7)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Responsable (Abonné) */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide border-l-3 border-primary pl-2 mb-1">
              Informations du Responsable (Étape 6)
            </h3>

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface" htmlFor="nom_resp">
                Nom Complet du Responsable *
              </label>
              <input 
                id="nom_resp"
                type="text"
                value={nomResponsable}
                onChange={(e) => setNomResponsable(e.target.value)}
                className="w-full h-11 px-3 border border-outline-variant rounded bg-background text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Ex. Pierre Kalonji..."
                autoFocus
              />
            </div>

            {/* Primary Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface" htmlFor="phone_p">
                Téléphone Principal *
              </label>
              <input 
                id="phone_p"
                type="tel"
                value={phonePrincipal}
                onChange={(e) => setPhonePrincipal(e.target.value)}
                className="w-full h-11 px-3 border border-outline-variant rounded bg-background text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono"
                placeholder="Ex. 0812345678"
              />
            </div>

            {/* Optional Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface" htmlFor="phone_s">
                Téléphone Secondaire (Optionnel)
              </label>
              <input 
                id="phone_s"
                type="tel"
                value={phoneSecondaire}
                onChange={(e) => setPhoneSecondaire(e.target.value)}
                className="w-full h-11 px-3 border border-outline-variant rounded bg-background text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono"
                placeholder="Ex. 0998765432"
              />
            </div>
            <p className="text-[11px] text-on-surface-variant font-sans">
              ℹ️ Ce responsable sera automatiquement créé comme nouvel abonné actif de Hico-Cleaning (Règle 4).
            </p>
          </div>
        )}

        {/* STEP 3: Logement & Conditional questions */}
        {step === 3 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide border-l-3 border-primary pl-2 mb-1">
              Type de Logement & Questions (Étape 7 & 8)
            </h3>

            {/* Choice */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface">
                Type de logement *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTypeLogement('maison_basse')}
                  className={`border-2 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    typeLogement === 'maison_basse'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-outline-variant bg-transparent text-on-surface-variant hover:border-outline'
                  }`}
                >
                  <Home size={22} />
                  <span className="text-sm">Maison basse</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTypeLogement('appartement');
                    // Reset dependency
                  }}
                  className={`border-2 py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    typeLogement === 'appartement'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-outline-variant bg-transparent text-on-surface-variant hover:border-outline'
                  }`}
                >
                  <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-sm">Appartement</span>
                </button>
              </div>
            </div>

            {/* Conditional 1: Presence Locataire (Only if Maison Basse) */}
            {typeLogement === 'maison_basse' && (
              <div className="flex flex-col gap-2 animate-fade-in p-3 bg-background rounded-lg border border-outline-variant/30">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface">
                  Présence de locataires ?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-on-surface font-semibold cursor-pointer">
                    <input 
                      type="radio" 
                      name="presence_loc"
                      checked={presenceLocataire === 'oui'}
                      onChange={() => setPresenceLocataire('oui')}
                      className="text-primary focus:ring-primary w-4 h-4 border-outline-variant"
                    />
                    Oui
                  </label>
                  <label className="flex items-center gap-2 text-sm text-on-surface font-semibold cursor-pointer">
                    <input 
                      type="radio" 
                      name="presence_loc"
                      checked={presenceLocataire === 'non'}
                      onChange={() => setPresenceLocataire('non')}
                      className="text-primary focus:ring-primary w-4 h-4 border-outline-variant"
                    />
                    Non
                  </label>
                </div>
              </div>
            )}

            {/* Households Count: Always required, default 1, must be >= 1 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface" htmlFor="menages_c">
                Nombre de ménages *
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setNombreMenages(Math.max(1, nombreMenages - 1))}
                  className="w-10 h-10 rounded bg-background border border-outline-variant flex items-center justify-center font-bold text-lg hover:border-primary active:scale-95 transition-all text-on-surface cursor-pointer"
                >
                  -
                </button>
                <input 
                  id="menages_c"
                  type="number"
                  min="1"
                  value={nombreMenages}
                  onChange={(e) => setNombreMenages(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center h-10 border border-outline-variant rounded bg-background text-on-surface font-mono text-base font-bold"
                />
                <button
                  type="button"
                  onClick={() => setNombreMenages(nombreMenages + 1)}
                  className="w-10 h-10 rounded bg-background border border-outline-variant flex items-center justify-center font-bold text-lg hover:border-primary active:scale-95 transition-all text-on-surface cursor-pointer"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant font-sans">
                ⚠️ Le nombre de ménages doit être supérieur ou égal à 1 (Règle 6).
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Revision & final submit validation */}
        {step === 4 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide border-l-3 border-secondary pl-2 mb-1">
              Récapitulatif de validation (Étape 9)
            </h3>

            <div className="border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="bg-background px-4 py-2 text-xs font-bold text-on-surface-variant uppercase tracking-wide border-b border-outline-variant">
                📍 Identification Parcelles
              </div>
              <div className="p-4 flex flex-col gap-2.5 text-sm font-sans">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Commune:</span>
                  <span className="font-bold text-on-surface">{commune.nom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Avenue:</span>
                  <span className="font-bold text-on-surface">{avenue.nom}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/30 pt-1.5">
                  <span className="text-on-surface-variant">Parcelle N°:</span>
                  <span className="font-bold text-primary text-base">N° {numeroParcelle.toUpperCase().trim()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Type de Logement:</span>
                  <span className="font-bold text-on-surface capitalize">
                    {typeLogement === 'maison_basse' ? 'Maison basse' : 'Appartement'}
                  </span>
                </div>
                {typeLogement === 'maison_basse' && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Présence Locataires:</span>
                    <span className="font-bold text-on-surface">
                      {presenceLocataire === 'oui' ? 'Oui (Locataire présent)' : 'Non (Seul propriétaire)'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Nombre de ménages recensés:</span>
                  <span className="font-extrabold text-secondary">{nombreMenages}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/30 pt-1.5">
                  <span className="text-on-surface-variant">Coordonnées GPS:</span>
                  <span className="font-bold font-mono text-xs">
                    {latitude && longitude ? (
                      <span className="text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/15">
                        {latitude.toFixed(6)}, {longitude.toFixed(6)} 📍
                      </span>
                    ) : (
                      <span className="text-on-surface-variant italic">Non renseignées (Facultatif)</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="bg-[#10b981]/15 px-4 py-2 text-xs font-bold text-[#10b981] uppercase tracking-wider border-t border-b border-outline-variant">
                👤 Nouveau Abonné Responsable (Création auto)
              </div>
              <div className="p-4 flex flex-col gap-2 text-sm font-sans">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Nom Complet:</span>
                  <span className="font-bold text-on-surface">{nomResponsable}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Tél principal:</span>
                  <span className="font-bold text-on-surface font-mono">{phonePrincipal}</span>
                </div>
                {phoneSecondaire.trim() && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Tél secondaire:</span>
                    <span className="font-bold text-on-surface font-mono">{phoneSecondaire}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant leading-relaxed font-sans italic">
              * En cliquant sur "Confirmer & Enregistrer les données", la parcelle sera officiellement indexée et le gestionnaire d'abonnés Hico-Cleaning générera l'inscription de l'abonné associé.
            </p>
          </div>
        )}

        {/* STEP 5: Success block (Étape 9 / 10 is Choice) */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center text-center gap-5 py-6 animate-fade-in">
            {/* Round Green Check animation */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 animate-pulse">
              <CheckCircle size={36} />
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl font-extrabold text-primary">Enregistrement Validé !</h3>
              <p className="text-sm font-semibold text-on-surface text-sans px-2">
                La parcelle N° <span className="font-extrabold text-secondary">{numeroParcelle.toUpperCase()}</span> a été recensée avec succès.
              </p>
              <div className="mt-2 bg-secondary/10 border border-secondary/20 rounded-xl p-3.5 text-xs text-on-surface leading-relaxed font-sans text-left max-w-sm">
                🎉 <span className="font-bold text-secondary">Abonnement généré :</span> Le système de salubrité a enregistré automatiquement <span className="font-bold">{nomResponsable}</span> comme nouvel abonné principal Hico-Cleaning pour cette parcelle.
              </div>
            </div>

            {/* Stepper Choices */}
            <div className="flex flex-col gap-2.5 w-full max-w-xs mt-4">
              <button
                type="button"
                onClick={handleResetForAnother}
                className="w-full h-11 bg-primary text-on-primary rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-primary-container flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus size={16} />
                Ajouter une autre parcelle
              </button>
              <button
                type="button"
                onClick={onFinish}
                className="w-full h-11 bg-transparent border-2 border-outline-variant text-on-surface-variant hover:bg-background rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                Terminer le recensement
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons for progression */}
      {step < 5 && (
        <div className="flex items-center gap-3 pt-6 mt-6 border-t border-outline-variant/30">
          <button
            type="button"
            onClick={handlePrev}
            className="w-1/2 min-h-[44px] border border-outline-variant text-on-surface-variant hover:bg-background rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} />
            {step === 1 ? 'Annuler' : 'Retour'}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-1/2 min-h-[44px] bg-secondary text-white hover:bg-secondary-container hover:text-on-secondary-container rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              Suivant
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="w-1/2 min-h-[44px] bg-primary text-on-primary hover:bg-primary-container rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              Confirmer
              <CheckCircle size={16} />
            </button>
          )}
        </div>
      )}

      {/* Interactive GPS Help Modal Overlay */}
      {showGpsHelpModal && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center z-[10000] p-4 animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <Settings className="text-primary animate-spin-slow" size={20} />
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                  Activer le GPS & Autorisations
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsHelpModal(false)}
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-background rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4 text-left">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Le recensement nécessite de récupérer de vraies coordonnées GPS pour valider précisément la localisation de la parcelle. Veuillez suivre les instructions ci-dessous pour activer le GPS de votre appareil.
              </p>

              {/* Tabs */}
              <div className="flex border-b border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setGpsHelpTab('smartphone')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    gpsHelpTab === 'smartphone'
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Smartphone size={14} />
                  <span>Sur Téléphone / Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGpsHelpTab('computer')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    gpsHelpTab === 'computer'
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Laptop size={14} />
                  <span>Sur Ordinateur / PC</span>
                </button>
              </div>

              {/* Tab Contents */}
              {gpsHelpTab === 'smartphone' ? (
                <div className="flex flex-col gap-3 text-xs leading-relaxed">
                  <div className="flex gap-2.5 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">1</span>
                    <div>
                      <strong className="text-on-surface">Activez la localisation de l'appareil :</strong>
                      <p className="text-on-surface-variant mt-0.5">Glissez votre doigt du haut vers le bas de l'écran pour ouvrir le volet d'accès rapide, puis activez l'icône <span className="font-bold">"Localisation"</span> ou <span className="font-bold">"GPS"</span> 📍.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">2</span>
                    <div>
                      <strong className="text-on-surface">Autorisez le navigateur :</strong>
                      <p className="text-on-surface-variant mt-0.5">Lorsque l'application ou le navigateur vous demande l'accès à votre position géographique, appuyez impérativement sur <span className="font-bold text-success">"Autoriser"</span> ou <span className="font-bold text-success">"Lorsque vous utilisez l'application"</span>.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">3</span>
                    <div>
                      <strong className="text-on-surface">Vider le cache des permissions (si bloqué) :</strong>
                      <p className="text-on-surface-variant mt-0.5">Si vous aviez déjà refusé auparavant : appuyez sur les trois points (ou icône de menu) du navigateur &gt; Paramètres du site &gt; Localisation &gt; Recherchez ce site et supprimez-le de la liste des sites bloqués.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 text-xs leading-relaxed">
                  <div className="flex gap-2.5 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">1</span>
                    <div>
                      <strong className="text-on-surface">Cliquez sur le cadenas ou l'icône de réglage :</strong>
                      <p className="text-on-surface-variant mt-0.5">Dans la barre d'adresse de votre navigateur (à gauche du lien <code className="bg-background px-1.5 py-0.5 rounded text-[11px] font-mono border border-outline-variant/50 text-secondary">https://...</code>), cliquez sur le symbole de cadenas 🔒 ou de curseur.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">2</span>
                    <div>
                      <strong className="text-on-surface">Autorisez la Localisation :</strong>
                      <p className="text-on-surface-variant mt-0.5">Dans le menu contextuel, repérez l'autorisation <span className="font-bold">"Localisation"</span> (ou <span className="font-bold">"Location"</span>) et modifiez-la pour choisir <span className="font-bold text-success text-xs font-mono">"Autoriser"</span>.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">3</span>
                    <div>
                      <strong className="text-on-surface">Vérifiez les paramètres Windows / macOS :</strong>
                      <p className="text-on-surface-variant mt-0.5">Assurez-vous que les services de localisation globaux sont bien activés dans les Paramètres système de votre système d'exploitation et que le navigateur a l'autorisation d'y accéder.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Show current GPS status/error inside modal to give active feedback */}
              {gpsError && (
                <div className="bg-error/10 border border-error/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-error font-semibold mt-1">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{gpsError}</span>
                </div>
              )}
            </div>

            {/* Footer with actions */}
            <div className="px-5 py-4 bg-background border-t border-outline-variant flex flex-col sm:flex-row gap-2 items-center justify-between">
              <button
                type="button"
                onClick={() => setShowGpsHelpModal(false)}
                className="w-full sm:w-auto px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={handleGetGpsCoordinates}
                disabled={isFetchingGps}
                className="w-full sm:w-auto px-5 py-2.5 bg-primary text-on-primary hover:bg-primary-container rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                {isFetchingGps ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Prélèvement en cours...</span>
                  </>
                ) : (
                  <>
                    <Navigation size={14} className="animate-pulse" />
                    <span>Réessayer de prélever la position 📍</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
