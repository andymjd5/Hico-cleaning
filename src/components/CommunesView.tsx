import React, { useState } from 'react';
import { Search, ChevronRight, Map, ArrowLeft, Plus, ChevronDown, CheckCircle } from 'lucide-react';
import { Commune, Avenue } from '../types';

interface CommunesViewProps {
  communes: Commune[];
  avenues: Avenue[];
  onSelectCommune: (communeId: string) => void;
  onSelectAvenueDirectly?: (communeId: string, avenue: Avenue) => void;
  onBack: () => void;
  onAddCommuneToggle: () => void;
  onAddAvenueToggle?: (communeId: string) => void;
}

export default function CommunesView({
  communes,
  avenues,
  onSelectCommune,
  onSelectAvenueDirectly,
  onBack,
  onAddCommuneToggle,
  onAddAvenueToggle
}: CommunesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommuneIdLocal, setSelectedCommuneIdLocal] = useState<string>('');
  const [selectedAvenueIdLocal, setSelectedAvenueIdLocal] = useState<string>('');

  const filteredCommunes = communes.filter((c) =>
    c.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter avenues belonging to the locally selected commune
  const localAvenues = avenues.filter((a) => a.commune_id === selectedCommuneIdLocal);

  // Helper inside the UI to count real avenues dynamically in our state
  const getAvenuesCount = (communeId: string): number => {
    return avenues.filter((a) => a.commune_id === communeId).length;
  };

  const handleContinue = () => {
    if (selectedCommuneIdLocal && selectedAvenueIdLocal && onSelectAvenueDirectly) {
      const selectedAve = avenues.find((a) => a.id === selectedAvenueIdLocal);
      if (selectedAve) {
        onSelectAvenueDirectly(selectedCommuneIdLocal, selectedAve);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-on-background">
      {/* Top Header Section inside view */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="text-on-surface-variant hover:text-on-surface hover:bg-background transition-colors rounded-full p-1.5 active:scale-95 duration-100 cursor-pointer"
          >
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h2 className="text-xl font-bold text-on-background font-sans">
            Communes
          </h2>
        </div>
        <button 
          onClick={onAddCommuneToggle}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-on-primary hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer border border-outline-variant"
          title="Ajouter une commune"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Intro info */}
      <div className="bg-surface/80 border border-outline-variant rounded-2xl p-4 text-xs font-sans shadow-lg leading-relaxed text-on-surface-variant">
        🗺️ <span className="font-semibold text-primary">Étape 1 du Recensement :</span> Sélectionnez d'abord la commune de l'avenue que vous souhaitez recenser. Vous pouvez également rechercher ou insérer une nouvelle commune.
      </div>

      {/* Double Dropdown Selection Matching Bento Theme */}
      <div className="flex flex-col gap-4 bg-surface/50 border border-outline-variant rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
            Sélectionner une Commune *
          </label>
          <div className="relative">
            <select
              value={selectedCommuneIdLocal}
              onChange={(e) => {
                setSelectedCommuneIdLocal(e.target.value);
                setSelectedAvenueIdLocal('');
              }}
              className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer appearance-none"
            >
              <option value="">-- Choisir une commune --</option>
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
        </div>

        {/* Dynamic Avenue Dropdown */}
        {selectedCommuneIdLocal && (
          <div className="flex flex-col gap-2 animate-fade-in duration-200">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                Sélectionner une Avenue *
              </label>
              {onAddAvenueToggle && (
                <button
                  type="button"
                  onClick={() => onAddAvenueToggle(selectedCommuneIdLocal)}
                  className="text-primary hover:underline text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Nouvelle avenue</span>
                </button>
              )}
            </div>
            
            <div className="relative">
              <select
                value={selectedAvenueIdLocal}
                onChange={(e) => setSelectedAvenueIdLocal(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-outline-variant rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer appearance-none"
              >
                <option value="">-- Choisir une avenue --</option>
                {localAvenues.map((ave) => (
                  <option key={ave.id} value={ave.id}>
                    {ave.nom}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-on-surface-variant">
                <ChevronDown size={18} />
              </div>
            </div>

            {localAvenues.length === 0 && (
              <p className="text-xs text-[#ef4444] mt-1 font-semibold">
                ⚠️ Aucune avenue n'est encore enregistrée pour cette commune. Veuillez en créer une ci-dessus.
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                disabled={!selectedAvenueIdLocal}
                onClick={handleContinue}
                className="flex-grow h-11 bg-primary disabled:opacity-50 text-on-primary disabled:cursor-not-allowed rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-outline-variant"
              >
                <CheckCircle size={16} />
                <span>Commencer le Recensement 🚀</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Styled Search Input Area matching Bento Theme */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-on-surface-variant/70">
          <Search size={18} />
        </div>
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-12 pl-11 pr-4 bg-surface border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none transition-all font-sans text-sm shadow-md"
          placeholder="Rechercher une commune par nom..."
        />
      </div>

      {/* Communes List Stack matching Bento Theme */}
      <div className="flex flex-col gap-3">
        {filteredCommunes.length > 0 ? (
          filteredCommunes.map((commune) => {
            const numAvenues = getAvenuesCount(commune.id);

            return (
              <div 
                key={commune.id}
                onClick={() => {
                  setSelectedCommuneIdLocal(commune.id);
                  setSelectedAvenueIdLocal('');
                }}
                className={`bg-surface border rounded-2xl p-4.5 flex items-center justify-between hover:border-outline hover:bg-surface/80 transition-all cursor-pointer group active:scale-[0.99] duration-150 shadow-md ${
                  selectedCommuneIdLocal === commune.id ? 'border-primary bg-primary/5' : 'border-outline-variant'
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors font-sans">
                    {commune.nom}
                  </h3>
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-sans">
                    <Map size={14} className="text-[#10b981] shrink-0" />
                    <span className="text-xs font-semibold">
                      {numAvenues} Avenues
                    </span>
                  </div>
                </div>
                <div className="text-on-surface-variant group-hover:text-primary transition-colors">
                  <ChevronRight size={20} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-surface border border-dashed border-outline-variant rounded-3xl flex flex-col items-center gap-3">
            <span className="text-3xl">🏜️</span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-on-surface max-w-xs mx-auto">Aucune commune trouvée</p>
              <p className="text-xs text-on-surface-variant px-6">
                Aucun résultat ne correspond à votre recherche "{searchTerm}".
              </p>
            </div>
            <button 
              onClick={onAddCommuneToggle}
              className="mt-2 text-xs font-bold text-primary border border-primary/20 px-3 py-1.5 rounded-full hover:bg-background transition-all cursor-pointer"
            >
              Créer "{searchTerm}"
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
