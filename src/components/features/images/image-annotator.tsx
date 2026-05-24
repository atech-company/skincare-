"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { TreatmentImage } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type FabricModule = typeof import("fabric");

export function ImageAnnotator({
  image,
  onSave,
}: {
  image: TreatmentImage;
  onSave?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<InstanceType<FabricModule["Canvas"]> | null>(null);
  const fabricModuleRef = useRef<FabricModule | null>(null);
  const [mode, setMode] = useState<"draw" | "circle">("draw");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    let disposed = false;

    (async () => {
      const fabric = await import("fabric");
      if (disposed || !canvasRef.current) return;

      fabricModuleRef.current = fabric;
      const canvas = new fabric.Canvas(canvasRef.current, { width: 600, height: 400 });
      fabricRef.current = canvas;

      fabric.FabricImage.fromURL(image.file_url, { crossOrigin: "anonymous" }).then((img) => {
        if (disposed) return;
        const scale = Math.min(600 / (img.width || 600), 400 / (img.height || 400));
        img.scale(scale);
        canvas.backgroundImage = img;
        canvas.renderAll();

        if (image.annotations) {
          canvas.loadFromJSON(image.annotations as object).then(() => canvas.renderAll());
        }
        setReady(true);
      });
    })();

    return () => {
      disposed = true;
      fabricRef.current?.dispose();
      fabricRef.current = null;
      fabricModuleRef.current = null;
      setReady(false);
    };
  }, [image.file_url, image.annotations]);

  useEffect(() => {
    const canvas = fabricRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;
    canvas.isDrawingMode = mode === "draw";
    if (mode === "draw") {
      const brush = new fabric.PencilBrush(canvas);
      brush.color = "#ef4444";
      brush.width = 3;
      canvas.freeDrawingBrush = brush;
    }
  }, [mode, ready]);

  const addCircle = () => {
    const canvas = fabricRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;
    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      radius: 30,
      fill: "transparent",
      stroke: "#7c3aed",
      strokeWidth: 3,
    });
    canvas.add(circle);
  };

  const save = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = canvas.toJSON();
    try {
      await api.patch(`/treatment-images/${image.id}/annotations`, { annotations: json });
      toast.success("Annotations saved");
      onSave?.();
    } catch {
      toast.error("Failed to save annotations");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant={mode === "draw" ? "default" : "secondary"} size="sm" onClick={() => setMode("draw")}>
          Highlight
        </Button>
        <Button variant={mode === "circle" ? "default" : "secondary"} size="sm" onClick={() => { setMode("circle"); addCircle(); }}>
          Mark Area
        </Button>
        <Button size="sm" onClick={save}>Save Annotations</Button>
      </div>
      <div className="relative overflow-hidden rounded-2xl border">
        {!ready && <Skeleton className="absolute inset-0 h-[400px] w-full" />}
        <canvas ref={canvasRef} className={ready ? "" : "opacity-0"} />
      </div>
    </div>
  );
}
