import React, { useState } from 'react';
import { Search, Users, MapPin, Phone, User, X, Landmark, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { Abonne, Parcelle, Commune, Avenue } from '../types';

interface AbonnesViewProps {
  abonnes: Abonne[];
  parcelles: Parcelle[];
  communes: Commune[];
  avenues: Avenue[];
}

export default function AbonnesView({
  abonnes,
  parcelles,
  communes,
  avenues
}: AbonnesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [communeFilter, setCommuneFilter] = useState('');
  const [selectedAbonne, setSelectedAbonne] = useState<Abonne | null>(null);

  // Filter subscribers list
  const filteredAbonnes = abonnes.filter((ab) => {
    // Search text matches (Name or Phone number)
    const matchesSearch = 
      ab.nom_complet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ab.telephone_principal.includes(searchTerm) ||
      (ab.telephone_secondaire && ab.telephone_secondaire.includes(searchTerm));

    // Commune match
    if (!communeFilter) return matchesSearch;

    const linkedParcelle = parcelles.find(p => p.id === ab.parcelle_id);
    const linkedAvenue = linkedParcelle ? avenues.find(a => a.id === linkedParcelle.avenue_id) : null;
    const matchesCommune = linkedAvenue ? linkedAvenue.commune_id === communeFilter : false;

    return matchesSearch && matchesCommune;
  });

  const getAbonneAddressDetails = (parcelleId: string) => {
    const parcelle = parcelles.find(p => p.id === parcelleId);
    const avenue = parcelle ? avenues.find(a => a.id === parcelle.avenue_id) : null;
    const commune = avenue ? communes.find(c => c.id === avenue.commune_id) : null;

    return {
      numeroParcelle: parcelle?.numero_parcelle || 'N/A',
      typeLogement: parcelle?.type_logement === 'maison_basse' ? 'Maison basse' : 'Appartement',
      nombreMenages: parcelle?.nombre_menages || 1,
      avenueNom: avenue?.nom || 'Inconnue',
      communeNom: commune?.nom || 'Inconnue',
      locataires: parcelle?.presence_locataire === 'oui' ? 'Oui' : 'Non',
    };
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-on-background">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-surface text-primary flex items-center justify-center border border-outline-variant">
            <Users size={18} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-on-background font-sans">Base des Abonnés</h2>
        </div>
        <span className="bg-surface text-on-surface-variant text-xs px-3 py-1 rounded-full font-bold border border-outline-variant font-mono">
          {abonnes.length} inscrits
        </span>
      </div>

      {/* Info indicator */}
      <div className="bg-surface/80 border border-outline-variant rounded-2xl p-4 text-xs font-sans shadow-lg leading-relaxed text-on-surface-variant">
        📋 <span className="font-semibold text-primary">Base d'Abonnés Hico-Cleaning :</span> Tous les responsables saisis lors du recensement sont d'office convertis en abonnés. Les informations servent à générer la facturation et planifier les collectes de déchets.
      </div>

      {/* Search & Filter bar wrapper */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
            <Search size={18} />
          </div>
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-surface border border-outline-variant rounded-xl text-on-surface placeholder:text-gray-500 focus:outline-none focus:border-primary text-sm transition-all font-sans"
            placeholder="Rechercher par nom ou téléphone..."
          />
        </div>

        {/* Commune filter */}
        <div className="relative shrink-0">
          <select 
            value={communeFilter}
            onChange={(e) => setCommuneFilter(e.target.value)}
            className="w-full sm:w-[180px] h-11 pl-4 pr-8 bg-surface border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface text-sm cursor-pointer font-sans"
          >
            <option value="" className="bg-surface text-on-surface">Tous secteurs</option>
            {communes.map(c => (
              <option key={c.id} value={c.id} className="bg-surface text-on-surface">{c.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List cards stack */}
      <div className="flex flex-col gap-3">
        {filteredAbonnes.length > 0 ? (
          filteredAbonnes.map((ab) => {
            const extra = getAbonneAddressDetails(ab.parcelle_id);

            return (
              <div 
                key={ab.id}
                onClick={() => setSelectedAbonne(ab)}
                className="bg-surface border border-outline-variant hover:bg-surface/60 hover:shadow-lg rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 cursor-pointer transition-all duration-150 group active:scale-[0.99]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background text-on-surface-variant flex items-center justify-center shrink-0 mt-0.5 border border-outline-variant group-hover:bg-[#10b981]/10 group-hover:text-[#10b981] group-hover:border-[#10b981]/20 transition-colors">
                    <User size={18} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm md:text-base font-bold text-on-surface group-hover:text-primary transition-colors font-sans">
                      {ab.nom_complet}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mt-1 font-sans">
                      <Phone size={12} className="text-[#10b981] shrink-0 font-mono" />
                      <span>{ab.telephone_principal}</span>
                      {ab.telephone_secondaire && (
                        <>
                          <span className="text-outline-variant">|</span>
                          <span>{ab.telephone_secondaire}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-sans sm:text-right sm:flex-col sm:items-end">
                  <span className="bg-[#10b981]/10 text-[#10b981] text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[#10b981]/25">
                    Abonné Actif
                  </span>
                  <div className="flex items-center gap-1 mt-1 select-none shrink-0">
                    <MapPin size={12} className="text-[#10b981]" />
                    <span>N° {extra.numeroParcelle}, Av. {extra.avenueNom} ({extra.communeNom})</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-surface border border-dashed border-outline-variant rounded-3xl flex flex-col items-center gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-bold text-on-surface">Aucun abonné trouvé</p>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
              Vos critères de recherche ou de filtre ne retournent actuellement aucun inscrit dans la base.
            </p>
          </div>
        )}
      </div>

      {/* Profil Detail Overlay Modal / Image style */}
      {selectedAbonne && (() => {
        const extra = getAbonneAddressDetails(selectedAbonne.parcelle_id);
        const randTaxe = 15; // Simulated monthly rate

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-on-surface">
            <div className="bg-surface border border-outline-variant rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
              
              {/* Header profile */}
              <div className="bg-background/40 px-5 py-4 flex justify-between items-start border-b border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-background text-primary flex items-center justify-center text-lg font-bold border border-outline-variant">
                    {selectedAbonne.nom_complet.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold truncate max-w-[200px] text-on-surface">
                      {selectedAbonne.nom_complet}
                    </h3>
                    <span className="text-xs text-on-surface-variant block font-sans">
                      ID Abonné: HICO-2026-{selectedAbonne.id.substring(3).toUpperCase()}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAbonne(null)}
                  className="bg-background border border-outline-variant text-on-surface-variant hover:text-on-surface transition-all rounded-lg p-1.5 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col gap-4 font-sans text-sm">
                
                {/* Contact information details */}
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-outline-variant pb-1">
                    📞 Coordonnées Responsable
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Téléphone principal:</span>
                    <span className="font-bold text-on-surface font-mono">{selectedAbonne.telephone_principal}</span>
                  </div>
                  {selectedAbonne.telephone_secondaire && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Téléphone secondaire:</span>
                      <span className="font-bold text-on-surface font-mono">{selectedAbonne.telephone_secondaire}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Date d'inscription:</span>
                    <span className="font-bold text-on-surface">
                      {new Date(selectedAbonne.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Linked plot details */}
                <div className="flex flex-col gap-2.5 mt-1">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-outline-variant pb-1">
                    🏠 Informations Parcelle Associée
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Numéro parcelle:</span>
                    <span className="font-extrabold text-[#10b981]">N° {extra.numeroParcelle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Quartier (Avenue / Sec):</span>
                    <span className="font-bold text-on-surface">Av. {extra.avenueNom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Commune:</span>
                    <span className="font-bold text-on-surface">Commune de {extra.communeNom}</span>
                  </div>
                  <div className="flex justify-between border-t border-outline-variant pt-2 text-xs">
                    <span className="text-on-surface-variant">Type Logement:</span>
                    <span className="font-bold text-on-surface">{extra.typeLogement}</span>
                  </div>
                  {extra.typeLogement === 'Maison basse' && (
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant">Présence Locataire:</span>
                      <span className="font-bold text-on-surface">{extra.locataires}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Nombre de ménages:</span>
                    <span className="font-bold text-[#10b981]">{extra.nombreMenages} ménage(s)</span>
                  </div>
                </div>

                {/* Simulation Billing Area (future roadmap validation) */}
                <div className="bg-background border border-outline-variant rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-on-surface">
                      <Landmark size={14} className="text-primary" />
                      Estimation Taxe de Salubrité
                    </span>
                    <span className="text-[#10b981] text-[10px] font-bold tracking-widest bg-[#10b981]/15 px-2 py-0.5 rounded-full">STABLE</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-sans mt-0.5">
                    Sur base du type <span className="font-bold text-on-surface">{extra.typeLogement}</span> avec {extra.nombreMenages} ménage(s) :
                  </p>

                  <div className="flex flex-col gap-1.5 text-xs border-t border-b border-outline-variant/30 py-2 my-1">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Ménage principal (Bailleur) :</span>
                      <span className="font-bold text-on-surface">15.00 $ / mois</span>
                    </div>
                    {extra.nombreMenages > 1 && (
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Ménages locataires ({extra.nombreMenages - 1}) :</span>
                        <span className="font-extrabold text-secondary">{((extra.nombreMenages - 1) * 15).toFixed(2)} $ / mois</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-on-surface-variant">Projet de Facture Global:</span>
                    <span className="text-base font-extrabold text-primary font-mono">
                      {(randTaxe * extra.nombreMenages).toFixed(2)} $ / mois
                    </span>
                  </div>

                  {extra.nombreMenages > 1 && (
                    <p className="text-[10px] text-amber-500 font-sans leading-normal font-medium mt-1 border-t border-outline-variant/20 pt-1.5">
                      ℹ️ Note : Les ménages locataires supplémentaires sont bien rattachés aux comptes des locataires payeurs et non à la charge du bailleur seul.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-background/40 px-5 py-3 border-t border-outline-variant flex justify-end gap-2.5">
                <button
                  onClick={() => alert(`Impression du badge d'abonné de ${selectedAbonne.nom_complet}...`)}
                  className="bg-transparent border border-outline-variant text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-background/20 active:scale-95 transition-all cursor-pointer"
                >
                  Imprimer QR
                </button>
                <button
                  onClick={() => setSelectedAbonne(null)}
                  className="bg-primary text-on-primary text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  Fermer
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
