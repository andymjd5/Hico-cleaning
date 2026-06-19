import { Commune, Avenue, Parcelle, Abonne, Agent } from './types';

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    nom: 'Jean Malonga',
    telephone: '0612345678', // can be written as 0612345678 or formatted
    role: 'agent',
    created_at: new Date('2026-05-01').toISOString()
  },
  {
    id: 'admin-1',
    nom: 'Hico Admin',
    telephone: '0600000000',
    role: 'admin',
    created_at: new Date('2026-05-01').toISOString()
  }
];

export const INITIAL_COMMUNES: Commune[] = [
  { id: 'c-bandalungwa', nom: 'Bandalungwa', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-barumbu', nom: 'Barumbu', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-bumbu', nom: 'Bumbu', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-gombe', nom: 'Gombe', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-kalamu', nom: 'Kalamu', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-kasa-vubu', nom: 'Kasa-Vubu', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-kimbanseke', nom: 'Kimbanseke', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-kinshasa', nom: 'Kinshasa', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-kintambo', nom: 'Kintambo', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-kisenso', nom: 'Kisenso', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-lemba', nom: 'Lemba', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-limete', nom: 'Limete', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-lingwala', nom: 'Lingwala', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-makala', nom: 'Makala', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-maluku', nom: 'Maluku', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-masina', nom: 'Masina', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-matete', nom: 'Matete', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-mont-ngafula', nom: 'Mont-Ngafula', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-ndjili', nom: 'Ndjili', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-ngaba', nom: 'Ngaba', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-ngaliema', nom: 'Ngaliema', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-ngiringiri', nom: 'Ngiri-Ngiri', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-nsele', nom: 'Nsele', created_at: new Date('2026-06-01').toISOString() },
  { id: 'c-selembao', nom: 'Selembao', created_at: new Date('2026-06-01').toISOString() }
];

export const INITIAL_AVENUES: Avenue[] = [];

export const INITIAL_PARCELLES: Parcelle[] = [];

export const INITIAL_ABONNES: Abonne[] = [];

// Seed basic parameters corresponding exactly to mockup indicators + dynamic updates
export const BASE_COMMUNES_COUNT = 0;
export const BASE_AVENUES_COUNT = 0;
export const BASE_PARCELLES_COUNT = 0;
export const BASE_MENAGES_COUNT = 0;
export const BASE_ABONNES_COUNT = 0;
