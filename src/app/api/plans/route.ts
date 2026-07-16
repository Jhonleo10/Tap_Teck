import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Public plans API for React Native user & provider apps */
export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        durationMode: true,
        durationDays: true,
        features: true,
      },
    });

    return NextResponse.json({
      plans,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
