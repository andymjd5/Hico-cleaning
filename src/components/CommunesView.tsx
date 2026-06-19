import React, { useState } from 'react';
import { Search, ChevronRight, Map, ArrowLeft, Plus } from 'lucide-react';
import { Commune, Avenue } from '../types';

interface CommunesViewProps {
  communes: Commune[];
  avenues: Avenue[];
  onSelectCommune: (communeId: string) => void;
  onBack: () => void;
  onAddCommuneToggle: () => void;
}

export default function CommunesView({
  communes,
  avenues,
  onSelectCommune,
  onBack,
  onAddCommuneToggle
}: CommunesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCommunes = communes.filter((c) =>
    c.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper inside the UI to count real avenues dynamically in our state
  const getAvenuesCount = (communeId: string): number => {
    return avenues.filter((a) => a.commune_id === communeId).length;
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
          placeholder="Rechercher une commune..."
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
                onClick={() => onSelectCommune(commune.id)}
                className="bg-surface border border-outline-variant rounded-2xl p-4.5 flex items-center justify-between hover:border-outline hover:bg-surface/80 transition-all cursor-pointer group active:scale-[0.99] duration-150 shadow-md"
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
