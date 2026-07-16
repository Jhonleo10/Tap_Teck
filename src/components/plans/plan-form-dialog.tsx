"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus } from "lucide-react";

interface PlanFormData {
  name: string;
  description?: string;
  price: number;
  durationMode: "DAY" | "WEEK" | "MONTH";
  durationDays: number;
  features: string[];
}

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlanFormData) => Promise<void>;
  initialData?: {
    name: string;
    description: string | null;
    price: number;
    durationMode: string;
    durationDays: number;
    features: unknown;
  };
}

const durationOptions: { value: PlanFormData["durationMode"]; label: string; defaultDays: number }[] = [
  { value: "DAY", label: "Day(s)", defaultDays: 1 },
  { value: "WEEK", label: "Week(s)", defaultDays: 7 },
  { value: "MONTH", label: "Month(s)", defaultDays: 30 },
];

export function PlanFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: PlanFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMode, setDurationMode] = useState<PlanFormData["durationMode"]>("MONTH");
  const [durationDays, setDurationDays] = useState("30");
  const [features, setFeatures] = useState<string[]>([""]);

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description ?? "");
      setPrice(String(initialData.price));
      setDurationMode(initialData.durationMode as PlanFormData["durationMode"]);
      setDurationDays(String(initialData.durationDays));
      setFeatures(((initialData.features as string[])?.length ? initialData.features as string[] : [""]));
    } else {
      resetForm();
    }
  }, [initialData, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setDurationMode("MONTH");
    setDurationDays("30");
    setFeatures([""]);
  };

  const handleDurationModeChange = (mode: PlanFormData["durationMode"]) => {
    setDurationMode(mode);
    const opt = durationOptions.find((o) => o.value === mode);
    if (opt) setDurationDays(String(opt.defaultDays));
  };

  const addFeature = () => setFeatures((prev) => [...prev, ""]);

  const removeFeature = (index: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFeature = (index: number, value: string) => {
    setFeatures((prev) => prev.map((f, i) => (i === index ? value : f)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const filteredFeatures = features.filter((f) => f.trim());
    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      price: parseFloat(price) || 0,
      durationMode,
      durationDays: parseInt(durationDays) || 30,
      features: filteredFeatures,
    });
    if (!isEditing) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan" : "Create New Plan"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the plan details below." : "Define a new subscription plan for providers."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Basic Monthly"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the plan"
              className="rounded-xl min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Price (₹)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration Mode</Label>
              <Select
                value={durationMode}
                onValueChange={(v) => handleDurationModeChange(v as PlanFormData["durationMode"])}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (Days)</Label>
              <Input
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Features</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={addFeature}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(i, e.target.value)}
                    placeholder={`Feature ${i + 1}`}
                    className="rounded-xl flex-1"
                  />
                  {features.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => removeFeature(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {isEditing ? "Save Changes" : "Create Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
