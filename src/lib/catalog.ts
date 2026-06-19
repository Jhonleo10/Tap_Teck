import { getCountryServices, type CountryCode } from "@/lib/countries";
import {
  services,
  serviceCategories,
  getCategoryLabel,
  type PlatformServiceItem,
  type ServiceCategoryId,
} from "@/lib/services-data";

export { services, serviceCategories, getCategoryLabel };

export function getServiceByCatalogId(id: number): PlatformServiceItem | undefined {
  return services.find((s) => s.id === id);
}

export function getServiceByTitle(title: string): PlatformServiceItem | undefined {
  return services.find((s) => s.title === title);
}

export function isCatalogServiceTitle(title: string): boolean {
  return services.some((s) => s.title === title);
}

export function isCatalogSubService(serviceTitle: string, subServiceName: string): boolean {
  const service = getServiceByTitle(serviceTitle);
  if (!service) return false;
  if (!service.subServices?.length) return subServiceName === service.title;
  return service.subServices.includes(subServiceName);
}

export function getSubServicesForTitle(title: string): string[] {
  const service = getServiceByTitle(title);
  if (!service) return [];
  return service.subServices?.length ? service.subServices : [service.title];
}

export function getCountryServiceTitles(code: CountryCode): string[] {
  return getCountryServices(code).map((s) => s.title);
}

export function getCountryServicesByCategory(
  code: CountryCode,
  categoryId: Exclude<ServiceCategoryId, "all"> | "all"
): PlatformServiceItem[] {
  const countryServices = getCountryServices(code);
  if (categoryId === "all") return countryServices;
  return countryServices.filter((s) => s.category === categoryId);
}

export function getCountrySubServiceOptions(
  code: CountryCode,
  serviceTitle?: string
): string[] {
  if (!serviceTitle || serviceTitle === "all") {
    const subs = new Set<string>();
    for (const service of getCountryServices(code)) {
      getSubServicesForTitle(service.title).forEach((sub) => subs.add(sub));
    }
    return Array.from(subs).sort();
  }

  const service = getCountryServices(code).find((s) => s.title === serviceTitle);
  if (!service) return [];
  return getSubServicesForTitle(service.title);
}

export function getCatalogStats() {
  return {
    categories: serviceCategories.filter((c) => c.id !== "all").length,
    services: services.length,
    subServices: services.reduce(
      (sum, s) => sum + (s.subServices?.length ?? 1),
      0
    ),
  };
}
