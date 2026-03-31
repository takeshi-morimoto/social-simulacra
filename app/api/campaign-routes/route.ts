import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaignRoutes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });

  const routes = await db
    .select()
    .from(campaignRoutes)
    .where(eq(campaignRoutes.userId, session.user.id));

  return NextResponse.json(routes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });

  const { municipality, name, routeData } = await req.json();

  const [route] = await db
    .insert(campaignRoutes)
    .values({
      userId: session.user.id,
      municipality,
      name: name || "",
      routeData: typeof routeData === "string" ? routeData : JSON.stringify(routeData),
    })
    .returning();

  return NextResponse.json({ id: route.id });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });

  const { id, name, routeData } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await db
    .update(campaignRoutes)
    .set({
      name: name || "",
      routeData: typeof routeData === "string" ? routeData : JSON.stringify(routeData),
      updatedAt: new Date(),
    })
    .where(and(eq(campaignRoutes.id, id), eq(campaignRoutes.userId, session.user.id)));

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await db
    .delete(campaignRoutes)
    .where(and(eq(campaignRoutes.id, id), eq(campaignRoutes.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
