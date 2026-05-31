import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-slate-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/60 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 p-6 pb-0", className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50", className)} {...props} />
);

const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6", className)} {...props} />
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
