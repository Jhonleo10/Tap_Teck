"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { generateReferralCode } from "@/lib/utils";

export async function registerAdmin(formData: unknown) {
  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
      referralCode: generateReferralCode(name),
      status: "ACTIVE",
    },
  });

  return { success: true };
}

export async function requestPasswordReset(formData: unknown) {
  const parsed = forgotPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user) {
    return {
      success: true,
      message: "If an account exists, a reset link has been sent.",
    };
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000);

  await prisma.passwordResetToken.deleteMany({
    where: { email: parsed.data.email },
  });

  await prisma.passwordResetToken.create({
    data: {
      email: parsed.data.email,
      token,
      expires,
    },
  });

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${token}`;

  return {
    success: true,
    message: "If an account exists, a reset link has been sent.",
    resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
  };
}

export async function resetPassword(token: string, formData: unknown) {
  const parsed = resetPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expires < new Date()) {
    return { error: "Invalid or expired reset token" };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({ where: { token } });

  return { success: true };
}
