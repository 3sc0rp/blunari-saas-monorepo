import React from "react";
import { TrendingUp, Clock, Star, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReservationResponse, ROIMetrics } from "@/types/booking-api";

interface ROIPanelProps {
  reservation: ReservationResponse;
  stepTimes: { [key: string]: number };
  totalTime: number;
}

const ROIPanel: React.FC<ROIPanelProps> = ({
  reservation,
  stepTimes,
  totalTime,
}) => {
  // Only show if we have actual ROI data from the API
  // This component will be empty if the API doesn't provide ROI metrics
  const [roiData, setROIData] = React.useState<ROIMetrics | null>(null);

  React.useEffect(() => {
    // In a real implementation, this would fetch ROI data from the API
    // For now, we'll only show timing-based achievements which are client-side
  }, [reservation]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getAchievements = () => {
    const achievements = [];
    const totalSeconds = totalTime / 1000;

    if (totalSeconds < 60)
      achievements.push({
        icon: Clock,
        label: "Speed Demon",
        desc: "Under 1 minute",
      });
    else if (totalSeconds < 120)
      achievements.push({
        icon: Clock,
        label: "Quick Booker",
        desc: "Under 2 minutes",
      });

    if (reservation.summary) {
      achievements.push({
        icon: Star,
        label: "Confirmed",
        desc: "Successful booking",
      });
    }

    return achievements;
  };

  const achievements = getAchievements();

  // Only render if we have achievements or ROI data
  if (achievements.length === 0 && !roiData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Booking Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timing achievements - always available */}
        {achievements.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Achievements</h4>
            <div className="flex flex-wrap gap-2">
              {achievements.map((achievement, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <achievement.icon className="w-3 h-3" />
                  {achievement.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Total booking time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{formatTime(totalTime)}</div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {Object.keys(stepTimes).length}
            </div>
            <div className="text-sm text-muted-foreground">Steps Completed</div>
          </div>
        </div>

        {/* ROI metrics - only if provided by API */}
        {roiData && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Value Added
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {roiData.fees_avoided && (
                <div className="flex justify-between">
                  <span>Fees Avoided:</span>
                  <span className="font-medium">${roiData.fees_avoided}</span>
                </div>
              )}
              {roiData.additional_covers && (
                <div className="flex justify-between">
                  <span>Additional Covers:</span>
                  <span className="font-medium">
                    {roiData.additional_covers}
                  </span>
                </div>
              )}
              {roiData.experience_score && (
                <div className="flex justify-between">
                  <span>Experience Score:</span>
                  <span className="font-medium">
                    {roiData.experience_score}/10
                  </span>
                </div>
              )}
              {roiData.total_value && (
                <div className="flex justify-between">
                  <span>Total Value:</span>
                  <span className="font-medium">${roiData.total_value}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ROIPanel;
