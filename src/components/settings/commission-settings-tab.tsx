"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Percent, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  applyDefaultCommissionToAll,
  saveCommissionRates,
  updateCommission,
} from "@/actions/settings";
import { clampCommission, parseCommissionInput, resolveCommissionRate } from "@/lib/commission";
import { isActionSuccess } from "@/lib/unwrap-action";
import { cn } from "@/lib/utils";

type SubService = { id: string; name: string; commissionPercentage: number | null };
type PlatformService = {
  id: string;
  catalogId: number;
  title: string;
  isActive: boolean;
  commissionPercentage: number | null;
  subServices: SubService[];
};
type Category = {
  id: string;
  slug: string | null;
  name: string;
  isActive: boolean;
  services: PlatformService[];
};

interface CommissionSettingsTabProps {
  defaultCommission: number;
  categories: Category[];
}

export function CommissionSettingsTab({
  defaultCommission: initialDefault,
  categories,
}: CommissionSettingsTabProps) {
  const [defaultCommission, setDefaultCommission] = useState(initialDefault);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(categories.filter((c) => c.slug).slice(0, 2).map((c) => c.id))
  );
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const catalogCategories = useMemo(
    () => categories.filter((cat) => cat.slug && cat.services.length > 0),
    [categories]
  );

  const [serviceRates, setServiceRates] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    catalogCategories.forEach((cat) =>
      cat.services.forEach((svc) => {
        map[svc.id] =
          svc.commissionPercentage != null ? String(svc.commissionPercentage) : "";
      })
    );
    return map;
  });

  const [subRates, setSubRates] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    catalogCategories.forEach((cat) =>
      cat.services.forEach((svc) => {
        svc.subServices.forEach((sub) => {
          map[sub.id] =
            sub.commissionPercentage != null ? String(sub.commissionPercentage) : "";
        });
      })
    );
    return map;
  });

  const toggleCatExpand = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSvcExpand = (id: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyDefaultToAllLocal = (pct: number) => {
    const value = String(clampCommission(pct));
    setServiceRates((prev) => {
      const next = { ...prev };
      catalogCategories.forEach((cat) =>
        cat.services.forEach((svc) => {
          next[svc.id] = value;
        })
      );
      return next;
    });
    setSubRates((prev) => {
      const next = { ...prev };
      catalogCategories.forEach((cat) =>
        cat.services.forEach((svc) =>
          svc.subServices.forEach((sub) => {
            next[sub.id] = value;
          })
        )
      );
      return next;
    });
  };

  const saveDefaultOnly = () => {
    startTransition(async () => {
      await updateCommission(defaultCommission);
      toast.success("Default commission saved");
    });
  };

  const handleApplyDefaultToAll = () => {
    startTransition(async () => {
      await updateCommission(defaultCommission);
      const result = await applyDefaultCommissionToAll();
      if (!isActionSuccess(result)) {
        toast.error(result.error ?? "Failed to apply default commission");
        return;
      }
      applyDefaultToAllLocal(defaultCommission);
      toast.success(`Applied ${clampCommission(defaultCommission)}% to all services and sub-services`);
    });
  };

  const handleSaveAll = () => {
    const defaultPct = clampCommission(defaultCommission);
    const services = catalogCategories.flatMap((cat) =>
      cat.services.map((svc) => ({
        serviceId: svc.id,
        commissionPercentage: parseCommissionInput(serviceRates[svc.id] ?? ""),
      }))
    );
    const subServices = catalogCategories.flatMap((cat) =>
      cat.services.flatMap((svc) =>
        svc.subServices.map((sub) => ({
          subServiceId: sub.id,
          commissionPercentage: parseCommissionInput(subRates[sub.id] ?? ""),
        }))
      )
    );

    startTransition(async () => {
      const result = await saveCommissionRates({
        defaultPercentage: defaultPct,
        services,
        subServices,
      });
      if (!isActionSuccess(result)) {
        toast.error(result.error ?? "Failed to save commission rates");
        return;
      }
      toast.success("Commission rates saved");
    });
  };

  const previewCount = useMemo(() => {
    let services = 0;
    let subs = 0;
    catalogCategories.forEach((cat) => {
      services += cat.services.length;
      cat.services.forEach((svc) => {
        subs += svc.subServices.length;
      });
    });
    return { services, subs };
  }, [catalogCategories]);

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-primary" />
            Default Platform Commission
          </CardTitle>
          <CardDescription>
            Used when a service or sub-service has no custom rate. Synced to mobile apps via the catalog API.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="default-commission">Default rate (%)</Label>
            <Input
              id="default-commission"
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="h-9 w-32 rounded-xl"
              value={defaultCommission}
              onChange={(e) => setDefaultCommission(parseFloat(e.target.value) || 0)}
            />
          </div>
          <Button
            variant="outline"
            className="h-9 rounded-xl"
            onClick={saveDefaultOnly}
            disabled={isPending}
          >
            Save Default
          </Button>
          <Button
            className="h-9 gap-2 rounded-xl"
            onClick={handleApplyDefaultToAll}
            disabled={isPending}
          >
            <Sparkles className="h-4 w-4" />
            Apply Default to All Services
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Set custom rates for {previewCount.services} services and {previewCount.subs} sub-services.
          Leave blank to inherit the parent or default rate.
        </p>
        <Button className="h-9 rounded-xl" onClick={handleSaveAll} disabled={isPending}>
          Save All Rates
        </Button>
      </div>

      {catalogCategories.map((cat) => (
        <Card key={cat.id} className="overflow-hidden">
          <button
            type="button"
            onClick={() => toggleCatExpand(cat.id)}
            className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              {expandedCats.has(cat.id) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="font-semibold">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.services.length} services</p>
              </div>
            </div>
            <Badge variant="secondary">{cat.slug}</Badge>
          </button>

          {expandedCats.has(cat.id) && (
            <CardContent className="space-y-3 border-t border-border/50 bg-muted/10 pt-4">
              {cat.services.map((svc) => {
                const serviceInput = serviceRates[svc.id] ?? "";
                const servicePct = parseCommissionInput(serviceInput);
                const effectiveService = resolveCommissionRate({
                  defaultPercentage: defaultCommission,
                  servicePercentage: servicePct,
                });

                return (
                  <div
                    key={svc.id}
                    className="rounded-xl border border-border/50 bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => svc.subServices.length > 0 && toggleSvcExpand(svc.id)}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 text-left",
                          svc.subServices.length === 0 && "cursor-default"
                        )}
                      >
                        {svc.subServices.length > 0 ? (
                          expandedServices.has(svc.id) ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{svc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Effective: {effectiveService}%
                            {svc.subServices.length > 0 &&
                              ` · ${svc.subServices.length} sub-service${svc.subServices.length !== 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <Label className="sr-only">Service commission for {svc.title}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          placeholder={String(defaultCommission)}
                          className="h-9 w-24 rounded-lg text-right"
                          value={serviceInput}
                          onChange={(e) =>
                            setServiceRates((prev) => ({ ...prev, [svc.id]: e.target.value }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>

                    {expandedServices.has(svc.id) && svc.subServices.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                        {svc.subServices.map((sub) => {
                          const subInput = subRates[sub.id] ?? "";
                          const subPct = parseCommissionInput(subInput);
                          const effectiveSub = resolveCommissionRate({
                            defaultPercentage: defaultCommission,
                            servicePercentage: servicePct,
                            subServicePercentage: subPct,
                          });

                          return (
                            <div
                              key={sub.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm">{sub.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  Effective: {effectiveSub}%
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.5}
                                  placeholder={String(effectiveService)}
                                  className="h-8 w-20 rounded-lg text-right text-sm"
                                  value={subInput}
                                  onChange={(e) =>
                                    setSubRates((prev) => ({ ...prev, [sub.id]: e.target.value }))
                                  }
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
