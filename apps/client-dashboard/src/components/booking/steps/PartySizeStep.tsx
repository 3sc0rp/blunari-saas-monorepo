import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import { TenantInfo } from "@/types/booking-api";

interface PartySizeStepProps {
  tenant: TenantInfo;
  onComplete: (data: { party_size: number }) => void;
  loading?: boolean;
}

const PartySizeStep: React.FC<PartySizeStepProps> = ({
  tenant,
  onComplete,
  loading = false,
}) => {
  const [selectedSize, setSelectedSize] = useState<number | null>(null);

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (loading) return;
    const idx = selectedSize ? selectedSize - 1 : -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const next = Math.min(11, Math.max(0, idx + 1));
      setSelectedSize(next + 1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const prev = Math.min(11, Math.max(0, (idx === -1 ? 0 : idx - 1)));
      setSelectedSize(prev + 1);
      e.preventDefault();
    } else if (e.key === 'Enter' && selectedSize) {
      handleSizeSelect(selectedSize);
      e.preventDefault();
    }
  };

  // Generate party size options (1-12)
  const partySizeOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleSizeSelect = (size: number) => {
    setSelectedSize(size);
    // Auto-advance with 250ms delay for visual feedback
    setTimeout(() => {
      onComplete({ party_size: size });
    }, 250);
  };

  const getSizeIcon = (size: number) => {
    if (size === 1) return "👤";
    if (size === 2) return "👥";
    if (size <= 4) return "👨‍👩‍👦";
    if (size <= 6) return "👨‍👩‍👦‍👦";
    return "👥+";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="shadow-lg border-surface-3">
        <CardHeader className="text-center pb-6">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <Users className="h-6 w-6 text-brand" />
            Party Size
          </CardTitle>
          <p className="text-muted-foreground">
            How many guests will be dining with us?
          </p>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4" role="listbox" aria-label="Select party size" tabIndex={0} onKeyDown={onKeyDown}>
            {partySizeOptions.map((size) => (
              <motion.button
                key={size}
                onClick={() => handleSizeSelect(size)}
                disabled={loading}
                role="option"
                aria-selected={selectedSize === size}
                aria-label={`${size} ${size === 1 ? 'guest' : 'guests'}`}
                className={`
                  relative aspect-square rounded-xl border-2 transition-all duration-300 shadow-sm
                  hover:scale-[1.08] hover:shadow-lg hover:shadow-brand/20
                  active:scale-[0.95] active:shadow-inner
                  focus:outline-none focus:ring-4 focus:ring-brand/30 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  ${
                    selectedSize === size
                      ? "border-brand bg-gradient-to-br from-brand/10 to-accent/10 text-brand shadow-lg shadow-brand/20 scale-[1.05] ring-4 ring-brand/20"
                      : "border-surface-3 bg-surface hover:border-brand/50 hover:bg-surface-2"
                  }
                `}
                whileHover={{
                  scale: selectedSize === size ? 1.08 : 1.05,
                  rotateY: 5,
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8, rotateY: -10 }}
                animate={{
                  opacity: 1,
                  scale: selectedSize === size ? 1.05 : 1,
                  rotateY: 0,
                }}
                transition={{
                  delay: size * 0.05,
                  duration: 0.4,
                  type: "spring",
                  stiffness: 200,
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    className="text-2xl mb-1"
                    animate={{
                      scale: selectedSize === size ? [1, 1.2, 1] : 1,
                    }}
                    transition={{
                      duration: 0.6,
                      ease: "easeInOut",
                    }}
                  >
                    {getSizeIcon(size)}
                  </motion.div>
                  <div
                    className={`text-2xl font-bold mb-1 transition-colors duration-300 ${
                      selectedSize === size ? "text-brand" : "text-text"
                    }`}
                  >
                    {size}
                  </div>
                  <div
                    className={`text-xs font-medium transition-colors duration-300 ${
                      selectedSize === size ? "text-brand" : "text-text-muted"
                    }`}
                  >
                    {size === 1 ? "guest" : "guests"}
                  </div>
                </div>

                {/* Enhanced selected state effect */}
                {selectedSize === size && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-brand bg-gradient-to-br from-brand/5 to-accent/5"
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      initial={{ scale: 1 }}
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(var(--brand), 0.3)",
                          "0 0 0 8px rgba(var(--brand), 0)",
                        ],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </>
                )}

                {/* Hover glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand/10 to-accent/10 opacity-0"
                  whileHover={{ opacity: selectedSize === size ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            ))}
          </div>

          {/* Large Group Option */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center"
          >
            <Button
              variant="outline"
              onClick={() => {
                const customSize = prompt("Enter party size (13+ guests):");
                if (customSize && parseInt(customSize) >= 13) {
                  handleSizeSelect(parseInt(customSize));
                }
              }}
              className="text-sm"
            >
              Large group (13+)?
            </Button>
          </motion.div>

          {/* Accessibility hint */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Use keyboard arrows to navigate or click to select
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PartySizeStep;
