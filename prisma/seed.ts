import {
  PrismaClient,
  type BookingStatus,
  type DocStatus,
  type ProviderStatus,
  type ReferralStatus,
  type RewardType,
  type UserStatus,
  type VerificationStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays, subHours, addHours } from "date-fns";
import { generateReferralCode } from "../src/lib/utils";
import {
  serviceCategories,
  services,
  getCategoryLabel,
  getBookableServices,
} from "../src/lib/services-data";

const prisma = new PrismaClient();
const DEMO_EMAIL_DOMAIN = "@demo.tapteck.com";

const CITIES = [
  { city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  { city: "Delhi", state: "Delhi", pincode: "110001" },
  { city: "Bangalore", state: "Karnataka", pincode: "560001" },
  { city: "Hyderabad", state: "Telangana", pincode: "500001" },
  { city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
  { city: "Pune", state: "Maharashtra", pincode: "411001" },
];

const CUSTOMERS = [
  { name: "Rahul Sharma", phone: "+91 98765 43210" },
  { name: "Priya Patel", phone: "+91 98765 43211" },
  { name: "Amit Kumar", phone: "+91 98765 43212" },
  { name: "Sneha Reddy", phone: "+91 98765 43213" },
  { name: "Vikram Singh", phone: "+91 98765 43214" },
  { name: "Ananya Iyer", phone: "+91 98765 43215" },
  { name: "Karan Mehta", phone: "+91 98765 43216" },
  { name: "Divya Nair", phone: "+91 98765 43217" },
  { name: "Arjun Das", phone: "+91 98765 43218" },
  { name: "Meera Joshi", phone: "+91 98765 43219" },
  { name: "Rohan Gupta", phone: "+91 98765 43220" },
  { name: "Kavya Menon", phone: "+91 98765 43221" },
  { name: "Suresh Pillai", phone: "+91 98765 43222" },
  { name: "Neha Kapoor", phone: "+91 98765 43223" },
  { name: "Aditya Rao", phone: "+91 98765 43224" },
];

const PROVIDERS = [
  { name: "AutoShine Mumbai", businessName: "AutoShine Vehicle Wash", category: "automotive" as const, cityIdx: 0, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.8, reviews: 42, jobs: 156 },
  { name: "DriveEasy Delhi", businessName: "DriveEasy Drivers", category: "automotive" as const, cityIdx: 1, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.6, reviews: 31, jobs: 98 },
  { name: "Spark Electric", businessName: "Spark Electrician Services", category: "home-repair" as const, cityIdx: 2, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.7, reviews: 55, jobs: 178 },
  { name: "AquaFix Plumbing", businessName: "AquaFix Plumbing", category: "home-repair" as const, cityIdx: 3, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.5, reviews: 28, jobs: 87 },
  { name: "CoolBreeze AC", businessName: "CoolBreeze AC Service", category: "home-repair" as const, cityIdx: 4, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.6, reviews: 38, jobs: 112 },
  { name: "CleanPro Hyderabad", businessName: "CleanPro Home Cleaning", category: "cleaning" as const, cityIdx: 3, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.7, reviews: 48, jobs: 145 },
  { name: "Glow At Home", businessName: "Glow Home Salon", category: "beauty" as const, cityIdx: 0, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.9, reviews: 73, jobs: 215 },
  { name: "Chef's Table", businessName: "Chef's Table In-Home", category: "food" as const, cityIdx: 5, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.8, reviews: 29, jobs: 64 },
  { name: "CareNurse Bangalore", businessName: "CareNurse Home Healthcare", category: "healthcare" as const, cityIdx: 2, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.9, reviews: 22, jobs: 56 },
  { name: "EduMentor", businessName: "EduMentor Tutors", category: "education" as const, cityIdx: 1, status: "ACTIVE" as ProviderStatus, verification: "VERIFIED" as VerificationStatus, rating: 4.7, reviews: 19, jobs: 71 },
  { name: "QuickDrop Delivery", businessName: "QuickDrop Delivery", category: "delivery" as const, cityIdx: 0, status: "PENDING" as ProviderStatus, verification: "UNDER_REVIEW" as VerificationStatus, rating: 0, reviews: 0, jobs: 0 },
  { name: "Fresh Tank Clean", businessName: "Fresh Septic Cleaning", category: "cleaning" as const, cityIdx: 1, status: "PENDING" as ProviderStatus, verification: "PENDING" as VerificationStatus, rating: 0, reviews: 0, jobs: 0 },
];

const REVIEW_COMMENTS = [
  "Excellent service! Very professional and on time.",
  "Good work, would recommend to others.",
  "Amazing experience, exceeded expectations!",
  "Quick and efficient, fair pricing.",
  "Very skilled technician, neat work.",
  "Punctual and courteous, happy with the result.",
  "Outstanding quality, will book again!",
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getDocStatuses(verification: VerificationStatus): Record<string, DocStatus> {
  if (verification === "VERIFIED") {
    return { aadhaarStatus: "APPROVED", panStatus: "APPROVED", certificateStatus: "APPROVED", addressStatus: "APPROVED", profileStatus: "APPROVED" };
  }
  if (verification === "REJECTED") {
    return { aadhaarStatus: "REJECTED", panStatus: "APPROVED", certificateStatus: "REJECTED", addressStatus: "PENDING", profileStatus: "APPROVED" };
  }
  if (verification === "UNDER_REVIEW") {
    return { aadhaarStatus: "APPROVED", panStatus: "APPROVED", certificateStatus: "PENDING", addressStatus: "PENDING", profileStatus: "APPROVED" };
  }
  return { aadhaarStatus: "PENDING", panStatus: "PENDING", certificateStatus: "PENDING", addressStatus: "PENDING", profileStatus: "PENDING" };
}

async function seedServiceCatalog() {
  await prisma.subService.deleteMany();
  await prisma.platformService.deleteMany();
  await prisma.serviceCategory.deleteMany({ where: { slug: null } });

  for (const cat of serviceCategories.filter((c) => c.id !== "all")) {
    const category = await prisma.serviceCategory.upsert({
      where: { slug: cat.id },
      update: { name: cat.label, isActive: true },
      create: { slug: cat.id, name: cat.label, isActive: true },
    });

    const categoryServices = services.filter((s) => s.category === cat.id);
    for (const svc of categoryServices) {
      const platformService = await prisma.platformService.upsert({
        where: { catalogId: svc.id },
        update: {
          title: svc.title,
          description: svc.description,
          icon: svc.icon,
          categoryId: category.id,
          isActive: true,
        },
        create: {
          catalogId: svc.id,
          title: svc.title,
          description: svc.description,
          icon: svc.icon,
          categoryId: category.id,
        },
      });

      await prisma.subService.deleteMany({ where: { serviceId: platformService.id } });
      const subs = svc.subServices ?? [svc.title];
      for (const sub of subs) {
        await prisma.subService.create({
          data: { name: sub, serviceId: platformService.id },
        });
      }
    }
  }
}

async function clearDemoData() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_DOMAIN } },
    select: { id: true },
  });
  const demoUserIds = demoUsers.map((u) => u.id);
  if (demoUserIds.length === 0) return;

  await prisma.review.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.booking.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.referral.deleteMany({
    where: { OR: [{ inviterId: { in: demoUserIds } }, { referredUserId: { in: demoUserIds } }] },
  });
  await prisma.reward.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.providerVerification.deleteMany({ where: { provider: { userId: { in: demoUserIds } } } });
  await prisma.provider.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: demoUserIds } } });
}

async function main() {
  console.log("🌱 Seeding TapTeck Admin Portal...\n");

  await prisma.user.upsert({
    where: { email: "admin@tapteck.com" },
    update: {},
    create: {
      name: "TapTeck Admin",
      email: "admin@tapteck.com",
      password: await bcrypt.hash("Admin@123", 12),
      role: "ADMIN",
      status: "ACTIVE",
      referralCode: generateReferralCode("Admin"),
    },
  });

  await seedServiceCatalog();

  if ((await prisma.appSettings.count()) === 0) {
    await prisma.appSettings.create({
      data: {
        commissionPercentage: 10,
        referralRewardAmount: 100,
        giftRules: { minRating: 4.5, minJobs: 50 },
      },
    });
  }

  await clearDemoData();

  const now = new Date();
  const hashedPassword = await bcrypt.hash("Demo@123", 12);
  const bookableServices = getBookableServices();
  const customerUsers: { id: string; name: string | null; referralCode: string | null }[] = [];

  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i];
    const user = await prisma.user.create({
      data: {
        name: c.name,
        email: `${slugify(c.name)}${i}${DEMO_EMAIL_DOMAIN}`,
        password: hashedPassword,
        role: "USER",
        phone: c.phone,
        status: (["ACTIVE", "ACTIVE", "ACTIVE", "INACTIVE", "SUSPENDED"] as UserStatus[])[i % 5],
        referralCode: generateReferralCode(c.name),
        createdAt: subDays(now, 90 - i * 5),
      },
    });
    customerUsers.push(user);
  }

  const providerRecords: { id: string; categoryId: string; cityIdx: number }[] = [];

  for (let i = 0; i < PROVIDERS.length; i++) {
    const p = PROVIDERS[i];
    const city = CITIES[p.cityIdx];
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: `${slugify(p.businessName)}${i}${DEMO_EMAIL_DOMAIN}`,
        password: hashedPassword,
        role: "PROVIDER",
        phone: `+91 98${String(10000000 + i).slice(0, 8)}`,
        status: "ACTIVE",
        referralCode: generateReferralCode(p.name),
        createdAt: subDays(now, 120 - i * 8),
      },
    });

    const provider = await prisma.provider.create({
      data: {
        userId: user.id,
        businessName: p.businessName,
        description: `Professional ${getCategoryLabel(p.category)} services in ${city.city}`,
        serviceCategory: getCategoryLabel(p.category),
        location: `${city.city}, ${city.state}`,
        city: city.city,
        state: city.state,
        pincode: city.pincode,
        status: p.status,
        verificationStatus: p.verification,
        isVerified: p.verification === "VERIFIED",
        canReceiveBookings: p.verification === "VERIFIED" && p.status === "ACTIVE",
        rating: p.rating,
        totalReviews: p.reviews,
        completedJobs: p.jobs,
        createdAt: subDays(now, 100 - i * 7),
      },
    });

    const docs = getDocStatuses(p.verification);
    await prisma.providerVerification.create({
      data: {
        providerId: provider.id,
        ...docs,
        aadhaarNumber: docs.aadhaarStatus !== "PENDING" ? `XXXX-XXXX-${1000 + i}` : null,
        panNumber: docs.panStatus !== "PENDING" ? `ABCDE${1000 + i}F` : null,
      },
    });

    providerRecords.push({ id: provider.id, categoryId: p.category, cityIdx: p.cityIdx });
  }

  const activeProviders = providerRecords.filter((_, i) => PROVIDERS[i].verification === "VERIFIED");
  const bookingStatuses: BookingStatus[] = ["COMPLETED", "COMPLETED", "COMPLETED", "CONFIRMED", "IN_PROGRESS", "PENDING", "CANCELLED"];
  let bookingCounter = 0;
  const completedBookings: { id: string; userId: string; providerId: string; rating: number }[] = [];

  for (let dayOffset = 90; dayOffset >= 0; dayOffset -= 2) {
    const bookingsToday = dayOffset <= 7 ? 3 : dayOffset <= 30 ? 2 : 1;
    for (let b = 0; b < bookingsToday; b++) {
      const customer = customerUsers[bookingCounter % customerUsers.length];
      const svc = bookableServices[bookingCounter % bookableServices.length];
      const matchingProviders = activeProviders.filter((p) => p.categoryId === svc.categoryId);
      const provider = matchingProviders[bookingCounter % Math.max(matchingProviders.length, 1)] ?? activeProviders[0];
      const city = CITIES[provider.cityIdx];
      const status = dayOffset === 0 ? "COMPLETED" : bookingStatuses[bookingCounter % bookingStatuses.length];
      const createdAt = subHours(subDays(now, dayOffset), b * 3);
      const completedAt = status === "COMPLETED" ? addHours(createdAt, 2 + (bookingCounter % 4)) : null;

      const booking = await prisma.booking.create({
        data: {
          bookingNumber: `BK-${String(10000 + bookingCounter).padStart(5, "0")}`,
          userId: customer.id,
          providerId: provider.id,
          serviceName: svc.subServiceName,
          serviceCategory: svc.category,
          location: `${city.city}, ${city.state}`,
          amount: svc.basePrice,
          commission: Math.round(svc.basePrice * 0.1),
          status,
          scheduledAt: createdAt,
          completedAt,
          createdAt,
        },
      });

      if (status === "COMPLETED") {
        completedBookings.push({
          id: booking.id,
          userId: customer.id,
          providerId: provider.id,
          rating: 3 + (bookingCounter % 3),
        });
      }
      bookingCounter++;
    }
  }

  for (let i = 0; i < completedBookings.length; i++) {
    if (i % 3 === 0) continue;
    const b = completedBookings[i];
    await prisma.review.create({
      data: {
        bookingId: b.id,
        userId: b.userId,
        providerId: b.providerId,
        rating: b.rating,
        comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
        createdAt: subDays(now, 90 - i),
      },
    });
  }

  const referralPairs = [[0, 1], [0, 2], [2, 3], [4, 5], [6, 7], [8, 9], [1, 10], [3, 11], [5, 12], [7, 13]];
  for (const [inviterIdx, referredIdx] of referralPairs) {
    const inviter = customerUsers[inviterIdx];
    const referred = customerUsers[referredIdx];
    await prisma.referral.create({
      data: {
        referralCode: inviter.referralCode!,
        inviterId: inviter.id,
        referredUserId: referred.id,
        rewardAmount: 100,
        status: (["COMPLETED", "COMPLETED", "PENDING", "EXPIRED"] as ReferralStatus[])[inviterIdx % 4],
        createdAt: subDays(now, 60 - inviterIdx * 5),
      },
    });
  }

  const rewardData: { type: RewardType; title: string; description: string; value: number; isAutomatic: boolean; userIdx?: number }[] = [
    { type: "HIGHEST_RATED", title: "Top Rated Provider Q1", description: "Highest rated provider", value: 5000, isAutomatic: true },
    { type: "MOST_JOBS", title: "Most Jobs Completed", description: "Most completed jobs", value: 3000, isAutomatic: true },
    { type: "BEST_REVIEWS", title: "Best Review Score", description: "Highest review count", value: 2500, isAutomatic: true },
    { type: "REFERRAL_BONUS", title: "Referral Bonus", description: "Successful referral", value: 100, isAutomatic: false, userIdx: 0 },
    { type: "MANUAL_GIFT", title: "Festival Gift Card", description: "Festival reward", value: 500, isAutomatic: false, userIdx: 4 },
  ];

  for (const reward of rewardData) {
    await prisma.reward.create({
      data: {
        type: reward.type,
        title: reward.title,
        description: reward.description,
        value: reward.value,
        isAutomatic: reward.isAutomatic,
        userId: reward.userIdx !== undefined ? customerUsers[reward.userIdx].id : null,
        status: "ACTIVE",
        createdAt: subDays(now, 30 - rewardData.indexOf(reward) * 4),
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log(`  Categories: ${serviceCategories.length - 1} | Services: ${services.length}`);
  console.log(`  Sub-services: ${bookableServices.length} | Bookings: ${bookingCounter}`);
  console.log("  Login: admin@tapteck.com / Admin@123\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
