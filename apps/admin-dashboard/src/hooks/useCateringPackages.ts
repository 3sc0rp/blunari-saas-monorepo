import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  CateringPackage,
  CateringMenuItem,
  CateringMenuCategory,
  CateringEventType,
  CateringEquipment,
  CreateCateringPackageRequest,
  CreateCateringMenuItemRequest
} from '@/types/catering';

export interface UseCateringPackagesReturn {
  packages: CateringPackage[] | null;
  menuItems: CateringMenuItem[] | null;
  menuCategories: CateringMenuCategory[] | null;
  eventTypes: CateringEventType[] | null;
  equipment: CateringEquipment[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createPackage: (packageData: CreateCateringPackageRequest) => Promise<void>;
  updatePackage: (packageId: string, updates: Partial<CateringPackage>) => Promise<void>;
  deletePackage: (packageId: string) => Promise<void>;
  createMenuItem: (itemData: CreateCateringMenuItemRequest) => Promise<void>;
  updateMenuItem: (itemId: string, updates: Partial<CateringMenuItem>) => Promise<void>;
  deleteMenuItem: (itemId: string) => Promise<void>;
}

export function useCateringPackages(): UseCateringPackagesReturn {
  const [packages, setPackages] = useState<CateringPackage[] | null>(null);
  const [menuItems, setMenuItems] = useState<CateringMenuItem[] | null>(null);
  const [menuCategories, setMenuCategories] = useState<CateringMenuCategory[] | null>(null);
  const [eventTypes, setEventTypes] = useState<CateringEventType[] | null>(null);
  const [equipment, setEquipment] = useState<CateringEquipment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch packages with items using the view
      const { data: packagesData, error: packagesError } = await (supabase as any)
        .from('catering_packages_with_items')
        .select('*')
        .eq('active', true)
        .order('popular', { ascending: false })
        .order('created_at', { ascending: false });

      if (packagesError) {
        console.warn('Catering packages not found - apply database migration first');
      } else {
        setPackages(packagesData || []);
      }

      // Fetch menu items with categories
      const { data: itemsData, error: itemsError } = await (supabase as any)
        .from('catering_menu_items')
        .select(`
          *,
          category:catering_menu_categories(*)
        `)
        .eq('active', true)
        .order('display_order');

      if (itemsError) {
        console.warn('Menu items not found - apply database migration first');
      } else {
        setMenuItems(itemsData || []);
      }

      // Fetch menu categories
      const { data: categoriesData, error: categoriesError } = await (supabase as any)
        .from('catering_menu_categories')
        .select('*')
        .eq('active', true)
        .order('display_order');

      if (categoriesError) {
        console.warn('Menu categories not found - apply database migration first');
      } else {
        setMenuCategories(categoriesData || []);
      }

      // Fetch event types
      const { data: eventTypesData, error: eventTypesError } = await (supabase as any)
        .from('catering_event_types')
        .select('*')
        .eq('active', true)
        .order('name');

      if (eventTypesError) {
        console.warn('Event types not found - apply database migration first');
      } else {
        setEventTypes(eventTypesData || []);
      }

      // Fetch equipment
      const { data: equipmentData, error: equipmentError } = await (supabase as any)
        .from('catering_equipment')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name');

      if (equipmentError) {
        console.warn('Equipment not found - apply database migration first');
      } else {
        setEquipment(equipmentData || []);
      }

    } catch (err) {
      console.warn('Catering system not ready:', err);
      setError('Catering system not ready - apply database migration first');
      // Set empty arrays for graceful degradation
      setPackages([]);
      setMenuItems([]);
      setMenuCategories([]);
      setEventTypes([]);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const createPackage = async (packageData: CreateCateringPackageRequest) => {
    try {
      // First create the package
      const { data: newPackage, error: packageError } = await (supabase as any)
        .from('catering_packages')
        .insert({
          name: packageData.name,
          description: packageData.description,
          price_per_person: packageData.price_per_person,
          min_guests: packageData.min_guests,
          max_guests: packageData.max_guests,
          includes_setup: packageData.includes_setup || false,
          includes_service: packageData.includes_service || false,
          includes_cleanup: packageData.includes_cleanup || false,
          dietary_accommodations: packageData.dietary_accommodations || [],
          image_url: packageData.image_url
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // Then add package items
      if (packageData.items && packageData.items.length > 0) {
        const packageItems = packageData.items.map(item => ({
          package_id: newPackage.id,
          menu_item_id: item.menu_item_id,
          quantity_per_person: item.quantity_per_person,
          is_included: item.is_included,
          additional_cost_per_person: item.additional_cost_per_person || 0
        }));

        const { error: itemsError } = await (supabase as any)
          .from('catering_package_items')
          .insert(packageItems);

        if (itemsError) throw itemsError;
      }

      await fetchAllData();
    } catch (err) {
      console.warn('Error creating package:', err);
      throw new Error('Could not create package - catering system may not be ready');
    }
  };

  const updatePackage = async (packageId: string, updates: Partial<CateringPackage>) => {
    try {
      const { error } = await (supabase as any)
        .from('catering_packages')
        .update(updates)
        .eq('id', packageId);

      if (error) throw error;
      await fetchAllData();
    } catch (err) {
      console.warn('Error updating package:', err);
      throw new Error('Could not update package - catering system may not be ready');
    }
  };

  const deletePackage = async (packageId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('catering_packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;
      await fetchAllData();
    } catch (err) {
      console.warn('Error deleting package:', err);
      throw new Error('Could not delete package - catering system may not be ready');
    }
  };

  const createMenuItem = async (itemData: CreateCateringMenuItemRequest) => {
    try {
      const { error } = await (supabase as any)
        .from('catering_menu_items')
        .insert({
          category_id: itemData.category_id,
          name: itemData.name,
          description: itemData.description,
          price_per_person: itemData.price_per_person,
          price_per_item: itemData.price_per_item,
          minimum_quantity: itemData.minimum_quantity || 1,
          serves_people: itemData.serves_people,
          dietary_restrictions: itemData.dietary_restrictions || [],
          ingredients: itemData.ingredients || [],
          allergens: itemData.allergens || [],
          preparation_time_minutes: itemData.preparation_time_minutes || 30,
          image_url: itemData.image_url
        });

      if (error) throw error;
      await fetchAllData();
    } catch (err) {
      console.warn('Error creating menu item:', err);
      throw new Error('Could not create menu item - catering system may not be ready');
    }
  };

  const updateMenuItem = async (itemId: string, updates: Partial<CateringMenuItem>) => {
    try {
      const { error } = await (supabase as any)
        .from('catering_menu_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      await fetchAllData();
    } catch (err) {
      console.warn('Error updating menu item:', err);
      throw new Error('Could not update menu item - catering system may not be ready');
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('catering_menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await fetchAllData();
    } catch (err) {
      console.warn('Error deleting menu item:', err);
      throw new Error('Could not delete menu item - catering system may not be ready');
    }
  };

  const refetch = fetchAllData;

  useEffect(() => {
    fetchAllData();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const packagesSubscription = supabase
      .channel('catering_packages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'catering_packages',
        },
        () => fetchAllData()
      )
      .subscribe();

    const itemsSubscription = supabase
      .channel('catering_menu_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'catering_menu_items',
        },
        () => fetchAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(packagesSubscription);
      supabase.removeChannel(itemsSubscription);
    };
  }, []);

  return {
    packages,
    menuItems,
    menuCategories,
    eventTypes,
    equipment,
    loading,
    error,
    refetch,
    createPackage,
    updatePackage,
    deletePackage,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };
}
