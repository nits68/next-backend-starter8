import db from "@/prisma/db";
import { NextRequest, NextResponse } from "next/server";

// Keresés az 1:N kapcsolat mindkét oldalára adott feltétellel, pl.:
// GET /api-examples/articles/search?title=film&author=anna
// azok a cikkek (N oldal), amelyek címében szerepel a "film",
// ÉS a szerzőjük (1 oldal, Author) nevében szerepel az "anna" (kis- és nagybetű nem számít)
export async function GET(request: NextRequest) {
  try {
    // query paraméterek kiolvasása és ellenőrzése
    const title = request.nextUrl.searchParams.get("title");
    const author = request.nextUrl.searchParams.get("author");
    if (!title || !author) {
      return NextResponse.json(
        { message: "A title és az author paraméter megadása kötelező!" },
        { status: 400 },
      );
    }

    const data = await db.orm.public.Article.include("author")
      .where((a) => a.title.ilike(`%${title}%`)) // feltétel a cikkre (Article)
      .where((a) => a.author.some((u) => u.name.ilike(`%${author}%`))) // feltétel a szerzőre (Author)
      .orderBy((a) => a.author.name.asc()) // kapcsolati mezőre (name) csak a rendezésnél lehet hivatkozni, a where feltételben nem
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
