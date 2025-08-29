import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/hooks/useTenant';
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Calendar,
  Star,
  MapPin,
  Gift,
  AlertTriangle
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  total_visits: number;
  total_spent: number;
  last_visit: string;
  average_party_size: number;
  customer_type: 'regular' | 'vip' | 'new' | 'inactive';
  preferences: string[];
  allergies: string[];
  special_occasions: Array<{
    type: string;
    date: string;
    notes?: string;
  }>;
  loyalty_points: number;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

const CustomerManagement: React.FC = () => {
  const { tenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>('all');

  // Mock customer data - in production this would come from the database
  const customers: Customer[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1 (555) 123-4567',
      total_visits: 24,
      total_spent: 2850,
      last_visit: '2024-01-15',
      average_party_size: 2.3,
      customer_type: 'vip',
      preferences: ['Window seating', 'Quiet atmosphere', 'Wine pairings'],
      allergies: ['Shellfish'],
      special_occasions: [
        { type: 'Anniversary', date: '2024-03-15', notes: 'Married 5 years' }
      ],
      loyalty_points: 1250,
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105'
      }
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael.chen@email.com',
      phone: '+1 (555) 987-6543',
      total_visits: 8,
      total_spent: 920,
      last_visit: '2024-01-12',
      average_party_size: 4.2,
      customer_type: 'regular',
      preferences: ['Booth seating', 'Family-friendly'],
      allergies: ['Nuts', 'Dairy'],
      special_occasions: [],
      loyalty_points: 460,
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@email.com',
      total_visits: 1,
      total_spent: 85,
      last_visit: '2024-01-10',
      average_party_size: 2,
      customer_type: 'new',
      preferences: [],
      allergies: [],
      special_occasions: [],
      loyalty_points: 25,
    }
  ];

  // Filter customers based on search and type
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.phone && customer.phone.includes(searchTerm));
    
    const matchesType = selectedCustomerType === 'all' || customer.customer_type === selectedCustomerType;
    
    return matchesSearch && matchesType;
  });

  // Customer statistics
  const customerStats = {
    total: customers.length,
    new: customers.filter(c => c.customer_type === 'new').length,
    regular: customers.filter(c => c.customer_type === 'regular').length,
    vip: customers.filter(c => c.customer_type === 'vip').length,
    inactive: customers.filter(c => c.customer_type === 'inactive').length,
    total_revenue: customers.reduce((sum, c) => sum + c.total_spent, 0),
    average_spend: customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length
  };

  const getCustomerTypeColor = (type: Customer['customer_type']) => {
    switch (type) {
      case 'vip':
        return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'regular':
        return 'bg-primary text-primary-foreground';
      case 'new':
        return 'bg-success text-success-foreground';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage customer relationships and track dining preferences
          </p>
        </div>
        
        <Button>
          <Users className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </motion.div>

      {/* Customer Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{customerStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Customers</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{customerStats.vip}</div>
              <div className="text-sm text-muted-foreground">VIP</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{customerStats.regular}</div>
              <div className="text-sm text-muted-foreground">Regular</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{customerStats.new}</div>
              <div className="text-sm text-muted-foreground">New</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">${customerStats.total_revenue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">${Math.round(customerStats.average_spend)}</div>
              <div className="text-sm text-muted-foreground">Avg. Spend</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Customer Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Tabs value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({customerStats.total})</TabsTrigger>
            <TabsTrigger value="vip">VIP ({customerStats.vip})</TabsTrigger>
            <TabsTrigger value="regular">Regular ({customerStats.regular})</TabsTrigger>
            <TabsTrigger value="new">New ({customerStats.new})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({customerStats.inactive})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCustomerType} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <CustomerCard customer={customer} getCustomerTypeColor={getCustomerTypeColor} />
                </motion.div>
              ))}
            </div>
            
            {filteredCustomers.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No customers found</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    No customers match your current search criteria. Try adjusting your filters.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

// Customer Card Component
const CustomerCard: React.FC<{
  customer: Customer;
  getCustomerTypeColor: (type: Customer['customer_type']) => string;
}> = ({ customer, getCustomerTypeColor }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{customer.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
          </div>
          <Badge className={getCustomerTypeColor(customer.customer_type)}>
            {customer.customer_type.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="space-y-2">
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{customer.address.city}, {customer.address.state}</span>
            </div>
          )}
        </div>

        {/* Visit Stats */}
        <div className="grid grid-cols-2 gap-4 py-3 border-t border-b">
          <div className="text-center">
            <div className="font-semibold">{customer.total_visits}</div>
            <div className="text-xs text-muted-foreground">Visits</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">${customer.total_spent}</div>
            <div className="text-xs text-muted-foreground">Total Spent</div>
          </div>
        </div>

        {/* Preferences & Allergies */}
        {(customer.preferences.length > 0 || customer.allergies.length > 0) && (
          <div className="space-y-2">
            {customer.preferences.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Preferences</h4>
                <div className="flex flex-wrap gap-1">
                  {customer.preferences.slice(0, 2).map((pref, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {pref}
                    </Badge>
                  ))}
                  {customer.preferences.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{customer.preferences.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {customer.allergies.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Allergies</h4>
                <div className="flex flex-wrap gap-1">
                  {customer.allergies.map((allergy, idx) => (
                    <Badge key={idx} variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Occasions */}
        {customer.special_occasions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Upcoming</h4>
            {customer.special_occasions.slice(0, 1).map((occasion, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4 text-warning" />
                <span>{occasion.type} - {new Date(occasion.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Loyalty Points */}
        {customer.loyalty_points > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" />
              <span>Loyalty Points</span>
            </div>
            <span className="font-semibold">{customer.loyalty_points}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button size="sm" className="flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Book
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerManagement;