export type ServiceCategoryId =
  | "all"
  | "cleaning"
  | "automotive"
  | "home-repair"
  | "healthcare"
  | "beauty"
  | "education"
  | "food"
  | "delivery";

export interface ServiceCategoryItem {
  id: ServiceCategoryId;
  label: string;
}

export interface PlatformServiceItem {
  id: number;
  title: string;
  description: string;
  icon: string;
  category: Exclude<ServiceCategoryId, "all">;
  subServices?: string[];
}

export const serviceCategories: ServiceCategoryItem[] = [
  { id: "all", label: "All Services" },
  { id: "cleaning", label: "Cleaning" },
  { id: "automotive", label: "Automotive" },
  { id: "home-repair", label: "Home Repair" },
  { id: "healthcare", label: "Healthcare" },
  { id: "beauty", label: "Beauty & Wellness" },
  { id: "education", label: "Education" },
  { id: "food", label: "Food & Chef" },
  { id: "delivery", label: "Delivery" },
];

export const services: PlatformServiceItem[] = [
  {
    id: 1,
    title: "Vehicle Wash",
    description:
      "Professional car and bike wash at your doorstep — from quick exterior cleans to premium detailing.",
    icon: "FaCar",
    category: "automotive",
    subServices: [
      "Basic Exterior Wash",
      "Interior + Exterior Full Service",
      "Premium Detailing",
      "Basic Bike Wash",
      "Premium Bike Wash",
    ],
  },
  {
    id: 2,
    title: "Driver On Demand",
    description: "Reliable drivers available on demand for safe and comfortable travel.",
    icon: "FaLocationArrow",
    category: "automotive",
    subServices: [
      "Hourly Driver",
      "Half Day Driver",
      "Full Day Driver",
      "Outstation Driver",
      "Night / Emergency Driver",
    ],
  },
  {
    id: 3,
    title: "Electrician Services",
    description: "Certified electricians for wiring, repairs, and electrical installations.",
    icon: "FaBolt",
    category: "home-repair",
    subServices: [
      "Switch/Socket Repair and Replacement",
      "Plug Replacement",
      "New Switchboard Installation",
      "Ceiling Fan Installation",
      "Exhaust/Pedestal/Tower Fan Installation",
      "Fan Repair",
      "Fan Regulator Replacement",
      "Bulb Installation",
      "Tube Light Installation/Repair",
      "Ceiling Light Installation",
      "Hanging Light Installation",
      "Chandelier Installation",
      "New Internal Wiring",
      "New External Wiring",
      "Regular Doorbell Installation",
      "Video Doorbell Installation",
      "Wireless CCTV Installation",
      "MCB/Fuse Repair or Replacement",
      "Submeter Installation",
      "3-Phase Changeover Switch Installation",
      "TV Installation",
      "TV Uninstallation",
      "Home Theater Installation",
      "Soundbar Installation",
    ],
  },
  {
    id: 4,
    title: "Plumbing Services",
    description: "Expert plumbers for leaks, pipe repairs, and bathroom fittings.",
    icon: "FaTint",
    category: "home-repair",
    subServices: [
      "Tap Repair/Replacement",
      "Tap Accessory Installation",
      "Mixer Installation",
      "Jet Spray Repair/Installation",
      "Toilet Seat Cover Installation",
      "Flush Tank Repair",
      "External Flush Tank Replacement",
      "Western Toilet Repair",
      "Indian Toilet Installation",
      "Shower Installation",
      "Shower Mixer Tap Installation",
      "Shower Filter Installation",
      "Shower Repair",
      "Soap Holder Installation",
      "Towel Holder Installation",
      "Bathroom Shelf Installation",
      "Wash Basin Leakage Repair",
      "Basin/Sink Blockage Removal",
      "Basin Installation",
      "Waste Coupling Installation",
      "Drain Cover Installation",
      "Drain Blockage Removal",
      "Connection Hose Installation",
      "Washing Machine Inlet/Outlet Install",
      "Geyser Connection Leakage Repair",
      "Shut Off Valve Leakage Repair",
      "Overhead Water Tank Installation",
      "Water Tank Repair",
      "Motor Installation",
      "Motor Air Cavity Removal",
    ],
  },
  {
    id: 5,
    title: "Septic Tank Cleaning",
    description: "Safe and efficient septic tank cleaning with proper waste disposal.",
    icon: "FaTrash",
    category: "cleaning",
  },
  {
    id: 6,
    title: "Fish Tank Cleaning",
    description: "Professional aquarium cleaning to keep your fish healthy and happy.",
    icon: "GiTropicalFish",
    category: "cleaning",
  },
  {
    id: 7,
    title: "AC Service",
    description: "AC repair, maintenance, and gas refilling by trained technicians.",
    icon: "MdAir",
    category: "home-repair",
    subServices: [
      "Split AC Servicing",
      "Window AC Servicing",
      "Split AC Deep Cleaning",
      "Window AC Deep Cleaning",
      "Split AC Installation",
      "Window AC Installation",
      "Split AC Uninstallation",
      "Window AC Uninstallation",
      "Split AC Gas Refilling (R32/R410A)",
      "Window AC Gas Refilling",
      "AC PCB Repair",
      "AC Capacitor Replacement",
      "AC Fan Motor Replacement",
      "AC Thermostat Replacement",
    ],
  },
  {
    id: 8,
    title: "Pest Control",
    description: "Effective pest control solutions for a safe and hygienic home.",
    icon: "FaBug",
    category: "home-repair",
    subServices: [
      "General Pest Control",
      "Termite Control",
      "Rodent Control",
      "Bed Bug Treatment",
      "Mosquito Control",
    ],
  },
  {
    id: 9,
    title: "Housemaid Services",
    description: "Trusted housemaids for daily cleaning, laundry, and household help.",
    icon: "MdOutlineAutoAwesome",
    category: "cleaning",
    subServices: ["House Cleaning", "Cooking Help", "Childcare / Nanny"],
  },
  {
    id: 10,
    title: "In-home Chef",
    description: "Personal chefs to prepare delicious meals in the comfort of your home.",
    icon: "GiChefToque",
    category: "food",
    subServices: [
      "Home Cooking",
      "Specialized Cuisine",
      "Diet & Health Cooking",
      "Party Cook — Small Gathering",
      "Party Cook — Medium Gathering",
      "Party Cook — Large Gathering",
    ],
  },
  {
    id: 11,
    title: "RO Water Service",
    description: "RO filter installation, servicing, and water purifier maintenance.",
    icon: "FaWrench",
    category: "home-repair",
  },
  {
    id: 12,
    title: "Delivery Service",
    description: "Fast and reliable delivery for packages, groceries, and essentials.",
    icon: "FaTruck",
    category: "delivery",
    subServices: ["Truck", "Two Wheeler"],
  },
  {
    id: 13,
    title: "Home Nursing Care",
    description: "Qualified nurses providing compassionate in-home healthcare support.",
    icon: "FaStethoscope",
    category: "healthcare",
  },
  {
    id: 14,
    title: "Personal Tutors",
    description: "Experienced tutors for academic support across all subjects and levels.",
    icon: "FaGraduationCap",
    category: "education",
  },
  {
    id: 15,
    title: "Home Salon & Beauty Service",
    description: "Salon-quality hair, skin, and beauty treatments at your home.",
    icon: "FaHandScissors",
    category: "beauty",
    subServices: [
      "Men's Basic Haircut",
      "Men's Styled Haircut",
      "Beard Trim",
      "Full Shave",
      "Beard Styling (Fade/Design)",
      "Women's Basic Trim",
      "Layered/Styled Cut",
      "Creative/Director Cut",
      "Wash + Cut + Blow Dry",
      "Boys Haircut",
      "Girls Haircut",
      "Children's Special Styling",
      "Basic Grooming",
      "Facial & Clean Up",
      "Hair Care Treatment",
      "Men's Grooming Package",
      "Basic Makeup Package",
      "HD Makeup Package",
      "Luxe Makeup Package",
      "Bridal Makeup",
      "Engagement/Reception Makeup",
      "Party Makeup — Basic",
      "Party Makeup — HD Finish",
      "Party Makeup — Luxe Glam",
      "Photoshoot Makeup",
      "Simple/Day Makeup",
      "Premium Wedding Combo",
      "Complete Event Combo",
      "Glow Smart Combo",
      "Salon Package & Combos",
    ],
  },
  {
    id: 16,
    title: "Psychotherapist",
    description: "Licensed therapists offering confidential mental health counseling.",
    icon: "FaBrain",
    category: "healthcare",
  },
  {
    id: 17,
    title: "Taxi Service",
    description:
      "Quick rides on two wheels, autos, or comfortable car cabs — book in seconds.",
    icon: "FaTaxi",
    category: "automotive",
    subServices: ["Bike Taxi", "Auto/Rickshaw", "Car Cab"],
  },
];

export function getCategoryLabel(categoryId: Exclude<ServiceCategoryId, "all">): string {
  return serviceCategories.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function getBookableServices(): Array<{
  serviceTitle: string;
  subServiceName: string;
  category: string;
  categoryId: Exclude<ServiceCategoryId, "all">;
  basePrice: number;
}> {
  const items: Array<{
    serviceTitle: string;
    subServiceName: string;
    category: string;
    categoryId: Exclude<ServiceCategoryId, "all">;
    basePrice: number;
  }> = [];

  const priceMap: Record<string, number> = {
    automotive: 499,
    cleaning: 799,
    "home-repair": 349,
    healthcare: 999,
    beauty: 599,
    education: 450,
    food: 1200,
    delivery: 199,
  };

  for (const service of services) {
    const category = getCategoryLabel(service.category);
    const base = priceMap[service.category] ?? 500;

    if (service.subServices?.length) {
      service.subServices.forEach((sub, i) => {
        items.push({
          serviceTitle: service.title,
          subServiceName: sub,
          category,
          categoryId: service.category,
          basePrice: base + i * 75,
        });
      });
    } else {
      items.push({
        serviceTitle: service.title,
        subServiceName: service.title,
        category,
        categoryId: service.category,
        basePrice: base,
      });
    }
  }

  return items;
}

export function getTotalSubServiceCount(): number {
  return services.reduce(
    (sum, s) => sum + (s.subServices?.length ?? 1),
    0
  );
}
