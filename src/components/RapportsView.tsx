import React, { useState } from 'react';
import { BarChart3, FileSpreadsheet, FileDown, CheckCircle, PieChart, TrendingUp, RefreshCw } from 'lucide-react';
import { Commune, Avenue, Parcelle, Abonne } from '../types';

interface RapportsViewProps {
  communes: Commune[];
  avenues: Avenue[];
  parcelles: Parcelle[];
  abonnes: Abonne[];
}

export default function RapportsView({
  communes,
  avenues,
  parcelles,
  abonnes
}: RapportsViewProps) {
  const [exportingType, setExportingType] = useState<'pdf' | 'excel' | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Group parcelles by type_logement
  const maisonsCount = parcelles.filter(p => p.type_logement === 'maison_basse').length;
  const apartmentsCount = parcelles.filter(p => p.type_logement === 'appartement').length;

  const totalTypeCount = maisonsCount + apartmentsCount || 1;
  const percentMaisons = Math.round((maisonsCount / totalTypeCount) * 100);
  const percentApparts = Math.round((apartmentsCount / totalTypeCount) * 100);

  // Group parcelles count by Commune
  const parcellesByCommune = communes.map((c) => {
    // find all avenues for this commune
    const avIds = avenues.filter(a => a.commune_id === c.id).map(a => a.id);
    const count = parcelles.filter(p => avIds.includes(p.avenue_id)).length;
    
    return {
      communeNom: c.nom,
      total: count,
    };
  }).sort((a, b) => b.total - a.total);

  const handleExport = (type: 'pdf' | 'excel') => {
    setExportingType(type);
    setExportSuccess(null);

    // Simulate exporting delay
    setTimeout(() => {
      setExportingType(null);
      setExportSuccess(`Le fichier Hico-Cleaning_Rapport_Recensement_${new Date().getFullYear()}.${type === 'pdf' ? 'pdf' : 'xlsx'} a été téléchargé avec succès.`);
      setTimeout(() => setExportSuccess(null), 5000);
    }, 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-on-background">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-on-background font-sans">Rapports & Statistiques</h2>
          <p className="text-xs text-on-surface-variant font-sans">
            Analyses et exportations des données de salubrité publique.
          </p>
        </div>
        <BarChart3 size={20} className="text-primary" />
      </div>

      {/* Success notification banner */}
      {exportSuccess && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/25 text-[#10b981] rounded-xl p-4 text-xs font-semibold animate-fade-in flex items-center gap-3">
          <CheckCircle size={18} className="text-[#10b981] shrink-0 animate-bounce" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Export tools */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-on-surface font-sans">Télécharger les livrables</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed font-sans font-medium">
            Générez des rapports synthétiques mis à jour en continu pour préparer la facturation client et planifier les tournées des camions.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-1">
          {/* PDF */}
          <button
            onClick={() => handleExport('pdf')}
            disabled={exportingType !== null}
            className="h-11 bg-primary hover:opacity-95 text-on-primary rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans border border-outline-variant"
          >
            {exportingType === 'pdf' ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <FileDown size={14} />
            )}
            {exportingType === 'pdf' ? 'Génération...' : 'Exporter PDF'}
          </button>

          {/* Excel */}
          <button
            onClick={() => handleExport('excel')}
            disabled={exportingType !== null}
            className="h-11 bg-surface border border-outline-variant text-on-surface hover:bg-background rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
          >
            {exportingType === 'excel' ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={14} />
            )}
            {exportingType === 'excel' ? 'Génération...' : 'Excel (.xlsx)'}
          </button>
        </div>

        {/* Progress simulation state bar */}
        {exportingType && (
          <div className="flex flex-col gap-1.5 animate-pulse pt-2">
            <div className="flex justify-between text-[11px] font-bold text-[#10b981] uppercase font-mono">
              <span>Simulation de l'assemblage de la base de données...</span>
              <span>55%</span>
            </div>
            <div className="w-full bg-background h-1.5 rounded-full overflow-hidden border border-outline-variant">
              <div className="bg-[#10b981] h-full rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{width: '65%'}}></div>
            </div>
          </div>
        )}
      </div>

      {/* Structured Statistics Charts Section - Pure CSS Vectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Parcelles par Commune diagram */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <TrendingUp size={16} className="text-[#10b981]" />
              Parcelles par Commune (Top)
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">Seuil: &gt; 100</span>
          </div>

          {parcelles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <span className="text-3xl mb-2">📊</span>
              <p className="text-xs font-semibold text-on-surface">Aucune donnée de parcelle disponible</p>
              <p className="text-[10.5px] text-on-surface-variant leading-relaxed mt-1 max-w-xs">
                Les statistiques de répartition s'afficheront en temps réel au fur et à mesure des recensements d'avenues et de parcelles.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 mt-2">
              {parcellesByCommune.slice(0, 6).map((item, index) => {
                // Calculate percent width against maximum
                const maxTotal = parcellesByCommune[0]?.total || 1;
                const barPercent = Math.round((item.total / maxTotal) * 100);

                return (
                  <div key={item.communeNom} className="flex flex-col gap-1 font-sans">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-on-surface">
                        {index + 1}. {item.communeNom}
                      </span>
                      <span className="font-mono font-bold text-[#10b981]">
                        {item.total.toLocaleString('fr-FR')} parcelles
                      </span>
                    </div>
                    {/* Dynamic Progress Bar */}
                    <div className="w-full bg-background h-2.5 rounded-full border border-outline-variant">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          index === 0 ? 'bg-primary' : index === 1 ? 'bg-[#10b981]' : 'bg-on-surface-variant/20'
                        }`}
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Housing Distribution (type_logement) pie representation */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <PieChart size={16} className="text-[#10b981]" />
              Répartition Logements (%)
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold text-on-surface-variant">Maison vs App</span>
          </div>

          <div className="flex flex-col items-center gap-6 py-2">
            {/* Styled vector chart representation */}
            <div className="relative w-28 h-28 rounded-full border border-outline-variant shadow-xl bg-background flex items-center justify-center overflow-hidden">
              {/* Pie slices simulation using gradient circle shapes */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-[#10b981] opacity-80" />
              <div className="w-16 h-16 rounded-xl bg-surface border border-outline-variant z-10 flex items-center justify-center font-bold text-on-surface text-xs font-mono text-center shadow-lg">
                🏠 APP<br />{maisonsCount + apartmentsCount > 0 ? percentApparts : 0}%
              </div>
            </div>

            {/* Explanations index block */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="flex flex-col items-center p-3 bg-background border border-outline-variant rounded-xl text-center gap-0.5">
                <span className="w-3.5 h-3.5 bg-primary rounded" />
                <span className="text-xs font-semibold text-on-surface-variant mt-1 font-medium">Maisons basses</span>
                <span className="text-sm font-extrabold text-primary font-mono">{maisonsCount + apartmentsCount > 0 ? percentMaisons : 0}%</span>
                <span className="text-[10px] text-on-surface-variant font-medium font-sans">({maisonsCount} recensées)</span>
              </div>

              <div className="flex flex-col items-center p-3 bg-background border border-outline-variant rounded-xl text-center gap-0.5">
                <span className="w-3.5 h-3.5 bg-[#10b981] rounded" />
                <span className="text-xs font-semibold text-on-surface-variant mt-1 font-medium">Appartements</span>
                <span className="text-sm font-extrabold text-[#10b981] font-mono">{maisonsCount + apartmentsCount > 0 ? percentApparts : 0}%</span>
                <span className="text-[10px] text-on-surface-variant font-medium font-sans">({apartmentsCount} recensées)</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
