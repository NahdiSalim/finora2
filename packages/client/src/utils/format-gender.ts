import type { UserGenderApi, UserGender } from 'src/types/user';

/**
 * Converts API gender value to display value
 * Note: API now returns lowercase values (male/female) directly
 */
export const formatGenderForDisplay = (
  apiValue: UserGenderApi | string | null | undefined
): UserGender => {
  // Handle both old uppercase and new lowercase formats for backward compatibility
  if (apiValue === 'MALE' || apiValue === 'male') return 'male';
  if (apiValue === 'FEMALE' || apiValue === 'female') return 'female';
  return 'male'; // Default fallback
};

/**
 * Converts display gender value to API value
 * Note: API now expects lowercase values (male/female)
 */
export const formatGenderForApi = (displayValue: UserGender | string): UserGenderApi => {
  if (displayValue === 'male' || displayValue === 'MALE') return 'male';
  if (displayValue === 'female' || displayValue === 'FEMALE') return 'female';
  return 'male'; // Default fallback
};
