import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Home, UserPlus, FileText, Check, Plus } from 'lucide-react';
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
    const newParcelleId = 'p-' + Math.random().toString(36).substr(2, 9);
    const newAbonneId = 'ab-' + Math.random().toString(36).substr(2, 9);

    const newParcelle: Parcelle = {
      id: newParcelleId,
      avenue_id: avenue.id,
      numero_parcelle: numeroParcelle.toUpperCase().trim(),
      type_logement: typeLogement,
      presence_locataire: typeLogement === 'maison_basse' ? presenceLocataire : null,
      nombre_menages: nombreMenages,
      created_by: 'Jean Malonga',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
    </div>
  );
}
