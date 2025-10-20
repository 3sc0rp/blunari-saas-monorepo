import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  available: boolean;
  dietary_tags?: string[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

interface MenuPreviewProps {
  categories: Category[];
  className?: string;
}

const DIETARY_TAG_COLORS: Record<string, string> = {
  vegetarian: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  vegan: 'bg-green-200 text-green-900 dark:bg-green-900/30 dark:text-green-300',
  'gluten-free': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  'dairy-free': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'nut-free': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  halal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  kosher: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
};

/**
 * MenuPreview Component
 * 
 * Live preview of how the menu will appear to customers.
 * Shows the menu in a customer-facing format.
 */
export function MenuPreview({ categories, className }: MenuPreviewProps) {
  const formatCurrency = (cents?: number) => {
    if (!cents) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <CardTitle>Customer Preview</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          How your menu will appear to customers
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2">
          {categories
            .filter(cat => cat.items.some(i => i.available))
            .map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Category Header */}
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  )}
                </div>

                {/* Menu Items */}
                <div className="space-y-4">
                  {category.items
                    .filter(item => item.available)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 pb-3 border-b last:border-0"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start gap-2">
                            <h4 className="font-medium">{item.name}</h4>
                            {item.dietary_tags && item.dietary_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.dietary_tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className={cn(
                                      'text-[10px] px-1.5 py-0',
                                      DIETARY_TAG_COLORS[tag]
                                    )}
                                  >
                                    {tag.replace('-', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <span className="font-semibold text-primary whitespace-nowrap">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            ))}

          {categories.every(cat => !cat.items.some(i => i.available)) && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No available menu items to display</p>
              <p className="text-xs mt-1">Add items and mark them as available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
