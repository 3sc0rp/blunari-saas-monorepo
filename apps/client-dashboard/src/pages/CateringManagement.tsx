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
import { ChefHat, ImageIcon, Plus, Trash, Star, ArrowUpDown, Search } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";

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

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'popular'|'name'|'price'|'display_order'>('display_order');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const sorted = useMemo(() => {
    const q = (query || '').toLowerCase();
    const filtered = q ? packages.filter(p => (p.name||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q)) : packages;
    const arr = [...filtered];
    arr.sort((a,b) => {
      if (sortKey === 'popular') return Number(b.popular) - Number(a.popular);
      if (sortKey === 'name') return (a.name||'').localeCompare(b.name||'');
      if (sortKey === 'price') return (b.price_per_person||0) - (a.price_per_person||0);
      return (a.display_order||0) - (b.display_order||0);
    });
    return arr;
  }, [packages, query, sortKey]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string, index: number) => {
    if (sortKey !== 'display_order') return;
    setDragIndex(index);
    setDragId(id);
    try { e.dataTransfer.effectAllowed = 'move'; } catch {}
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (sortKey !== 'display_order') return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch {}
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
    if (sortKey !== 'display_order') return;
    e.preventDefault();
    if (dragIndex == null || dragId == null) return;
    if (toIndex === dragIndex) return;

    // Build new id order based on current filtered+sorted view
    const ids = sorted.map(p => p.id);
    const [moved] = ids.splice(dragIndex, 1);
    ids.splice(toIndex, 0, moved);

    // Assign sequential display_order values (10,20,...) for stability
    const idToOrder: Record<string, number> = {};
    ids.forEach((id, i) => { idToOrder[id] = (i + 1) * 10; });

    // Update only those whose order changed
    for (const p of sorted) {
      const desired = idToOrder[p.id];
      if (desired != null && (p.display_order || 0) !== desired) {
        updatePackage({ packageId: p.id, updates: { display_order: desired as any } });
      }
    }

    setDragIndex(null);
    setDragId(null);
  };

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

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search packages..." value={query} onChange={(e)=>setQuery(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={()=>setSortKey(sortKey==='display_order'?'popular':sortKey==='popular'?'name':sortKey==='name'?'price':'display_order')}>
          <ArrowUpDown className="w-4 h-4 mr-2" /> Sort: {sortKey.replace('_',' ')}
        </Button>
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
          {sorted.map((pkg, index) => (
            <div
              key={pkg.id}
              draggable={sortKey === 'display_order'}
              onDragStart={(e) => handleDragStart(e, pkg.id, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <PackageRow
                pkg={pkg}
                onUpdate={(updates) => updatePackage({ packageId: pkg.id, updates })}
                onDelete={() => deletePackage(pkg.id)}
                busy={isUpdating || isDeleting}
              />
            </div>
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
            <div className="space-y-2">
              <FileUpload
                label="Package Image"
                value={local.image_url || ""}
                onChange={(url) => commit({ image_url: url })}
                description="JPEG/PNG up to 5MB"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="w-4 h-4" />
                <Input
                  placeholder="Or paste an image URL"
                  defaultValue={local.image_url || ""}
                  onBlur={(e) => commit({ image_url: e.target.value })}
                />
              </div>
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

          <div className="md:col-span-2 space-y-2">
            <Label>Display Order</Label>
            <Input type="number" defaultValue={local.display_order || 0} onBlur={(e)=>commit({ display_order: Number(e.target.value||0) as any })} />
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


