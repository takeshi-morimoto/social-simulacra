import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidateProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });

  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, session.user.id));

  return NextResponse.json(profile ?? null);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });

  const { name, party, district, platform, customData } = await req.json();

  const [existing] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, session.user.id));

  if (existing) {
    await db.update(candidateProfiles)
      .set({ name, party, district, platform, customData: customData || "", updatedAt: new Date() })
      .where(eq(candidateProfiles.userId, session.user.id));
  } else {
    await db.insert(candidateProfiles)
      .values({ userId: session.user.id, name, party, district, platform, customData: customData || "" });
  }

  return NextResponse.json({ success: true });
}
