import React, { useState } from 'react';
import { useCateringPackages } from '@/hooks/useCateringPackages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Star,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { CateringPackage, DietaryRestriction } from '@/types/catering';
import { DIETARY_ACCOMMODATIONS } from '@/types/catering';

interface CateringPackagesManagerProps {
  tenantId: string;
}

export function CateringPackagesManager({ tenantId }: CateringPackagesManagerProps) {
  const {
    packages,
    isLoading,
    error,
    createPackage,
    isCreating,
    updatePackage,
    isUpdating,
    deletePackage,
    isDeleting,
    togglePopular,
  } = useCateringPackages(tenantId);

  const [showDialog, setShowDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CateringPackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_per_person: 0,
    min_guests: 10,
    max_guests: 500,
    includes_setup: false,
    includes_service: false,
    includes_cleanup: false,
    dietary_accommodations: [] as DietaryRestriction[],
    image_url: '',
    popular: false,
    active: true,
  });

  const handleCreatePackage = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      price_per_person: 0,
      min_guests: 10,
      max_guests: 500,
      includes_setup: false,
      includes_service: false,
      includes_cleanup: false,
      dietary_accommodations: [],
      image_url: '',
      popular: false,
      active: true,
    });
    setShowDialog(true);
  };

  const handleEditPackage = (pkg: CateringPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price_per_person: pkg.price_per_person / 100, // Convert from cents to dollars
      min_guests: pkg.min_guests,
      max_guests: pkg.max_guests || 500,
      includes_setup: pkg.includes_setup,
      includes_service: pkg.includes_service,
      includes_cleanup: pkg.includes_cleanup,
      dietary_accommodations: pkg.dietary_accommodations || [],
      image_url: pkg.image_url || '',
      popular: pkg.popular,
      active: pkg.active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.price_per_person <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const packageData = {
      ...formData,
      price_per_person: Math.round(formData.price_per_person * 100), // Convert to cents
    };

    if (editingPackage) {
      updatePackage({
        packageId: editingPackage.id,
        updates: packageData,
      });
    } else {
      createPackage(packageData);
    }
    
    setShowDialog(false);
  };

  const handleDelete = (packageId: string) => {
    if (confirm('Are you sure you want to delete this package?')) {
      deletePackage(packageId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading packages...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Catering Packages</CardTitle>
              <CardDescription>
                Create and manage your catering package offerings
              </CardDescription>
            </div>
            <Button onClick={handleCreatePackage}>
              <Plus className="w-4 h-4 mr-2" />
              New Package
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Packages Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages && packages.length > 0 ? (
          packages.map((pkg) => (
            <Card key={pkg.id} className="relative">
              {pkg.popular && (
                <Badge className="absolute top-4 right-4 bg-orange-500">
                  <Star className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {pkg.name}
                  {!pkg.active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-2xl font-bold">
                    <DollarSign className="w-5 h-5" />
                    {(pkg.price_per_person / 100).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/person</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {pkg.min_guests} - {pkg.max_guests || '∞'} guests
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Includes:</p>
                  <div className="flex flex-wrap gap-2">
                    {pkg.includes_setup && (
                      <Badge variant="outline">Setup</Badge>
                    )}
                    {pkg.includes_service && (
                      <Badge variant="outline">Service</Badge>
                    )}
                    {pkg.includes_cleanup && (
                      <Badge variant="outline">Cleanup</Badge>
                    )}
                  </div>
                </div>

                {pkg.dietary_accommodations && pkg.dietary_accommodations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Dietary Options:</p>
                    <div className="flex flex-wrap gap-2">
                      {pkg.dietary_accommodations.map((diet) => (
                        <Badge key={diet} variant="secondary" className="text-xs">
                          {diet}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditPackage(pkg)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(pkg.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Packages Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first catering package to start accepting orders
              </p>
              <Button onClick={handleCreatePackage}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Package
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Edit Package' : 'Create New Package'}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? 'Update your catering package details'
                : 'Create a new catering package for customers'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Corporate Lunch Package"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what's included in this package..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price Per Person ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price_per_person}
                    onChange={(e) => setFormData({ ...formData, price_per_person: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_guests">Minimum Guests *</Label>
                  <Input
                    id="min_guests"
                    type="number"
                    value={formData.min_guests}
                    onChange={(e) => setFormData({ ...formData, min_guests: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_guests">Maximum Guests</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Services Included */}
            <div className="space-y-4">
              <Label>Services Included</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="setup" className="font-normal">Setup Service</Label>
                  <Switch
                    id="setup"
                    checked={formData.includes_setup}
                    onCheckedChange={(checked) => setFormData({ ...formData, includes_setup: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="service" className="font-normal">Full Service Staff</Label>
                  <Switch
                    id="service"
                    checked={formData.includes_service}
                    onCheckedChange={(checked) => setFormData({ ...formData, includes_service: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cleanup" className="font-normal">Cleanup Service</Label>
                  <Switch
                    id="cleanup"
                    checked={formData.includes_cleanup}
                    onCheckedChange={(checked) => setFormData({ ...formData, includes_cleanup: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <Label>Package Options</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="popular" className="font-normal">Mark as Popular</Label>
                  <Switch
                    id="popular"
                    checked={formData.popular}
                    onCheckedChange={(checked) => setFormData({ ...formData, popular: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active" className="font-normal">Active (Visible to customers)</Label>
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isCreating || isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Saving...' : editingPackage ? 'Update Package' : 'Create Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

