import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Check } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category_id: string;
  sort_order: number;
  available: boolean;
  dietary_tags?: string[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  items: MenuItem[];
}

interface MenuTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (template: Category[]) => void;
}

// Pre-built menu templates
const TEMPLATES: { name: string; description: string; categories: Category[] }[] = [
  {
    name: 'Classic Catering',
    description: 'Traditional catering menu with appetizers, entrees, and desserts',
    categories: [
      {
        id: 'template-1-appetizers',
        name: 'Appetizers',
        description: 'Start your event with delicious appetizers',
        sort_order: 0,
        items: [
          {
            id: 'template-1-app-1',
            name: 'Bruschetta',
            description: 'Toasted bread with tomato, basil, and balsamic glaze',
            price: 850,
            category_id: 'template-1-appetizers',
            sort_order: 0,
            available: true,
            dietary_tags: ['vegetarian'],
          },
          {
            id: 'template-1-app-2',
            name: 'Shrimp Cocktail',
            description: 'Chilled jumbo shrimp with cocktail sauce',
            price: 1250,
            category_id: 'template-1-appetizers',
            sort_order: 1,
            available: true,
            dietary_tags: ['gluten-free'],
          },
          {
            id: 'template-1-app-3',
            name: 'Spinach Artichoke Dip',
            description: 'Creamy dip served with tortilla chips',
            price: 950,
            category_id: 'template-1-appetizers',
            sort_order: 2,
            available: true,
            dietary_tags: ['vegetarian'],
          },
        ],
      },
      {
        id: 'template-1-entrees',
        name: 'Entrees',
        description: 'Main course selections',
        sort_order: 1,
        items: [
          {
            id: 'template-1-entree-1',
            name: 'Grilled Salmon',
            description: 'Fresh Atlantic salmon with lemon butter sauce',
            price: 2850,
            category_id: 'template-1-entrees',
            sort_order: 0,
            available: true,
            dietary_tags: ['gluten-free'],
          },
          {
            id: 'template-1-entree-2',
            name: 'Chicken Parmesan',
            description: 'Breaded chicken breast with marinara and mozzarella',
            price: 2450,
            category_id: 'template-1-entrees',
            sort_order: 1,
            available: true,
          },
          {
            id: 'template-1-entree-3',
            name: 'Vegetable Lasagna',
            description: 'Layers of pasta, vegetables, and ricotta cheese',
            price: 2150,
            category_id: 'template-1-entrees',
            sort_order: 2,
            available: true,
            dietary_tags: ['vegetarian'],
          },
        ],
      },
      {
        id: 'template-1-desserts',
        name: 'Desserts',
        description: 'Sweet endings for your event',
        sort_order: 2,
        items: [
          {
            id: 'template-1-dessert-1',
            name: 'Tiramisu',
            description: 'Classic Italian dessert with espresso and mascarpone',
            price: 750,
            category_id: 'template-1-desserts',
            sort_order: 0,
            available: true,
            dietary_tags: ['vegetarian'],
          },
          {
            id: 'template-1-dessert-2',
            name: 'Chocolate Cake',
            description: 'Rich chocolate cake with ganache frosting',
            price: 650,
            category_id: 'template-1-desserts',
            sort_order: 1,
            available: true,
            dietary_tags: ['vegetarian'],
          },
        ],
      },
    ],
  },
  {
    name: 'Asian Fusion',
    description: 'Asian-inspired menu with diverse flavors',
    categories: [
      {
        id: 'template-2-starters',
        name: 'Starters',
        description: 'Asian-inspired appetizers',
        sort_order: 0,
        items: [
          {
            id: 'template-2-starter-1',
            name: 'Spring Rolls',
            description: 'Crispy vegetable spring rolls with sweet chili sauce',
            price: 950,
            category_id: 'template-2-starters',
            sort_order: 0,
            available: true,
            dietary_tags: ['vegan'],
          },
          {
            id: 'template-2-starter-2',
            name: 'Edamame',
            description: 'Steamed soybeans with sea salt',
            price: 650,
            category_id: 'template-2-starters',
            sort_order: 1,
            available: true,
            dietary_tags: ['vegan', 'gluten-free'],
          },
        ],
      },
      {
        id: 'template-2-mains',
        name: 'Main Dishes',
        description: 'Asian main courses',
        sort_order: 1,
        items: [
          {
            id: 'template-2-main-1',
            name: 'Pad Thai',
            description: 'Stir-fried rice noodles with shrimp or tofu',
            price: 1950,
            category_id: 'template-2-mains',
            sort_order: 0,
            available: true,
            dietary_tags: ['gluten-free'],
          },
          {
            id: 'template-2-main-2',
            name: 'Teriyaki Chicken',
            description: 'Grilled chicken with teriyaki glaze',
            price: 2150,
            category_id: 'template-2-mains',
            sort_order: 1,
            available: true,
          },
        ],
      },
    ],
  },
  {
    name: 'Mediterranean',
    description: 'Fresh Mediterranean flavors',
    categories: [
      {
        id: 'template-3-mezze',
        name: 'Mezze',
        description: 'Mediterranean small plates',
        sort_order: 0,
        items: [
          {
            id: 'template-3-mezze-1',
            name: 'Hummus Platter',
            description: 'Classic hummus with pita bread and vegetables',
            price: 1050,
            category_id: 'template-3-mezze',
            sort_order: 0,
            available: true,
            dietary_tags: ['vegan'],
          },
          {
            id: 'template-3-mezze-2',
            name: 'Greek Salad',
            description: 'Fresh vegetables, feta, olives, and olive oil',
            price: 950,
            category_id: 'template-3-mezze',
            sort_order: 1,
            available: true,
            dietary_tags: ['vegetarian', 'gluten-free'],
          },
        ],
      },
      {
        id: 'template-3-mains',
        name: 'Main Courses',
        description: 'Mediterranean entrees',
        sort_order: 1,
        items: [
          {
            id: 'template-3-main-1',
            name: 'Lamb Kebabs',
            description: 'Grilled lamb skewers with tzatziki sauce',
            price: 2850,
            category_id: 'template-3-mains',
            sort_order: 0,
            available: true,
            dietary_tags: ['gluten-free'],
          },
          {
            id: 'template-3-main-2',
            name: 'Falafel Wrap',
            description: 'Crispy falafel with tahini sauce',
            price: 1650,
            category_id: 'template-3-mains',
            sort_order: 1,
            available: true,
            dietary_tags: ['vegan'],
          },
        ],
      },
    ],
  },
];

/**
 * MenuTemplateDialog Component
 * 
 * Dialog for selecting and applying pre-built menu templates.
 */
export function MenuTemplateDialog({
  open,
  onOpenChange,
  onApply,
}: MenuTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Menu Templates</DialogTitle>
          <DialogDescription>
            Choose a pre-built template to quickly set up your catering menu.
            You can customize it after applying.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {TEMPLATES.map((template) => (
            <Card
              key={template.name}
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => onApply(template.categories)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  {template.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {template.categories.map((cat) => (
                    <div key={cat.id} className="text-xs">
                      <span className="font-medium">{cat.name}</span>
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {cat.items.length} items
                      </Badge>
                    </div>
                  ))}
                </div>

                <Button size="sm" className="w-full mt-4">
                  <Check className="h-3 w-3 mr-2" />
                  Apply Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg text-xs text-muted-foreground">
          <strong>Note:</strong> Applying a template will replace your current menu.
          Make sure to save any changes before applying a template.
        </div>
      </DialogContent>
    </Dialog>
  );
}
