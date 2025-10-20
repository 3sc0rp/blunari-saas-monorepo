import React, { useState } from 'react';
import { useCateringPackages } from '@/hooks/useCateringPackages';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import type { CateringPackage } from '@/types/catering';
import { CateringPackageForm } from '@/components/catering/CateringPackageForm';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePackage = () => {
    setEditingPackage(null);
    setShowDialog(true);
  };

  const handleEditPackage = (pkg: CateringPackage) => {
    setEditingPackage(pkg);
    setShowDialog(true);
  };

  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      // Convert dollar amounts to cents
      const packageData = {
        ...formData,
        price_per_person: Math.round(formData.price_per_person * 100),
        base_price: Math.round(formData.base_price * 100),
      };

      if (editingPackage) {
        await updatePackage({
          packageId: editingPackage.id,
          updates: packageData,
        });
        toast.success('Package updated successfully!');
      } else {
        await createPackage(packageData);
        toast.success('Package created successfully!');
      }
      
      setShowDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save package');
      throw error; // Let form component handle error display
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setShowDialog(false);
    setEditingPackage(null);
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
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Edit Package' : 'Create New Package'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <CateringPackageForm
              package={editingPackage}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              loading={isSubmitting}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

