"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Layers, Trash2, Plus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateReferralReward,
  updateGiftRules,
  syncCatalogFromSource,
  toggleServiceCategory,
  deleteServiceCategory,
  togglePlatformService,
  createServiceCategory,
  createPlatformService,
  createSubService,
} from "@/actions/settings";
import { getCatalogStats } from "@/lib/catalog";
import { useCountry } from "@/components/providers/country-provider";
import { cn } from "@/lib/utils";

type Settings = {
  id: string;
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
  const [referralReward, setReferralReward] = useState(settings.referralRewardAmount);
  const [giftRules, setGiftRules] = useState(
    JSON.stringify(settings.giftRules ?? { minRating: 4.5, minJobs: 50 }, null, 2)
  );

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [newServiceCategoryId, setNewServiceCategoryId] = useState("");
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newSubServiceId, setNewSubServiceId] = useState("");
  const [newSubServiceName, setNewSubServiceName] = useState("");

  const { country } = useCountry();

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

  const syncCatalog = async () => {
    await syncCatalogFromSource();
    toast.success("Service catalog synced from platform source");
    window.location.reload();
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

  const catalogStats = getCatalogStats();

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }
    await createServiceCategory(newCategoryName.trim(), newCategoryDesc.trim() || undefined);
    toast.success("Category created");
    setNewCategoryName("");
    setNewCategoryDesc("");
    window.location.reload();
  };

  const addService = async () => {
    if (!newServiceCategoryId || !newServiceTitle.trim()) {
      toast.error("Category and service title are required");
      return;
    }
    const svc = await createPlatformService({
      categoryId: newServiceCategoryId,
      title: newServiceTitle.trim(),
      description: newServiceDesc.trim() || undefined,
    });
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === newServiceCategoryId
          ? {
              ...cat,
              services: [
                ...cat.services,
                { ...svc, subServices: [] },
              ],
            }
          : cat
      )
    );
    toast.success("Service added to catalog");
    setNewServiceTitle("");
    setNewServiceDesc("");
  };

  const addSubService = async () => {
    if (!newSubServiceId || !newSubServiceName.trim()) {
      toast.error("Service and sub-service name are required");
      return;
    }
    const sub = await createSubService({
      serviceId: newSubServiceId,
      name: newSubServiceName.trim(),
    });
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        services: cat.services.map((s) =>
          s.id === newSubServiceId
            ? {
                ...s,
                subServices: [...s.subServices, { ...sub }],
              }
            : s
        ),
      }))
    );
    toast.success("Sub-service added");
    setNewSubServiceName("");
  };

  const allServices = categories.flatMap((c) =>
    c.services.map((s) => ({ ...s, categoryName: c.name }))
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Platform Settings"
        description={`${country.flag} ${country.name} — Configure catalog, referrals, and rewards synced to mobile apps`}
        badge="Configuration"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Categories" value={catalogStats.categories} icon={Layers} accent="teal" />
        <StatCard title="Services" value={catalogStats.services} icon={Layers} accent="emerald" />
        <StatCard title="Sub-Services" value={catalogStats.subServices} icon={Layers} accent="orange" />
      </div>

      <Tabs defaultValue="catalog">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="catalog">Service Catalog</TabsTrigger>
          <TabsTrigger value="referral">Referrals</TabsTrigger>
          <TabsTrigger value="gifts">Gift Rules</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Catalog is managed from the TapTeck platform service list. Changes sync to mobile apps.
            </p>
            <Button size="sm" onClick={syncCatalog}>Sync Catalog</Button>
          </div>
          {categories.filter((cat) => cat.slug).map((cat) => (
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

        <TabsContent value="categories" className="mt-4 space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add to Catalog ({country.name})
              </CardTitle>
              <CardDescription>
                Changes sync to the mobile apps via <code className="text-xs">/api/catalog?country={country.code}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-3 rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">New Category</p>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Pet Care"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    placeholder="Optional"
                    className="rounded-xl"
                  />
                </div>
                <Button size="sm" className="w-full rounded-lg" onClick={addCategory}>
                  Add Category
                </Button>
              </div>

              <div className="space-y-3 rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">New Service</p>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newServiceCategoryId} onValueChange={setNewServiceCategoryId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Service Title</Label>
                  <Input
                    value={newServiceTitle}
                    onChange={(e) => setNewServiceTitle(e.target.value)}
                    placeholder="e.g. Dog Walking"
                    className="rounded-xl"
                  />
                </div>
                <Button size="sm" className="w-full rounded-lg" onClick={addService}>
                  Add Service
                </Button>
              </div>

              <div className="space-y-3 rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">New Sub-Service</p>
                <div className="space-y-2">
                  <Label>Parent Service</Label>
                  <Select value={newSubServiceId} onValueChange={setNewSubServiceId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {allServices.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title} ({s.categoryName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sub-Service Name</Label>
                  <Input
                    value={newSubServiceName}
                    onChange={(e) => setNewSubServiceName(e.target.value)}
                    placeholder="e.g. Basic Walk (30 min)"
                    className="rounded-xl"
                  />
                </div>
                <Button size="sm" className="w-full rounded-lg" onClick={addSubService}>
                  Add Sub-Service
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Catalog Categories</CardTitle>
              <CardDescription>
                Categories are defined by the TapTeck platform catalog. Use Sync Catalog to refresh from source.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={syncCatalog}>Sync Catalog from Source</Button>
              <div className="space-y-2">
                {categories.filter((cat) => cat.slug).map((cat) => (
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
