import db from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";

// Mindkét route itt dinamikusan kapja az id paramétert
type Params = { params: Promise<{ id: string }> };

// Egy rekord lekérdezése azonosító alapján
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    // dinamikus paraméter kiolvasása és ellenőrzése
    const { id } = await params;
    const id_article = Number(id);
    if (Number.isNaN(id_article)) {
      return NextResponse.json({ message: "Hibás azonosító!" }, { status: 400 });
    }
    const data = await db.orm.public.Article.include("author").where({ id: id_article }).first();
    if (!data) {
      return NextResponse.json({ message: "Nincs ilyen cikk!" }, { status: 404 });
    }
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

// Rekord részleges módosítása (csak a kérésben megadott mezők változnak)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    // dinamikus paraméter kiolvasása és ellenőrzése
    const { id } = await params;
    const id_article = Number(id);
    if (Number.isNaN(id_article)) {
      return NextResponse.json({ message: "Hibás azonosító!" }, { status: 400 });
    }
    // a kérés törzsének kiolvasása és az id mező eltávolítása
    const body = await request.json();
    delete body.id; // az azonosítót a kérés törzséből nem engedjük átírni

    const updated = await db.orm.public.Article.where({ id: id_article }).update(body);
    if (!updated) {
      return NextResponse.json({ message: "Nincs ilyen cikk!" }, { status: 404 });
    }
    return NextResponse.json(updated);
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

// Rekord törlése
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    // dinamikus paraméter kiolvasása és ellenőrzése
    const { id } = await params;
    const id_article = Number(id);
    if (Number.isNaN(id_article)) {
      return NextResponse.json({ message: "Hibás azonosító!" }, { status: 400 });
    }
    const deleted = await db.orm.public.Article.where({ id: id_article }).delete();
    if (!deleted) {
      return NextResponse.json({ message: "Nincs ilyen cikk!" }, { status: 404 });
    }
    // sikeres törlés, nincs visszaadandó tartalom (204 No Content)
    return new NextResponse(null, { status: 204 });
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
