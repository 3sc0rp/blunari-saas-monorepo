import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
				heading: ['Inter', 'system-ui', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))',
					light: 'hsl(var(--primary-light))',
					dark: 'hsl(var(--primary-dark))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					light: 'hsl(var(--secondary-light))',
					dark: 'hsl(var(--secondary-dark))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					light: 'hsl(var(--accent-light))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))',
					light: 'hsl(var(--success-light))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))',
					light: 'hsl(var(--warning-light))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
					light: 'hsl(var(--destructive-light))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-subtle': 'var(--gradient-subtle)',
				'gradient-glass': 'var(--gradient-glass)'
			},
			boxShadow: {
				'elegant': 'var(--shadow-elegant)',
				'glow': 'var(--shadow-glow)',
				'card': 'var(--shadow-card)',
				'premium': 'var(--shadow-premium)',
				'subtle': 'var(--shadow-subtle)'
			},
			transitionTimingFunction: {
				'smooth': 'var(--transition-smooth)',
				'bounce': 'var(--transition-bounce)',
				'elastic': 'var(--transition-elastic)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
		keyframes: {
			// Enhanced fade animations
			"fade-in": {
				"0%": { opacity: "0", transform: "translateY(10px)" },
				"100%": { opacity: "1", transform: "translateY(0)" }
			},
			"fade-in-up": {
				"0%": { opacity: "0", transform: "translateY(20px)" },
				"100%": { opacity: "1", transform: "translateY(0)" }
			},
			"fade-in-down": {
				"0%": { opacity: "0", transform: "translateY(-20px)" },
				"100%": { opacity: "1", transform: "translateY(0)" }
			},
			
			// Slide animations
			"slide-in-left": {
				"0%": { opacity: "0", transform: "translateX(-100%)" },
				"100%": { opacity: "1", transform: "translateX(0)" }
			},
			"slide-in-right": {
				"0%": { opacity: "0", transform: "translateX(100%)" },
				"100%": { opacity: "1", transform: "translateX(0)" }
			},
			
			// Scale animations
			"scale-in": {
				"0%": { opacity: "0", transform: "scale(0.95)" },
				"100%": { opacity: "1", transform: "scale(1)" }
			},
			"scale-in-center": {
				"0%": { opacity: "0", transform: "scale(0.8)" },
				"100%": { opacity: "1", transform: "scale(1)" }
			},
			
			// Advanced animations
			"bounce-in": {
				"0%": { opacity: "0", transform: "scale(0.3)" },
				"50%": { opacity: "1", transform: "scale(1.05)" },
				"70%": { transform: "scale(0.9)" },
				"100%": { opacity: "1", transform: "scale(1)" }
			},
			"shimmer": {
				"0%": { transform: "translateX(-100%)" },
				"100%": { transform: "translateX(100%)" }
			},
			"pulse-ring": {
				"0%": { transform: "scale(0.33)" },
				"40%, 50%": { opacity: "1" },
				"100%": { opacity: "0", transform: "scale(1)" }
			},
			"float": {
				"0%, 100%": { transform: "translateY(0px)" },
				"50%": { transform: "translateY(-10px)" }
			},
			"glow": {
				"0%, 100%": { opacity: "1" },
				"50%": { opacity: "0.5" }
			},
			
			// Accordion
			"accordion-down": {
				from: { height: "0" },
				to: { height: "var(--radix-accordion-content-height)" }
			},
			"accordion-up": {
				from: { height: "var(--radix-accordion-content-height)" },
				to: { height: "0" }
			}
		},
		animation: {
			// Basic animations
			"fade-in": "fade-in 0.5s ease-out",
			"fade-in-up": "fade-in-up 0.6s ease-out",
			"fade-in-down": "fade-in-down 0.6s ease-out",
			"slide-in-left": "slide-in-left 0.6s ease-out",
			"slide-in-right": "slide-in-right 0.6s ease-out",
			"scale-in": "scale-in 0.4s ease-out",
			"scale-in-center": "scale-in-center 0.3s ease-out",
			
			// Advanced animations
			"bounce-in": "bounce-in 0.6s ease-out",
			"shimmer": "shimmer 2s infinite",
			"pulse-ring": "pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite",
			"float": "float 3s ease-in-out infinite",
			"glow": "glow 2s ease-in-out infinite alternate",
			
			// Component animations
			"accordion-down": "accordion-down 0.2s ease-out",
			"accordion-up": "accordion-up 0.2s ease-out"
		},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
