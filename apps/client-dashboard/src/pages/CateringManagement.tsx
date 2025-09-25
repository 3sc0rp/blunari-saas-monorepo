import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useTenant } from "@/hooks/useTenant";
import { useCateringPackages } from "@/hooks/useCateringPackages";
import {
  DIETARY_ACCOMMODATIONS,
  type CateringPackage,
} from "@/types/catering";
import { ChefHat, ImageIcon, Plus, Trash, Star } from "lucide-react";

export default function CateringManagement(): JSX.Element {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const {
    packages,
    createPackage,
    updatePackage,
    deletePackage,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCateringPackages(tenant?.id);

  const [creatingName, setCreatingName] = useState("Signature Buffet");
  const [creatingPrice, setCreatingPrice] = useState<number>(2500);

  const sorted = useMemo(
    () => [...packages].sort((a, b) => Number(b.popular) - Number(a.popular)),
    [packages],
  );

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        Loading catering management...
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        Tenant not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catering Package Management</h1>
          <p className="text-muted-foreground">
            Create and maintain packages displayed in your public catering widget.
          </p>
        </div>
        <ChefHat className="w-6 h-6 text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Create</CardTitle>
          <CardDescription>Start with a name and base price; fine-tune later.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <Label>Name</Label>
              <Input value={creatingName} onChange={(e) => setCreatingName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Price per person (cents)</Label>
              <Input
                type="number"
                value={creatingPrice}
                onChange={(e) => setCreatingPrice(Number(e.target.value || 0))}
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button
                disabled={isCreating}
                onClick={() =>
                  createPackage({
                    name: creatingName.trim() || "Untitled Package",
                    price_per_person: creatingPrice || 2500,
                    min_guests: 10,
                    includes_setup: false,
                    includes_service: true,
                    includes_cleanup: false,
                    dietary_accommodations: [],
                  })
                }
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" /> Create
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No packages yet. Use Quick Create above to add your first package.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((pkg) => (
            <PackageRow
              key={pkg.id}
              pkg={pkg}
              onUpdate={(updates) => updatePackage({ packageId: pkg.id, updates })}
              onDelete={() => deletePackage(pkg.id)}
              busy={isUpdating || isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PackageRow({
  pkg,
  onUpdate,
  onDelete,
  busy,
}: {
  pkg: CateringPackage;
  onUpdate: (updates: Partial<CateringPackage>) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [local, setLocal] = useState<CateringPackage>(pkg);

  const commit = (partial: Partial<CateringPackage>) => {
    setLocal((p) => ({ ...p, ...partial } as CateringPackage));
    onUpdate(partial);
  };

  const toggleDiet = (value: string) => {
    const next = new Set(local.dietary_accommodations || []);
    if (next.has(value as any)) next.delete(value as any);
    else next.add(value as any);
    commit({ dietary_accommodations: Array.from(next) as any });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-3 space-y-2">
            <Label>Name</Label>
            <Input
              defaultValue={local.name}
              onBlur={(e) => commit({ name: e.target.value })}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              <Input
                placeholder="Image URL"
                defaultValue={local.image_url || ""}
                onBlur={(e) => commit({ image_url: e.target.value })}
              />
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              defaultValue={local.description || ""}
              onBlur={(e) => commit({ description: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Price/person (cents)</Label>
            <Input
              type="number"
              defaultValue={local.price_per_person}
              onBlur={(e) => commit({ price_per_person: Number(e.target.value || 0) })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min</Label>
                <Input
                  type="number"
                  defaultValue={local.min_guests}
                  onBlur={(e) => commit({ min_guests: Number(e.target.value || 0) })}
                />
              </div>
              <div>
                <Label>Max</Label>
                <Input
                  type="number"
                  defaultValue={local.max_guests || 0}
                  onBlur={(e) => commit({ max_guests: Number(e.target.value || 0) || undefined })}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Inclusions</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!local.includes_setup}
                  onCheckedChange={(v) => commit({ includes_setup: !!v })}
                />
                Setup
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!local.includes_service}
                  onCheckedChange={(v) => commit({ includes_service: !!v })}
                />
                Service
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!local.includes_cleanup}
                  onCheckedChange={(v) => commit({ includes_cleanup: !!v })}
                />
                Cleanup
              </label>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!local.popular}
                  onCheckedChange={(v) => commit({ popular: !!v })}
                />
                <Star className="w-3 h-3" /> Popular
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!local.active}
                  onCheckedChange={(v) => commit({ active: !!v })}
                />
                Published
              </label>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Dietary</Label>
            <div className="flex flex-wrap gap-1">
              {DIETARY_ACCOMMODATIONS.map((d) => (
                <Badge
                  key={d.value}
                  variant={local.dietary_accommodations?.includes(d.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleDiet(d.value)}
                >
                  {d.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex items-start justify-end gap-2">
            <Button variant="destructive" onClick={onDelete} disabled={busy}>
              <Trash className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


