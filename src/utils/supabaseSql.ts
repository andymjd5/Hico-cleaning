// Script SQL d'initialisation, de migration et de correction Supabase pour Hico-Cleaning Kinshasa
// Résout définitivement l'erreur 42703 (colonne commune_id manquante) sur toutes les tables existantes et nouvelles

export const HICO_COMPLETE_SUPABASE_SQL = `-- =========================================================================
-- HICO-CLEANING KINSHASA : SCRIPT SQL UNIFIÉ SANS ERREUR (RÉSOLUTION ERREUR 42703)
-- Résout l'erreur 42703 (la colonne « commune_id » n'existe pas) en ajoutant
-- automatiquement la colonne 'commune_id' et 'commune_nom' à TOUTES les tables.
-- =========================================================================

-- ÉTAPE 0 : MIGRATION UNIVERSELLE AUTOMATIQUE (AJOUT SÉCURISÉ DE COMMUNE_ID SUR TOUTES LES TABLES EXISTANTES)
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'communes', 'avenues', 'parcelles', 'abonnes', 'agents', 
    'signaux_poubelles', 'eboueurs_gps', 'subscription_payments', 
    'sachet_stocks', 'sachet_distributions', 'agent_dotations', 
    'agent_dotation_logs', 'dispute_signals', 'dis_signals', 
    'incivisme_incidents', 'convocations_communales', 'support_tickets', 
    'inbox_messages', 'messages_plateforme', 'validations_locataires', 
    'staff_payments', 'material_expenses', 'system_settings'
  ];
BEGIN
  FOR t IN SELECT unnest(all_tables) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'commune_id') THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN commune_id TEXT', t);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'commune_nom') THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN commune_nom TEXT', t);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 1. Table COMMUNES (24 communes de Kinshasa)
CREATE TABLE IF NOT EXISTS communes (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  commune_id TEXT,
  commune_nom TEXT,
  population INTEGER DEFAULT 0,
  superficie NUMERIC DEFAULT 0,
  densite NUMERIC DEFAULT 0,
  centre_lat NUMERIC DEFAULT -4.325,
  centre_lng NUMERIC DEFAULT 15.322,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE communes ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS commune_nom TEXT;
UPDATE communes SET commune_id = id WHERE commune_id IS NULL OR commune_id = '';
UPDATE communes SET commune_nom = nom WHERE commune_nom IS NULL OR commune_nom = '';

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
ALTER TABLE abonnes ADD COLUMN IF NOT EXISTS telephone_principal TEXT;
ALTER TABLE abonnes ADD COLUMN IF NOT EXISTS telephone_secondaire TEXT;

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
  id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  en_service BOOLEAN DEFAULT TRUE,
  derniere_mise_a_jour TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE eboueurs_gps ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE eboueurs_gps ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE eboueurs_gps ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE eboueurs_gps ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE eboueurs_gps ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE eboueurs_gps ADD COLUMN IF NOT EXISTS en_service BOOLEAN DEFAULT TRUE;

-- 8. Table SUBSCRIPTION_PAYMENTS (Redevance & Facturation)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  parcelle_id TEXT,
  abonne_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  nom_complet TEXT,
  montant NUMERIC DEFAULT 10,
  amount NUMERIC DEFAULT 10,
  currency TEXT DEFAULT 'USD',
  month TEXT,
  year INTEGER,
  payment_method TEXT DEFAULT 'Airtel Money',
  mode_paiement TEXT DEFAULT 'Airtel Money',
  telephone_payeur TEXT,
  status TEXT DEFAULT 'success',
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS parcelle_id TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS abonne_id TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS nom_complet TEXT;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS montant NUMERIC DEFAULT 10;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 10;
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS date_paiement TIMESTAMPTZ DEFAULT NOW();

-- 9. Table SACHET_STOCKS & DISTRIBUTIONS (Gestion des stocks et dotations)
CREATE TABLE IF NOT EXISTS sachet_stocks (
  commune_id TEXT PRIMARY KEY,
  id TEXT,
  commune_nom TEXT,
  bio_disponibles INTEGER DEFAULT 1000,
  non_bio_disponibles INTEGER DEFAULT 1000,
  bio_distribues INTEGER DEFAULT 0,
  non_bio_distribues INTEGER DEFAULT 0,
  biodegradable INTEGER DEFAULT 1000,
  non_biodegradable INTEGER DEFAULT 1000,
  seuil_alerte INTEGER DEFAULT 10,
  last_replenished TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS bio_disponibles INTEGER DEFAULT 1000;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS non_bio_disponibles INTEGER DEFAULT 1000;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS bio_distribues INTEGER DEFAULT 0;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS non_bio_distribues INTEGER DEFAULT 0;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS biodegradable INTEGER DEFAULT 1000;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS non_biodegradable INTEGER DEFAULT 1000;
ALTER TABLE sachet_stocks ADD COLUMN IF NOT EXISTS seuil_alerte INTEGER DEFAULT 10;

CREATE TABLE IF NOT EXISTS sachet_distributions (
  id TEXT PRIMARY KEY,
  commune_id TEXT,
  commune_nom TEXT,
  parcelle_id TEXT,
  avenue_id TEXT,
  abonne_id TEXT,
  bailleur_nom TEXT,
  bio_qty INTEGER DEFAULT 0,
  non_bio_qty INTEGER DEFAULT 0,
  quantite_biodegradable INTEGER DEFAULT 0,
  quantite_non_biodegradable INTEGER DEFAULT 0,
  distribue_par_id TEXT,
  distribue_par_nom TEXT,
  distribue_par TEXT,
  eboueur_id TEXT,
  date_distribution TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sachet_distributions ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE sachet_distributions ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE sachet_distributions ADD COLUMN IF NOT EXISTS avenue_id TEXT;
ALTER TABLE sachet_distributions ADD COLUMN IF NOT EXISTS parcelle_id TEXT;
ALTER TABLE sachet_distributions ADD COLUMN IF NOT EXISTS abonne_id TEXT;
ALTER TABLE sachet_distributions ADD COLUMN IF NOT EXISTS quantite_biodegradable INTEGER DEFAULT 0;
ALTER TABLE sachet_distributions ADD COLUMN IF NOT EXISTS quantite_non_biodegradable INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS agent_dotations (
  agent_id TEXT PRIMARY KEY,
  id TEXT,
  agent_nom TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  bio_stock INTEGER DEFAULT 0,
  non_bio_stock INTEGER DEFAULT 0,
  biodegradable INTEGER DEFAULT 0,
  non_biodegradable INTEGER DEFAULT 0,
  last_assigned TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agent_dotations ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE agent_dotations ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE agent_dotations ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE agent_dotations ADD COLUMN IF NOT EXISTS biodegradable INTEGER DEFAULT 0;
ALTER TABLE agent_dotations ADD COLUMN IF NOT EXISTS non_biodegradable INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS agent_dotation_logs (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  agent_nom TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  bio_qty INTEGER DEFAULT 0,
  non_bio_qty INTEGER DEFAULT 0,
  biodegradable INTEGER DEFAULT 0,
  non_biodegradable INTEGER DEFAULT 0,
  type TEXT DEFAULT 'recharge',
  attribue_par TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agent_dotation_logs ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE agent_dotation_logs ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE agent_dotation_logs ADD COLUMN IF NOT EXISTS agent_nom TEXT;

-- 10. Table DISPUTE_SIGNALS & DIS_SIGNALS (Contentieux & Litiges)
CREATE TABLE IF NOT EXISTS dispute_signals (
  id TEXT PRIMARY KEY,
  abonne_id TEXT,
  parcelle_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  nom_complet TEXT,
  telephone TEXT,
  montant_du NUMERIC DEFAULT 10,
  raison TEXT,
  date_constat TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dispute_signals ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE dispute_signals ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE dispute_signals ADD COLUMN IF NOT EXISTS nom_complet TEXT;
ALTER TABLE dispute_signals ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE dispute_signals ADD COLUMN IF NOT EXISTS montant_du NUMERIC DEFAULT 10;
ALTER TABLE dispute_signals ADD COLUMN IF NOT EXISTS reminders_sent INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS dis_signals (
  id TEXT PRIMARY KEY,
  abonne_id TEXT,
  parcelle_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  nom_complet TEXT,
  telephone TEXT,
  montant_du NUMERIC DEFAULT 10,
  raison TEXT,
  date_constat TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  reminders_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dis_signals ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE dis_signals ADD COLUMN IF NOT EXISTS commune_nom TEXT;

-- 11. Table INCIVISME_INCIDENTS & CONVOCATIONS (Bourgmestres & Police)
CREATE TABLE IF NOT EXISTS incivisme_incidents (
  id TEXT PRIMARY KEY,
  commune_id TEXT,
  commune_nom TEXT,
  parcelle_id TEXT,
  abonne_id TEXT,
  bailleur_nom TEXT,
  bailleur_telephone TEXT,
  numero_parcelle TEXT,
  avenue_nom TEXT,
  avenue TEXT,
  quartier TEXT,
  description TEXT,
  type_infraction TEXT,
  gravite TEXT DEFAULT 'moyenne',
  auteur_presume TEXT,
  statut TEXT DEFAULT 'signale',
  photo_url TEXT,
  date_incident TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE incivisme_incidents ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE incivisme_incidents ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE incivisme_incidents ADD COLUMN IF NOT EXISTS parcelle_id TEXT;
ALTER TABLE incivisme_incidents ADD COLUMN IF NOT EXISTS type_infraction TEXT;

CREATE TABLE IF NOT EXISTS convocations_communales (
  id TEXT PRIMARY KEY,
  incident_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  parcelle_id TEXT,
  numero_parcelle TEXT,
  avenue_nom TEXT,
  destinataire_nom TEXT,
  destinataire_telephone TEXT,
  motif TEXT,
  date_convocation TIMESTAMPTZ,
  date_emission TIMESTAMPTZ DEFAULT NOW(),
  date_comparution TEXT,
  heure_comparution TEXT,
  lieu_comparution TEXT,
  statut TEXT DEFAULT 'emise',
  officier_traitant TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE convocations_communales ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE convocations_communales ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE convocations_communales ADD COLUMN IF NOT EXISTS incident_id TEXT;

-- 12. Table SUPPORT_TICKETS & INBOX_MESSAGES
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_nom TEXT,
  user_role TEXT,
  auteur_nom TEXT,
  auteur_telephone TEXT,
  auteur_role TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  sujet TEXT,
  description TEXT,
  message TEXT,
  categorie TEXT DEFAULT 'reclamation',
  statut TEXT DEFAULT 'ouvert',
  status TEXT DEFAULT 'nouveau',
  priorite TEXT DEFAULT 'normale',
  reponse_support TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS auteur_nom TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS auteur_telephone TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sujet TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nouveau';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS reponse_support TEXT;

CREATE TABLE IF NOT EXISTS inbox_messages (
  id TEXT PRIMARY KEY,
  expediteur_id TEXT,
  expediteur_nom TEXT,
  destinataire_id TEXT,
  destinataire_role TEXT,
  sender TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  titre TEXT,
  contenu TEXT,
  content TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();

-- 13. Table STAFF_PAYMENTS & MATERIAL_EXPENSES
CREATE TABLE IF NOT EXISTS staff_payments (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  staff_name TEXT,
  staff_role TEXT,
  recipient_id TEXT,
  recipient_name TEXT,
  recipient_role TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  amount NUMERIC DEFAULT 0,
  montant NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  month TEXT,
  year INTEGER,
  status TEXT DEFAULT 'paid',
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE staff_payments ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE staff_payments ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE staff_payments ADD COLUMN IF NOT EXISTS recipient_id TEXT;
ALTER TABLE staff_payments ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE staff_payments ADD COLUMN IF NOT EXISTS montant NUMERIC DEFAULT 0;
ALTER TABLE staff_payments ADD COLUMN IF NOT EXISTS date_paiement TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS material_expenses (
  id TEXT PRIMARY KEY,
  description TEXT,
  label TEXT,
  category TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  amount NUMERIC DEFAULT 0,
  montant NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  expense_date TIMESTAMPTZ DEFAULT NOW(),
  date_depense TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE material_expenses ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE material_expenses ADD COLUMN IF NOT EXISTS commune_nom TEXT;
ALTER TABLE material_expenses ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE material_expenses ADD COLUMN IF NOT EXISTS montant NUMERIC DEFAULT 0;
ALTER TABLE material_expenses ADD COLUMN IF NOT EXISTS date_depense TIMESTAMPTZ DEFAULT NOW();

-- 14. Table SYSTEM_SETTINGS & VALIDATIONS LOCATAIRES & MESSAGES
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  commune_id TEXT DEFAULT 'all',
  commune_nom TEXT DEFAULT 'Toutes les communes (Kinshasa)',
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS commune_id TEXT DEFAULT 'all';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS commune_nom TEXT DEFAULT 'Toutes les communes (Kinshasa)';

CREATE TABLE IF NOT EXISTS validations_locataires (
  id TEXT PRIMARY KEY,
  bailleur_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  mois_annee TEXT,
  locataires_payes INTEGER DEFAULT 0,
  paiement_effectue BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE validations_locataires ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE validations_locataires ADD COLUMN IF NOT EXISTS commune_nom TEXT;

CREATE TABLE IF NOT EXISTS messages_plateforme (
  id TEXT PRIMARY KEY,
  expediteur TEXT DEFAULT 'Hico-Cleaning',
  titre TEXT,
  contenu TEXT,
  destinataire_role TEXT DEFAULT 'bailleur',
  destinataire_id TEXT,
  commune_id TEXT,
  commune_nom TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages_plateforme ADD COLUMN IF NOT EXISTS commune_id TEXT;
ALTER TABLE messages_plateforme ADD COLUMN IF NOT EXISTS commune_nom TEXT;

-- 15. DÉSACTIVATION UNIVERSELLE DU ROW LEVEL SECURITY (RLS) POUR ACCÈS TRANSPARENT
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'communes', 'avenues', 'parcelles', 'abonnes', 'agents', 
    'signaux_poubelles', 'eboueurs_gps', 'subscription_payments', 
    'sachet_stocks', 'sachet_distributions', 'agent_dotations', 
    'agent_dotation_logs', 'dispute_signals', 'dis_signals', 
    'incivisme_incidents', 'convocations_communales', 'support_tickets', 
    'inbox_messages', 'messages_plateforme', 'validations_locataires', 
    'staff_payments', 'material_expenses', 'system_settings'
  ];
BEGIN
  FOR t IN SELECT unnest(all_tables) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- 16. CRÉATION SÉCURISÉE DES INDEX DE PERFORMANCE PAR COMMUNE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'commune_id') THEN
    CREATE INDEX IF NOT EXISTS idx_agents_commune_id ON public.agents(commune_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'signaux_poubelles' AND column_name = 'commune_id') THEN
    CREATE INDEX IF NOT EXISTS idx_signaux_commune_id ON public.signaux_poubelles(commune_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscription_payments' AND column_name = 'commune_id') THEN
    CREATE INDEX IF NOT EXISTS idx_payments_commune_id ON public.subscription_payments(commune_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sachet_stocks' AND column_name = 'commune_id') THEN
    CREATE INDEX IF NOT EXISTS idx_sachets_commune_id ON public.sachet_stocks(commune_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parcelles' AND column_name = 'commune_id') THEN
    CREATE INDEX IF NOT EXISTS idx_parcelles_commune_id ON public.parcelles(commune_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'avenues' AND column_name = 'commune_id') THEN
    CREATE INDEX IF NOT EXISTS idx_avenues_commune_id ON public.avenues(commune_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'communes' AND column_name = 'commune_id') THEN
    CREATE INDEX IF NOT EXISTS idx_communes_commune_id ON public.communes(commune_id);
  END IF;
END $$;

-- 17. INITIALISATION DES 24 COMMUNES DE KINSHASA (AVEC ID ET COMMUNE_ID)
INSERT INTO communes (id, nom, population, superficie, densite, centre_lat, centre_lng, commune_id, commune_nom) VALUES
('c-bandalungwa', 'Bandalungwa', 250000, 6.82, 36656, -4.3317, 15.2811, 'c-bandalungwa', 'Bandalungwa'),
('c-barumbu', 'Barumbu', 180000, 4.72, 38135, -4.3125, 15.3186, 'c-barumbu', 'Barumbu'),
('c-bumbu', 'Bumbu', 450000, 5.3, 84905, -4.3792, 15.2958, 'c-bumbu', 'Bumbu'),
('c-gombe', 'Gombe', 50000, 29.33, 1704, -4.3033, 15.3056, 'c-gombe', 'Gombe'),
('c-kalamu', 'Kalamu', 350000, 6.64, 52710, -4.3431, 15.3139, 'c-kalamu', 'Kalamu'),
('c-kasa-vubu', 'Kasa-Vubu', 200000, 5.05, 39603, -4.3356, 15.3083, 'c-kasa-vubu', 'Kasa-Vubu'),
('c-kimbanseke', 'Kimbanseke', 1500000, 237.78, 6308, -4.4372, 15.3858, 'c-kimbanseke', 'Kimbanseke'),
('c-kinshasa', 'Kinshasa', 190000, 2.87, 66202, -4.3211, 15.3131, 'c-kinshasa', 'Kinshasa'),
('c-kintambo', 'Kintambo', 130000, 3.9, 33333, -4.3278, 15.2750, 'c-kintambo', 'Kintambo'),
('c-kisenso', 'Kisenso', 500000, 16.63, 30066, -4.4167, 15.3333, 'c-kisenso', 'Kisenso'),
('c-lemba', 'Lemba', 400000, 23.70, 16877, -4.3847, 15.3278, 'c-lemba', 'Lemba'),
('c-limete', 'Limete', 450000, 67.46, 6670, -4.3514, 15.3403, 'c-limete', 'Limete'),
('c-lingwala', 'Lingwala', 120000, 2.88, 41666, -4.3167, 15.2972, 'c-lingwala', 'Lingwala'),
('c-makala', 'Makala', 300000, 5.6, 53571, -4.3708, 15.3083, 'c-makala', 'Makala'),
('c-maluku', 'Maluku', 250000, 7948.8, 31, -4.0833, 16.0833, 'c-maluku', 'Maluku'),
('c-masina', 'Masina', 800000, 69.93, 11440, -4.3833, 15.3833, 'c-masina', 'Masina'),
('c-matete', 'Matete', 350000, 4.88, 71721, -4.3833, 15.3500, 'c-matete', 'Matete'),
('c-mont-ngafula', 'Mont-Ngafula', 600000, 358.92, 1671, -4.4333, 15.2667, 'c-mont-ngafula', 'Mont-Ngafula'),
('c-ndjili', 'Ndjili', 500000, 11.4, 43859, -4.4167, 15.3667, 'c-ndjili', 'Ndjili'),
('c-ngaba', 'Ngaba', 220000, 4.0, 55000, -4.3750, 15.3250, 'c-ngaba', 'Ngaba'),
('c-ngaliema', 'Ngaliema', 850000, 224.3, 3789, -4.3500, 15.2500, 'c-ngaliema', 'Ngaliema'),
('c-ngiringiri', 'Ngiri-Ngiri', 210000, 3.4, 61764, -4.3417, 15.2972, 'c-ngiringiri', 'Ngiri-Ngiri'),
('c-nsele', 'Nsele', 400000, 898.79, 445, -4.2667, 15.5500, 'c-nsele', 'Nsele'),
('c-selembao', 'Selembao', 450000, 23.18, 19413, -4.3833, 15.2667, 'c-selembao', 'Selembao')
ON CONFLICT (id) DO UPDATE SET 
  nom = EXCLUDED.nom,
  commune_id = EXCLUDED.id,
  commune_nom = EXCLUDED.nom;

-- 18. INITIALISATION DU COMPTE SUPER-ADMIN (GLOBAL KINSHASA)
INSERT INTO agents (id, nom, telephone, role, password, commune_id, commune_nom)
VALUES ('admin-1', 'Super Admin Hico (Global)', '0600000000', 'admin', 'password', 'all', 'Toutes les communes (Kinshasa)')
ON CONFLICT (id) DO UPDATE SET 
  nom = EXCLUDED.nom,
  role = 'admin',
  password = 'password',
  commune_id = 'all', 
  commune_nom = 'Toutes les communes (Kinshasa)';
`;

