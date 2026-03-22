"use client";

import { useEffect } from "react";
import { clamp } from "@/lib/utils";

type ResizeState =
  | { type: "primary"; startX: number; startSize: number }
  | { type: "secondary"; startX: number; startSize: number }
  | { type: "panel"; startY: number; startSize: number }
  | null;

export function useWorkbenchLayoutEffects({
  resizeState,
  primarySidebarWidth,
  secondarySidebarWidth,
  panelHeight,
  setPrimarySidebarWidth,
  setSecondarySidebarWidth,
  setPanelHeight,
  setShowPrimarySidebar,
  setShowSecondarySidebar,
  setShowPanel,
  setResizeState,
  showPrimarySidebar,
  showSecondarySidebar,
  showPanel,
}: {
  resizeState: ResizeState;
  primarySidebarWidth: number;
  secondarySidebarWidth: number;
  panelHeight: number;
  setPrimarySidebarWidth: (value: number) => void;
  setSecondarySidebarWidth: (value: number) => void;
  setPanelHeight: (value: number) => void;
  setShowPrimarySidebar: (value: boolean) => void;
  setShowSecondarySidebar: (value: boolean) => void;
  setShowPanel: (value: boolean) => void;
  setResizeState: (value: ResizeState) => void;
  showPrimarySidebar: boolean;
  showSecondarySidebar: boolean;
  showPanel: boolean;
}) {
  useEffect(() => {
    if (!resizeState) return;
    const activeResize = resizeState;

    function handleMove(event: MouseEvent) {
      if (activeResize.type === "primary") {
        setPrimarySidebarWidth(clamp(activeResize.startSize + (event.clientX - activeResize.startX), 96, 520));
      }
      if (activeResize.type === "secondary") {
        setSecondarySidebarWidth(clamp(activeResize.startSize - (event.clientX - activeResize.startX), 96, 520));
      }
      if (activeResize.type === "panel") {
        setPanelHeight(clamp(activeResize.startSize - (event.clientY - activeResize.startY), 80, 420));
      }
    }

    function handleUp() {
      if (activeResize.type === "primary" && primarySidebarWidth < 190) {
        setShowPrimarySidebar(false);
        setPrimarySidebarWidth(280);
      }
      if (activeResize.type === "secondary" && secondarySidebarWidth < 230) {
        setShowSecondarySidebar(false);
        setSecondarySidebarWidth(300);
      }
      if (activeResize.type === "panel" && panelHeight < 120) {
        setShowPanel(false);
        setPanelHeight(224);
      }
      setResizeState(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.userSelect = "none";
    document.body.style.cursor = activeResize.type === "panel" ? "row-resize" : "col-resize";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [
    panelHeight,
    primarySidebarWidth,
    resizeState,
    secondarySidebarWidth,
    setPanelHeight,
    setPrimarySidebarWidth,
    setResizeState,
    setSecondarySidebarWidth,
    setShowPanel,
    setShowPrimarySidebar,
    setShowSecondarySidebar,
  ]);

  useEffect(() => {
    if (showPrimarySidebar && primarySidebarWidth < 190) {
      setShowPrimarySidebar(false);
      setPrimarySidebarWidth(280);
    }
    if (showSecondarySidebar && secondarySidebarWidth < 230) {
      setShowSecondarySidebar(false);
      setSecondarySidebarWidth(300);
    }
    if (showPanel && panelHeight < 120) {
      setShowPanel(false);
      setPanelHeight(224);
    }
  }, [
    panelHeight,
    primarySidebarWidth,
    secondarySidebarWidth,
    setPanelHeight,
    setPrimarySidebarWidth,
    setSecondarySidebarWidth,
    setShowPanel,
    setShowPrimarySidebar,
    setShowSecondarySidebar,
    showPanel,
    showPrimarySidebar,
    showSecondarySidebar,
  ]);
}
