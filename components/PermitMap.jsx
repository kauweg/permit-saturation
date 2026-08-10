"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

export default function PermitMap({ points }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    if (!leafletReady || !el.current || !window.L || mapRef.current) return;

    const L = window.L;
    const map = L.map(el.current).setView([47.61, -122.27], 10);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const safe = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

    const valid = points.filter(
      (p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))
    );

    for (const p of valid) {
      const units = Math.max(1, Number(p.unit_count || 1));
      const marker = L.circleMarker([Number(p.latitude), Number(p.longitude)], {
        radius: Math.max(4, Math.min(16, 4 + Math.sqrt(units))),
        fillOpacity: 0.7
      }).addTo(map);

      marker.bindPopup(
        `<strong>${safe(p.address || p.permit_number)}</strong><br>` +
        `${safe(p.city)} · ${safe(p.normalized_stage || "Unknown")}<br>` +
        `Units: ${safe(p.unit_count ?? "—")}<br>` +
        `Permit: ${safe(p.permit_number)}`
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [leafletReady, points]);

  return (
    <>
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        crossOrigin=""
        strategy="afterInteractive"
        onLoad={() => setLeafletReady(true)}
      />
      <div ref={el} style={{ height: "100%", width: "100%" }} />
    </>
  );
}
