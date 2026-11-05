// Reference pricing is informational; checkout must use the seller's listing price.
export function steamReferencePrice(app) {
    if (!app?.success || !app.data) return null;
    const overview = app.data.price_overview;
    if (overview?.currency === "INR" && Number.isSafeInteger(overview.final) && overview.final >= 0) {
        return { pricePaise: overview.final, priceFormatted: overview.final_formatted || `₹${(overview.final / 100).toFixed(2)}`, isFree: app.data.is_free === true };
    }
    if (app.data.is_free === true) return { pricePaise: 0, priceFormatted: "Free", isFree: true };
    // Missing pricing can mean unavailable/unreleased, not free-to-play.
    return null;
}
