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
  DurationMode,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { serviceCategories, services } from "../src/lib/services-data";
import { countries } from "../src/lib/countries";
import { syncServiceCatalog } from "../src/lib/sync-catalog";

const prisma = new PrismaClient();

const PROVIDERS_PER_COUNTRY = 3;
const CUSTOMERS_COUNT = 10;
const BOOKINGS_PER_COUNTRY = 5;
const REFERRALS_COUNT = 5;
const REWARDS_COUNT = 5;
const NOTIFICATIONS_COUNT = 5;
const AUDIT_LOGS_COUNT = 5;

type DocSeed = {
  aadhaarStatus: DocStatus;
  panStatus: DocStatus;
  certificateStatus: DocStatus;
  addressStatus: DocStatus;
  profileStatus: DocStatus;
  documentNotes?: Record<string, string>;
};

function docUrls(countryCode: string, index: number) {
  const s = `${countryCode}-${index}`;
  return {
    aadhaarDocUrl: `https://picsum.photos/seed/aadhaar-${s}/900/560`,
    panDocUrl: `https://picsum.photos/seed/pan-${s}/900/560`,
    certificateUrl: `https://picsum.photos/seed/cert-${s}/900/560`,
    addressProofUrl: `https://picsum.photos/seed/addr-${s}/900/560`,
    profilePhotoUrl: `https://picsum.photos/seed/profile-${s}/400/400`,
  };
}

/** All pending — ready for admin to verify every document */
function allPending(): DocSeed {
  return {
    aadhaarStatus: DocStatus.PENDING,
    panStatus: DocStatus.PENDING,
    certificateStatus: DocStatus.PENDING,
    addressStatus: DocStatus.PENDING,
    profileStatus: DocStatus.PENDING,
  };
}

/** Partial review in progress */
function underReviewDocs(): DocSeed {
  return {
    aadhaarStatus: DocStatus.APPROVED,
    panStatus: DocStatus.APPROVED,
    certificateStatus: DocStatus.PENDING,
    addressStatus: DocStatus.PENDING,
    profileStatus: DocStatus.PENDING,
  };
}

/** Rejected / re-upload requested */
function rejectedDocs(): DocSeed {
  return {
    aadhaarStatus: DocStatus.REUPLOAD_REQUESTED,
    panStatus: DocStatus.APPROVED,
    certificateStatus: DocStatus.REUPLOAD_REQUESTED,
    addressStatus: DocStatus.APPROVED,
    profileStatus: DocStatus.REUPLOAD_REQUESTED,
    documentNotes: {
      aadhaar: "Aadhaar image is blurry. Upload a clear photo showing all digits.",
      certificate: "Trade license has expired. Upload a current valid certificate.",
      profile: "Profile photo does not show your face clearly.",
    },
  };
}

function allApproved(): DocSeed {
  return {
    aadhaarStatus: DocStatus.APPROVED,
    panStatus: DocStatus.APPROVED,
    certificateStatus: DocStatus.APPROVED,
    addressStatus: DocStatus.APPROVED,
    profileStatus: DocStatus.APPROVED,
  };
}

function providerProfile(index: number): {
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  canReceiveBookings: boolean;
  status: ProviderStatus;
  docs: DocSeed;
} {
  if (index <= 1) {
    return {
      verificationStatus: VerificationStatus.PENDING,
      isVerified: false,
      canReceiveBookings: false,
      status: ProviderStatus.PENDING,
      docs: allPending(),
    };
  }
  if (index === 2) {
    return {
      verificationStatus: VerificationStatus.UNDER_REVIEW,
      isVerified: false,
      canReceiveBookings: false,
      status: ProviderStatus.PENDING,
      docs: underReviewDocs(),
    };
  }
  if (index === 3) {
    return {
      verificationStatus: VerificationStatus.REJECTED,
      isVerified: false,
      canReceiveBookings: false,
      status: ProviderStatus.INACTIVE,
      docs: rejectedDocs(),
    };
  }
  return {
    verificationStatus: VerificationStatus.VERIFIED,
    isVerified: true,
    canReceiveBookings: true,
    status: ProviderStatus.ACTIVE,
    docs: allApproved(),
  };
}

async function main() {
  console.log("🌱 Starting TapTeck database seed...");

  await prisma.appSettings.upsert({
    where: { id: "default-settings" },
    update: {},
    create: {
      id: "default-settings",
      referralRewardAmount: 100.0,
      giftRules: { newProvider: 50, fiveStarBonus: 200 },
    },
  });

  console.log("Creating Super Admin...");
  const adminEmail = "admin@tapteck.com";
  const hashedAdminPassword = await bcrypt.hash("Admin@123", 12);

  const adminUser = await prisma.user.upsert({
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

  console.log("Using existing TapTeck Service Catalog...");

  console.log("Creating customers...");
  const customers = [];
  for (let i = 0; i < CUSTOMERS_COUNT; i++) {
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

  console.log("Creating providers & verification docs for India...");
  const india = countries.find((c) => c.code === "india")!;
  const indiaServices = services.filter((s) => india.serviceIds.includes(s.id));
  const providers: Array<{
    id: string;
    userId: string;
    businessName: string;
    serviceCategory: string;
    country: string;
    verificationStatus: VerificationStatus;
    completedJobs: number;
  }> = [];

  for (let i = 0; i < PROVIDERS_PER_COUNTRY; i++) {
    const email = `provider-india-${i}@example.com`;
    const svc = faker.helpers.arrayElement(indiaServices);
    const region = faker.helpers.arrayElement(india.regions);
    const city = faker.helpers.arrayElement(region.cities);
    const profile = providerProfile(i);
    const urls = docUrls("india", i);

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
        referralCode: `PROVIND${i}`,
        createdAt: faker.date.past({ years: 1 }),
      },
    });

    const pRecord = await prisma.provider.upsert({
      where: { userId: pUser.id },
      update: {
        country: "india",
        primaryService: svc.title,
        serviceCategory: svc.category,
        verificationStatus: profile.verificationStatus,
        isVerified: profile.isVerified,
        canReceiveBookings: profile.canReceiveBookings,
        status: profile.status,
      },
      create: {
        userId: pUser.id,
        businessName: `${faker.company.name()} — ${svc.title}`,
        description: svc.description,
        serviceCategory: svc.category,
        primaryService: svc.title,
        location: city,
        city,
        state: region.state,
        pincode: faker.location.zipCode(),
        country: "india",
        status: profile.status,
        verificationStatus: profile.verificationStatus,
        isVerified: profile.isVerified,
        canReceiveBookings: profile.canReceiveBookings,
        rating: profile.isVerified
          ? faker.number.float({ min: 3.8, max: 5, multipleOf: 0.1 })
          : 0,
        totalReviews: profile.isVerified ? faker.number.int({ min: 5, max: 80 }) : 0,
        completedJobs: profile.isVerified ? faker.number.int({ min: 10, max: 250 }) : 0,
        createdAt: pUser.createdAt,
      },
    });

    providers.push({
      id: pRecord.id,
      userId: pUser.id,
      businessName: pRecord.businessName,
      serviceCategory: svc.category,
      country: "india",
      verificationStatus: profile.verificationStatus,
      completedJobs: pRecord.completedJobs,
    });

    await prisma.providerVerification.upsert({
      where: { providerId: pRecord.id },
      update: {
        ...urls,
        aadhaarStatus: profile.docs.aadhaarStatus,
        panStatus: profile.docs.panStatus,
        certificateStatus: profile.docs.certificateStatus,
        addressStatus: profile.docs.addressStatus,
        profileStatus: profile.docs.profileStatus,
        documentNotes: profile.docs.documentNotes ?? undefined,
      },
      create: {
        providerId: pRecord.id,
        aadhaarStatus: profile.docs.aadhaarStatus,
        aadhaarNumber: faker.string.numeric(12),
        panStatus: profile.docs.panStatus,
        panNumber: faker.string.alphanumeric({ length: 10, casing: "upper" }),
        certificateStatus: profile.docs.certificateStatus,
        addressStatus: profile.docs.addressStatus,
        profileStatus: profile.docs.profileStatus,
        documentNotes: profile.docs.documentNotes ?? undefined,
        rejectionReason:
          profile.verificationStatus === VerificationStatus.REJECTED
            ? "Multiple documents require re-upload before verification can continue."
            : null,
        reviewedBy: profile.isVerified ? adminUser.id : null,
        reviewedAt: profile.isVerified ? faker.date.recent({ days: 30 }) : null,
        ...urls,
      },
    });
  }

  console.log("Creating bookings for India...");
  let bookingIndex = 0;
  const countryProviders = providers.filter(
    (p) => p.verificationStatus === VerificationStatus.VERIFIED
  );
  const fallbackProviders = providers;

  for (let i = 0; i < BOOKINGS_PER_COUNTRY; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const provider = faker.helpers.arrayElement(
      countryProviders.length > 0 ? countryProviders : fallbackProviders
    );
    const svc = faker.helpers.arrayElement(indiaServices);
    const region = faker.helpers.arrayElement(india.regions);
    const city = faker.helpers.arrayElement(region.cities);
    const bNumber = `BKG-IND-${String(bookingIndex++).padStart(4, "0")}`;

    const createdAt = faker.date.past({ years: 1 });
    const isCompleted = i < 10;
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

    const completedAt =
      bStatus === BookingStatus.COMPLETED
        ? new Date(createdAt.getTime() + 172800000)
        : null;

    const booking = await prisma.booking.upsert({
      where: { bookingNumber: bNumber },
      update: {
        country: "india",
        subServiceName: subService,
        status: bStatus,
        completedAt,
      },
      create: {
        bookingNumber: bNumber,
        userId: customer.id,
        providerId: provider.id,
        serviceName: svc.title,
        subServiceName: subService,
        serviceCategory: svc.category,
        location: city,
        country: "india",
        amount: faker.number.float({ min: 200, max: 8000, multipleOf: 0.01 }),
        status: bStatus,
        scheduledAt: new Date(createdAt.getTime() + 86400000),
        completedAt,
        createdAt,
      },
    });

    if (bStatus === BookingStatus.COMPLETED && i < 7 && booking.completedAt) {
      await prisma.review.upsert({
        where: { bookingId: booking.id },
        update: {},
        create: {
          bookingId: booking.id,
          userId: customer.id,
          providerId: provider.id,
          rating: faker.number.int({ min: 3, max: 5 }),
          comment: `Great ${subService} service in ${city}, India!`,
          createdAt: new Date(booking.completedAt.getTime() + 86400000),
        },
      });
    }
  }

  console.log("Creating referrals...");
  for (let i = 0; i < REFERRALS_COUNT; i++) {
    const inviter = customers[i % customers.length];
    const referred = customers[(i + 7) % customers.length];
    if (inviter.id === referred.id) continue;

    await prisma.referral.upsert({
      where: { id: `REF-${i}` },
      update: {},
      create: {
        id: `REF-${i}`,
        referralCode: inviter.referralCode || `TEMP${i}`,
        inviterId: inviter.id,
        referredUserId: referred.id,
        rewardAmount: faker.number.int({ min: 50, max: 200 }),
        status: faker.helpers.arrayElement(Object.values(ReferralStatus)),
        createdAt: faker.date.recent({ days: 120 }),
      },
    });
  }

  console.log("Creating rewards...");
  for (let i = 0; i < REWARDS_COUNT; i++) {
    const p = providers[i % providers.length];
    await prisma.reward.upsert({
      where: { id: `REW-${i}` },
      update: {},
      create: {
        id: `REW-${i}`,
        providerId: p.id,
        type: faker.helpers.arrayElement(Object.values(RewardType)),
        title: faker.helpers.arrayElement([
          "Performance Bonus",
          "Five-Star Streak",
          "New Provider Welcome",
          "Referral Milestone",
        ]),
        description: faker.lorem.sentence(),
        value: faker.number.float({ min: 10, max: 500, multipleOf: 1 }),
        isAutomatic: faker.datatype.boolean(),
        status: faker.helpers.arrayElement(Object.values(RewardStatus)),
        createdAt: faker.date.recent({ days: 120 }),
      },
    });
  }

  console.log("Creating subscription plans...");
  const planData = [
    {
      id: "plan-day",
      name: "Day Pass",
      description: "24-hour access to receive unlimited bookings",
      price: 49,
      durationMode: DurationMode.DAY,
      durationDays: 1,
      features: JSON.stringify([
        "Unlimited bookings for 24 hours",
        "Visible in customer search results",
        "Instant booking notifications",
        "Priority customer support",
      ]),
    },
    {
      id: "plan-week",
      name: "Weekly Plan",
      description: "7 days of full platform access for providers",
      price: 199,
      durationMode: DurationMode.WEEK,
      durationDays: 7,
      features: JSON.stringify([
        "7 days of unlimited bookings",
        "Featured provider badge",
        "Priority in search results",
        "Analytics dashboard access",
        "Dedicated support",
      ]),
    },
    {
      id: "plan-month-basic",
      name: "Basic Monthly",
      description: "Essential monthly plan for growing your business",
      price: 499,
      durationMode: DurationMode.MONTH,
      durationDays: 30,
      features: JSON.stringify([
        "30 days of unlimited bookings",
        "Featured provider badge",
        "Priority in search results",
        "Analytics dashboard access",
        "Monthly performance report",
        "Dedicated account manager",
      ]),
    },
    {
      id: "plan-month-pro",
      name: "Pro Monthly",
      description: "Professional plan for top-performing providers",
      price: 999,
      durationMode: DurationMode.MONTH,
      durationDays: 30,
      features: JSON.stringify([
        "30 days of unlimited bookings",
        "Verified premium badge",
        "Top placement in search results",
        "Advanced analytics & insights",
        "Weekly performance reports",
        "Priority 24/7 support",
        "Marketing promotion opportunities",
        "Access to exclusive jobs",
      ]),
    },
    {
      id: "plan-year",
      name: "Annual Plan",
      description: "Best value — full year of premium access",
      price: 4999,
      durationMode: DurationMode.MONTH,
      durationDays: 365,
      features: JSON.stringify([
        "365 days of unlimited bookings",
        "Verified premium badge",
        "Top placement in search results",
        "Advanced analytics & insights",
        "Monthly performance reports",
        "Priority 24/7 support",
        "Marketing promotion opportunities",
        "Access to exclusive jobs",
        "2 months free compared to monthly",
      ]),
    },
  ];

  for (const plan of planData) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {},
      create: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        durationMode: plan.durationMode,
        durationDays: plan.durationDays,
        features: plan.features,
        isActive: true,
      },
    });
  }

  console.log("Creating provider subscriptions...");
  const verifiedProviders = providers.filter(
    (p) => p.verificationStatus === VerificationStatus.VERIFIED
  );
  const allPlanIds = ["plan-day", "plan-week", "plan-month-basic", "plan-month-pro", "plan-year"];

  for (let i = 0; i < Math.min(verifiedProviders.length, 5); i++) {
    const p = verifiedProviders[i];
    const planId = faker.helpers.arrayElement(allPlanIds);
    const plan = planData.find((pd) => pd.id === planId);
    const days = plan?.durationDays ?? 30;
    const startDate = faker.date.recent({ days: 120 });
    const endDate = new Date(startDate.getTime() + days * 86400000);
    const isExpired = i >= 20;
    const isCancelled = i === 24;

    let status: "ACTIVE" | "EXPIRED" | "CANCELLED" = "ACTIVE";
    if (isExpired) status = "EXPIRED";
    if (isCancelled) status = "CANCELLED";

    await prisma.providerSubscription.create({
      data: {
        providerId: p.id,
        planId,
        startDate,
        endDate,
        status,
        paymentReference: `PAY-${faker.string.alphanumeric({ length: 10, casing: "upper" })}`,
      },
    });

if (status === "ACTIVE") {
      await prisma.provider.update({
        where: { id: p.id },
        data: {
          hasActiveSubscription: true,
          freeBookingSlotsUsed: Math.min(p.completedJobs ?? 0, 5),
        },
      });
    }
  }

  console.log("Creating provider service prices...");
  const serviceTitles = services.map((s) => s.title);

  for (let i = 0; i < Math.min(providers.length, 10); i++) {
    const p = providers[i];
    const servicesForProvider = faker.helpers.arrayElements(
      serviceTitles,
      faker.number.int({ min: 1, max: 5 })
    );

    for (const svcTitle of servicesForProvider) {
      const svc = services.find((s) => s.title === svcTitle);
      const basePrice = {
        automotive: 499,
        cleaning: 799,
        "home-repair": 349,
        healthcare: 999,
        beauty: 599,
        education: 450,
        food: 1200,
        delivery: 199,
      }[svc?.category ?? "cleaning"] ?? 500;

      const hasSubServices = svc?.subServices && svc.subServices.length > 0;

      if (hasSubServices) {
        const subServicesToPrice = faker.helpers.arrayElements(
          svc!.subServices!,
          faker.number.int({ min: 1, max: Math.min(4, svc!.subServices!.length) })
        );
        for (const sub of subServicesToPrice) {
          await prisma.providerServicePrice.upsert({
            where: {
              providerId_serviceName_subServiceName: {
                providerId: p.id,
                serviceName: svcTitle,
                subServiceName: sub,
              },
            },
            update: {},
            create: {
              providerId: p.id,
              serviceName: svcTitle,
              subServiceName: sub,
              price: basePrice + faker.number.int({ min: 0, max: 800 }),
              isActive: faker.datatype.boolean(0.9),
            },
          });
        }
      } else {
        await prisma.providerServicePrice.upsert({
          where: {
            providerId_serviceName_subServiceName: {
              providerId: p.id,
              serviceName: svcTitle,
              subServiceName: svcTitle,
            },
          },
          update: {},
          create: {
            providerId: p.id,
            serviceName: svcTitle,
            subServiceName: svcTitle,
            price: basePrice + faker.number.int({ min: 0, max: 500 }),
            isActive: faker.datatype.boolean(0.9),
          },
        });
      }
    }
  }

  console.log("Creating verification messages...");
  const messageProviders = providers.filter(
    (p) =>
      p.verificationStatus === VerificationStatus.REJECTED ||
      p.verificationStatus === VerificationStatus.UNDER_REVIEW
  );

  for (const p of messageProviders) {
    await prisma.verificationMessage.create({
      data: {
        providerId: p.id,
        documentType: "aadhaar",
        message: "Your Aadhaar document is under review. We will notify you once verified.",
        action: "DOC_PENDING",
        isAutomated: true,
        adminName: "System",
      },
    });
    await prisma.verificationMessage.create({
      data: {
        providerId: p.id,
        documentType: "certificate",
        message:
          "Trade license has expired. Upload a current valid certificate to continue verification.",
        action: "DOC_REUPLOAD_REQUESTED",
        isAutomated: false,
        adminId: adminUser.id,
        adminName: adminUser.name,
      },
    });
  }

  console.log("Creating notifications...");
  const notificationTypes = [
    { type: "DOC_REUPLOAD_REQUESTED", title: "Document re-upload required", body: "Please re-upload your certificate. Approved documents remain locked." },
    { type: "DOC_APPROVED", title: "Document approved", body: "Your PAN card has been approved." },
    { type: "PROVIDER_VERIFIED", title: "Account verified", body: "Congratulations! Your provider account is fully verified." },
    { type: "BOOKING_NEW", title: "New booking", body: "You have a new booking request." },
    { type: "REVIEW_SUBMITTED", title: "Review update", body: "Admin submitted a verification review for your account." },
    { type: "SYSTEM", title: "Platform update", body: "TapTeck admin panel maintenance completed successfully." },
  ];

  for (let i = 0; i < NOTIFICATIONS_COUNT; i++) {
    const p = providers[i % providers.length];
    const tpl = notificationTypes[i % notificationTypes.length];
    await prisma.notification.upsert({
      where: { id: `NOTIF-${i}` },
      update: {},
      create: {
        id: `NOTIF-${i}`,
        providerId: p.id,
        userId: p.userId,
        title: tpl.title,
        body: tpl.body,
        type: tpl.type,
        channel: "IN_APP",
        read: i % 3 === 0,
        createdAt: faker.date.recent({ days: 45 }),
      },
    });
  }

  console.log("Creating audit logs...");
  const auditActions = [
    { action: "DOCUMENT_APPROVED", entityType: "ProviderVerification" },
    { action: "DOCUMENT_REUPLOAD_REQUESTED", entityType: "ProviderVerification" },
    { action: "VERIFICATION_REVIEW_SUBMITTED", entityType: "Provider" },
    { action: "PROVIDER_VERIFIED", entityType: "Provider" },
    { action: "SETTINGS_UPDATED", entityType: "AppSettings" },
    { action: "USER_STATUS_CHANGED", entityType: "User" },
    { action: "BOOKING_CANCELLED", entityType: "Booking" },
  ];

  for (let i = 0; i < AUDIT_LOGS_COUNT; i++) {
    const p = providers[i % providers.length];
    const audit = auditActions[i % auditActions.length];
    await prisma.auditLog.upsert({
      where: { id: `AUDIT-${i}` },
      update: {},
      create: {
        id: `AUDIT-${i}`,
        action: audit.action,
        entityType: audit.entityType,
        entityId: p.id,
        adminId: adminUser.id,
        adminName: adminUser.name,
        metadata: { seed: true, country: p.country },
        createdAt: faker.date.recent({ days: 60 }),
      },
    });
  }

  const pendingCount = providers.filter(
    (p) => p.verificationStatus === VerificationStatus.PENDING
  ).length;

  console.log(
    `✅ Seeding complete — ${countries.length} countries, ${providers.length} providers (${pendingCount} pending verification), ${CUSTOMERS_COUNT} customers, ${services.length} services`
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
