const SUPABASE_URL = process.env.SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SECRET_KEY) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY first.");
}

const SOURCE = "https://data.seattle.gov/resource/76t5-zqzr.json";
const PAGE = 1000;
const MAX_ROWS = Number(process.env.SEATTLE_MAX_ROWS || 50000);

const first = (o, ...keys) => {
  for (const k of keys) {
    if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== "") return o[k];
  }
  return null;
};

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

const int = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.round(x) : null;
};

function extractLatLng(r) {
  const lat = num(first(r, "latitude", "lat"));
  const lng = num(first(r, "longitude", "lon", "lng"));
  if (lat !== null && lng !== null) return [lat, lng];

  const loc = first(r, "location", "location_1");
  if (loc?.coordinates?.length >= 2) return [num(loc.coordinates[1]), num(loc.coordinates[0])];
  if (loc?.latitude && loc?.longitude) return [num(loc.latitude), num(loc.longitude)];
  return [null, null];
}

function normalizeStage(status = "") {
  const s = String(status).toLowerCase();
  if (/cancel|withdraw|void|expire/.test(s)) return "CANCELLED";
  if (/final|complete|closed/.test(s)) return "FINAL";
  if (/construction|inspection/.test(s)) return "CONSTRUCTION";
  if (/issued|permit issued/.test(s)) return "ISSUED";
  if (/approved|ready to issue/.test(s)) return "APPROVED";
  if (/review|correction|intake|screen/.test(s)) return "REVIEW";
  return "APPLICATION";
}

function classifyNewResidential(r) {
  const text = [
    first(r, "description"),
    first(r, "category"),
    first(r, "permit_type"),
    first(r, "permit_type_mapped"),
    first(r, "permit_class")
  ].filter(Boolean).join(" ").toLowerCase();

  const units = int(first(r, "housing_units", "housingunits", "housing_units_net", "units"));

  const exclude = /(remodel|alteration|addition|repair|reroof|re-roof|mechanical|electrical|plumbing|sign|tenant improvement|demolition only|demo only)/;
  const include = /(new|construct|construction).*(single family|single-family|sfr|duplex|townhouse|townhome|multifamily|multi-family|apartment|residential)|((single family|single-family|sfr|duplex|townhouse|townhome|multifamily|multi-family|apartment).*(new|construct))/;

  if (exclude.test(text) && !include.test(text)) return false;
  if (units !== null && units > 0 && /residen|housing|dwelling|town|family|apartment/.test(text)) return true;
  return include.test(text);
}

function normalize(r) {
  const permitNumber = String(first(r,
    "application_permit_number",
    "permitnum",
    "permit_number",
    "permit_no"
  ) || "");

  const [latitude, longitude] = extractLatLng(r);
  const status = first(r, "status", "permit_status", "current_status") || "";
  const units = int(first(r, "housing_units", "housingunits", "housing_units_net", "units"));
  const address = first(r, "address", "project_address", "site_address");

  return {
    city: "Seattle",
    source: "Seattle Open Data",
    source_id: permitNumber,
    permit_number: permitNumber,
    parent_permit: first(r, "parent_permit", "parent_permit_number"),
    address,
    parcel_number: first(r, "parcel", "parcel_number"),
    zip_code: first(r, "zip", "zip_code", "zipcode"),
    neighborhood: first(r, "neighborhood"),
    latitude,
    longitude,
    builder: first(r, "contractor", "contractor_name"),
    owner_name: first(r, "owner", "owner_name"),
    residential_type: first(r, "category", "permit_class"),
    unit_count: units,
    applied_date: first(r, "application_date", "applied_date", "date_applied"),
    issued_date: first(r, "issue_date", "issued_date"),
    finaled_date: first(r, "final_date", "finaled_date"),
    raw_status: String(status),
    normalized_stage: normalizeStage(status),
    description: first(r, "description"),
    is_new_residential: classifyNewResidential(r),
    source_url: "https://data.seattle.gov/d/76t5-zqzr",
    source_updated_at: first(r, "last_updated", "updated_at"),
    synced_at: new Date().toISOString(),
    raw: r
  };
}

async function upsert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/permits?on_conflict=city,source_id`, {
    method: "POST",
    headers: {
      apikey: SECRET_KEY,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(rows)
  });
  if (!res.ok) throw new Error(`Supabase upsert failed ${res.status}: ${await res.text()}`);
}

let offset = 0;
let total = 0;
let residential = 0;

while (offset < MAX_ROWS) {
  const url = new URL(SOURCE);
  url.searchParams.set("$limit", String(PAGE));
  url.searchParams.set("$offset", String(offset));
  url.searchParams.set("$order", ":id");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Seattle fetch failed ${res.status}: ${await res.text()}`);
  const raw = await res.json();
  if (!raw.length) break;

  const rows = raw.map(normalize).filter(r => r.source_id);
  residential += rows.filter(r => r.is_new_residential).length;

  for (let i = 0; i < rows.length; i += 250) {
    await upsert(rows.slice(i, i + 250));
  }

  total += rows.length;
  offset += raw.length;
  console.log(`Synced ${total} Seattle permits (${residential} classified new residential)`);

  if (raw.length < PAGE) break;
}

console.log("Seattle sync complete.");
