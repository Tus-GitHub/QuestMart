import { NextResponse } from "next/server";
import { query } from "@/lib/db.mjs";
import { steamReferencePrice } from "@/lib/reference-prices.mjs";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function tryQuery(sql, values) {
    if (!process.env.DATABASE_URL) return null;
    try { return await query(sql, values); } catch { return null; }
}

export async function GET(request) {
    const params = new URL(request.url).searchParams;
    const rawgId = Number(params.get("gameId"));
    if (!Number.isSafeInteger(rawgId) || rawgId < 1) {
        return NextResponse.json({ success: false, message: "A valid gameId is required" }, { status: 400 });
    }
    const cached = (await tryQuery("SELECT * FROM game_prices WHERE rawg_id = $1", [rawgId]))?.rows[0];
    if (cached && Number.isInteger(cached.price_paise) && cached.price_paise >= 0 && cached.price_formatted && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS && !cached.not_on_steam) {
        return NextResponse.json({ success: true, priceINR: cached.price_paise / 100, priceFormatted: cached.price_formatted, isFree: cached.is_free, cached: true });
    }
    const key = process.env.NEXT_PUBLIC_ROWG_KEY;
    if (!key) return NextResponse.json({ success: false, message: "Reference pricing is not configured" });
    try {
        const storesResponse = await fetch(`https://api.rawg.io/api/games/${rawgId}/stores?key=${key}`, { signal: AbortSignal.timeout(7000) });
        if (!storesResponse.ok) throw new Error("Catalog unavailable");
        const stores = await storesResponse.json();
        const steamAppId = stores.results?.find(store => store.store_id === 1)?.url?.match(/\/app\/(\d+)/i)?.[1];
        if (!steamAppId) return NextResponse.json({ success: false, message: "No Steam reference price" });
        const steamResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${steamAppId}&cc=in`, { signal: AbortSignal.timeout(7000) });
        if (!steamResponse.ok) throw new Error("Steam unavailable");
        const steam = await steamResponse.json();
        const price = steamReferencePrice(steam[steamAppId]);
        if (!price) return NextResponse.json({ success: false, message: "Reference price unavailable" });
        await tryQuery(`INSERT INTO game_prices
            (rawg_id, steam_app_id, game_name, price_paise, price_formatted, is_free, not_on_steam, fetched_at)
            VALUES ($1, $2, $3, $4, $5, $6, false, now())
            ON CONFLICT (rawg_id) DO UPDATE SET steam_app_id = EXCLUDED.steam_app_id,
            game_name = EXCLUDED.game_name, price_paise = EXCLUDED.price_paise,
            price_formatted = EXCLUDED.price_formatted, is_free = EXCLUDED.is_free,
            not_on_steam = false, fetched_at = now()`,
            [rawgId, steamAppId, (params.get("name") || "").slice(0, 200), price.pricePaise, price.priceFormatted, price.isFree]);
        return NextResponse.json({ success: true, priceINR: price.pricePaise / 100, priceFormatted: price.priceFormatted, isFree: price.isFree });
    } catch {
        return NextResponse.json({ success: false, message: "Reference price unavailable" }, { status: 502 });
    }
}
