const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

export async function supabaseGet(path) {
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Accept: "application/json"
    },
    cache: "no-store"
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  return res.json();
}
