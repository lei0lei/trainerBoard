"use client";

import { AlertTriangle, CheckCircle2, GaugeCircle, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { detectionBoxes, detectionSummary } from "./demo-data";

export function DetectionSecondarySidebar() {
  return (
    <aside className="flex h-full flex-col bg-[#252526]">
      <div className="flex h-9 items-center justify-between px-4 text-xs font-semibold tracking-wide text-[#bbbbbb]">
        <span>DETECTION RESULT</span>
        <span className="text-[#8b8b8b]">{detectionSummary.status}</span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8b8b8b]">
              <ImageIcon className="h-3.5 w-3.5" />
              Image
            </div>
            <div className="mt-2 text-sm text-[#d4d4d4]">{detectionSummary.imageSize}</div>
          </div>
          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8b8b8b]">
              <GaugeCircle className="h-3.5 w-3.5" />
              Avg Confidence
            </div>
            <div className="mt-2 text-sm text-[#d4d4d4]">{detectionSummary.avgConfidence}</div>
          </div>
          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8b8b8b]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Targets
            </div>
            <div className="mt-2 text-sm text-[#d4d4d4]">{detectionSummary.totalTargets}</div>
          </div>
          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8b8b8b]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Inference Time
            </div>
            <div className="mt-2 text-sm text-[#d4d4d4]">{detectionSummary.elapsed}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#8b8b8b]">Detections</div>
          <div className="space-y-2">
            {detectionBoxes.map((item, index) => (
              <div key={item.id} className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[#d4d4d4]">
                      {index + 1}. {item.label}
                    </div>
                    <div className="mt-1 text-xs text-[#8b8b8b]">{item.description}</div>
                  </div>
                  <span
                    className="rounded px-2 py-1 text-[11px] font-medium text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    {(item.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#8b8b8b]">
            <AlertTriangle className="h-3.5 w-3.5" />
            Recommendation
          </div>
          <div className="rounded border border-[#5a4722] bg-[#2b2415] p-3 text-sm leading-6 text-[#f5deb3]">
            {detectionSummary.recommendation}
          </div>
        </div>
      </div>
    </aside>
  );
}

