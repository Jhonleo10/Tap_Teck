import { PrismaClient, UserRole, UserStatus, ProviderStatus, VerificationStatus, DocStatus, BookingStatus, ReferralStatus, RewardType, RewardStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Neon production...');

  // --- 1. AppSettings (Idempotent 1 Record) ---
  console.log('Creating App Settings...');
  await prisma.appSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      commissionPercentage: 10.0,
      referralRewardAmount: 100.0,
      giftRules: {
        newProvider: 50,
        fiveStarBonus: 200,
      },
    },
  });

  // --- 2. Admin User ---
  console.log('Creating Super Admin...');
  const adminEmail = 'admin@tapteck.com';
  const hashedAdminPassword = await bcrypt.hash('Admin@123', 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedAdminPassword,
      role: UserRole.ADMIN,
      name: 'Super Admin',
      status: UserStatus.ACTIVE,
    },
    create: {
      email: adminEmail,
      name: 'Super Admin',
      password: hashedAdminPassword,
      role: UserRole.ADMIN,
      phone: '1234567890',
      status: UserStatus.ACTIVE,
      referralCode: 'ADMINX99',
    },
  });

  // --- 3. Categories, Services & SubServices ---
  console.log('Creating Service Categories & Catalog...');
  const categoryNames = [
    'Plumbing', 'Electrical', 'Cleaning', 'Appliance Repair',
    'Carpentry', 'Pest Control', 'Painting', 'Masonry',
    'Roofing', 'Landscaping'
  ];

  const categories = [];
  for (let i = 0; i < categoryNames.length; i++) {
    const slug = categoryNames[i].toLowerCase().replace(/\s+/g, '-');
    const cat = await prisma.serviceCategory.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: categoryNames[i],
        description: `Professional ${categoryNames[i]} services`,
        icon: faker.helpers.arrayElement(['wrench', 'zap', 'sparkles', 'hammer']),
        isActive: true,
      },
    });
    categories.push(cat);

    // Create 3 Services per Category
    for (let j = 0; j < 3; j++) {
      const catalogId = parseInt(`${i + 1}0${j + 1}`);
      const srvName = `${categoryNames[i]} Service ${j + 1}`;
      const srv = await prisma.platformService.upsert({
        where: { catalogId },
        update: {},
        create: {
          catalogId,
          title: srvName,
          description: faker.lorem.paragraph(),
          categoryId: cat.id,
          isActive: true,
        },
      });

      // Create 2 Subservices per Service
      for (let k = 0; k < 2; k++) {
        const subName = `${srvName} - Task ${k + 1}`;
        await prisma.subService.upsert({
          where: { serviceId_name: { serviceId: srv.id, name: subName } },
          update: {},
          create: {
            name: subName,
            serviceId: srv.id,
          },
        });
      }
    }
  }

  // --- 4. Users (20 Customers, 20 Providers) ---
  console.log('Creating Users and Providers...');
  const customers = [];
  for (let i = 0; i < 20; i++) {
    const email = `customer${i}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: faker.person.fullName(),
        password: await bcrypt.hash('Password@123', 10),
        role: UserRole.USER,
        phone: faker.phone.number({ style: 'national' }),
        status: faker.helpers.arrayElement(Object.values(UserStatus)),
        referralCode: `CUST${faker.string.alphanumeric({ length: 5, casing: 'upper' })}`,
        createdAt: faker.date.past({ years: 1 }),
      },
    });
    customers.push(user);
  }

  const providers = [];
  for (let i = 0; i < 20; i++) {
    const email = `provider${i}@example.com`;
    const pUser = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: faker.person.fullName(),
        password: await bcrypt.hash('Password@123', 10),
        role: UserRole.PROVIDER,
        phone: faker.phone.number({ style: 'national' }),
        status: UserStatus.ACTIVE,
        referralCode: `PROV${faker.string.alphanumeric({ length: 5, casing: 'upper' })}`,
        createdAt: faker.date.past({ years: 1 }),
      },
    });

    const providerLocation = faker.location.city();
    const pRecord = await prisma.provider.upsert({
      where: { userId: pUser.id },
      update: {},
      create: {
        userId: pUser.id,
        businessName: `${faker.company.name()} ${faker.company.catchPhraseAdjective()}`,
        description: faker.lorem.paragraph(),
        serviceCategory: faker.helpers.arrayElement(categoryNames),
        location: providerLocation,
        city: providerLocation,
        state: faker.location.state(),
        pincode: faker.location.zipCode(),
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
    providers.push(pRecord);

    await prisma.providerVerification.upsert({
      where: { providerId: pRecord.id },
      update: {},
      create: {
        providerId: pRecord.id,
        aadhaarStatus: DocStatus.APPROVED,
        aadhaarNumber: faker.string.numeric(12),
        panStatus: DocStatus.APPROVED,
        panNumber: faker.string.alphanumeric({ length: 10, casing: 'upper' }),
        certificateStatus: DocStatus.APPROVED,
        addressStatus: DocStatus.APPROVED,
        profileStatus: DocStatus.APPROVED,
      },
    });
  }

  // --- 5. Bookings & Reviews (50 minimum) ---
  console.log('Creating 50 Bookings and Reviews...');
  const bookings = [];
  for (let i = 0; i < 50; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const provider = faker.helpers.arrayElement(providers);
    const bNumber = `BKG-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`;

    // Spread dates over the last 12 months
    const createdAt = faker.date.past({ years: 1 });
    const isCompleted = faker.datatype.boolean() || i < 40; // Force most to be completed for dashboard
    let bStatus = isCompleted ? BookingStatus.COMPLETED : faker.helpers.arrayElement([BookingStatus.PENDING, BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED]);

    const booking = await prisma.booking.upsert({
      where: { bookingNumber: bNumber },
      update: {},
      create: {
        bookingNumber: bNumber,
        userId: customer.id,
        providerId: provider.id,
        serviceName: `${provider.serviceCategory} Service Call`,
        serviceCategory: provider.serviceCategory,
        location: customer.phone ? customer.phone : 'Standard Address', // fallback
        amount: faker.number.float({ min: 50, max: 1500, multipleOf: 0.01 }),
        commission: faker.number.float({ min: 5, max: 150, multipleOf: 0.01 }),
        status: bStatus,
        scheduledAt: new Date(createdAt.getTime() + 86400000), // Next day
        completedAt: bStatus === BookingStatus.COMPLETED ? new Date(createdAt.getTime() + 172800000) : null,
        createdAt: createdAt,
      },
    });
    bookings.push(booking);

    if (bStatus === BookingStatus.COMPLETED && i < 30) {
      // 30 reviews generated
      await prisma.review.upsert({
        where: { bookingId: booking.id },
        update: {},
        create: {
          bookingId: booking.id,
          userId: customer.id,
          providerId: provider.id,
          rating: faker.number.int({ min: 3, max: 5 }),
          comment: faker.lorem.sentence(),
          createdAt: new Date(booking.completedAt!.getTime() + 86400000),
        },
      });
    }
  }

  // --- 6. Referrals (20+) ---
  console.log('Creating Referrals...');
  for (let i = 0; i < 30; i++) {
    const inviter = faker.helpers.arrayElement(customers);
    const referred = faker.helpers.arrayElement(customers);

    // Prevent self-referral
    if (inviter.id === referred.id) continue;

    const rCode = `REF-${i}`;
    await prisma.referral.upsert({
      where: { id: rCode }, // using ID as reference point conceptually for upsert
      update: {},
      create: {
        id: rCode,
        referralCode: inviter.referralCode || `TEMP${i}`,
        inviterId: inviter.id,
        referredUserId: referred.id,
        rewardAmount: 100,
        status: faker.helpers.arrayElement(Object.values(ReferralStatus)),
        createdAt: faker.date.recent({ days: 90 }),
      },
    });
  }

  // --- 7. Rewards (20+) ---
  console.log('Creating Rewards...');
  for (let i = 0; i < 30; i++) {
    const p = faker.helpers.arrayElement(providers);
    const rId = `REW-${i}`;
    await prisma.reward.upsert({
      where: { id: rId },
      update: {},
      create: {
        id: rId,
        providerId: p.id,
        type: faker.helpers.arrayElement(Object.values(RewardType)),
        title: `Bonus Reward for Performance`,
        description: faker.lorem.sentence(),
        value: faker.number.float({ min: 10, max: 200, multipleOf: 1 }),
        isAutomatic: true,
        status: faker.helpers.arrayElement(Object.values(RewardStatus)),
        createdAt: faker.date.recent({ days: 120 }),
      },
    });
  }

  console.log('✅ Seeding completed perfectly!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
