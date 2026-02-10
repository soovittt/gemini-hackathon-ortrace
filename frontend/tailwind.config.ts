import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
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
  			},
  			severity: {
  				critical: 'hsl(var(--severity-critical))',
  				high: 'hsl(var(--severity-high))',
  				medium: 'hsl(var(--severity-medium))',
  				low: 'hsl(var(--severity-low))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			type: {
  				bug: 'hsl(var(--type-bug))',
  				ux: 'hsl(var(--type-ux))',
  				feature: 'hsl(var(--type-feature))',
  				feedback: 'hsl(var(--type-feedback))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			},
			'shake': {
				'0%, 100%': { transform: 'translateX(0)' },
				'10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
				'20%, 40%, 60%, 80%': { transform: 'translateX(2px)' }
			},
			'pulse-slow': {
				'0%, 100%': { opacity: '1' },
				'50%': { opacity: '0.5' }
			},
			'pulse-subtle': {
				'0%, 100%': { opacity: '1', transform: 'scale(1)' },
				'50%': { opacity: '0.8', transform: 'scale(0.98)' }
			},
			'bounce-subtle': {
				'0%, 100%': { transform: 'translateY(0)' },
				'50%': { transform: 'translateY(-4px)' }
			},
			'bounce-horizontal': {
				'0%, 100%': { transform: 'translateX(0)' },
				'50%': { transform: 'translateX(4px)' }
			},
			'float': {
				'0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
				'50%': { transform: 'translateY(-20px) rotate(2deg)' }
			},
			'fade-in-up': {
				'0%': { opacity: '0', transform: 'translateY(20px)' },
				'100%': { opacity: '1', transform: 'translateY(0)' }
			},
			'fade-in': {
				'0%': { opacity: '0' },
				'100%': { opacity: '1' }
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'shake': 'shake 0.5s ease-in-out',
			'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
			'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
			'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
			'bounce-horizontal': 'bounce-horizontal 1.5s ease-in-out infinite',
			'float': 'float 6s ease-in-out infinite',
			'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
			'fade-in': 'fade-in 0.4s ease-out forwards'
		},
  		fontFamily: {
  			sans: [
  				'Plus Jakarta Sans',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif',
  				'Apple Color Emoji',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'Noto Color Emoji'
  			],
  			serif: [
  				'Source Serif Pro',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
