import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Settings, 
  Globe, 
  Eye,
  Building2,
  Users,
  Calendar,
  TrendingUp,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  bookings_count?: number;
  revenue?: number;
  domains_count?: number;
}

const TenantsPage = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTenants();
  }, [searchTerm, statusFilter, sortBy, sortOrder, currentPage]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tenants')
        .select('*', { count: 'exact' });

      // Apply filters
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const start = (currentPage - 1) * itemsPerPage;
      query = query.range(start, start + itemsPerPage - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      setTenants(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    console.log('Delete tenant called for:', tenant.name, tenant.id);
    setIsDeleting(true);
    try {
      // First, check if tenant has any active bookings
      const { count: bookingsCount, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      if (bookingsError) {
        console.error('Error checking bookings:', bookingsError);
      }

      if (bookingsCount && bookingsCount > 0) {
        toast({
          title: "Cannot Delete Tenant",
          description: "This tenant has active bookings. Please cancel all bookings before deleting.",
          variant: "destructive"
        });
        setIsDeleting(false);
        return;
      }

      console.log('Starting tenant deletion using database function...');
      
      // Use the secure database function to delete the tenant completely
      const { error } = await supabase.rpc('delete_tenant_complete', {
        p_tenant_id: tenant.id
      });

      if (error) {
        console.error('Database function error:', error);
        throw new Error(error.message);
      }

      console.log('Tenant deletion completed successfully');
      
      toast({
        title: "Tenant Deleted",
        description: `${tenant.name} has been permanently deleted.`,
      });

      // Refresh the list
      fetchTenants();
      setTenantToDelete(null);
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast({
        title: "Error",
        description: "Failed to delete tenant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-success/10 text-success border-success/20">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-muted/50 text-muted-foreground">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Memoized stats for performance with real data calculations
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calculate tenants from this month
    const thisMonthTenants = tenants.filter(t => {
      const created = new Date(t.created_at);
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    });
    
    // Calculate tenants from last month
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthTenants = tenants.filter(t => {
      const created = new Date(t.created_at);
      return created.getMonth() === lastMonth && created.getFullYear() === lastMonthYear;
    });
    
    // Calculate growth rate
    const calculateGrowthRate = () => {
      if (lastMonthTenants.length === 0) {
        return thisMonthTenants.length > 0 ? "+100%" : "0%";
      }
      const growth = ((thisMonthTenants.length - lastMonthTenants.length) / lastMonthTenants.length) * 100;
      const sign = growth >= 0 ? "+" : "";
      return `${sign}${growth.toFixed(1)}%`;
    };

    return [
      {
        title: "Total Tenants",
        value: totalCount.toString(),
        icon: Building2,
        color: "from-blue-500 to-blue-600"
      },
      {
        title: "Active Tenants", 
        value: tenants.filter(t => t.status === 'active').length.toString(),
        icon: Users,
        color: "from-green-500 to-green-600"
      },
      {
        title: "New This Month",
        value: thisMonthTenants.length.toString(),
        icon: Calendar,
        color: "from-purple-500 to-purple-600"
      },
      {
        title: "Growth Rate",
        value: calculateGrowthRate(),
        icon: TrendingUp,
        color: "from-orange-500 to-orange-600"
      }
    ];
  }, [tenants, totalCount]);

  if (loading) {
    return <LoadingState title="Loading Tenants" description="Fetching tenant directory and statistics" rows={8} />;
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 animate-slide-in-left">
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">
            Tenant Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive multi-tenant restaurant platform administration
          </p>
        </div>
        <Button 
          onClick={() => navigate('/admin/tenants/provision')}
          variant="premium"
          className="hover:scale-105 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Provision New Tenant
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="border-0 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] animate-scale-in" 
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants by name or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('_');
              setSortBy(field);
              setSortOrder(order as "asc" | "desc");
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Newest First</SelectItem>
                <SelectItem value="created_at_asc">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="status_asc">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Tenants Directory</CardTitle>
          <CardDescription>
            {totalCount} total tenants found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Domains</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                        </div>
                      </TableCell>
                      <TableCell><div className="h-6 bg-muted rounded animate-pulse w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-8" /></TableCell>
                      <TableCell><div className="h-8 bg-muted rounded animate-pulse w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
                        title={searchTerm || statusFilter !== 'all' 
                          ? 'No tenants match your filters' 
                          : 'No tenants found'}
                        description={searchTerm || statusFilter !== 'all'
                          ? 'Try adjusting your search criteria or filters to find tenants.'
                          : 'Get started by creating your first tenant to manage restaurant operations.'}
                        action={{
                          label: 'Provision New Tenant',
                          onClick: () => navigate('/admin/tenants/provision')
                        }}
                        className="m-6"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((tenant, index) => (
                    <TableRow 
                      key={tenant.id} 
                      className="hover:bg-muted/50 transition-colors animate-fade-in-up cursor-pointer"
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{tenant.name}</div>
                          <div className="text-sm text-muted-foreground">/{tenant.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{tenant.timezone}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{tenant.domains_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/tenants/${tenant.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/tenants/${tenant.id}/settings`);
                              }}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/tenants/${tenant.id}/domains`);
                              }}
                            >
                              <Globe className="h-4 w-4 mr-2" />
                              Domains
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setTenantToDelete(tenant);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Tenant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} tenants
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                  return page <= totalPages ? (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ) : null;
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!tenantToDelete} onOpenChange={() => setTenantToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{tenantToDelete?.name}</strong>? 
              This action cannot be undone and will permanently remove:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>All tenant data and settings</li>
                <li>Restaurant tables and business hours</li>
                <li>Domains and features</li>
                <li>Provisioning records</li>
              </ul>
              <p className="mt-2 text-sm font-medium text-destructive">
                Note: Tenants with active bookings cannot be deleted.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => tenantToDelete && handleDeleteTenant(tenantToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Tenant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TenantsPage;