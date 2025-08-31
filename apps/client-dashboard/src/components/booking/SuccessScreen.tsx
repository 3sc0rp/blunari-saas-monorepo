import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Calendar, Clock, Users, MapPin, Trophy, Star, Zap } from 'lucide-react';

interface SuccessScreenProps {
  reservation: {
    reservation_id: string;
    guest_name: string;
    party_size: number;
    booking_time: string;
    restaurant_name: string;
    table_info?: string;
    confirmation_code?: string;
  };
  achievements: string[];
  totalTime: number;
  onNewBooking?: () => void;
  onViewReservation?: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({
  reservation,
  achievements,
  totalTime,
  onNewBooking,
  onViewReservation
}) => {
  const getAchievementBadge = () => {
    if (totalTime < 20000) return { type: 'gold', icon: Trophy, label: 'Gold Speed Master' };
    if (totalTime < 60000) return { type: 'silver', icon: Star, label: 'Silver Speedster' };
    if (totalTime < 120000) return { type: 'bronze', icon: Zap, label: 'Bronze Booker' };
    return null;
  };

  const achievement = getAchievementBadge();
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  const formatBookingTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const { date, time } = formatBookingTime(reservation.booking_time);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8"
      >
        <div className="relative inline-block mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto shadow-lg"
          >
            <CheckCircle2 className="w-10 h-10 text-success-foreground" />
          </motion.div>
          
          {/* Achievement Badge */}
          {achievement && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
              className="absolute -top-2 -right-2"
            >
              <Badge 
                className={`px-3 py-1 text-xs font-bold shadow-lg ${
                  achievement.type === 'gold' 
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900' 
                    : achievement.type === 'silver'
                      ? 'bg-gradient-to-r from-surface-2 to-surface-3 text-text-muted'
                      : 'bg-gradient-to-r from-warning to-warning text-warning-foreground'
                }`}
              >
                <achievement.icon className="w-3 h-3 mr-1" />
                {achievement.label}
              </Badge>
            </motion.div>
          )}
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-foreground mb-2"
        >
          Booking Confirmed!
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-muted-foreground"
        >
          Your table is reserved at {reservation.restaurant_name}
        </motion.p>
      </motion.div>

      {/* Reservation Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="shadow-lg border-success/20 bg-gradient-to-br from-success/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-success" />
              Reservation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{reservation.guest_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {reservation.party_size} {reservation.party_size === 1 ? 'guest' : 'guests'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{time}</p>
                  <p className="text-sm text-muted-foreground">{date}</p>
                </div>
              </div>
            </div>

            {reservation.table_info && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Table Assignment</p>
                  <p className="text-sm text-muted-foreground">{reservation.table_info}</p>
                </div>
              </div>
            )}

            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Confirmation Code</p>
                <p className="text-lg font-mono font-bold text-brand">
                  {reservation.confirmation_code || reservation.reservation_id.slice(-8).toUpperCase()}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Booking completed in</p>
                <p className="font-bold text-brand">{formatTime(totalTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6"
        >
          <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                Achievements Unlocked!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.9 + index * 0.1, type: "spring" }}
                  >
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      🏆 {achievement}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="flex flex-col sm:flex-row gap-4 mt-8"
      >
        <Button 
          size="lg" 
          className="flex-1"
          onClick={onViewReservation}
        >
          View Reservation Details
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          className="flex-1"
          onClick={onNewBooking}
        >
          Make Another Booking
        </Button>
      </motion.div>

      {/* Footer Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-center mt-8 p-4 bg-muted/30 rounded-lg"
      >
        <p className="text-sm text-muted-foreground">
          📧 A confirmation email has been sent to your email address.
          <br />
          Please arrive 5-10 minutes early for your reservation.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default SuccessScreen;