-- ====================================================================
-- ESEKA DISTRIBUTION - SUPABASE CLOUD SQL MIGRATION
-- Offline-First Beverage Depot & Tour Management (Cameroon - FCFA / XAF)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SYNC DOCUMENTS TABLE (GENERIC REPOSITORY FOR OFFLINE-FIRST DRIFT REPLICATION)
CREATE TABLE IF NOT EXISTS public.sync_documents (
    collection TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    deposit_id TEXT, -- NULL means shared across all depots, or specific depot_id
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    server_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (collection, doc_id)
);

-- Indexes for lightning-fast keyset pagination cursor pulls
CREATE INDEX IF NOT EXISTS idx_sync_docs_keyset 
    ON public.sync_documents (collection, deposit_id, server_updated_at ASC, doc_id ASC);

CREATE INDEX IF NOT EXISTS idx_sync_docs_updated 
    ON public.sync_documents (server_updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sync_documents ENABLE ROW LEVEL SECURITY;

-- Default permissive policy for authenticated depot users
CREATE POLICY "Depot staff can read accessible documents"
    ON public.sync_documents
    FOR SELECT
    USING (
        deposit_id IS NULL OR 
        deposit_id = (auth.jwt() ->> 'deposit_id') OR 
        (auth.jwt() ->> 'role') = 'superadmin'
    );

CREATE POLICY "Depot staff can insert and update documents"
    ON public.sync_documents
    FOR ALL
    USING (
        deposit_id IS NULL OR 
        deposit_id = (auth.jwt() ->> 'deposit_id') OR 
        (auth.jwt() ->> 'role') = 'superadmin'
    );

-- 3. AUDIT LOG & RECONCILIATION TABLE
CREATE TABLE IF NOT EXISTS public.depot_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_id TEXT NOT NULL,
    tour_id TEXT,
    action TEXT NOT NULL,
    details JSONB NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. RPC FUNCTION: sync_push_rows (LAST-WRITE-WINS CONFLICT RESOLUTION)
-- Receives dirty rows from Drift SQLite local client, merges with server state
CREATE OR REPLACE FUNCTION public.sync_push_rows(
    p_rows JSONB,
    p_client_deposit_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row JSONB;
    v_collection TEXT;
    v_doc_id TEXT;
    v_deposit_id TEXT;
    v_payload JSONB;
    v_version INT;
    v_deleted BOOLEAN;
    v_existing_version INT;
    v_synced_count INT := 0;
    v_rejected_count INT := 0;
    v_results JSONB := '[]'::jsonb;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_collection := v_row->>'collection';
        v_doc_id := v_row->>'doc_id';
        v_deposit_id := COALESCE(v_row->>'deposit_id', p_client_deposit_id);
        v_payload := COALESCE(v_row->'payload', '{}'::jsonb);
        v_version := COALESCE((v_row->>'version')::INT, 1);
        v_deleted := COALESCE((v_row->>'deleted')::BOOLEAN, false);

        -- Check existing version on server
        SELECT version INTO v_existing_version
        FROM public.sync_documents
        WHERE collection = v_collection AND doc_id = v_doc_id;

        -- Last-Write-Wins (LWW) condition: client version must be >= server version
        IF v_existing_version IS NULL OR v_version >= v_existing_version THEN
            INSERT INTO public.sync_documents (
                collection, doc_id, deposit_id, payload, version, deleted, server_updated_at
            )
            VALUES (
                v_collection, v_doc_id, v_deposit_id, v_payload, v_version, v_deleted, timezone('utc'::text, now())
            )
            ON CONFLICT (collection, doc_id) DO UPDATE
            SET payload = EXCLUDED.payload,
                deposit_id = EXCLUDED.deposit_id,
                version = EXCLUDED.version,
                deleted = EXCLUDED.deleted,
                server_updated_at = timezone('utc'::text, now());

            v_synced_count := v_synced_count + 1;
            v_results := v_results || jsonb_build_object(
                'collection', v_collection,
                'doc_id', v_doc_id,
                'status', 'ACCEPTED',
                'version', v_version
            );
        ELSE
            -- Client version is stale (Conflict lost)
            v_rejected_count := v_rejected_count + 1;
            v_results := v_results || jsonb_build_object(
                'collection', v_collection,
                'doc_id', v_doc_id,
                'status', 'CONFLICT_STALE',
                'server_version', v_existing_version
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'synced_count', v_synced_count,
        'rejected_count', v_rejected_count,
        'items', v_results
    );
END;
$$;

-- 5. RPC FUNCTION: sync_pull_rows (KEYSET CURSOR SCOPED BY DEPOT)
CREATE OR REPLACE FUNCTION public.sync_pull_rows(
    p_collection TEXT,
    p_deposit_id TEXT,
    p_cursor_timestamp TIMESTAMPTZ DEFAULT '1970-01-01 00:00:00+00'::timestamptz,
    p_cursor_doc_id TEXT DEFAULT '',
    p_limit INT DEFAULT 100
)
RETURNS TABLE (
    collection TEXT,
    doc_id TEXT,
    deposit_id TEXT,
    payload JSONB,
    version INT,
    deleted BOOLEAN,
    server_updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        s.collection,
        s.doc_id,
        s.deposit_id,
        s.payload,
        s.version,
        s.deleted,
        s.server_updated_at
    FROM public.sync_documents s
    WHERE (p_collection IS NULL OR s.collection = p_collection)
      AND (s.deposit_id IS NULL OR s.deposit_id = p_deposit_id OR p_deposit_id = 'all')
      AND (
          s.server_updated_at > p_cursor_timestamp
          OR (s.server_updated_at = p_cursor_timestamp AND s.doc_id > p_cursor_doc_id)
      )
    ORDER BY s.server_updated_at ASC, s.doc_id ASC
    LIMIT p_limit;
$$;

-- 6. SEED INITIAL DATA FOR ESEKA DEPOTS, BEVERAGES & FLEET
INSERT INTO public.sync_documents (collection, doc_id, deposit_id, payload, version, deleted)
VALUES 
    -- Product catalog (Beverages common to Cameroonian market)
    ('products', 'prod_33_export', NULL, '{
        "id": "prod_33_export",
        "name": "\"33\" Export 65cl",
        "category": "Bière Blonde",
        "crateCapacity": 12,
        "liquidPrice": 6500,
        "crateDepositPrice": 1500,
        "bottleDepositPrice": 125,
        "totalCratePrice": 8000,
        "barcode": "6041001001",
        "sku": "33EXP-65"
    }'::jsonb, 1, false),

    ('products', 'prod_kadji', NULL, '{
        "id": "prod_kadji",
        "name": "Kadji Beer 65cl",
        "category": "Bière Premium",
        "crateCapacity": 12,
        "liquidPrice": 7200,
        "crateDepositPrice": 1500,
        "bottleDepositPrice": 125,
        "totalCratePrice": 8700,
        "barcode": "6041001002",
        "sku": "KADJI-65"
    }'::jsonb, 1, false),

    ('products', 'prod_castel', NULL, '{
        "id": "prod_castel",
        "name": "Castel Beer 65cl",
        "category": "Bière Blonde",
        "crateCapacity": 12,
        "liquidPrice": 6500,
        "crateDepositPrice": 1500,
        "bottleDepositPrice": 125,
        "totalCratePrice": 8000,
        "barcode": "6041001003",
        "sku": "CASTEL-65"
    }'::jsonb, 1, false),

    ('products', 'prod_guinness', NULL, '{
        "id": "prod_guinness",
        "name": "Guinness FES 33cl",
        "category": "Stout",
        "crateCapacity": 24,
        "liquidPrice": 10500,
        "crateDepositPrice": 2000,
        "bottleDepositPrice": 85,
        "totalCratePrice": 12500,
        "barcode": "6041001004",
        "sku": "GUIN-33"
    }'::jsonb, 1, false),

    ('products', 'prod_top_pample', NULL, '{
        "id": "prod_top_pample",
        "name": "Top Pamplemousse 60cl",
        "category": "Gazeuse",
        "crateCapacity": 12,
        "liquidPrice": 4800,
        "crateDepositPrice": 1500,
        "bottleDepositPrice": 125,
        "totalCratePrice": 6300,
        "barcode": "6041001005",
        "sku": "TOP-PAMP"
    }'::jsonb, 1, false),

    -- Fleet vehicles in Eséka
    ('vehicles', 'veh_camion_5t', 'depot_eseka_centre', '{
        "id": "veh_camion_5t",
        "name": "Camion 5T Mercedes Benz",
        "plate": "LT 894 AB",
        "type": "TRUCK_5T",
        "maxCrates": 280,
        "maxWeightKg": 5000,
        "assignedDriverId": "user_driver_paul",
        "status": "AVAILABLE"
    }'::jsonb, 1, false),

    ('vehicles', 'veh_pickup_hilux', 'depot_eseka_centre', '{
        "id": "veh_pickup_hilux",
        "name": "Pickup Toyota Hilux 4x4",
        "plate": "CE 412 HK",
        "type": "PICKUP",
        "maxCrates": 90,
        "maxWeightKg": 1500,
        "assignedDriverId": "user_driver_alain",
        "status": "AVAILABLE"
    }'::jsonb, 1, false),

    ('vehicles', 'veh_tricycle_tvs', 'depot_eseka_centre', '{
        "id": "veh_tricycle_tvs",
        "name": "Tricycle TVS King Cargo",
        "plate": "ESK-TRI-02",
        "type": "TRICYCLE",
        "maxCrates": 40,
        "maxWeightKg": 600,
        "assignedDriverId": "user_driver_jean",
        "status": "AVAILABLE"
    }'::jsonb, 1, false),

    -- Customers / Points of sale in Eséka (Bars, Ventes à emporter, Caves)
    ('customers', 'cust_boukarou', 'depot_eseka_centre', '{
        "id": "cust_boukarou",
        "name": "Bar Le Boukarou Eséka",
        "type": "BAR",
        "ownerName": "M. Nlend Joseph",
        "phone": "+237 677 12 34 56",
        "quarter": "Quartier Gare",
        "emptyCratesBalance": -24,
        "gps": {"lat": 3.6489, "lng": 10.7712}
    }'::jsonb, 1, false),

    ('customers', 'cust_cave_palmier', 'depot_eseka_centre', '{
        "id": "cust_cave_palmier",
        "name": "Cave Le Palmier Royal",
        "type": "CAVE",
        "ownerName": "Mme Ngo Mandeng",
        "phone": "+237 699 98 76 54",
        "quarter": "Marché Central",
        "emptyCratesBalance": -12,
        "gps": {"lat": 3.6421, "lng": 10.7745}
    }'::jsonb, 1, false),

    ('customers', 'cust_oasis_carrefour', 'depot_eseka_centre', '{
        "id": "cust_oasis_carrefour",
        "name": "Boutique Snack L''Oasis",
        "type": "SNACK",
        "ownerName": "M. Biyong Pierre",
        "phone": "+237 655 44 33 22",
        "quarter": "Carrefour Hôpital",
        "emptyCratesBalance": 0,
        "gps": {"lat": 3.6510, "lng": 10.7680}
    }'::jsonb, 1, false)

ON CONFLICT (collection, doc_id) DO NOTHING;
