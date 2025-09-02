import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Plus } from "lucide-react";

const Waitlist: React.FC = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Waitlist Management
          </h1>
          <p className="text-muted-foreground">
            Manage customer waitlist and queue
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add to Waitlist
        </Button>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Current Waitlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Waitlist is Empty</h3>
            <p className="text-muted-foreground">
              No customers are currently waiting. Add customers to the waitlist
              when tables are full.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Waitlist;
