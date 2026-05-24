"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2, X } from "lucide-react";
import type { TreatmentImage } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ReactCompareSlider = dynamic(
  () => import("react-compare-slider").then((m) => m.ReactCompareSlider),
  { ssr: false }
);
const ReactCompareSliderImage = dynamic(
  () => import("react-compare-slider").then((m) => m.ReactCompareSliderImage),
  { ssr: false }
);

export function BeforeAfterViewer({
  before,
  after,
}: {
  before?: TreatmentImage;
  after?: TreatmentImage;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  if (!before?.file_url || !after?.file_url) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-slate-500">
        Upload before & after images to compare
      </div>
    );
  }

  const slider = (
    <ReactCompareSlider
      itemOne={<ReactCompareSliderImage src={before.file_url} alt="Before" />}
      itemTwo={<ReactCompareSliderImage src={after.file_url} alt="After" />}
      className="h-full w-full rounded-2xl"
    />
  );

  return (
    <>
      <div className="relative h-80 overflow-hidden rounded-2xl border border-slate-200/60 shadow-lg">
        {slider}
        <Button
          size="icon"
          variant="secondary"
          className="absolute right-3 top-3"
          onClick={() => setFullscreen(true)}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            className="absolute right-6 top-6 text-white"
            onClick={() => setFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className={cn("h-[80vh] w-full max-w-5xl")}>{slider}</div>
        </div>
      )}
    </>
  );
}
