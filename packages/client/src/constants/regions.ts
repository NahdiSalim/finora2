export const UAE_REGIONS = [
  {
    value: 'abu-dhabi',
    name_en: 'Abu Dhabi',
  },
  {
    value: 'dubai',
    name_en: 'Dubai',
  },
  {
    value: 'sharjah',
    name_en: 'Sharjah',
  },
  {
    value: 'ajman',
    name_en: 'Ajman',
  },
  {
    value: 'umm-al-quwain',
    name_en: 'Umm Al Quwain',
  },
  {
    value: 'ras-al-khaimah',
    name_en: 'Ras Al Khaimah',
  },
  {
    value: 'fujairah',
    name_en: 'Fujairah',
  },
] as const;

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}
