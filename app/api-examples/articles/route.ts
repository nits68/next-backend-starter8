import db from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";

// Összes rekord lekérdezése
export async function GET() {
  try {
    const data = await db.orm.public.Article.include("author")
      .orderBy((e) => e.id.asc())
      .all();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message, sqlState: "sqlState" in error ? error.sqlState : "unknow" },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Adatbázis hiba!" }, { status: 500 });
  }
}

// Új rekord létrehozása
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newOne = await db.orm.public.Article.create(body);
    return NextResponse.json(newOne, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message, sqlState: "sqlState" in error ? error.sqlState : "unknow" },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: "Adatbázis hiba!" }, { status: 500 });
  }
}
