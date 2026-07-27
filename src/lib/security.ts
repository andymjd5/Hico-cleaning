/**
 * Hico-Cleaning Security Utility Module
 * Defensive controls against XSS, Injection, Rate-Limiting, Password Security, and Local Storage Tampering.
 */

// 1. XSS Input Sanitizer & Escaper
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Clean text for display/search without dangerous control characters or scripts
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') return '';
  // Strip potential script tags or inline events
  const cleaned = text
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onclick=/gi, '');
  return cleaned.trim().slice(0, maxLength);
}

// 2. Strict Input Validators
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // Validates RDC formats: e.g., 0812345678, +243812345678, 0991234567, 082..., 084...
  const phoneRegex = /^(?:\+243|00243|0)[89][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

export function validateCodeParcelle(code: string): boolean {
  if (!code) return false;
  // Example format: KIN-GOM-001 or length 3-30 alphanumeric with hyphens
  const codeRegex = /^[A-Z0-9\-_]{3,30}$/i;
  return codeRegex.test(code.trim());
}

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0 to 4
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    feedback.push('Le mot de passe doit contenir au moins 8 caractères.');
  } else {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Inclure au moins une lettre majuscule.');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Inclure au moins un chiffre.');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Inclure au moins un caractère spécial (!@#$%^&*...).');
  }

  return {
    isValid: password.length >= 8 && score >= 2,
    score,
    feedback,
  };
}

// 3. Client-Side Rate Limiter (Anti Brute-Force & Anti-Spam)
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(actionKey: string, maxAttempts: number = 5, windowMs: number = 60000): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const record = this.attempts.get(actionKey);

    if (!record || now > record.resetTime) {
      this.attempts.set(actionKey, { count: 1, resetTime: now + windowMs });
      return { allowed: true };
    }

    if (record.count >= maxAttempts) {
      return { allowed: false, retryAfterMs: record.resetTime - now };
    }

    record.count += 1;
    this.attempts.set(actionKey, record);
    return { allowed: true };
  }

  reset(actionKey: string) {
    this.attempts.delete(actionKey);
  }
}

export const rateLimiter = new RateLimiter();

// 4. Secure Session & Permissions Storage Validation
export function getSecureRolePermissions(userRole: string, defaultPerms: Record<string, string[]>): string[] {
  try {
    const raw = localStorage.getItem('hico_role_permissions');
    if (!raw) return defaultPerms[userRole] || [];
    
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed || !Array.isArray(parsed[userRole])) {
      return defaultPerms[userRole] || [];
    }

    // Filter permissions to ensure no unknown/injected screen identifiers exist
    const allowedKnownScreens = new Set([
      'dashboard', 'communes', 'avenues', 'recensement_form', 'abonne_list', 
      'abonne_detail', 'rapports', 'commune_explorer', 'dechets_map', 
      'sachets_management', 'finance_management', 'support', 'abonne_space', 
      'eboueur_space', 'admin_settings_screens', 'admin_settings_pricing', 
      'admin_settings_accounts', 'admin_settings_passwords'
    ]);

    return parsed[userRole].filter((screen: unknown) => typeof screen === 'string' && allowedKnownScreens.has(screen));
  } catch (e) {
    console.warn('[SECURITY] Erreur de lecture des permissions, repli sur les permissions par défaut.', e);
    return defaultPerms[userRole] || [];
  }
}
