-- PostgreSQL 14+. Money is stored as whole INR paise, never floating point.
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE CHECK (username = lower(username) AND username ~ '^[a-z0-9_-]{3,30}$'),
  email TEXT NOT NULL UNIQUE CHECK (email = lower(email) AND email = btrim(email) AND char_length(email) BETWEEN 3 AND 254),
  password_hash TEXT NOT NULL CHECK (char_length(password_hash) BETWEEN 20 AND 200),
  avatar TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION valid_listing_photos(value TEXT[]) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT value IS NOT NULL AND array_ndims(value) = 1 AND cardinality(value) BETWEEN 1 AND 5
    AND NOT EXISTS (
      SELECT 1 FROM unnest(value) photo
      WHERE photo IS NULL OR char_length(photo) > 2048 OR photo !~ '^https://[^/@?#[:space:]]+([/?#]|$)'
    );
$$;

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rawg_id BIGINT CHECK (rawg_id BETWEEN 1 AND 9007199254740991),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  platform TEXT NOT NULL CHECK (platform IN ('PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'Nintendo Switch', 'PC')),
  format TEXT NOT NULL CHECK (format IN ('disc', 'cartridge')),
  condition TEXT NOT NULL CHECK (condition IN ('like-new', 'good', 'fair')),
  price_paise INTEGER NOT NULL CHECK (price_paise BETWEEN 100 AND 10000000),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 20 AND 3000),
  photos TEXT[] NOT NULL CHECK (valid_listing_photos(photos)),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, seller_id)
);
CREATE INDEX listings_seller_created_idx ON listings (seller_id, created_at DESC);
CREATE INDEX listings_available_filter_idx ON listings (status, platform, price_paise);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  listing_id UUID NOT NULL,
  snapshot_title TEXT NOT NULL CHECK (char_length(btrim(snapshot_title)) BETWEEN 2 AND 120),
  snapshot_platform TEXT NOT NULL CHECK (snapshot_platform IN ('PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'Nintendo Switch', 'PC')),
  snapshot_format TEXT NOT NULL CHECK (snapshot_format IN ('disc', 'cartridge')),
  snapshot_condition TEXT NOT NULL CHECK (snapshot_condition IN ('like-new', 'good', 'fair')),
  snapshot_price_paise INTEGER NOT NULL CHECK (snapshot_price_paise BETWEEN 100 AND 10000000),
  snapshot_currency TEXT NOT NULL DEFAULT 'INR' CHECK (snapshot_currency = 'INR'),
  snapshot_photo TEXT NOT NULL CHECK (valid_listing_photos(ARRAY[snapshot_photo])),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_mode TEXT NOT NULL DEFAULT 'test' CHECK (payment_mode = 'test'),
  payment_provider TEXT CHECK (char_length(payment_provider) BETWEEN 1 AND 64 AND payment_provider ~ '^[a-z0-9_-]+$'),
  provider_order_id TEXT CHECK (char_length(provider_order_id) BETWEEN 1 AND 200),
  provider_payment_id TEXT UNIQUE CHECK (char_length(provider_payment_id) BETWEEN 1 AND 200),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (buyer_id <> seller_id),
  FOREIGN KEY (listing_id, seller_id) REFERENCES listings(id, seller_id) ON DELETE RESTRICT
);
CREATE INDEX orders_buyer_created_idx ON orders (buyer_id, created_at DESC);
CREATE INDEX orders_seller_created_idx ON orders (seller_id, created_at DESC);
-- Cancel failed/abandoned orders before re-offering the one physical copy.
CREATE UNIQUE INDEX orders_one_active_per_listing_idx ON orders(listing_id)
  WHERE status IN ('pending', 'confirmed', 'completed');

CREATE TABLE game_prices (
  rawg_id BIGINT PRIMARY KEY CHECK (rawg_id BETWEEN 1 AND 9007199254740991),
  steam_app_id TEXT CHECK (steam_app_id ~ '^[0-9]+$'),
  game_name TEXT NOT NULL DEFAULT '',
  price_paise INTEGER CHECK (price_paise >= 0),
  price_formatted TEXT,
  is_free BOOLEAN NOT NULL DEFAULT false,
  not_on_steam BOOLEAN NOT NULL DEFAULT false,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE FUNCTION protect_listing_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    RAISE EXCEPTION 'Listing identity cannot change' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER listings_identity BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION protect_listing_identity();

CREATE FUNCTION protect_order_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.id, NEW.buyer_id, NEW.seller_id, NEW.listing_id, NEW.snapshot_title,
         NEW.snapshot_platform, NEW.snapshot_format, NEW.snapshot_condition,
         NEW.snapshot_price_paise, NEW.snapshot_currency, NEW.snapshot_photo, NEW.payment_mode)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.buyer_id, OLD.seller_id, OLD.listing_id, OLD.snapshot_title,
         OLD.snapshot_platform, OLD.snapshot_format, OLD.snapshot_condition,
         OLD.snapshot_price_paise, OLD.snapshot_currency, OLD.snapshot_photo, OLD.payment_mode) THEN
    RAISE EXCEPTION 'Order identity and item snapshot cannot change' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_snapshot BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION protect_order_snapshot();

-- These constraints complement, not replace, server authorization and the
-- transaction/conditional inventory update required when creating an order.
