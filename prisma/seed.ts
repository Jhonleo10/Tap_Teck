import {
  PrismaClient,
  UserRole,
  UserStatus,
  ProviderStatus,
  VerificationStatus,
  DocStatus,
  BookingStatus,
  ReferralStatus,
  RewardType,
  RewardStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { serviceCategories, services } from "../src/lib/services-data";
import { countries } from "../src/lib/countries";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting TapTeck database seed...");

  await prisma.appSettings.upsert({
    where: { id: "default-settings" },
    update: {},
    create: {
      id: "default-settings",
      commissionPercentage: 10.0,
      referralRewardAmount: 100.0,
      giftRules: { newProvider: 50, fiveStarBonus: 200 },
    },
  });

  console.log("Creating Super Admin...");
  const adminEmail = "admin@tapteck.com";
  const hashedAdminPassword = await bcrypt.hash("Admin@123", 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedAdminPassword,
      role: UserRole.ADMIN,
      name: "Super Admin",
      status: UserStatus.ACTIVE,
    },
    create: {
      email: adminEmail,
      name: "Super Admin",
      password: hashedAdminPassword,
      role: UserRole.ADMIN,
      phone: "1234567890",
      status: UserStatus.ACTIVE,
      referralCode: "ADMINX99",
    },
  });

  console.log("Creating TapTeck Service Catalog...");
  const categoryMap = new Map<string, string>();

  for (const cat of serviceCategories.filter((c) => c.id !== "all")) {
    const record = await prisma.serviceCategory.upsert({
      where: { slug: cat.id },
      update: { name: cat.label, isActive: true },
      create: {
        slug: cat.id,
        name: cat.label,
        description: `${cat.label} services on TapTeck`,
        isActive: true,
      },
    });
    categoryMap.set(cat.id, record.id);
  }

  for (const svc of services) {
    const categoryId = categoryMap.get(svc.category);
    if (!categoryId) continue;

    const platformService = await prisma.platformService.upsert({
      where: { catalogId: svc.id },
      update: {
        title: svc.title,
        description: svc.description,
        icon: svc.icon,
        categoryId,
        isActive: true,
      },
      create: {
        catalogId: svc.id,
        title: svc.title,
        description: svc.description,
        icon: svc.icon,
        categoryId,
        isActive: true,
      },
    });

    if (svc.subServices?.length) {
      for (const sub of svc.subServices) {
        await prisma.subService.upsert({
          where: { serviceId_name: { serviceId: platformService.id, name: sub } },
          update: {},
          create: { name: sub, serviceId: platformService.id },
        });
      }
    }
  }

  console.log("Creating Users and Providers per country...");
  const customers = [];
  for (let i = 0; i < 25; i++) {
    const email = `customer${i}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: faker.person.fullName(),
        password: await bcrypt.hash("Password@123", 10),
        role: UserRole.USER,
        phone: faker.phone.number({ style: "national" }),
        status: UserStatus.ACTIVE,
        referralCode: `CUST${faker.string.alphanumeric({ length: 5, casing: "upper" })}`,
        createdAt: faker.date.past({ years: 1 }),
      },
    });
    customers.push(user);
  }

  const providers: Array<{ id: string; serviceCategory: string; country: string }> = [];

  for (const country of countries) {
    const countryServices = services.filter((s) => country.serviceIds.includes(s.id));

    for (let i = 0; i < 8; i++) {
      const email = `provider-${country.code}-${i}@example.com`;
      const svc = faker.helpers.arrayElement(countryServices);
      const region = faker.helpers.arrayElement(country.regions);
      const city = faker.helpers.arrayElement(region.cities);

      const pUser = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: faker.person.fullName(),
          password: await bcrypt.hash("Password@123", 10),
          role: UserRole.PROVIDER,
          phone: faker.phone.number({ style: "national" }),
          status: UserStatus.ACTIVE,
          referralCode: `PROV${country.code.toUpperCase()}${i}`,
          createdAt: faker.date.past({ years: 1 }),
        },
      });

      const pRecord = await prisma.provider.upsert({
        where: { userId: pUser.id },
        update: { country: country.code },
        create: {
          userId: pUser.id,
          businessName: `${faker.company.name()} — ${svc.title}`,
          description: svc.description,
          serviceCategory: svc.category,
          location: city,
          city,
          state: region.state,
          pincode: faker.location.zipCode(),
          country: country.code,
          status: ProviderStatus.ACTIVE,
          verificationStatus: VerificationStatus.VERIFIED,
          isVerified: true,
          canReceiveBookings: true,
          rating: faker.number.float({ min: 3.5, max: 5, multipleOf: 0.1 }),
          totalReviews: faker.number.int({ min: 5, max: 50 }),
          completedJobs: faker.number.int({ min: 10, max: 200 }),
          createdAt: pUser.createdAt,
        },
      });

      providers.push({
        id: pRecord.id,
        serviceCategory: svc.category,
        country: country.code,
      });

      await prisma.providerVerification.upsert({
        where: { providerId: pRecord.id },
        update: {},
        create: {
          providerId: pRecord.id,
          aadhaarStatus: DocStatus.APPROVED,
          aadhaarNumber: faker.string.numeric(12),
          panStatus: DocStatus.APPROVED,
          panNumber: faker.string.alphanumeric({ length: 10, casing: "upper" }),
          certificateStatus: DocStatus.APPROVED,
          addressStatus: DocStatus.APPROVED,
          profileStatus: DocStatus.APPROVED,
        },
      });
    }
  }

  console.log("Creating Bookings across countries...");
  let bookingIndex = 0;

  for (const country of countries) {
    const countryServices = services.filter((s) => country.serviceIds.includes(s.id));
    const countryProviders = providers.filter((p) => p.country === country.code);

    for (let i = 0; i < 20; i++) {
      const customer = faker.helpers.arrayElement(customers);
      const provider = faker.helpers.arrayElement(countryProviders);
      const svc = faker.helpers.arrayElement(countryServices);
      const region = faker.helpers.arrayElement(country.regions);
      const city = faker.helpers.arrayElement(region.cities);
      const bNumber = `BKG-${country.code.toUpperCase()}-${String(bookingIndex++).padStart(4, "0")}`;

      const createdAt = faker.date.past({ years: 1 });
      const isCompleted = i < 15;
      const bStatus = isCompleted
        ? BookingStatus.COMPLETED
        : faker.helpers.arrayElement([
            BookingStatus.PENDING,
            BookingStatus.IN_PROGRESS,
            BookingStatus.CANCELLED,
          ]);

      const subService =
        svc.subServices && svc.subServices.length > 0
          ? faker.helpers.arrayElement(svc.subServices)
          : svc.title;

      const booking = await prisma.booking.upsert({
        where: { bookingNumber: bNumber },
        update: { country: country.code },
        create: {
          bookingNumber: bNumber,
          userId: customer.id,
          providerId: provider.id,
          serviceName: svc.title,
          serviceCategory: svc.category,
          location: city,
          country: country.code,
          amount: faker.number.float({ min: 200, max: 5000, multipleOf: 0.01 }),
          commission: faker.number.float({ min: 20, max: 500, multipleOf: 0.01 }),
          status: bStatus,
          scheduledAt: new Date(createdAt.getTime() + 86400000),
          completedAt:
            bStatus === BookingStatus.COMPLETED
              ? new Date(createdAt.getTime() + 172800000)
              : null,
          createdAt,
        },
      });

      if (bStatus === BookingStatus.COMPLETED && i < 10) {
        await prisma.review.upsert({
          where: { bookingId: booking.id },
          update: {},
          create: {
            bookingId: booking.id,
            userId: customer.id,
            providerId: provider.id,
            rating: faker.number.int({ min: 3, max: 5 }),
            comment: `Great ${subService} service in ${city}!`,
            createdAt: new Date(booking.completedAt!.getTime() + 86400000),
          },
        });
      }
    }
  }

  console.log("Creating Referrals...");
  for (let i = 0; i < 20; i++) {
    const inviter = faker.helpers.arrayElement(customers);
    const referred = faker.helpers.arrayElement(customers);
    if (inviter.id === referred.id) continue;

    await prisma.referral.upsert({
      where: { id: `REF-${i}` },
      update: {},
      create: {
        id: `REF-${i}`,
        referralCode: inviter.referralCode || `TEMP${i}`,
        inviterId: inviter.id,
        referredUserId: referred.id,
        rewardAmount: 100,
        status: faker.helpers.arrayElement(Object.values(ReferralStatus)),
        createdAt: faker.date.recent({ days: 90 }),
      },
    });
  }

  console.log("Creating Rewards...");
  for (let i = 0; i < 20; i++) {
    const p = faker.helpers.arrayElement(providers);
    await prisma.reward.upsert({
      where: { id: `REW-${i}` },
      update: {},
      create: {
        id: `REW-${i}`,
        providerId: p.id,
        type: faker.helpers.arrayElement(Object.values(RewardType)),
        title: "Performance Bonus",
        description: faker.lorem.sentence(),
        value: faker.number.float({ min: 10, max: 200, multipleOf: 1 }),
        isAutomatic: true,
        status: faker.helpers.arrayElement(Object.values(RewardStatus)),
        createdAt: faker.date.recent({ days: 120 }),
      },
    });
  }

  console.log(
    `✅ Seeding complete — ${services.length} services, ${countries.length} countries, ${serviceCategories.length - 1} categories`
  );
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
