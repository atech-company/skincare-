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
      <div className="flex min-h-[12rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:min-h-[16rem]">
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
      <div className="relative aspect-[4/3] max-h-[28rem] min-h-[12rem] w-full overflow-hidden rounded-2xl border border-slate-200/60 shadow-lg dark:border-slate-700/60 sm:min-h-[16rem] md:aspect-video md:min-h-[18rem]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4">
          <button
            type="button"
            className="absolute right-4 top-4 text-white sm:right-6 sm:top-6"
            onClick={() => setFullscreen(false)}
            aria-label="Close fullscreen"
          >
            <X className="h-6 w-6" />
          </button>
          <div className={cn("h-[70vh] w-full max-w-5xl sm:h-[80vh]")}>{slider}</div>
        </div>
      )}
    </>
  );
}
