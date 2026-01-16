/**
 * Label-specific validation and cleaning utilities
 */

export interface ValidationResult {
  isValid: boolean;
  cleaned: string;
  reason?: string;
}

/**
 * Validate and clean a generated string based on its label type
 */
export function validateForLabel(label: string, value: string): ValidationResult {
  if (!value || value.length === 0) {
    return { isValid: false, cleaned: '', reason: 'Empty value' };
  }

  // Get label-specific validator
  const validator = getValidatorForLabel(label);
  return validator(value);
}

/**
 * Get validator function for a specific label
 */
function getValidatorForLabel(label: string): (value: string) => ValidationResult {
  switch (label) {
    case 'first_name':
    case 'last_name':
      return validateName;
    case 'phone_number':
      return validatePhoneNumber;
    case 'email':
      return validateEmail;
    case 'street_address':
      return validateStreetAddress;
    case 'city':
    case 'state':
    case 'country':
      return validateLocation;
    case 'company_name':
    case 'job_title':
    case 'product_name':
      return validateText;
    case 'color':
      return validateColor;
    case 'uuid':
      return validateUUID;
    case 'date':
      return validateDate;
    case 'credit_card_type':
    case 'device_type':
      return validateText;
    default:
      return validateGeneric;
  }
}

/**
 * Validate name (first_name, last_name)
 * Rules: Letters only, optional hyphens/apostrophes, no numbers
 */
function validateName(value: string): ValidationResult {
  // First check for placeholder patterns in original value (before cleaning)
  const lowerOriginal = value.toLowerCase();
  // Reject "Name" followed by numbers (e.g., "Name97", "name123")
  if (/^name\d+$/i.test(value)) {
    return { isValid: false, cleaned: '', reason: 'Placeholder name with numbers' };
  }
  
  // Remove all non-letter characters except hyphens and apostrophes
  let cleaned = value.replace(/[^a-zA-Z\-\'\s]/g, '');
  
  // Remove numbers completely
  cleaned = cleaned.replace(/[0-9]/g, '');
  
  // Remove excessive special characters
  cleaned = cleaned.replace(/[-']{2,}/g, '-'); // Multiple hyphens/apostrophes -> single
  cleaned = cleaned.replace(/^[-']+|[-']+$/g, ''); // Remove leading/trailing
  
  // Trim and normalize whitespace
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  // Must be at least 2 characters and contain at least one letter
  if (cleaned.length < 2 || !/[a-zA-Z]/.test(cleaned)) {
    return { isValid: false, cleaned: '', reason: 'Too short or no letters' };
  }
  
  // Reject common placeholder names (case-insensitive) after cleaning
  const lowerCleaned = cleaned.toLowerCase();
  // Check for exact matches
  if (lowerCleaned === 'name' || lowerCleaned === 'firstname' || lowerCleaned === 'lastname' || 
      lowerCleaned === 'surname') {
    return { isValid: false, cleaned: '', reason: 'Placeholder name' };
  }
  // Check for "name" followed by very short variations
  if (lowerCleaned.startsWith('name') && lowerCleaned.length <= 6) {
    return { isValid: false, cleaned: '', reason: 'Placeholder name' };
  }
  
  // Max length check
  if (cleaned.length > 30) {
    cleaned = cleaned.substring(0, 30).trim();
  }
  
  return { isValid: true, cleaned };
}

/**
 * Validate phone number
 * Rules: Digits, dashes, parentheses, dots, plus, spaces
 */
function validatePhoneNumber(value: string): ValidationResult {
  // Keep only valid phone characters
  let cleaned = value.replace(/[^0-9\-\+\(\)\.\s]/g, '');
  
  // Remove excessive special characters
  cleaned = cleaned.replace(/[-\.]{2,}/g, '-');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();
  
  // Count digits
  const digitCount = (cleaned.match(/\d/g) || []).length;
  
  // Must have at least 7 digits (minimum phone number)
  if (digitCount < 7) {
    return { isValid: false, cleaned: '', reason: 'Too few digits' };
  }
  
  // Max length check
  if (cleaned.length > 25) {
    cleaned = cleaned.substring(0, 25).trim();
  }
  
  return { isValid: true, cleaned };
}

/**
 * Validate email
 * Rules: Must contain @, valid characters before and after
 */
function validateEmail(value: string): ValidationResult {
  // Keep valid email characters
  let cleaned = value.replace(/[^a-zA-Z0-9@\.\-\_]/g, '');
  
  // Must contain @
  if (!cleaned.includes('@')) {
    return { isValid: false, cleaned: '', reason: 'Missing @ symbol' };
  }
  
  const parts = cleaned.split('@');
  if (parts.length !== 2) {
    return { isValid: false, cleaned: '', reason: 'Invalid @ usage' };
  }
  
  const [local, domain] = parts;
  
  // Local part must have at least 1 character
  if (!local || local.length === 0) {
    return { isValid: false, cleaned: '', reason: 'Empty local part' };
  }
  
  // Domain must have at least 3 characters (x.y)
  if (!domain || domain.length < 3) {
    return { isValid: false, cleaned: '', reason: 'Invalid domain' };
  }
  
  // Domain must contain at least one dot
  if (!domain.includes('.')) {
    return { isValid: false, cleaned: '', reason: 'Domain missing dot' };
  }
  
  // Remove leading/trailing dots and hyphens
  const cleanLocal = local.replace(/^[\.\-]+|[\.\-]+$/g, '');
  const cleanDomain = domain.replace(/^[\.\-]+|[\.\-]+$/g, '');
  
  if (!cleanLocal || !cleanDomain) {
    return { isValid: false, cleaned: '', reason: 'Invalid format after cleaning' };
  }
  
  cleaned = `${cleanLocal}@${cleanDomain}`;
  
  // Max length check
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50);
  }
  
  return { isValid: true, cleaned };
}

/**
 * Validate street address
 * Rules: Numbers, letters, spaces, common address characters
 */
function validateStreetAddress(value: string): ValidationResult {
  // Keep valid address characters
  let cleaned = value.replace(/[^a-zA-Z0-9\s\-\#\.\,]/g, '');
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  // Must have at least 5 characters
  if (cleaned.length < 5) {
    return { isValid: false, cleaned: '', reason: 'Too short' };
  }
  
  // Max length check
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50).trim();
  }
  
  return { isValid: true, cleaned };
}

/**
 * Validate location (city, state, country)
 * Rules: Mostly letters, optional spaces/hyphens
 */
function validateLocation(value: string): ValidationResult {
  // Keep letters, spaces, hyphens, apostrophes
  let cleaned = value.replace(/[^a-zA-Z\s\-\']/g, '');
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  // Must have at least 2 characters and contain letters
  if (cleaned.length < 2 || !/[a-zA-Z]/.test(cleaned)) {
    return { isValid: false, cleaned: '', reason: 'Too short or no letters' };
  }
  
  // Max length check
  if (cleaned.length > 30) {
    cleaned = cleaned.substring(0, 30).trim();
  }
  
  return { isValid: true, cleaned };
}

/**
 * Validate text (company_name, job_title, product_name)
 * Rules: Letters, numbers, spaces, common punctuation
 */
function validateText(value: string): ValidationResult {
  // Keep alphanumeric and common punctuation
  let cleaned = value.replace(/[^a-zA-Z0-9\s\-\'\.\,]/g, '');
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  // Must have at least 2 characters
  if (cleaned.length < 2) {
    return { isValid: false, cleaned: '', reason: 'Too short' };
  }
  
  // Max length check
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50).trim();
  }
  
  return { isValid: true, cleaned };
}

/**
 * Validate color
 * Rules: Letters only, maybe spaces
 */
function validateColor(value: string): ValidationResult {
  // Keep letters and spaces only
  let cleaned = value.replace(/[^a-zA-Z\s]/g, '');
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  // Must have at least 3 characters
  if (cleaned.length < 3) {
    return { isValid: false, cleaned: '', reason: 'Too short' };
  }
  
  // Max length check
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 20).trim();
  }
  
  return { isValid: true, cleaned };
}

/**
 * Validate UUID
 * Rules: Should follow UUID format (8-4-4-4-12 hex digits with dashes)
 */
function validateUUID(value: string): ValidationResult {
  // Keep hex characters and dashes
  let cleaned = value.replace(/[^0-9a-fA-F\-]/g, '');
  
  // Try to format as UUID if it has enough characters
  const hexOnly = cleaned.replace(/-/g, '');
  if (hexOnly.length >= 32) {
    // Format as UUID: 8-4-4-4-12
    const formatted = [
      hexOnly.substring(0, 8),
      hexOnly.substring(8, 12),
      hexOnly.substring(12, 16),
      hexOnly.substring(16, 20),
      hexOnly.substring(20, 32)
    ].join('-');
    cleaned = formatted;
  }
  
  // Must have at least 32 hex characters
  const hexCount = cleaned.replace(/-/g, '').length;
  if (hexCount < 32) {
    return { isValid: false, cleaned: '', reason: 'Too few hex characters' };
  }
  
  return { isValid: true, cleaned };
}

/**
 * Validate date
 * Rules: Should follow date format (YYYY-MM-DD or similar)
 */
function validateDate(value: string): ValidationResult {
  // Keep digits, dashes, slashes
  let cleaned = value.replace(/[^0-9\-\/]/g, '');
  
  // Must have at least 8 digits (YYYYMMDD)
  const digitCount = (cleaned.match(/\d/g) || []).length;
  if (digitCount < 8) {
    return { isValid: false, cleaned: '', reason: 'Too few digits' };
  }
  
  // Max length check
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 20).trim();
  }
  
  return { isValid: true, cleaned };
}

/**
 * Generic validator for unknown labels
 */
function validateGeneric(value: string): ValidationResult {
  // Remove control characters
  let cleaned = value.replace(/[\x00-\x1F\x7F]/g, '');
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  if (cleaned.length < 1) {
    return { isValid: false, cleaned: '', reason: 'Empty after cleaning' };
  }
  
  return { isValid: true, cleaned };
}

