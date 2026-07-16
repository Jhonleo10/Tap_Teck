"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAction } from "@/lib/action-response";
import { z } from "zod";

const createPlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be >= 0"),
  durationMode: z.enum(["DAY", "WEEK", "MONTH"]),
  durationDays: z.number().int().min(1),
  features: z.array(z.string()).optional(),
});

const updatePlanSchema = createPlanSchema.partial();

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export async function getPlans() {
  return withAction(async () => {
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });
    return plans;
  }, "getPlans");
}

export async function getPlanById(id: string) {
  return withAction(async () => {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });
    return plan;
  }, "getPlanById");
}

export async function createPlan(input: CreatePlanInput) {
  return withAction(async () => {
    const validated = createPlanSchema.parse(input);
    const plan = await prisma.plan.create({
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        durationMode: validated.durationMode,
        durationDays: validated.durationDays,
        features: validated.features ?? [],
      },
    });
    revalidatePath("/plans");
    return plan;
  }, "createPlan", "Plan created successfully");
}

export async function updatePlan(id: string, input: UpdatePlanInput) {
  return withAction(async () => {
    const validated = updatePlanSchema.parse(input);
    const plan = await prisma.plan.update({
      where: { id },
      data: validated,
    });
    revalidatePath("/plans");
    return plan;
  }, "updatePlan", "Plan updated successfully");
}

export async function togglePlan(id: string, isActive: boolean) {
  return withAction(async () => {
    const plan = await prisma.plan.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/plans");
    return plan;
  }, "togglePlan", `Plan ${isActive ? "activated" : "deactivated"} successfully`);
}

export async function deletePlan(id: string) {
  return withAction(async () => {
    await prisma.plan.delete({ where: { id } });
    revalidatePath("/plans");
  }, "deletePlan", "Plan deleted successfully");
}

export async function getPlanStats() {
  return withAction(async () => {
    const [total, active, totalSubscriptions, activeSubscriptions] = await Promise.all([
      prisma.plan.count(),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.providerSubscription.count(),
      prisma.providerSubscription.count({ where: { status: "ACTIVE" } }),
    ]);
    return { total, active, totalSubscriptions, activeSubscriptions };
  }, "getPlanStats");
}
