import { Agent, Commune } from '../types';

/**
 * Checks if a user is a Global Administrator (has access to all 24 communes of Kinshasa)
 */
export function isUserGlobalAdmin(user?: Agent | null): boolean {
  if (!user) return true;
  
  // If user role is not admin/bourgmestre/agent/etc with a specific commune, check commune_id
  if (!user.commune_id || user.commune_id === 'all' || user.commune_id === 'global' || user.commune_id === '') {
    return true;
  }

  const nomClean = (user.commune_nom || '').toLowerCase().trim();
  if (nomClean === 'toutes les communes' || nomClean.includes('toutes') || nomClean === 'global') {
    return true;
  }

  return false;
}

/**
 * Resolves the assigned Commune object for a user if scoped
 */
export function getUserAssignedCommune(user?: Agent | null, communes: Commune[] = []): Commune | null {
  if (!user || isUserGlobalAdmin(user)) return null;

  if (user.commune_id) {
    const foundById = communes.find(c => c.id.toLowerCase() === user.commune_id?.toLowerCase());
    if (foundById) return foundById;
  }

  if (user.commune_nom) {
    const foundByName = communes.find(c => 
      c.nom.toLowerCase().trim() === user.commune_nom?.toLowerCase().trim()
    );
    if (foundByName) return foundByName;
  }

  return null;
}

/**
 * Checks if a specific item/entity (with a commune_id and/or commune_nom) matches the user's assigned commune scope.
 */
export function isEntityInUserCommuneScope(
  itemCommuneId?: string | null,
  itemCommuneNom?: string | null,
  user?: Agent | null,
  communes: Commune[] = []
): boolean {
  // If user is a global admin or has no specific commune assigned, they see everything
  if (isUserGlobalAdmin(user)) {
    return true;
  }

  const userCommId = (user?.commune_id || '').toLowerCase().trim();
  const userCommNom = (user?.commune_nom || '').toLowerCase().trim();

  // Resolve user commune object if possible
  const assignedCommune = getUserAssignedCommune(user, communes);
  const assignedCommId = assignedCommune ? assignedCommune.id.toLowerCase().trim() : userCommId;
  const assignedCommNom = assignedCommune ? assignedCommune.nom.toLowerCase().trim() : userCommNom;

  const targetCommId = (itemCommuneId || '').toLowerCase().trim();
  const targetCommNom = (itemCommuneNom || '').toLowerCase().trim();

  // Direct ID match
  if (targetCommId && (targetCommId === userCommId || targetCommId === assignedCommId)) {
    return true;
  }

  // Name match
  if (targetCommNom && (targetCommNom === userCommNom || targetCommNom === assignedCommNom)) {
    return true;
  }

  // Substring or slug matches (e.g., 'c-gombe' vs 'gombe')
  if (targetCommId && (targetCommId.includes(assignedCommNom) || assignedCommId.includes(targetCommNom))) {
    return true;
  }
  if (targetCommNom && assignedCommNom && (targetCommNom.includes(assignedCommNom) || assignedCommNom.includes(targetCommNom))) {
    return true;
  }

  // If item only has an ID, look up its commune name in communes list
  if (targetCommId && communes.length > 0) {
    const itemCommune = communes.find(c => c.id.toLowerCase() === targetCommId);
    if (itemCommune) {
      const itemNom = itemCommune.nom.toLowerCase().trim();
      if (itemNom === assignedCommNom || itemNom === userCommNom) {
        return true;
      }
    }
  }

  return false;
}
