import { BrandLogo } from "@/components/brand/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-mesh" />
      <div className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-30" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 h-72 w-72 rounded-full bg-highlight/10 blur-3xl" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <BrandLogo className="h-12 px-4 shadow-lg" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your marketplace — providers, bookings & services
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/90 p-6 shadow-2xl shadow-black/5 backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
}
