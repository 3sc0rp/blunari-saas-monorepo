import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/state";
import {
  SkeletonPage,
  SkeletonTable,
  SkeletonChart,
} from "@/components/ui/skeleton-components";
import { Plus, RefreshCw, Download, Users, Search } from "lucide-react";

// Demo page showing all the new patterns
const DemoPage: React.FC = () => {
  const [state, setState] = useState<"loading" | "empty" | "error" | "data">(
    "loading",
  );
  const [data, setData] = useState<any[]>([]);

  // Simulate different states
  useEffect(() => {
    const timer = setTimeout(() => {
      const random = Math.random();
      if (random < 0.3) setState("empty");
      else if (random < 0.5) setState("error");
      else {
        setState("data");
        setData(["item1", "item2", "item3"]);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleCreate = () => {
    // Create new item logic
  };

  const handleRefresh = () => {
    setState("loading");
    setTimeout(() => setState("data"), 1000);
  };

  const handleExport = () => {
    console.log("Exporting data...");
  };

  // Loading state
  if (state === "loading") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Demo Page"
          description="Demonstrating page header patterns and state management"
        />
        <SkeletonPage />
      </motion.div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Demo Page"
          description="Demonstrating page header patterns and state management"
          secondaryActions={[
            {
              label: "Refresh",
              onClick: handleRefresh,
              icon: RefreshCw,
              variant: "outline",
            },
          ]}
        />
        <ErrorState
          variant="general-error"
          action={{
            label: "Try Again",
            onClick: handleRefresh,
            icon: RefreshCw,
          }}
          secondaryAction={{
            label: "Contact Support",
            onClick: () => console.log("Contacting support..."),
          }}
        />
      </motion.div>
    );
  }

  // Empty state
  if (state === "empty") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Demo Page"
          description="Demonstrating page header patterns and state management"
          primaryAction={{
            label: "Create First Item",
            onClick: handleCreate,
            icon: Plus,
          }}
          secondaryActions={[
            {
              label: "Refresh",
              onClick: handleRefresh,
              icon: RefreshCw,
              variant: "outline",
            },
          ]}
        />
        <EmptyState
          variant="no-search-results"
          action={{
            label: "Create Item",
            onClick: handleCreate,
            icon: Plus,
          }}
          secondaryAction={{
            label: "Learn More",
            onClick: () => console.log("Learning more..."),
          }}
        />
      </motion.div>
    );
  }

  // Data state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title="Demo Page"
        description="Demonstrating page header patterns and state management"
        primaryAction={{
          label: "Create New",
          onClick: handleCreate,
          icon: Plus,
        }}
        secondaryActions={[
          {
            label: "Export",
            onClick: handleExport,
            icon: Download,
            variant: "outline",
          },
          {
            label: "Refresh",
            onClick: handleRefresh,
            icon: RefreshCw,
            variant: "ghost",
          },
        ]}
        tabs={[
          { value: "all", label: "All Items" },
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
        ]}
        activeTab="all"
      />

      {/* Sample content with data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Item {i}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body-sm text-muted-foreground">
                Sample data item with proper spacing and typography.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart className="h-80" showLegend={false} />
        <SkeletonTable rows={6} columns={3} />
      </div>
    </motion.div>
  );
};

export default DemoPage;
