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
}

export interface Abonne {
  id: string;
  parcelle_id: string;
  nom_complet: string;
  telephone_principal: string;
  telephone_secondaire?: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  nom: string;
  telephone: string;
  role: 'admin' | 'agent';
  created_at: string;
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
  | 'profil';
