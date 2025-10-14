import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { FileText, Download, Mail, DollarSign } from 'lucide-react';
import type { CateringOrder } from '@/types/catering';

interface QuoteGeneratorProps {
  order: CateringOrder;
  onClose?: () => void;
}

export function QuoteGenerator({ order, onClose }: QuoteGeneratorProps) {
  const [subtotal, setSubtotal] = useState(order.subtotal || 0);
  const [taxRate, setTaxRate] = useState(0.08); // 8% default
      const [serviceFeePercent, setServiceFeePercent] = useState(0.15); // 15% default
      const [deliveryFee, setDeliveryFee] = useState(order.delivery_fee || 0);
  const [depositPercent, setDepositPercent] = useState(0.30); // 30% default

  // Calculate totals
      const taxAmount = Math.round(subtotal * taxRate);
  const serviceFee = Math.round(subtotal * serviceFeePercent);
  const totalAmount = subtotal + taxAmount + serviceFee + deliveryFee;
  const depositAmount = Math.round(totalAmount * depositPercent);
  const balanceDue = totalAmount - depositAmount;

  const handleGenerateQuote = async () => {
    try {
      // Update order with quote details
      const { error } = await (supabase as any)
        .from('catering_orders')
        .update({
          subtotal,
          tax_amount: taxAmount,
          service_fee: serviceFee,
          delivery_fee: deliveryFee,
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          balance_due: balanceDue,
          status: 'quoted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Quote generated and saved!');
      if (onClose) onClose();
    } catch (error) {
      console.error('Quote generation error:', error);
      toast.error('Failed to generate quote');
    }
  };

  const handleEmailQuote = () => {
    toast.info('Email functionality coming soon!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generate Quote
        </CardTitle>
        <CardDescription>
          Calculate pricing for {order.event_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pricing Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="subtotal">Subtotal ($)</Label>
            <Input
              id="subtotal"
              type="number"
              step="0.01"
              value={subtotal / 100}
              onChange={(e) => setSubtotal(Math.round(parseFloat(e.target.value) * 100))}
            />
            <p className="text-xs text-muted-foreground">
              Base price for {order.guest_count} guests
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              step="0.01"
              value={taxRate * 100}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-fee">Service Fee (%)</Label>
            <Input
              id="service-fee"
              type="number"
              step="0.01"
              value={serviceFeePercent * 100}
              onChange={(e) => setServiceFeePercent(parseFloat(e.target.value) / 100)}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="delivery-fee">Delivery Fee ($)</Label>
            <Input
              id="delivery-fee"
              type="number"
              step="0.01"
              value={deliveryFee / 100}
              onChange={(e) => setDeliveryFee(Math.round(parseFloat(e.target.value) * 100))}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="deposit">Deposit Percentage (%)</Label>
            <Input
              id="deposit"
              type="number"
              step="1"
              value={depositPercent * 100}
              onChange={(e) => setDepositPercent(parseFloat(e.target.value) / 100)}
            />
          </div>
        </div>

        <Separator />

        {/* Quote Summary */}
        <div className="space-y-3">
          <h3 className="font-semibold">Quote Summary</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(1)}%):</span>
              <span>${(taxAmount / 100).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Fee ({(serviceFeePercent * 100).toFixed(0)}%):</span>
              <span>${(serviceFee / 100).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee:</span>
              <span>${(deliveryFee / 100).toFixed(2)}</span>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold text-base">
              <span>Total Amount:</span>
              <span className="text-primary">${(totalAmount / 100).toFixed(2)}</span>

