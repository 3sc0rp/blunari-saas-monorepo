import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const CateringSampleDataSeeder: React.FC = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [status, setStatus] = useState<string>('');

  const seedSampleData = async () => {
    setIsSeeding(true);
    setStatus('Finding demo tenant...');

    try {
      // First, find the demo tenant
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('slug', 'demo-restaurant')
        .limit(1);

      if (tenantError) {
        setStatus(`Error finding tenant: ${tenantError.message}`);
        return;
      }

      if (!tenants || tenants.length === 0) {
        setStatus('Demo restaurant tenant not found');
        return;
      }

      const tenantId = tenants[0].id;
      setStatus(`Found tenant: ${tenants[0].name}`);

      // Sample catering packages
      const samplePackages = [
        {
          tenant_id: tenantId,
          name: 'Executive Business Lunch',
          description: 'Premium catering package perfect for corporate events and business meetings. Includes gourmet sandwiches, fresh salads, and beverages.',
          price_per_person: 2499, // $24.99
          min_guests: 10,
          max_guests: 50,
          preparation_time_hours: 24,
          includes_setup: true,
          includes_service: true,
          includes_cleanup: true,
          dietary_accommodations: ['vegetarian', 'gluten_free'],
          popular: true,
          active: true
        },
        {
          tenant_id: tenantId,
          name: 'Wedding Reception Package',
          description: 'Elegant three-course dinner perfect for wedding receptions and formal celebrations. Includes appetizers, main course, dessert, and full service.',
          price_per_person: 7999, // $79.99
          min_guests: 50,
          max_guests: 200,
          preparation_time_hours: 72,
          includes_setup: true,
          includes_service: true,
          includes_cleanup: true,
          dietary_accommodations: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'],
          popular: true,
          active: true
        },
        {
          tenant_id: tenantId,
          name: 'Casual Office Party',
          description: 'Fun and relaxed catering for office parties and team events. Pizza, finger foods, and beverages to keep everyone happy.',
          price_per_person: 1899, // $18.99
          min_guests: 15,
          max_guests: 75,
          preparation_time_hours: 12,
          includes_setup: false,
          includes_service: false,
          includes_cleanup: false,
          dietary_accommodations: ['vegetarian'],
          popular: false,
          active: true
        },
        {
          tenant_id: tenantId,
          name: 'Holiday Celebration Feast',
          description: 'Special holiday catering featuring traditional dishes and seasonal favorites. Perfect for corporate holiday parties and family gatherings.',
          price_per_person: 4999, // $49.99
          min_guests: 25,
          max_guests: 100,
          preparation_time_hours: 48,
          includes_setup: true,
          includes_service: true,
          includes_cleanup: true,
          dietary_accommodations: ['vegetarian', 'gluten_free', 'dairy_free'],
          popular: false,
          active: true
        }
      ];

      setStatus('Adding catering packages...');

      // Insert packages one by one
      for (const pkg of samplePackages) {
        try {
          const { data, error } = await supabase
            .from('catering_packages')
            .insert(pkg)
            .select()
            .single();

          if (error) {
            if (error.code === '23505') {
              console.log(`Package "${pkg.name}" already exists`);
            } else {
              console.error('Error adding package:', pkg.name, error);
            }
          } else {
            console.log('✅ Added package:', pkg.name);
          }
        } catch (err) {
          console.error('Exception adding package:', pkg.name, err);
        }
      }

      setStatus('✅ Sample catering data added successfully! Refresh the page to see the packages.');

    } catch (error) {
      console.error('Error seeding data:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium mb-2">Developer Tools</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Add sample catering packages for testing purposes.
      </p>
      
      <Button 
        onClick={seedSampleData}
        disabled={isSeeding}
        className="mb-2"
      >
        {isSeeding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Add Sample Catering Data
      </Button>
      
      {status && (
        <div className="text-sm p-2 bg-white rounded border">
          {status}
        </div>
      )}
    </div>
  );
};
