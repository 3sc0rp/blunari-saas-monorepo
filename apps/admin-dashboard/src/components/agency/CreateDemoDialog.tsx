import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { DemoTemplateCard } from "./DemoTemplateCard";
import { mockDemoTemplates, mockPartners } from "@/data/mockAgencyData";
import { RestaurantTemplate } from "@/types/agency";
import { useToast } from "@/hooks/use-toast";

interface CreateDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateDemoDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDemoDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] =
    useState<RestaurantTemplate | null>(null);
  const [formData, setFormData] = useState({
    restaurantName: "",
    partnerId: "",
    clientEmail: "",
    notes: "",
    expirationDays: "7",
  });
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleTemplateSelect = (templateId: RestaurantTemplate) => {
    setSelectedTemplate(templateId);
  };

  const handleNext = () => {
    if (step === 1 && !selectedTemplate) {
      toast({
        title: "Template Required",
        description: "Please select a template to continue.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!formData.restaurantName || !formData.partnerId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "Demo Created Successfully!",
        description: `${formData.restaurantName} demo is now live and ready for presentation.`,
      });

      // Reset form
      setStep(1);
      setSelectedTemplate(null);
      setFormData({
        restaurantName: "",
        partnerId: "",
        clientEmail: "",
        notes: "",
        expirationDays: "7",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error Creating Demo",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTemplateData = mockDemoTemplates.find(
    (t) => t.id === selectedTemplate,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Demo Tenant - Step {step} of 2</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Choose Restaurant Template
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Select a pre-configured template that matches your client's
                restaurant type. Each template includes optimized settings and
                sample content.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockDemoTemplates.map((template) => (
                <DemoTemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleTemplateSelect}
                  isSelected={selectedTemplate === template.id}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Demo Configuration</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure your demo tenant with specific details for your client
                presentation.
              </p>
            </div>

            {selectedTemplateData && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedTemplateData.previewImage}
                    alt={selectedTemplateData.name}
                    className="w-16 h-12 rounded object-cover"
                  />
                  <div>
                    <h4 className="font-medium">{selectedTemplateData.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplateData.category}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="restaurantName">Restaurant Name *</Label>
                  <Input
                    id="restaurantName"
                    value={formData.restaurantName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        restaurantName: e.target.value,
                      }))
                    }
                    placeholder="e.g., Bella Vista Ristorante"
                  />
                </div>

                <div>
                  <Label htmlFor="partnerId">Assign to Partner *</Label>
                  <Select
                    value={formData.partnerId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, partnerId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPartners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.id}>
                          {partner.name} - {partner.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expirationDays">Expiration Period</Label>
                  <Select
                    value={formData.expirationDays}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        expirationDays: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days (default)</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="clientEmail">Client Email (optional)</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        clientEmail: e.target.value,
                      }))
                    }
                    placeholder="client@restaurant.com"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Add any special notes or requirements..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!selectedTemplate}>
                Next: Configure Demo
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isCreating}>
                {isCreating ? "Creating Demo..." : "Create Demo Tenant"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
