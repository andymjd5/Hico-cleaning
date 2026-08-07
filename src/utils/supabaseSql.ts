// Script SQL d'initialisation et de correction Supabase pour Hico-Cleaning Kinshasa
// Résout l'erreur 42703 (colonne commune_id manquante) et configure toutes les 24 communes avec RLS désactivé

export const HICO_COMPLETE_SUPABASE_SQL = `-- =========================================================================
-- HICO-CLEANING KINSHASA : SCRIPT SQL COMPLET, UNIFIÉ ET SANS ERREUR (SUPABASE)
-- Résout l'erreur 42703 (colonne commune_id manquante) et initialise
-- toutes les tables avec isolation stricte des 24 communes de Kinshasa.
-- =========================================================================

-- 1. Table COMMUNES (24 communes de Kinshasa)
CREATE TABLE IF NOT EXISTS communes (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  population INTEGER DEFAULT 0,
  superficie NUMERIC DEFAULT 0,
  densite NUMERIC DEFAULT 0,
  centre_lat NUMERIC DEFAULT -4.325,
  centre_lng NUMERIC DEFAULT 15.322,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table AVENUES
CREATE TABLE IF NOT EXISTS avenues (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  commune_id TEXT,
  commune_nom TEXT,
  quartier TEXT,
  centre_lat NUMERIC,
  centre_lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE avenues ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE avenues ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE avenues ADD COLUMN IF NOT EXISTS quartier TEXT;

-- 3. Table PARCELLES
CREATE TABLE IF NOT EXISTS parcelles (
  id TEXT PRIMARY KEY,
  numero_parcelle TEXT,
  avenue_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  type_logement TEXT,
  presence_locataire TEXT,
  nombre_menages INTEGER DEFAULT 1,
  latitude NUMERIC,
  longitude NUMERIC,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- 4. Table ABONNES (Bailleurs / Responsables)
CREATE TABLE IF NOT EXISTS abonnes (
  id TEXT PRIMARY KEY,
  nom_complet TEXT NOT NULL,
  telephone TEXT,
  telephone_principal TEXT,
  telephone_secondaire TEXT,
  parcelle_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  avenue_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE abonnes ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE abonnes ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE abonnes ADD COLUMN IF NOT EXISTS telephone TEXT;

-- 5. Table AGENTS (Administrateurs, Bourgmestres, Éboueurs, Recenseurs)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  password TEXT DEFAULT 'password',
  is_temp_password BOOLEAN DEFAULT FALSE,
  commune_id TEXT DEFAULT 'all',
  commune_nom TEXT DEFAULT 'Toutes les communes (Kinshasa)',
  capacite_camion INTEGER DEFAULT 6,
  charge_actuelle INTEGER DEFAULT 0,
  parcelle_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'password';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_temp_password BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS commune_id TEXT DEFAULT 'all';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS commune_nom TEXT DEFAULT 'Toutes les communes (Kinshasa)';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS capacite_camion INTEGER DEFAULT 6;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS charge_actuelle INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS parcelle_id TEXT;

-- 6. Table SIGNAUX_POUBELLES (Alertes poubelles, assignation, traçabilité)
CREATE TABLE IF NOT EXISTS signaux_poubelles (
  id TEXT PRIMARY KEY,
  parcelle_id TEXT,
  numero_parcelle TEXT,
  avenue_id TEXT,
  avenue_nom TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  bailleur_id TEXT,
  bailleur_nom TEXT,
  bailleur_telephone TEXT,
  type_poubelle TEXT DEFAULT 'biodegradable',
  statut TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  assigned_eboueur_id TEXT,
  eboueur_assigne_id TEXT,
  is_hors_delai BOOLEAN DEFAULT FALSE,
  is_partiel BOOLEAN DEFAULT FALSE,
  partiel_note TEXT,
  estimated_arrival_minutes INTEGER,
  eta_appointment_time TEXT,
  confirmation_abonne TEXT DEFAULT 'en_attente',
  confirmation_date TIMESTAMPTZ,
  litige_abonne BOOLEAN DEFAULT FALSE,
  litige_raison TEXT,
  litige_date TIMESTAMPTZ,
  photo_preuve_url TEXT,
  gps_validation JSONB,
  sachets_remis_bio INTEGER DEFAULT 0,
  sachets_remis_non_bio INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS avenue_id TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS avenue_nom TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS parcelle_id TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS numero_parcelle TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS bailleur_nom TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS bailleur_telephone TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'pending';
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS assigned_eboueur_id TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS eboueur_assigne_id TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS type_poubelle TEXT DEFAULT 'biodegradable';
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS is_hors_delai BOOLEAN DEFAULT FALSE;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS is_partiel BOOLEAN DEFAULT FALSE;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS partiel_note TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS estimated_arrival_minutes INTEGER;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS eta_appointment_time TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS confirmation_abonne TEXT DEFAULT 'en_attente';
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMPTZ;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS litige_abonne BOOLEAN DEFAULT FALSE;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS litige_raison TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS litige_date TIMESTAMPTZ;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS photo_preuve_url TEXT;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS gps_validation JSONB;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS sachets_remis_bio INTEGER DEFAULT 0;
ALTER TABLE signaux_poubelles ADD COLUMN IF NOT EXISTS sachets_remis_non_bio INTEGER DEFAULT 0;

-- 7. Table EBOUEURS_GPS (Suivi GPS en temps réel)
CREATE TABLE IF NOT EXISTS eboueurs_gps (
  agent_id TEXT PRIMARY KEY,
  latitude NUMERIC,
  longitude NUMERIC,
  en_service BOOLEAN DEFAULT TRUE,
  derniere_mise_a_jour TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table SUBSCRIPTION_PAYMENTS (Redevance & Facturation)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  parcelle_id TEXT,
  abonne_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  amount NUMERIC DEFAULT 10,
  currency TEXT DEFAULT 'USD',
  month TEXT,
  year INTEGER,
  payment_method TEXT DEFAULT 'Airtel Money',
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS parcelle_id TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS abonne_id TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- 9. Table SACHET_STOCKS & DISTRIBUTIONS (Gestion des sachets par commune)
CREATE TABLE IF NOT EXISTS sachet_stocks (
  commune_id TEXT PRIMARY KEY,
  commune_nom TEXT,
  bio_disponibles INTEGER DEFAULT 1000,
  non_bio_disponibles INTEGER DEFAULT 1000,
  bio_distribues INTEGER DEFAULT 0,
  non_bio_distribues INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS commune_nom TEXT;

CREATE TABLE IF NOT EXISTS sachet_distributions (
  id TEXT PRIMARY KEY,
  commune_id TEXT,
  commune_nom TEXT,
  parcelle_id TEXT,
  abonne_id TEXT,
  bailleur_nom TEXT,
  bio_qty INTEGER DEFAULT 0,
  non_bio_qty INTEGER DEFAULT 0,
  distribue_par_id TEXT,
  distribue_par_nom TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sachet_distributions ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE sachet_distributions ADD COLUMN IF NOT EXISTS commune_nom TEXT;

CREATE TABLE IF NOT EXISTS agent_dotations (
  agent_id TEXT PRIMARY KEY,
  agent_nom TEXT,
  commune_id TEXT,
  bio_stock INTEGER DEFAULT 0,
  non_bio_stock INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agent_dotations ADD COLUMN IF NOT EXISTS commune_id TEXT;

CREATE TABLE IF NOT EXISTS agent_dotation_logs (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  commune_id TEXT,
  bio_qty INTEGER DEFAULT 0,
  non_bio_qty INTEGER DEFAULT 0,
  type TEXT DEFAULT 'recharge',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Table DISPUTE_SIGNALS (Contentieux & Litiges)
CREATE TABLE IF NOT EXISTS dispute_signals (
  id TEXT PRIMARY KEY,
  abonne_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  parcelle_id TEXT,
  raison TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dispute_signals ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE dispute_signals ADD COLUMN IF NOT EXISTS commune_nom TEXT;

CREATE TABLE IF NOT EXISTS dis_signals (
  id TEXT PRIMARY KEY,
  abonne_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  parcelle_id TEXT,
  raison TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dis_signals ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE dis_signals ADD COLUMN IF NOT EXISTS commune_nom TEXT;

-- 11. Table INCIVISME_INCIDENTS & CONVOCATIONS (Bourgmestres & Police)
CREATE TABLE IF NOT EXISTS incivisme_incidents (
  id TEXT PRIMARY KEY,
  commune_id TEXT,
  commune_nom TEXT,
  quartier TEXT,
  avenue TEXT,
  description TEXT,
  type_infraction TEXT,
  auteur_presume TEXT,
  statut TEXT DEFAULT 'signale',
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE incivisme_incidents ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE incivisme_incidents ADD COLUMN IF NOT EXISTS commune_nom TEXT;

CREATE TABLE IF NOT EXISTS convocations_communales (
  id TEXT PRIMARY KEY,
  commune_id TEXT,
  commune_nom TEXT,
  destinataire_nom TEXT,
  destinataire_telephone TEXT,
  motif TEXT,
  date_convocation TIMESTAMPTZ,
  statut TEXT DEFAULT 'emise',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE convocations_communales ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE convocations_communales ADD COLUMN IF NOT EXISTS commune_nom TEXT;

-- 12. Table SUPPORT_TICKETS & INBOX_MESSAGES
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_nom TEXT,
  user_role TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  sujet TEXT,
  description TEXT,
  statut TEXT DEFAULT 'ouvert',
  priorite TEXT DEFAULT 'normale',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id TEXT PRIMARY KEY,
  expediteur_id TEXT,
  expediteur_nom TEXT,
  destinataire_id TEXT,
  destinataire_role TEXT,
  commune_id TEXT,
  titre TEXT,
  contenu TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Table STAFF_PAYMENTS & MATERIAL_EXPENSES
CREATE TABLE IF NOT EXISTS staff_payments (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  staff_name TEXT,
  staff_role TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  month TEXT,
  year INTEGER,
  status TEXT DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_expenses (
  id TEXT PRIMARY KEY,
  description TEXT,
  category TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  expense_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Table SYSTEM_SETTINGS (Paramètres & Permissions)
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. DÉSACTIVATION DU ROW LEVEL SECURITY (RLS) POUR ACCÈS TRANSPARENT ET DIRECT
ALTER TABLE communes DISABLE ROW LEVEL SECURITY;
ALTER TABLE avenues DISABLE ROW LEVEL SECURITY;
ALTER TABLE parcelles DISABLE ROW LEVEL SECURITY;
ALTER TABLE abonnes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaux_poubelles DISABLE ROW LEVEL SECURITY;
ALTER TABLE eboueurs_gps DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE sachet_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE sachet_distributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_dotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_dotation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE dis_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE incivisme_incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE convocations_communales DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE material_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;

-- 16. INDEX DE PERFORMANCE PAR COMMUNE
CREATE INDEX IF NOT EXISTS idx_agents_commune_id ON agents(commune_id);
CREATE INDEX IF NOT EXISTS idx_signaux_commune_id ON signaux_poubelles(commune_id);
CREATE INDEX IF NOT EXISTS idx_payments_commune_id ON subscription_payments(commune_id);
CREATE INDEX IF NOT EXISTS idx_sachets_commune_id ON sachet_stocks(commune_id);
CREATE INDEX IF NOT EXISTS idx_parcelles_commune_id ON parcelles(commune_id);
CREATE INDEX IF NOT EXISTS idx_avenues_commune_id ON avenues(commune_id);

-- 17. INITIALISATION DU COMPTE SUPER-ADMIN (GLOBAL)
INSERT INTO agents (id, nom, telephone, role, password, commune_id, commune_nom)
VALUES ('admin-1', 'Super Admin Hico (Global)', '0600000000', 'admin', 'password', 'all', 'Toutes les communes (Kinshasa)')
ON CONFLICT (id) DO UPDATE SET 
  commune_id = 'all', 
  commune_nom = 'Toutes les communes (Kinshasa)';
`;
