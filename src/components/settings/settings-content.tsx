"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Layers, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  updateCommission,
  updateReferralReward,
  updateGiftRules,
  createServiceCategory,
  toggleServiceCategory,
  deleteServiceCategory,
  togglePlatformService,
} from "@/actions/settings";
import { services, getTotalSubServiceCount } from "@/lib/services-data";
import { cn } from "@/lib/utils";

type Settings = {
  id: string;
  commissionPercentage: number;
  referralRewardAmount: number;
  giftRules: unknown;
};

type SubService = { id: string; name: string };
type PlatformService = {
  id: string;
  catalogId: number;
  title: string;
  description: string | null;
  isActive: boolean;
  subServices: SubService[];
};
type Category = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  services: PlatformService[];
};

export function SettingsContent({
  settings,
  categories: initialCategories,
}: {
  settings: Settings;
  categories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(initialCategories.slice(0, 2).map((c) => c.id))
  );
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [newCategory, setNewCategory] = useState("");
  const [commission, setCommission] = useState(settings.commissionPercentage);
  const [referralReward, setReferralReward] = useState(settings.referralRewardAmount);
  const [giftRules, setGiftRules] = useState(
    JSON.stringify(settings.giftRules ?? { minRating: 4.5, minJobs: 50 }, null, 2)
  );

  const totalServices = categories.reduce((s, c) => s + c.services.length, 0);
  const totalSubs = categories.reduce(
    (s, c) => s + c.services.reduce((ss, svc) => ss + svc.subServices.length, 0),
    0
  );

  const saveCommission = async () => {
    await updateCommission(commission);
    toast.success("Commission updated");
  };

  const saveReferralReward = async () => {
    await updateReferralReward(referralReward);
    toast.success("Referral reward updated");
  };

  const saveGiftRules = async () => {
    try {
      await updateGiftRules(JSON.parse(giftRules));
      toast.success("Gift rules updated");
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await createServiceCategory(newCategory.trim());
    toast.success("Category added — refresh to see it");
    setNewCategory("");
  };

  const toggleCategory = async (id: string, isActive: boolean) => {
    await toggleServiceCategory(id, isActive);
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isActive } : c)));
    toast.success("Category updated");
  };

  const removeCategory = async (id: string) => {
    await deleteServiceCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success("Category deleted");
  };

  const toggleService = async (id: string, isActive: boolean) => {
    await togglePlatformService(id, isActive);
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        services: cat.services.map((s) => (s.id === id ? { ...s, isActive } : s)),
      }))
    );
    toast.success("Service updated");
  };

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

  return (
    <div className="page-container">
      <PageHeader
        title="Platform Settings"
        description="Configure commissions, rewards, and manage the TapTeck service catalog"
        badge="Configuration"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Categories" value={categories.length} icon={Layers} accent="teal" />
        <StatCard title="Services" value={totalServices || services.length} icon={Layers} accent="emerald" />
        <StatCard title="Sub-Services" value={totalSubs || getTotalSubServiceCount()} icon={Layers} accent="orange" />
      </div>

      <Tabs defaultValue="catalog">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="catalog">Service Catalog</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="referral">Referrals</TabsTrigger>
          <TabsTrigger value="gifts">Gift Rules</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4 space-y-4">
          {categories.map((cat) => (
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
                    <p className="text-xs text-muted-foreground">
                      {cat.services.length} services · {cat.slug}
                    </p>
                  </div>
                </div>
                <Badge variant={cat.isActive ? "default" : "secondary"}>
                  {cat.isActive ? "Active" : "Inactive"}
                </Badge>
              </button>

              {expandedCats.has(cat.id) && (
                <CardContent className="space-y-3 border-t border-border/50 bg-muted/20 pt-4">
                  {cat.services.map((svc) => (
                    <div
                      key={svc.id}
                      className="rounded-xl border border-border/50 bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSvcExpand(svc.id)}
                          className="flex flex-1 items-start gap-2 text-left"
                        >
                          {svc.subServices.length > 0 ? (
                            expandedServices.has(svc.id) ? (
                              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            )
                          ) : (
                            <span className="w-4" />
                          )}
                          <div>
                            <p className="font-medium">{svc.title}</p>
                            {svc.description && (
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                                {svc.description}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {svc.subServices.length} sub-service{svc.subServices.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </button>
                        <Switch
                          checked={svc.isActive}
                          onCheckedChange={(checked) => toggleService(svc.id, checked)}
                        />
                      </div>

                      {expandedServices.has(svc.id) && svc.subServices.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
                          {svc.subServices.map((sub) => (
                            <span
                              key={sub.id}
                              className="rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                            >
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="commission" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Commission Percentage</CardTitle>
              <CardDescription>Platform fee on each completed booking</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="space-y-2 flex-1 max-w-xs">
                <Label>Commission (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={commission}
                  onChange={(e) => setCommission(parseFloat(e.target.value))}
                />
              </div>
              <Button onClick={saveCommission}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referral" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral Reward</CardTitle>
              <CardDescription>Amount credited for successful referrals</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="space-y-2 flex-1 max-w-xs">
                <Label>Reward (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={referralReward}
                  onChange={(e) => setReferralReward(parseFloat(e.target.value))}
                />
              </div>
              <Button onClick={saveReferralReward}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gifts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gift Rules</CardTitle>
              <CardDescription>JSON config for automatic gift eligibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="w-full min-h-[200px] rounded-xl border border-input bg-background/80 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                value={giftRules}
                onChange={(e) => setGiftRules(e.target.value)}
              />
              <Button onClick={saveGiftRules}>Save Rules</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Categories</CardTitle>
              <CardDescription>Add or toggle service categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <Button onClick={addCategory}>Add</Button>
              </div>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border border-border/50 p-4 transition-colors",
                      !cat.isActive && "opacity-60"
                    )}
                  >
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{cat.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={cat.isActive}
                        onCheckedChange={(checked) => toggleCategory(cat.id, checked)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeCategory(cat.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
