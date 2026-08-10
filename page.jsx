import { supabaseGet } from "@/lib/supabase-rest";
import MapClient from "@/components/MapClient";

function n(v) { return Number(v || 0); }
function fmt(v) { return new Intl.NumberFormat("en-US").format(v); }

export default async function Home() {
  let permits = [];
  let areas = [];
  let setupError = "";

  try {
    permits = await supabaseGet(
      "permits?select=id,city,permit_number,address,zip_code,latitude,longitude,unit_count,normalized_stage,applied_date,issued_date&is_new_residential=eq.true&normalized_stage=neq.CANCELLED&order=applied_date.desc.nullslast&limit=2500"
    );
    areas = await supabaseGet(
      "saturation_by_area?select=*&order=active_units.desc&limit=50"
    );
  } catch (e) {
    setupError = e?.message || String(e);
  }

  const active = permits.filter(p => !["FINAL", "CANCELLED"].includes(p.normalized_stage));
  const activeUnits = active.reduce((s, p) => s + n(p.unit_count || 1), 0);
  const issuedUnits = active.filter(p => ["ISSUED", "CONSTRUCTION"].includes(p.normalized_stage))
    .reduce((s, p) => s + n(p.unit_count || 1), 0);
  const preIssueUnits = active.filter(p => ["APPLICATION", "REVIEW", "APPROVED"].includes(p.normalized_stage))
    .reduce((s, p) => s + n(p.unit_count || 1), 0);

  return (
    <main>
      <div className="header">
        <div>
          <div className="eyebrow">Residential Development Intelligence</div>
          <h1>Permit Saturation</h1>
          <p className="sub">Seattle · Bellevue · Kirkland · Redmond</p>
        </div>
        <div className="badge">V1 · Permit pipeline</div>
      </div>

      {setupError ? (
        <div className="panel empty">
          <h2>Database connection not ready</h2>
          <p>{setupError}</p>
          <p>Finish the Supabase setup and run the Seattle sync.</p>
        </div>
      ) : (
        <>
          <div className="cards">
            <div className="card"><div className="card-label">Active Units</div><div className="card-value">{fmt(activeUnits)}</div></div>
            <div className="card"><div className="card-label">Issued / Construction</div><div className="card-value">{fmt(issuedUnits)}</div></div>
            <div className="card"><div className="card-label">Pre-Issue Pipeline</div><div className="card-value">{fmt(preIssueUnits)}</div></div>
            <div className="card"><div className="card-label">Active Projects</div><div className="card-value">{fmt(active.length)}</div></div>
          </div>

          <div className="grid">
            <div className="panel">
              <h2>Active residential permit map</h2>
              <div className="map-wrap">
                <MapClient points={active} />
              </div>
            </div>

            <div className="panel">
              <h2>Saturation by area</h2>
              <table className="table">
                <thead>
                  <tr><th>Area</th><th className="right">Projects</th><th className="right">Units</th></tr>
                </thead>
                <tbody>
                  {areas.slice(0, 20).map((a) => (
                    <tr key={`${a.city}-${a.area}`}>
                      <td>{a.area}<div className="footer-note">{a.city}</div></td>
                      <td className="right">{fmt(n(a.active_projects))}</td>
                      <td className="right"><strong>{fmt(n(a.active_units))}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>Newest active projects</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Address</th><th>City</th><th>Stage</th><th className="right">Units</th><th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {active.slice(0, 30).map((p) => (
                  <tr key={p.id}>
                    <td>{p.address || p.permit_number}<div className="footer-note">{p.permit_number}</div></td>
                    <td>{p.city}</td>
                    <td><span className="stage">{p.normalized_stage || "UNKNOWN"}</span></td>
                    <td className="right">{p.unit_count ?? "—"}</td>
                    <td>{p.applied_date ? String(p.applied_date).slice(0, 10) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
