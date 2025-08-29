import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:shadow-glow active:scale-95 shadow-elegant",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-card hover:shadow-elegant active:scale-95",
        outline:
          "border-2 border-primary/20 bg-background text-primary hover:bg-primary hover:text-primary-foreground shadow-subtle hover:shadow-card active:scale-95",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-dark shadow-subtle hover:shadow-card active:scale-95",
        ghost: "hover:bg-accent/10 hover:text-accent transition-all duration-200 active:scale-95",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-glow transition-colors duration-200",
        hero: "bg-gradient-hero text-white hover:scale-105 shadow-glow hover:shadow-premium border-0 font-semibold text-base",
        premium: "bg-gradient-primary text-primary-foreground hover:scale-[1.02] shadow-elegant hover:shadow-glow border border-primary-light/20 font-semibold",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-card hover:shadow-elegant active:scale-95",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-card hover:shadow-elegant active:scale-95",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/20 shadow-card hover:shadow-elegant active:scale-95",
        gradient: "bg-gradient-secondary text-secondary-foreground hover:scale-[1.02] shadow-card hover:shadow-glow active:scale-95",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base font-semibold",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
