import test from 'node:test';
import assert from 'node:assert/strict';
import { steamReferencePrice } from '../lib/reference-prices.mjs';

test('unpriced, unavailable and non-INR games are not labelled free', () => {
    for (const app of [null, { success: false }, { success: true, data: {} }, { success: true, data: { price_overview: { currency: 'USD', final: 100 } } }]) {
        assert.equal(steamReferencePrice(app), null);
    }
});
test('uses INR minor units and explicit free-to-play status', () => {
    assert.deepEqual(steamReferencePrice({ success: true, data: { price_overview: { currency: 'INR', final: 79900, final_formatted: '₹799' } } }), { pricePaise: 79900, priceFormatted: '₹799', isFree: false });
    assert.deepEqual(steamReferencePrice({ success: true, data: { is_free: true } }), { pricePaise: 0, priceFormatted: 'Free', isFree: true });
});
