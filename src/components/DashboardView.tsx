import { 
  Users, 
  Home, 
  Map, 
  Milestone, 
  Building2, 
  PlusCircle, 
  FolderPlus, 
  Search, 
  MapPin, 
  ArrowRight 
} from 'lucide-react';
import { Commune, Avenue, Parcelle, Abonne, Screen } from '../types';

interface DashboardViewProps {
  communes: Commune[];
  avenues: Avenue[];
  parcelles: Parcelle[];
  abonnes: Abonne[];
  onNavigate: (screen: Screen) => void;
  onAddCommuneToggle: () => void;
  onAddAvenueToggle: () => void;
}

export default function DashboardView({
  communes,
  avenues,
  parcelles,
  abonnes,
  onNavigate,
  onAddCommuneToggle,
  onAddAvenueToggle
}: DashboardViewProps) {
  
  // Calculate dynamic stats purely from live data
  const totalCommunes = communes.length; 
  const totalAvenues = avenues.length;
  const totalParcelles = parcelles.length;
  
  // Custom reducer for real households
  const totalMenages = parcelles.reduce((sum, p) => sum + p.nombre_menages, 0);

  // Exact live abonne count
  const totalAbonnes = abonnes.length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background">
      {/* Title block */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-on-background font-sans">
          Tableau de Bord
        </h2>
        <p className="text-sm text-on-surface-variant leading-relaxed font-sans">
          Vue d'ensemble des données de recensement en temps réel.
        </p>
      </div>

      {/* Bento Grid: Stats Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Highlight Card: Abonnés */}
        <div className="col-span-2 md:col-span-4 bg-surface border border-outline-variant rounded-3xl p-6 flex items-center justify-between shadow-xl relative overflow-hidden group hover:border-[#10b981]/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-[#10b981]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="flex flex-col gap-1.5 z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#10b981] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              Abonnés Actifs
            </span>
            <span className="text-4xl font-extrabold text-on-surface tracking-tight md:text-5xl font-sans mt-1">
              {totalAbonnes.toLocaleString('fr-FR')}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-background border border-outline-variant flex items-center justify-center z-10 text-primary group-hover:bg-[#10b981] group-hover:text-white group-hover:border-[#10b981] transition-all duration-350 shadow-sm">
            <Users size={24} strokeWidth={2.2} />
          </div>
        </div>

        {/* Ménages */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 justify-between hover:border-outline hover:bg-surface/80 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Ménages
            </span>
            <div className="w-8 h-8 rounded-lg bg-background border border-outline-variant flex items-center justify-center text-[#10b981]">
              <Home size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-on-surface font-sans">
            {totalMenages.toLocaleString('fr-FR')}
          </span>
        </div>

        {/* Parcelles */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 justify-between hover:border-outline hover:bg-surface/80 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Parcelles
            </span>
            <div className="w-8 h-8 rounded-lg bg-background border border-outline-variant flex items-center justify-center text-[#10b981]">
              <Building2 size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-on-surface font-sans">
            {totalParcelles.toLocaleString('fr-FR')}
          </span>
        </div>

        {/* Avenues */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 justify-between hover:border-outline hover:bg-surface/80 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Avenues
            </span>
            <div className="w-8 h-8 rounded-lg bg-background border border-outline-variant flex items-center justify-center text-[#10b981]">
              <Milestone size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-on-surface font-sans">
            {totalAvenues.toLocaleString('fr-FR')}
          </span>
        </div>

        {/* Communes */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-col gap-3 justify-between hover:border-outline hover:bg-surface/80 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Communes
            </span>
            <div className="w-8 h-8 rounded-lg bg-background border border-outline-variant flex items-center justify-center text-[#10b981]">
              <Map size={16} />
            </div>
          </div>
          <span className="text-2xl font-bold text-on-surface font-sans">
            {totalCommunes.toLocaleString('fr-FR')}
          </span>
        </div>
      </section>

      {/* Actions Rapides Section */}
      <section className="flex flex-col gap-3 mt-1">
        <h3 className="text-on-surface-variant font-bold text-xs uppercase tracking-widest select-none">Actions Rapides</h3>
        
        {/* Core button step 1 */}
        <button 
          onClick={() => onNavigate('communes')}
          className="w-full min-h-[52px] bg-primary text-on-primary rounded-2xl flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold shadow-lg hover:opacity-95 active:scale-[0.98] transition-all duration-150 cursor-pointer group border border-outline-variant"
        >
          <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Commencer un recensement
        </button>

        {/* Sub grid choices */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            onClick={onAddCommuneToggle}
            className="min-h-[48px] bg-surface border border-outline-variant text-on-surface hover:bg-background/80 rounded-xl flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
          >
            <FolderPlus size={16} className="text-[#10b981]" />
            Ajouter une commune
          </button>
          <button 
            onClick={onAddAvenueToggle}
            className="min-h-[48px] bg-surface border border-outline-variant text-on-surface hover:bg-background/80 rounded-xl flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
          >
            <Milestone size={16} className="text-[#10b981]" />
            Ajouter une avenue
          </button>
          <button 
            onClick={() => onNavigate('abonne_list')}
            className="min-h-[48px] bg-surface border border-outline-variant text-on-surface hover:bg-background/80 rounded-xl flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
          >
            <Search size={16} className="text-primary" />
            Consulter les abonnés
          </button>
        </div>
      </section>

      {/* Recent Activity lists */}
      <section className="flex flex-col gap-3 mt-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-on-surface-variant font-bold text-xs uppercase tracking-widest">Activité Récente</h3>
          <button 
            onClick={() => onNavigate('abonne_list')}
            className="text-xs font-bold text-primary hover:text-on-background flex items-center gap-1 cursor-pointer transition-colors"
          >
            Voir tout
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Items matching Page 3 exactly */}
        <div className="flex flex-col gap-2">
          {parcelles.length === 0 ? (
            <div className="bg-surface border border-outline-variant rounded-2xl p-6 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-1.5 font-sans shadow-md">
              <span className="text-xl">📍</span>
              <span className="font-bold text-on-surface">Aucune activité récente</span>
              <span>Les fiches de recensement validées apparaîtront ici en temps réel.</span>
            </div>
          ) : (
            parcelles.slice(0, 4).map((parcelle, index) => {
              // Find corresponding avenue and commune
              const avenueObj = avenues.find(a => a.id === parcelle.avenue_id);
              const communeObj = avenueObj ? communes.find(c => c.id === avenueObj.commune_id) : null;
              const correspondingAbonne = abonnes.find(ab => ab.parcelle_id === parcelle.id);

              // Mock human-friendly time or derived creation
              let timestamp = '10:42';
              if (index === 1) timestamp = '09:15';
              if (index === 2) timestamp = 'Hier';
              if (index > 2) timestamp = 'Récemment';

              return (
                <div 
                  key={parcelle.id}
                  onClick={() => {
                    if (correspondingAbonne) {
                      onNavigate('abonne_list');
                    }
                  }}
                  className="bg-surface border border-outline-variant rounded-2xl p-4 flex items-center gap-4 hover:border-outline hover:bg-surface/80 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-background text-[#10b981] flex items-center justify-center shrink-0 border border-outline-variant group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all duration-200">
                    <MapPin size={18} />
                  </div>
                  
                  <div className="flex flex-col flex-grow">
                    <span className="text-sm font-bold text-on-surface leading-tight group-hover:text-primary transition-colors">
                      Parcelle N° {parcelle.numero_parcelle}
                    </span>
                    <span className="text-xs text-on-surface-variant mt-1 font-sans leading-relaxed">
                      {avenueObj?.nom || 'Avenue inconnue'}, Commune de {communeObj?.nom || 'Kinshasa'}
                    </span>
                    {correspondingAbonne && (
                      <span className="text-[11px] text-on-surface font-medium mt-1.5 inline-flex items-center gap-1 font-sans">
                        👤 {correspondingAbonne.nom_complet} • <span className="text-on-surface-variant font-mono">{correspondingAbonne.telephone_principal}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1.5 font-sans">
                    <span className="text-xs font-mono text-on-surface-variant">
                      {timestamp}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-indigo-500' : 'bg-transparent'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
