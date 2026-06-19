import React, { useState } from 'react';
import { Search, MapPin, MoreVertical, Plus, ArrowLeft } from 'lucide-react';
import { Avenue, Commune } from '../types';

interface AvenuesViewProps {
  avenues: Avenue[];
  communes: Commune[];
  selectedCommuneId: string | null;
  onSelectAvenue: (avenue: Avenue) => void;
  onBack: () => void;
  onAddAvenueToggle: () => void;
}

export default function AvenuesView({
  avenues,
  communes,
  selectedCommuneId,
  onSelectAvenue,
  onBack,
  onAddAvenueToggle
}: AvenuesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCommuneId, setFilterCommuneId] = useState<string>(selectedCommuneId || '');

  // Filter avenues based on search input and commune dropdown selector
  const filteredAvenues = avenues.filter((ave) => {
    const matchesSearch = ave.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCommune = filterCommuneId ? ave.commune_id === filterCommuneId : true;
    return matchesSearch && matchesCommune;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-on-background">
      {/* Top Header Block matching mockup */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="text-on-surface-variant hover:text-on-surface hover:bg-background transition-colors rounded-full p-1.5 active:scale-95 duration-100 cursor-pointer"
          >
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h2 className="text-xl font-bold text-on-background tracking-tight font-sans">
            Avenues
          </h2>
        </div>
        <button 
          onClick={onAddAvenueToggle}
          className="bg-primary hover:opacity-95 text-on-primary active:scale-95 duration-100 transition-all px-4.5 py-2.2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer border border-outline-variant"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Ajouter avenue</span>
        </button>
      </div>

      {/* Info indicator */}
      <div className="bg-surface/80 border border-outline-variant rounded-2xl p-4 text-xs font-sans shadow-lg leading-relaxed text-on-surface-variant">
        📍 <span className="font-semibold text-primary">Étape 2 du Recensement :</span> Sélectionnez l'avenue active pour recenser ses parcelles. Les parcelles créées d'ici s'associent directement à cette avenue.
      </div>

      {/* Search & Filter Controls matching Image 1 */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-col md:flex-row gap-3 shadow-md">
        {/* Search */}
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant/70">
            <Search size={18} />
          </div>
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-background border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 text-sm transition-all font-sans"
            placeholder="Rechercher une avenue..."
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative min-w-[200px] shrink-0">
          <select 
            value={filterCommuneId}
            onChange={(e) => setFilterCommuneId(e.target.value)}
            className="w-full h-11 pl-4 pr-8 bg-background border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface text-sm cursor-pointer font-sans"
          >
            <option value="" className="bg-surface text-on-surface">Toutes les communes</option>
            {communes.map((comm) => (
              <option key={comm.id} value={comm.id} className="bg-surface text-on-surface">
                {comm.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Avenues Grid (Bento/Card Style) matching Image 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAvenues.map((avenue) => {
          const matchingCommune = communes.find((c) => c.id === avenue.commune_id);

          return (
            <div 
              key={avenue.id}
              onClick={() => onSelectAvenue(avenue)}
              className="bg-surface border border-outline-variant rounded-2xl p-5 hover:border-outline hover:bg-surface/80 hover:shadow-xl transition-all duration-200 group flex flex-col gap-5 cursor-pointer relative overflow-hidden active:scale-[0.99]"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-base font-bold text-on-surface group-hover:text-primary font-sans transition-colors duration-200 leading-snug">
                  {avenue.nom}
                </h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Options pour l'avenue "${avenue.nom}" : Édition et suppression.` );
                  }}
                  className="text-on-surface-variant hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-background cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-outline-variant">
                <MapPin size={14} className="text-[#10b981] shrink-0" />
                <span className="bg-background text-on-surface-variant rounded-lg px-2.5 py-1 text-xs border border-outline-variant tracking-wide font-sans shadow-sm font-semibold">
                  {matchingCommune?.nom || 'Inconnue'}
                </span>
              </div>
            </div>
          );
        })}

        {/* Add New Placeholder Card matching mockup */}
        <div 
          onClick={onAddAvenueToggle}
          className="border-2 border-dashed border-outline-variant rounded-2xl p-5 hover:border-primary hover:bg-surface/50 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[148px] text-on-surface-variant hover:text-on-surface group active:scale-[0.99]"
        >
          <div className="bg-background border border-outline-variant rounded-full p-2.5 group-hover:bg-primary group-hover:text-on-primary transition-colors duration-200">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xs uppercase tracking-widest text-on-surface-variant group-hover:text-on-surface transition-colors">
            Nouvelle Avenue
          </span>
        </div>
      </div>
    </div>
  );
}
