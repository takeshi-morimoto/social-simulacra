import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "メールアドレスとパスワード（8文字以上）を入力してください" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    return NextResponse.json(
      { error: "このメールアドレスは既に登録されています" },
      { status: 409 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    name: name || null,
    email,
    password: hashedPassword,
  });

  return NextResponse.json({ success: true });
}
