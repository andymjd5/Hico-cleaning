export interface Commune {
  id: string;
  nom: string;
  created_at: string;
}

export interface Avenue {
  id: string;
  commune_id: string;
  nom: string;
  created_at: string;
}

export interface Parcelle {
  id: string;
  avenue_id: string;
  numero_parcelle: string;
  type_logement: 'maison_basse' | 'appartement';
  presence_locataire: 'oui' | 'non' | null;
  nombre_menages: number;
  created_by: string; // nom ou id de l'agent recenseur
  created_at: string;
  updated_at: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Abonne {
  id: string;
  parcelle_id: string;
  nom_complet: string;
  telephone_principal: string;
  telephone_secondaire?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  nom: string;
  telephone: string;
  role: 'admin' | 'agent' | 'abonne' | 'eboueur';
  created_at: string;
  parcelle_id?: string; // used for role === 'abonne' to link their specific parcel
  password?: string;
  isTempPassword?: boolean;
  capacite_camion?: number; // Capacité max du camion en sachets (par défaut 6)
  charge_actuelle?: number;  // Nombre de sachets actuellement dans le camion
}

export type Screen = 
  | 'login'
  | 'dashboard'
  | 'communes'
  | 'avenues'
  | 'recensement_form'
  | 'abonne_list'
  | 'abonne_detail'
  | 'rapports'
  | 'profil'
  | 'commune_explorer'
  | 'dechets_map'
  | 'abonne_space'
  | 'eboueur_space'
  | 'admin_settings'
  | 'admin_settings_screens'
  | 'admin_settings_pricing'
  | 'admin_settings_accounts'
  | 'admin_settings_passwords'
  | 'sachets_management'
  | 'finance_management';

export interface PoubelleSignal {
  id: string;
  parcelle_id: string;
  commune_id: string;
  avenue_id: string;
  commune_nom: string;
  avenue_nom: string;
  numero_parcelle: string;
  bailleur_nom: string;
  bailleur_telephone: string;
  status: 'pending' | 'assigned' | 'completed';
  assigned_eboueur_id?: string;
  reported_at: string;
  completed_at?: string;
  type_poubelle?: 'biodegradable' | 'non_biodegradable';
  latitude?: number | null;
  longitude?: number | null;
  // Verification & Traceability Extensions
  gps_validation?: {
    driver_latitude: number;
    driver_longitude: number;
    distance_metres: number;
    verified_on_site: boolean;
    verified_at: string;
  };
  photo_preuve_url?: string;
  sachets_remis_bio?: number;
  sachets_remis_non_bio?: number;
  litige_abonne?: boolean;
  litige_raison?: string;
  litige_date?: string;
}

export interface Eboueur {
  id: string;
  nom: string;
  telephone: string;
  latitude: number;
  longitude: number;
  status: 'idle' | 'en_mission';
  gps_active: boolean;
  capacite_camion?: number; // Capacité max du camion en sachets (par défaut 6)
  charge_actuelle?: number;  // Nombre de sachets actuellement dans le camion
}

export interface InboxMessage {
  id: string;
  sender: string;
  content: string;
  sent_at: string;
  read: boolean;
}

export interface SachetStock {
  id: string;
  commune_id: string | null;
  biodegradable: number;
  non_biodegradable: number;
  seuil_alerte: number;
  last_replenished: string;
}

export interface SachetDistribution {
  id: string;
  parcelle_id: string;
  avenue_id: string;
  commune_id: string;
  date_distribution: string;
  quantite_biodegradable: number;
  quantite_non_biodegradable: number;
  distribue_par: string; // Nom de l'éboueur ou agent
  eboueur_id?: string;
  type_distribution?: 'remise_ramassage' | 'distribution_directe';
  notes?: string;
}

export interface AgentDotation {
  id: string;
  agent_id: string;
  agent_nom: string;
  commune_id: string;
  biodegradable: number;
  non_biodegradable: number;
  last_assigned: string;
}

export interface AgentDotationLog {
  id: string;
  agent_id: string;
  agent_nom: string;
  commune_id: string;
  commune_nom: string;
  biodegradable: number;
  non_biodegradable: number;
  date: string;
  attribue_par: string;
}

export interface SubscriptionPayment {
  id: string;
  abonne_id: string;
  nom_complet: string;
  commune_id: string;
  parcelle_id: string;
  montant: number;
  date_paiement: string;
  mode_paiement: string;
  telephone_payeur: string;
  status: 'success';
  reference_transaction?: string;
}

export interface StaffPayment {
  id: string;
  recipient_id: string;
  recipient_name: string;
  recipient_role: 'agent' | 'eboueur' | 'staff';
  commune_id: string;
  montant: number;
  date_paiement: string;
  notes?: string;
}

export interface MaterialExpense {
  id: string;
  label: string;
  commune_id: string; // "global" or commune.id
  montant: number;
  date_depense: string;
  notes?: string;
}

export interface DisputeSignal {
  id: string;
  abonne_id: string;
  nom_complet: string;
  telephone: string;
  commune_id: string;
  parcelle_id: string;
  montant_du: number;
  date_constat: string;
  status: 'active' | 'resolved';
  reminders_sent: number;
  last_reminder_date?: string;
  notes?: string;
}

