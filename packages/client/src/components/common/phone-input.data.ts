import { customList } from "country-codes-list";
import { getExampleNumber, isSupportedCountry } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Country {
  countryCode: string; // ISO alpha-2  e.g. "TN"
  name: string; // e.g. "Tunisia"
  dialCode: string; // e.g. "+216"
  placeholder: string; // national format hint e.g. "12 123 123"
  maxLength: number; // max digit count for national number
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function getPhoneFormat(code: string): {
  placeholder: string;
  maxLength: number;
} {
  if (!isSupportedCountry(code as CountryCode)) {
    return { placeholder: "Phone number", maxLength: 15 };
  }
  try {
    const example = getExampleNumber(code as CountryCode, examples);
    if (!example) return { placeholder: "Phone number", maxLength: 15 };
    return {
      placeholder: example.formatNational(),
      maxLength: example.nationalNumber.toString().length,
    };
  } catch {
    return { placeholder: "Phone number", maxLength: 15 };
  }
}

export function formatNationalNumber(
  digits: string,
  countryCode: string,
): string {
  if (!digits || !isSupportedCountry(countryCode as CountryCode)) return digits;

  try {
    const example = getExampleNumber(countryCode as CountryCode, examples);
    if (!example) return digits;

    const formatted = example.formatNational();

    // Build separator map: digit-position → separator character(s)
    // e.g. "6 12 34 56 78"  →  { 1: ' ', 3: ' ', 5: ' ', 7: ' ' }
    const sepMap = new Map<number, string>();
    let dIdx = 0;

    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        dIdx++;
      } else {
        // Accumulate consecutive separators (e.g. ") " in US format)
        sepMap.set(dIdx, (sepMap.get(dIdx) ?? "") + formatted[i]);
      }
    }

    // Apply separator map to user digits
    let result = "";
    for (let i = 0; i < digits.length; i++) {
      const sep = sepMap.get(i);
      if (sep) result += sep;
      result += digits[i];
    }

    return result;
  } catch {
    return digits;
  }
}

// ─── Country list ─────────────────────────────────────────────────────────────

const nameMap = customList("countryCode", "{countryNameEn}");
const dialCodeMap = customList("countryCode", "{countryCallingCode}");

export const customCountries: Country[] = Object.entries(nameMap)
  .map(([code, name]) => {
    const { placeholder, maxLength } = getPhoneFormat(code);
    return {
      countryCode: code,
      name: name as string,
      dialCode: `+${dialCodeMap[code]}`,
      placeholder,
      maxLength,
    };
  })
  .filter((c) => c.name && c.dialCode !== "+")
  .sort((a, b) => a.name.localeCompare(b.name));
