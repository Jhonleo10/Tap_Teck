import { services, getCategoryLabel, type ServiceCategoryId } from "./services-data";
import {
  INDIA_REGIONS,
  CANADA_REGIONS,
  USA_REGIONS,
  UK_REGIONS,
  SINGAPORE_REGIONS,
} from "./country-locations";

export type CountryCode = "india" | "canada" | "usa" | "uk" | "singapore";

export interface CountryRegion {
  state: string;
  cities: string[];
}

export interface Country {
  code: CountryCode;
  name: string;
  flag: string;
  currency: string;
  locale: string;
  regions: CountryRegion[];
  /** Platform service catalog IDs available in this country */
  serviceIds: number[];
}

const ALL_SERVICE_IDS = services.map((s) => s.id);

export const countries: Country[] = [
  {
    code: "india",
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
    locale: "en-IN",
    regions: INDIA_REGIONS,
    serviceIds: ALL_SERVICE_IDS,
  },
  {
    code: "canada",
    name: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    locale: "en-CA",
    regions: CANADA_REGIONS,
    serviceIds: [1, 2, 3, 4, 7, 8, 9, 10, 12, 13, 14, 15, 16],
  },
  {
    code: "usa",
    name: "USA",
    flag: "🇺🇸",
    currency: "USD",
    locale: "en-US",
    regions: USA_REGIONS,
    serviceIds: [1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17],
  },
  {
    code: "uk",
    name: "UK",
    flag: "🇬🇧",
    currency: "GBP",
    locale: "en-GB",
    regions: UK_REGIONS,
    serviceIds: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16],
  },
  {
    code: "singapore",
    name: "Singapore",
    flag: "🇸🇬",
    currency: "SGD",
    locale: "en-SG",
    regions: SINGAPORE_REGIONS,
    serviceIds: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17],
  },
];

export const DEFAULT_COUNTRY: CountryCode = "india";

export function getCountry(code: CountryCode): Country {
  return countries.find((c) => c.code === code) ?? countries[0];
}

export function getCountryServices(code: CountryCode) {
  const country = getCountry(code);
  return services.filter((s) => country.serviceIds.includes(s.id));
}

export function getCountryServiceNames(code: CountryCode): string[] {
  return getCountryServices(code).map((s) => s.title);
}

export function getCountryCategories(code: CountryCode) {
  const countryServices = getCountryServices(code);
  const categoryIds = new Set(countryServices.map((s) => s.category));
  return Array.from(categoryIds).map((id) => ({
    id,
    label: getCategoryLabel(id as Exclude<ServiceCategoryId, "all">),
  }));
}

/** All cities for a country (flat list) */
export function getCountryCities(code: CountryCode): string[] {
  return getCountry(code).regions.flatMap((r) => r.cities);
}

/** States / provinces for a country */
export function getCountryStates(code: CountryCode): string[] {
  return getCountry(code).regions.map((r) => r.state);
}

export interface LocationOption {
  value: string;
  label: string;
  type: "state" | "city";
  state: string;
}

/** Grouped location options: states + their cities */
export function getCountryLocationOptions(code: CountryCode): LocationOption[] {
  const options: LocationOption[] = [];
  for (const region of getCountry(code).regions) {
    options.push({
      value: `state:${region.state}`,
      label: region.state,
      type: "state",
      state: region.state,
    });
    for (const city of region.cities) {
      options.push({
        value: city,
        label: city,
        type: "city",
        state: region.state,
      });
    }
  }
  return options;
}

/** Resolve a location filter value to city names for Prisma queries */
export function resolveLocationCities(code: CountryCode, locationValue: string): string[] {
  if (locationValue.startsWith("state:")) {
    const stateName = locationValue.slice(6);
    const region = getCountry(code).regions.find((r) => r.state === stateName);
    return region?.cities ?? [];
  }
  return [locationValue];
}

export function getLocationDisplayLabel(code: CountryCode, locationValue: string): string {
  if (locationValue.startsWith("state:")) {
    return `All of ${locationValue.slice(6)}`;
  }
  const region = getCountry(code).regions.find((r) => r.cities.includes(locationValue));
  if (region) {
    return `${locationValue}, ${region.state}`;
  }
  return locationValue;
}

/** Find which state a city belongs to */
export function getCityState(code: CountryCode, city: string): string | undefined {
  return getCountry(code).regions.find((r) => r.cities.includes(city))?.state;
}
