import React, { useState } from 'react';
import { 
  Headphones, 
  Plus, 
  Search, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Send, 
  HelpCircle, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { Agent, SupportTicket } from '../types';

interface SupportViewProps {
  currentUser: Agent | null;
}

export default function SupportView({ currentUser }: SupportViewProps) {
  // Mock / Initial Support Tickets
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem('hico_support_tickets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading tickets", e);
      }
    }
    return [
      {
        id: 'TICK-001',
        sujet: 'Sachets non livrés après paiement',
        categorie: 'sachets',
        priorite: 'haute',
        status: 'en_cours',
        auteur_nom: 'Major Diev',
        auteur_telephone: '0899774965',
        auteur_role: 'abonne',
        commune_nom: 'Bandalungwa',
        message: "J'ai effectué mon paiement Mobile Money ce matin mais mon lot de 10 sachets n'a pas encore été déposé par l'éboueur.",
        reponse_support: "Bonjour Major, un agent éboueur de la zone Bandalungwa est en route pour vous remettre vos sachets.",
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'TICK-002',
        sujet: 'Signalement de poubelle débordante non ramassée',
        categorie: 'ramassage',
        priorite: 'urgente',
        status: 'nouveau',
        auteur_nom: 'Maman Jeanne',
        auteur_telephone: '0812345678',
        auteur_role: 'abonne',
        commune_nom: 'Kintambo',
        message: "Notre parcelle compte 8 ménages et la poubelle est pleine depuis hier soir. Merci d'envoyer le camion.",
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        id: 'TICK-003',
        sujet: 'Question sur le tarif mensuel par ménage',
        categorie: 'facturation',
        priorite: 'basse',
        status: 'resolu',
        auteur_nom: 'Papa Mukendi',
        auteur_telephone: '0829988776',
        auteur_role: 'abonne',
        commune_nom: 'Gombe',
        message: "Je souhaite savoir pourquoi le montant calculé varie en fonction du nombre de ménages.",
        reponse_support: "Le tarif officiel Hico-Cleaning est de 1$ par ménage par mois conformément au barème de votre commune.",
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
      }
    ];
  });

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // New Ticket Form State
  const [newSujet, setNewSujet] = useState('');
  const [newCategory, setNewCategory] = useState<'facturation' | 'ramassage' | 'sachets' | 'application' | 'reclamation'>('ramassage');
  const [newPriorite, setNewPriorite] = useState<'basse' | 'moyenne' | 'haute' | 'urgente'>('moyenne');
  const [newAuteurNom, setNewAuteurNom] = useState(currentUser?.nom || '');
  const [newAuteurPhone, setNewAuteurPhone] = useState(currentUser?.telephone || '');
  const [newCommune, setNewCommune] = useState('Kinshasa');
  const [newMessage, setNewMessage] = useState('');

  // Support Response State
  const [reponseInput, setReponseInput] = useState('');

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Save tickets helper
  const saveTickets = (updated: SupportTicket[]) => {
    setTickets(updated);
    localStorage.setItem('hico_support_tickets', JSON.stringify(updated));
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSujet.trim() || !newMessage.trim() || !newAuteurNom.trim() || !newAuteurPhone.trim()) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const newTicket: SupportTicket = {
      id: 'TICK-' + Math.floor(100 + Math.random() * 900),
      sujet: newSujet.trim(),
      categorie: newCategory,
      priorite: newPriorite,
      status: 'nouveau',
      auteur_nom: newAuteurNom.trim(),
      auteur_telephone: newAuteurPhone.trim(),
      auteur_role: currentUser?.role || 'visiteur',
      commune_nom: newCommune,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [newTicket, ...tickets];
    saveTickets(updated);

    // Reset Form
    setNewSujet('');
    setNewMessage('');
    setShowNewTicketModal(false);
    alert("Votre ticket de support a été transmis à l'équipe d'assistance Hico-Cleaning !");
  };

  const handleUpdateTicketStatus = (ticketId: string, newStatus: 'nouveau' | 'en_cours' | 'resolu' | 'ferme', reponse?: string) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: newStatus,
          reponse_support: reponse !== undefined ? reponse : t.reponse_support,
          updated_at: new Date().toISOString()
        };
      }
      return t;
    });
    saveTickets(updated);
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => prev ? {
        ...prev,
        status: newStatus,
        reponse_support: reponse !== undefined ? reponse : prev.reponse_support,
        updated_at: new Date().toISOString()
      } : null);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.sujet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.auteur_nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.auteur_telephone.includes(searchTerm) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || t.categorie === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const faqs = [
    {
      q: "Comment est calculé le montant de mon abonnement mensuel ?",
      a: "Le tarif d'abonnement mensuel est fixé par ménage habitant dans la parcelle recensée (généralement 1$ / ménage / mois). Il est calculé automatiquement lors de la saisie de votre numéro de parcelle."
    },
    {
      q: "Comment s'effectue le paiement par Mobile Money (Push USSD) ?",
      a: "Lors de la saisie du paiement, sélectionnez 'Mobile Money' et entrez le numéro du téléphone payeur. Un message Push USSD s'affichera directement sur le téléphone pour valider avec le code PIN secret."
    },
    {
      q: "Que faire si mon lot de sachets poubelles est épuisé ?",
      a: "Vous pouvez demander un réapprovisionnement directement depuis l'application dans la rubrique 'Gestion de Sachets' ou contacter le support pour une livraison par l'éboueur lors du prochain passage."
    },
    {
      q: "Comment signaler une poubelle pleine non ramassée ?",
      a: "Accédez à votre Espace Abonné et appuyez sur 'Signaler ma poubelle pleine'. Les camionneurs éboueurs de votre commune recevront immédiatement votre position GPS pour procéder au ramassage."
    }
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-primary/20 text-primary flex items-center justify-center border border-primary/30 shadow-inner">
            <Headphones size={22} className="text-primary" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-on-background tracking-tight">Support & Assistance Client</h2>
            <p className="text-xs text-on-surface-variant">Gestion des réclamations, assistance technique & hotline Hico-Cleaning</p>
          </div>
        </div>

        <button
          onClick={() => setShowNewTicketModal(true)}
          className="px-4 py-2.5 bg-primary hover:opacity-95 text-on-primary font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer w-full md:w-auto"
        >
          <Plus size={16} />
          <span>Nouveau Ticket / Réclamation</span>
        </button>
      </div>

      {/* Emergency Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Phone size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hotline Kinshasa</span>
            <span className="text-sm font-extrabold text-white font-mono">+243 89 977 4965</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Disponible 7j/7 • 08h-18h</span>
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <MessageSquare size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">WhatsApp Direct</span>
            <span className="text-sm font-extrabold text-white font-mono">+243 81 234 5678</span>
            <span className="text-[10px] text-indigo-400 font-semibold">Réponse rapide via WhatsApp</span>
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dispatch Urgent Éboueurs</span>
            <span className="text-sm font-extrabold text-white font-mono">Urgence Ramassage</span>
            <span className="text-[10px] text-amber-400 font-semibold">Priorité Poubelle Débordante</span>
          </div>
        </div>
      </div>

      {/* Main Section: Ticket Management */}
      <div className="bg-surface border border-outline-variant rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">
              Tickets de Support & Signalements ({filteredTickets.length})
            </h3>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher ticket, nom, tél..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-8 pr-3 bg-background border border-outline-variant rounded-xl text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 bg-background border border-outline-variant rounded-xl text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="all">Toutes Catégories</option>
              <option value="ramassage">🚚 Ramassage</option>
              <option value="sachets">🛍️ Sachets Poubelles</option>
              <option value="facturation">💵 Facturation</option>
              <option value="reclamation">⚠️ Réclamation</option>
              <option value="application">📱 App Technique</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 bg-background border border-outline-variant rounded-xl text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="all">Tous Statuts</option>
              <option value="nouveau">🔵 Nouveau</option>
              <option value="en_cours">🟡 En Cours</option>
              <option value="resolu">🟢 Résolu</option>
              <option value="ferme">🔴 Fermé</option>
            </select>
          </div>
        </div>

        {/* Tickets Grid / List */}
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-2xl text-gray-400">
            <HelpCircle size={32} className="text-gray-500" />
            <p className="text-xs font-bold">Aucun ticket trouvé correspondant à vos critères.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTickets.map(ticket => {
              const isUrgent = ticket.priorite === 'urgente' || ticket.priorite === 'haute';
              return (
                <div 
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setReponseInput(ticket.reponse_support || '');
                  }}
                  className={`bg-background border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all cursor-pointer hover:border-primary/50 shadow-md ${
                    selectedTicket?.id === ticket.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-outline-variant'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-black text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                        #{ticket.id}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          ticket.status === 'nouveau' ? 'bg-blue-950/60 text-blue-400 border-blue-500/30' :
                          ticket.status === 'en_cours' ? 'bg-amber-950/60 text-amber-400 border-amber-500/30' :
                          ticket.status === 'resolu' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' :
                          'bg-gray-900 text-gray-400 border-gray-700'
                        }`}>
                          {ticket.status === 'nouveau' ? 'Nouveau' :
                           ticket.status === 'en_cours' ? 'En Cours' :
                           ticket.status === 'resolu' ? 'Résolu' : 'Fermé'}
                        </span>

                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isUrgent ? 'bg-red-950/60 text-red-400 border-red-500/30' : 'bg-gray-800 text-gray-300 border-gray-700'
                        }`}>
                          {ticket.priorite.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{ticket.sujet}</h4>
                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed bg-surface/50 p-2.5 rounded-xl border border-white/5">
                      "{ticket.message}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-indigo-400" />
                      <span className="font-bold text-gray-200">{ticket.auteur_nom}</span>
                      <span>({ticket.commune_nom || 'Kinshasa'})</span>
                    </div>

                    <span className="font-mono">{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Details & Response Drawer/Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col gap-5 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
                  {selectedTicket.id}
                </span>
                <h3 className="text-sm font-extrabold text-white">{selectedTicket.sujet}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-white text-xs font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10"
              >
                Fermer
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-surface p-3 rounded-2xl border border-white/5">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Auteur / Abonné</span>
                  <p className="font-bold text-white">{selectedTicket.auteur_nom}</p>
                  <p className="text-[11px] text-primary font-mono">{selectedTicket.auteur_telephone}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Catégorie & Commune</span>
                  <p className="font-bold text-white uppercase">{selectedTicket.categorie}</p>
                  <p className="text-[11px] text-gray-300">{selectedTicket.commune_nom || 'Kinshasa'}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Message de la réclamation</span>
                <div className="p-3 bg-black/60 rounded-xl border border-white/10 mt-1 leading-relaxed text-gray-200">
                  {selectedTicket.message}
                </div>
              </div>

              {selectedTicket.reponse_support && (
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 size={12} /> Réponse apportée par le support
                  </span>
                  <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30 mt-1 leading-relaxed text-emerald-200">
                    {selectedTicket.reponse_support}
                  </div>
                </div>
              )}

              {/* Admin/Support Reply Input */}
              <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-white/10">
                <span className="text-[10px] text-indigo-400 font-bold uppercase">
                  Ajouter / Modifier la Réponse du Support
                </span>
                <textarea
                  rows={3}
                  placeholder="Saisissez la réponse du service client..."
                  value={reponseInput}
                  onChange={(e) => setReponseInput(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 font-bold">Changer Statut:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'en_cours', reponseInput)}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg text-[10px] border border-amber-500/30"
                    >
                      En Cours
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'resolu', reponseInput)}
                      className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-lg text-[10px] border border-emerald-500/30"
                    >
                      Marquer Résolu
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateTicketStatus(selectedTicket.id, selectedTicket.status, reponseInput)}
                    className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                  >
                    <Send size={12} />
                    <span>Enregistrer Réponse</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col gap-5 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase text-primary flex items-center gap-2">
                <Plus size={18} /> Nouveau Ticket / Réclamation
              </h3>
              <button 
                onClick={() => setShowNewTicketModal(false)}
                className="text-gray-400 hover:text-white text-xs font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Sujet de la demande *</span>
                <input
                  type="text"
                  placeholder="ex. Retard ramassage poubelle"
                  value={newSujet}
                  onChange={(e) => setNewSujet(e.target.value)}
                  className="bg-black border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Catégorie *</span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="bg-black border border-white/10 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="ramassage">🚚 Ramassage Poubelle</option>
                    <option value="sachets">🛍️ Sachets Poubelles</option>
                    <option value="facturation">💵 Facturation / Paiement</option>
                    <option value="reclamation">⚠️ Réclamation générale</option>
                    <option value="application">📱 Problème App</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Priorité</span>
                  <select
                    value={newPriorite}
                    onChange={(e) => setNewPriorite(e.target.value as any)}
                    className="bg-black border border-white/10 px-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-primary font-bold"
                  >
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">🚨 Urgentes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Nom de l'émetteur *</span>
                  <input
                    type="text"
                    value={newAuteurNom}
                    onChange={(e) => setNewAuteurNom(e.target.value)}
                    className="bg-black border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Téléphone *</span>
                  <input
                    type="text"
                    value={newAuteurPhone}
                    onChange={(e) => setNewAuteurPhone(e.target.value)}
                    className="bg-black border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-primary font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Description détaillée du problème *</span>
                <textarea
                  rows={4}
                  placeholder="Décrivez précisément votre problème ou votre réclamation..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="bg-black border border-white/10 p-3.5 rounded-xl text-xs text-white focus:outline-none focus:border-primary leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-primary text-on-primary font-extrabold rounded-xl text-xs mt-2 flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <Send size={14} />
                <span>Envoyer le Ticket de Support</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="bg-surface border border-outline-variant rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-3">
          <Sparkles size={18} className="text-primary" />
          <h3 className="text-sm font-black uppercase tracking-wider text-on-surface">Foire Aux Questions (FAQ)</h3>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="bg-background border border-outline-variant rounded-2xl p-4 flex flex-col gap-2 transition-all"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="flex items-center justify-between text-left gap-3 text-xs font-bold text-white cursor-pointer"
              >
                <span>{faq.q}</span>
                {expandedFaq === idx ? <ChevronUp size={16} className="text-primary" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {expandedFaq === idx && (
                <p className="text-xs text-gray-300 leading-relaxed pt-2 border-t border-white/5 animate-fade-in">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
