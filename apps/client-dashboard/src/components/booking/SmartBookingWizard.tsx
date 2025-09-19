import React, { useState } from "react";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSmartBookingCreation } from "@/hooks/useSmartBookingCreation";
import { useTenant } from "@/hooks/useTenant";
import { format } from "date-fns";
import {
  CalendarIcon,
  Clock,
  Users,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Target,
  TrendingUp,
} from "lucide-react";

interface SmartBookingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SmartBookingWizard: React.FC<SmartBookingWizardProps> = ({
  open,
  onOpenChange,
}) => {
  const { tenant } = useTenant();
  const {
    currentStep,
    formData,
    availableTables,
    createBooking,
    isCreating,
    createdReservation,
    nextStep,
    previousStep,
    updateFormData,
    resetForm,
    calculateETA,
  } = useSmartBookingCreation(tenant?.id);

  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTable, setSelectedTable] = useState<string>("");
  const stripePromise = React.useMemo(() => {
    const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    return pk ? loadStripe(pk) : null;
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      updateFormData({ date: format(date, "yyyy-MM-dd") });
    }
  };

  const handleSubmit = () => {
    createBooking({
      ...formData,
      tableId: selectedTable,
    });
  };

  const steps = [
    { title: "Customer Details", icon: Users },
    { title: "Date & Time", icon: CalendarIcon },
    { title: "Table Selection", icon: MapPin },
    { title: "Review", icon: CheckCircle },
    { title: "Done", icon: CheckCircle },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-describedby="booking-wizard-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Smart Booking Creation
          </DialogTitle>
          <p id="booking-wizard-description" className="sr-only">
            Step-by-step booking wizard to create reservations
          </p>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === index + 1;
            const isCompleted = currentStep > index + 1;

            return (
              <div key={index} className="flex items-center">
                <div
                  className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${
                    isCompleted
                      ? "bg-success border-success text-success-foreground"
                      : isActive
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-muted border-muted-foreground/30 text-muted-foreground"
                  }
                `}
                >
                  <StepIcon className="h-4 w-4" />
                </div>
                <div className="ml-2 hidden sm:block">
                  <p
                    className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-4 ${isCompleted ? "bg-success" : "bg-muted"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Customer Details */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) =>
                      updateFormData({ customerName: e.target.value })
                    }
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partySize">Party Size *</Label>
                  <Select
                    value={formData.partySize.toString()}
                    onValueChange={(value) =>
                      updateFormData({ partySize: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(12)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1} {i === 0 ? "person" : "people"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData({ phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Booking Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(
                    value:
                      | "phone"
                      | "walk_in"
                      | "website"
                      | "social"
                      | "partner",
                  ) => updateFormData({ source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Select Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate
                          ? format(selectedDate, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="time">Select Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => updateFormData({ time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select
                    value={formData.duration?.toString() || "120"}
                    onValueChange={(value) =>
                      updateFormData({ duration: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="150">2.5 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Arrival</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formData.date && formData.time
                        ? `${calculateETA(`${formData.date}T${formData.time}`, formData.partySize)} minutes`
                        : "Select date & time"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deposit"
                    checked={formData.depositRequired}
                    onCheckedChange={(checked) =>
                      updateFormData({ depositRequired: !!checked })
                    }
                  />
                  <Label htmlFor="deposit">Require deposit</Label>
                </div>

                {formData.depositRequired && (
                  <div className="space-y-2">
                    <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      value={formData.depositAmount || ""}
                      onChange={(e) =>
                        updateFormData({
                          depositAmount: parseFloat(e.target.value),
                        })
                      }
                      placeholder="25.00"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: Table Selection */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">
                    Optimized Table Recommendations
                  </h3>
                </div>

                {availableTables.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No tables available for the selected time. Please choose
                        a different time.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableTables.map((table) => (
                      <Card
                        key={table.tableId}
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedTable === table.tableId
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:shadow-md"
                        }`}
                        onClick={() => setSelectedTable(table.tableId)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center justify-between">
                            {table.tableName}
                            <Badge variant="outline">
                              {Math.round(table.recommendationScore)}% match
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Capacity:
                              </span>
                              <span>{table.capacity} people</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Utilization:
                              </span>
                              <span>{Math.round(table.utilization)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2 transition-all duration-300"
                                style={{
                                  width: `${table.recommendationScore}%`,
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  value={formData.specialRequests || ""}
                  onChange={(e) =>
                    updateFormData({ specialRequests: e.target.value })
                  }
                  placeholder="Any special requests or dietary requirements..."
                  rows={3}
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Booking Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formData.customerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{formData.email}</span>
                      </div>
                      {formData.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{formData.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {selectedDate
                            ? format(selectedDate, "PPP")
                            : formData.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formData.time} ({formData.duration} minutes)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{formData.partySize} people</span>
                      </div>
                    </div>
                  </div>

                  {selectedTable && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm font-medium">
                        Table:{" "}
                        {
                          availableTables.find(
                            (t) => t.tableId === selectedTable,
                          )?.tableName
                        }
                      </p>
                    </div>
                  )}

                  {formData.depositRequired && (
                    <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg">
                      <CreditCard className="h-4 w-4 text-warning" />
                      <span className="text-sm">
                        Deposit required: ${formData.depositAmount}
                      </span>
                    </div>
                  )}

                  {formData.specialRequests && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">
                        Special Requests:
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formData.specialRequests}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {formData.depositRequired && stripePromise && (
                <Elements stripe={stripePromise} options={{appearance:{labels:'floating'},fonts:[],locale:'en'}}>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <div className="p-3 border rounded-md bg-background" aria-live="polite">
                      <CardElement options={{ hidePostalCode: true, style:{base:{fontSize:'16px'}} }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your card will be charged a refundable deposit of ${formData.depositAmount || 0}.
                    </p>
                  </div>
                </Elements>
              )}
            </motion.div>
          )}

          {/* Step 5: Success */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-5 w-5" />
                    Booking Confirmed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Confirmation No.: {createdReservation?.confirmation_number || createdReservation?.reservation_id}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name: </span>
                      <span>{formData.customerName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Party: </span>
                      <span>{formData.partySize}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date: </span>
                      <span>{selectedDate ? format(selectedDate, 'PPP') : formData.date}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time: </span>
                      <span>{formData.time}</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" onClick={resetForm}>Create Another</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              disabled={
                (currentStep === 1 &&
                  (!formData.customerName || !formData.email)) ||
                (currentStep === 2 && (!formData.date || !formData.time)) ||
                (currentStep === 3 &&
                  availableTables.length > 0 &&
                  !selectedTable)
              }
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : currentStep === 4 ? (
            <Button
              onClick={handleSubmit}
              disabled={isCreating}
              className="flex items-center gap-2"
            >
              {isCreating ? "Creating..." : "Create Booking"}
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)} className="flex items-center gap-2">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartBookingWizard;
