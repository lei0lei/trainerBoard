"use client";

import { Maximize2, ScanLine, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectionBoxes, detectionPreviewUrl, detectionSummary } from "./demo-data";

export function DetectionMainArea() {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex h-11 items-center justify-between border-b border-[#2a2d2e] bg-[#181818] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-[#3c3c3c] bg-[#252526] text-[#4fc1ff]">
            <ScanLine className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[#d4d4d4]">{detectionSummary.taskName}</div>
            <div className="truncate text-xs text-[#8b8b8b]">
              {detectionSummary.imageName} 路 {detectionSummary.imageSize}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9d9d9d] hover:bg-[#2a2d2e] hover:text-white">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_top,_rgba(79,193,255,0.12),_transparent_30%),_linear-gradient(180deg,#1e1e1e,#151515)] p-6">
        <div className="relative w-full max-w-6xl overflow-hidden rounded-2xl border border-[#2f3336] bg-[#111827] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <img
            src={detectionPreviewUrl}
            alt="Detection result preview"
            className="block aspect-[5/3] w-full object-cover"
          />

          {detectionBoxes.map((box) => (
            <div
              key={box.id}
              className="absolute rounded-lg border-2 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]"
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                borderColor: box.color,
                boxShadow: `0 0 0 1px rgba(15,23,42,0.55), inset 0 0 0 1px ${box.color}33`,
              }}
            >
              <div
                className="absolute -left-0.5 -top-8 rounded-md px-2 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: box.color }}
              >
                {box.label} 路 {(box.confidence * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

