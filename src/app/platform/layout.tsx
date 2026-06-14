/** Platform console always renders in dark mode, independent of clinic theme. */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark min-h-screen bg-slate-950 text-slate-100">{children}</div>;
}
