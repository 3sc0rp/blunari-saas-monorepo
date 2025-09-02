import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Calendar,
  Users,
  BarChart3,
  MessageSquare,
  Filter,
  Plus,
  Settings,
  Utensils,
  Clock,
  MapPin,
  FileText,
  BookOpen,
  Trophy,
  Target,
} from "lucide-react";

interface EmptyStateProps {
  variant:
    | "no-bookings"
    | "no-bookings-date"
    | "no-customers"
    | "no-messages"
    | "no-analytics"
    | "no-search-results"
    | "no-tables"
    | "no-staff"
    | "no-settings"
    | "no-filters"
    | "setup-required"
    | "feature-unavailable";
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

const emptyStateConfig = {
  "no-bookings": {
    icon: Calendar,
    title: "No bookings yet",
    description:
      "Your first reservation will appear here. Share your booking link to get started!",
    illustration: "calendar",
  },
  "no-bookings-date": {
    icon: Clock,
    title: "No bookings for this date",
    description:
      "Try selecting a different date or check your availability settings.",
    illustration: "calendar",
  },
  "no-customers": {
    icon: Users,
    title: "No customers yet",
    description:
      "Customer profiles will appear here once you receive your first booking.",
    illustration: "users",
  },
  "no-messages": {
    icon: MessageSquare,
    title: "No conversations",
    description: "Customer messages and notifications will appear here.",
    illustration: "messages",
  },
  "no-analytics": {
    icon: BarChart3,
    title: "Not enough data yet",
    description:
      "Analytics insights will appear once you have at least 5 bookings.",
    illustration: "chart",
  },
  "no-search-results": {
    icon: Search,
    title: "No results found",
    description: "Try adjusting your search terms or filters.",
    illustration: "search",
  },
  "no-tables": {
    icon: Utensils,
    title: "No tables configured",
    description:
      "Set up your floor plan and table layout to manage reservations.",
    illustration: "restaurant",
  },
  "no-staff": {
    icon: Users,
    title: "No staff members",
    description:
      "Add team members to manage bookings and access the dashboard.",
    illustration: "users",
  },
  "no-settings": {
    icon: Settings,
    title: "Settings not configured",
    description: "Complete your restaurant setup to enable all features.",
    illustration: "settings",
  },
  "no-filters": {
    icon: Filter,
    title: "No results with current filters",
    description: "Try removing some filters to see more results.",
    illustration: "filter",
  },
  "setup-required": {
    icon: Target,
    title: "Setup required",
    description: "Complete the initial setup to start using this feature.",
    illustration: "setup",
  },
  "feature-unavailable": {
    icon: Trophy,
    title: "Feature coming soon",
    description:
      "This feature is currently in development and will be available soon.",
    illustration: "feature",
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  title,
  description,
  action,
  secondaryAction,
}) => {
  const config = emptyStateConfig[variant];
  const IconComponent = config.icon;

  const finalTitle = title || config.title;
  const finalDescription = description || config.description;

  return (
    <Card className="border-dashed border-2 border-border/50 bg-surface/50">
      <CardContent className="flex flex-col items-center justify-center text-center py-16 px-8">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-surface-2 rounded-full flex items-center justify-center mb-6 ring-1 ring-border/10">
            <IconComponent className="h-10 w-10 text-text-muted" />
          </div>
        </div>

        <div className="max-w-md space-y-3 mb-8">
          <h3 className="text-h3 font-semibold text-text">{finalTitle}</h3>
          <p className="text-body-sm text-text-muted leading-relaxed">
            {finalDescription}
          </p>
        </div>

        {(action || secondaryAction) && (
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {secondaryAction && (
              <Button
                variant="outline"
                onClick={secondaryAction.onClick}
                className="transition-brand"
              >
                {secondaryAction.label}
              </Button>
            )}

            {action && (
              <Button
                onClick={action.onClick}
                className="transition-brand shadow-elev-1"
              >
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
