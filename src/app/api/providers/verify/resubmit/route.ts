import { NextResponse } from "next/server";
import { z } from "zod";
import { providerResubmitDocument } from "@/actions/verification";

const bodySchema = z.object({
  providerId: z.string().min(1),
  documentType: z.enum(["aadhaar", "pan", "certificate", "address", "profile"]),
  documentUrl: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    await providerResubmitDocument(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
