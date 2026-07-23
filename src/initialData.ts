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

const rawBarumbuAvenues: { nom: string; quartier: string }[] = [
  // Bitshaku Tshaku
  { nom: 'Avenue Bas-Congo', quartier: 'Bitshaku Tshaku' },
  { nom: 'Avenue de la Lowa', quartier: 'Bitshaku Tshaku' },
  { nom: 'Avenue de la Tshuapa', quartier: 'Bitshaku Tshaku' },
  { nom: 'Avenue du Kasaï', quartier: 'Bitshaku Tshaku' },
  { nom: 'Avenue Itaga', quartier: 'Bitshaku Tshaku' },
  { nom: 'Avenue Kato', quartier: 'Bitshaku Tshaku' },
  { nom: 'Avenue Lokele', quartier: 'Bitshaku Tshaku' },
  { nom: 'Avenue Mbomu', quartier: 'Bitshaku Tshaku' },
  { nom: 'Avenue Rwakadingi', quartier: 'Bitshaku Tshaku' },
  { nom: 'Avenue Usoke', quartier: 'Bitshaku Tshaku' },
  { nom: 'Rue de la Luvua', quartier: 'Bitshaku Tshaku' },
  { nom: 'Rue du lac Moero', quartier: 'Bitshaku Tshaku' },

  // Funa I
  { nom: "Avenue de l'Aérodrome", quartier: 'Funa I' },
  { nom: 'Avenue du Kasaï', quartier: 'Funa I' },
  { nom: 'Bobanga', quartier: 'Funa I' },
  { nom: 'Rue de Mbanza-Ngungu', quartier: 'Funa I' },
  { nom: 'Rue de Songololo', quartier: 'Funa I' },
  { nom: 'Rue de Tshela', quartier: 'Funa I' },
  { nom: 'Rue Disasi', quartier: 'Funa I' },
  { nom: 'Rue Jaques Mokelenge', quartier: 'Funa I' },
  { nom: 'Rue Tobo', quartier: 'Funa I' },

  // Funa II
  { nom: 'Avenue Luambo Makiadi', quartier: 'Funa II' },
  { nom: 'Boulevard Lumumba', quartier: 'Funa II' },

  // Kapinga (Kapinga Bapu)
  { nom: "Avenue de l'Aérodrome", quartier: 'Kapinga (Kapinga Bapu)' },
  { nom: 'Avenue Kabambare', quartier: 'Kapinga (Kapinga Bapu)' },

  // Kasaï
  { nom: 'Avenue Bas-Congo', quartier: 'Kasaï' },
  { nom: 'Avenue de Kapanga', quartier: 'Kasaï' },
  { nom: 'Avenue Lokele', quartier: 'Kasaï' },
  { nom: 'Rue de Kibate', quartier: 'Kasaï' },
  { nom: 'Rue de Kindu', quartier: 'Kasaï' },
  { nom: 'Rue de Luvungi', quartier: 'Kasaï' },

  // Libulu
  { nom: 'Avenue Bas-Congo', quartier: 'Libulu' },
  { nom: 'Avenue de Kilosa', quartier: 'Libulu' },
  { nom: 'Avenue de la Croix Rouge', quartier: 'Libulu' },
  { nom: 'Avenue Dodoma', quartier: 'Libulu' },
  { nom: 'Avenue du Kasaï', quartier: 'Libulu' },
  { nom: 'Avenue Kabalo', quartier: 'Libulu' },
  { nom: 'Avenue Kalembelembe', quartier: 'Libulu' },
  { nom: 'Avenue Kigoma', quartier: 'Libulu' },
  { nom: 'Avenue Kitega', quartier: 'Libulu' },
  { nom: 'Avenue Lokele', quartier: 'Libulu' },
  { nom: 'Avenue Luambo Makiadi', quartier: 'Libulu' },
  { nom: 'Rue de Baraka', quartier: 'Libulu' },
  { nom: 'Rue de Luapula', quartier: 'Libulu' },
  { nom: 'Rue de Mahenge', quartier: 'Libulu' },
  { nom: 'Rue de Nyanza', quartier: 'Libulu' },

  // Mozindo
  { nom: 'Avenue de la Croix Rouge', quartier: 'Mozindo' },
  { nom: 'Avenue de la Pharmacie', quartier: 'Mozindo' },
  { nom: 'Avenue du Canal', quartier: 'Mozindo' },
  { nom: 'Avenue Itaga', quartier: 'Mozindo' },

  // Ndolo
  { nom: 'Avenue de la Commune', quartier: 'Ndolo' },
  { nom: 'Avenue de la Pharmacie', quartier: 'Ndolo' },
  { nom: 'Avenue de la Prison', quartier: 'Ndolo' },
  { nom: "Avenue de l'Aérodrome", quartier: 'Ndolo' },
  { nom: 'Avenue du Canal', quartier: 'Ndolo' },
  { nom: 'Avenue du Parti', quartier: 'Ndolo' },
  { nom: 'Avenue du Pont', quartier: 'Ndolo' },
  { nom: 'Avenue du Progrès', quartier: 'Ndolo' },
  { nom: 'Avenue Kabalo', quartier: 'Ndolo' },
  { nom: 'Avenue Kabambare', quartier: 'Ndolo' },
  { nom: 'Avenue Kabasele Tshiamala Joseph', quartier: 'Ndolo' },
  { nom: 'Avenue Kasaï', quartier: 'Ndolo' },
  { nom: 'Aviation', quartier: 'Ndolo' },
  { nom: 'Echevin', quartier: 'Ndolo' },
  { nom: 'Epolo', quartier: 'Ndolo' },
  { nom: 'Essandja', quartier: 'Ndolo' },
  { nom: 'Inventeur Kabasele Mwamba', quartier: 'Ndolo' },
  { nom: 'Rue de Luvungi', quartier: 'Ndolo' },

  // Tshimanga
  { nom: "Avenue d'Udjidji", quartier: 'Tshimanga' },
  { nom: 'Avenue de Goma', quartier: 'Tshimanga' },
  { nom: 'Avenue de Kabolo', quartier: 'Tshimanga' },
  { nom: 'Avenue de Kananga', quartier: 'Tshimanga' },
  { nom: 'Avenue de Kasongo', quartier: 'Tshimanga' },
  { nom: 'Avenue de Rutshuru', quartier: 'Tshimanga' },
  { nom: 'Avenue de Tabora', quartier: 'Tshimanga' },
  { nom: 'Avenue des Vieillards', quartier: 'Tshimanga' },
  { nom: 'Avenue du Canal', quartier: 'Tshimanga' },
  { nom: 'Avenue du Syndicat', quartier: 'Tshimanga' },
  { nom: 'Avenue Itaga', quartier: 'Tshimanga' },
  { nom: 'Avenue Kwango', quartier: 'Tshimanga' },
  { nom: 'Avenue Sonabata', quartier: 'Tshimanga' }
];

export const INITIAL_AVENUES: Avenue[] = rawBarumbuAvenues.map((item, index) => ({
  id: `av-barumbu-${index + 1}`,
  commune_id: 'c-barumbu',
  nom: item.nom,
  quartier: item.quartier,
  created_at: new Date('2026-06-01').toISOString()
}));

export const INITIAL_PARCELLES: Parcelle[] = [];

export const INITIAL_ABONNES: Abonne[] = [];

// Seed basic parameters corresponding exactly to mockup indicators + dynamic updates
export const BASE_COMMUNES_COUNT = 0;
export const BASE_AVENUES_COUNT = 0;
export const BASE_PARCELLES_COUNT = 0;
export const BASE_MENAGES_COUNT = 0;
export const BASE_ABONNES_COUNT = 0;
