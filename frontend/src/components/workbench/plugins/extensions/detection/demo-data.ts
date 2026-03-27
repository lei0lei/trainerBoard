export type DetectionBox = {
  id: string;
  label: string;
  confidence: number;
  color: string;
  left: string;
  top: string;
  width: string;
  height: string;
  description: string;
};

export const detectionPreviewUrl = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="1600" height="960" viewBox="0 0 1600 960" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1600" height="960" fill="#0F172A"/>
  <rect x="48" y="48" width="1504" height="864" rx="28" fill="#111827" stroke="#334155" stroke-width="2"/>
  <rect x="96" y="104" width="1408" height="752" rx="20" fill="url(#bg)"/>
  <rect x="140" y="148" width="1320" height="664" rx="16" fill="#0B1220" stroke="#1E293B" stroke-width="2"/>
  <path d="M140 548C276 432 388 384 514 392C650 404 760 526 900 538C1040 548 1134 424 1268 412C1358 404 1424 438 1460 466V812H140V548Z" fill="url(#ground)" opacity="0.9"/>
  <circle cx="1210" cy="246" r="68" fill="#0EA5E9" opacity="0.18"/>
  <circle cx="1284" cy="200" r="124" fill="#38BDF8" opacity="0.08"/>
  <rect x="248" y="240" width="252" height="196" rx="12" fill="#1F2937" stroke="#475569" stroke-width="2"/>
  <rect x="540" y="276" width="198" height="160" rx="10" fill="#111827" stroke="#334155" stroke-width="2"/>
  <rect x="794" y="214" width="286" height="224" rx="12" fill="#0F172A" stroke="#334155" stroke-width="2"/>
  <rect x="1126" y="264" width="172" height="156" rx="12" fill="#1E293B" stroke="#475569" stroke-width="2"/>
  <rect x="332" y="478" width="164" height="198" rx="12" fill="#0F172A" stroke="#334155" stroke-width="2"/>
  <rect x="596" y="494" width="276" height="172" rx="12" fill="#111827" stroke="#334155" stroke-width="2"/>
  <rect x="980" y="510" width="242" height="152" rx="12" fill="#0F172A" stroke="#334155" stroke-width="2"/>
  <rect x="0" y="0" width="1600" height="960" fill="url(#noise)" opacity="0.14"/>
  <defs>
    <linearGradient id="bg" x1="96" y1="104" x2="1504" y2="856" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0B1120"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="ground" x1="620" y1="392" x2="620" y2="812" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1D4ED8" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#020617" stop-opacity="0.95"/>
    </linearGradient>
    <pattern id="noise" width="120" height="120" patternUnits="userSpaceOnUse">
      <circle cx="16" cy="22" r="2" fill="#E2E8F0"/>
      <circle cx="72" cy="44" r="1.5" fill="#CBD5E1"/>
      <circle cx="96" cy="84" r="2" fill="#E2E8F0"/>
      <circle cx="44" cy="92" r="1.5" fill="#CBD5E1"/>
    </pattern>
  </defs>
</svg>
`)}`;

export const detectionBoxes: DetectionBox[] = [
  {
    id: "det-1",
    label: "Crack",
    confidence: 0.98,
    color: "#22C55E",
    left: "18%",
    top: "30%",
    width: "16%",
    height: "18%",
    description: "A visible crack is detected in the middle section; surface stress should be rechecked.",
  },
  {
    id: "det-2",
    label: "Corrosion",
    confidence: 0.93,
    color: "#F59E0B",
    left: "48%",
    top: "36%",
    width: "19%",
    height: "22%",
    description: "Localized corrosion spots are present, likely caused by long-term moisture exposure.",
  },
  {
    id: "det-3",
    label: "Damage",
    confidence: 0.89,
    color: "#EF4444",
    left: "68%",
    top: "57%",
    width: "15%",
    height: "16%",
    description: "Material loss is detected near the edge; maintenance is recommended soon.",
  },
];

export const detectionSummary = {
  taskName: "Surface Defect Detection",
  modelName: "YOLOv11-Defect",
  imageName: "inspection_camera_03.png",
  imageSize: "1600 × 960",
  status: "Completed",
  elapsed: "1.28s",
  totalTargets: detectionBoxes.length,
  avgConfidence: "93.3%",
  recommendation: "Prioritize the high-risk damaged area and keep the current result image for follow-up comparison.",
};

