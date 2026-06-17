"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type CountryCode,
  DEFAULT_COUNTRY,
  getCountry,
  getCountryServices,
  getCountryCities,
  getCountryLocationOptions,
  countries,
} from "@/lib/countries";

const STORAGE_KEY = "tapteck-admin-country";

interface CountryContextValue {
  countryCode: CountryCode;
  country: ReturnType<typeof getCountry>;
  services: ReturnType<typeof getCountryServices>;
  cities: string[];
  locationOptions: ReturnType<typeof getCountryLocationOptions>;
  setCountry: (code: CountryCode) => void;
  isReady: boolean;
}

const CountryContext = createContext<CountryContextValue | null>(null);

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CountryCode | null;
    if (stored && countries.some((c) => c.code === stored)) {
      setCountryCode(stored);
    }
    setIsReady(true);
  }, []);

  const setCountry = useCallback((code: CountryCode) => {
    setCountryCode(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const value = useMemo(
    () => ({
      countryCode,
      country: getCountry(countryCode),
      services: getCountryServices(countryCode),
      cities: getCountryCities(countryCode),
      locationOptions: getCountryLocationOptions(countryCode),
      setCountry,
      isReady,
    }),
    [countryCode, setCountry, isReady]
  );

  return (
    <CountryContext.Provider value={value}>{children}</CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) {
    throw new Error("useCountry must be used within CountryProvider");
  }
  return ctx;
}
