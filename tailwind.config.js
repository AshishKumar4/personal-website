/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'Inter',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'sans-serif'
  			],
  			display: [
  				'"Cal Sans"',
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'SF Mono',
          'Fira Code',
          'Fira Mono',
          'Roboto Mono',
  				'monospace'
  			]
  		},
  		fontSize: {
  			'2xs': [
  				'0.625rem',
  				{
  					lineHeight: '0.75rem'
  				}
  			],
  			'3xl': [
  				'1.875rem',
  				{
  					lineHeight: '2.25rem'
  				}
  			],
  			'4xl': [
  				'2.25rem',
  				{
  					lineHeight: '2.5rem'
  				}
  			],
  			'5xl': [
  				'3rem',
  				{
  					lineHeight: '1.1'
  				}
  			],
  			'6xl': [
  				'3.75rem',
  				{
  					lineHeight: '1.1'
  				}
  			],
  			'7xl': [
  				'4.5rem',
  				{
  					lineHeight: '1.1'
  				}
  			],
  			'8xl': [
  				'6rem',
  				{
  					lineHeight: '1'
  				}
  			],
  			'9xl': [
  				'8rem',
  				{
  					lineHeight: '1'
  				}
  			]
  		},
  		spacing: {
  			'18': '4.5rem',
  			'72': '18rem',
  			'84': '21rem',
  			'96': '24rem',
  			'128': '32rem'
  		},
  		borderRadius: {
  			'4xl': '2rem',
  			'5xl': '2.5rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
        // Dark theme colors (original)
        'dark-navy': 'rgb(var(--color-dark-navy) / <alpha-value>)',
        'navy': 'rgb(var(--color-navy) / <alpha-value>)',
        'light-navy': 'rgb(var(--color-light-navy) / <alpha-value>)',
        'lightest-navy': 'rgb(var(--color-lightest-navy) / <alpha-value>)',
        'navy-shadow': 'rgba(2,12,27,0.7)',
        'slate': 'rgb(var(--color-slate) / <alpha-value>)',
        'light-slate': 'rgb(var(--color-light-slate) / <alpha-value>)',
        'lightest-slate': 'rgb(var(--color-lightest-slate) / <alpha-value>)',
        'white': '#e6f1ff',

        // Accent color (theme-aware)
        'accent': 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-tint': 'rgb(var(--color-accent-tint) / <alpha-value>)',

        // Legacy green (for backwards compatibility, maps to accent)
        'green': 'rgb(var(--color-accent) / <alpha-value>)',
        'green-tint': 'var(--color-accent-tint-full)',

        // Blueprint light theme colors (warm neutrals + burnt orange)
        'cf-orange': '#EA580C',
        'cf-orange-dark': '#C2410C',
        'cf-orange-light': '#F97316',
        'cf-red': '#DC2626',
        'cf-white': '#FFFFFF',
        'cf-gray-50': '#FAFAFA',
        'cf-gray-100': '#F5F5F5',
        'cf-gray-200': '#E5E5E5',
        'cf-gray-300': '#D4D4D4',
        'cf-gray-400': '#A3A3A3',
        'cf-gray-500': '#737373',
        'cf-gray-600': '#525252',
        'cf-gray-700': '#404040',
        'cf-gray-800': '#262626',
        'cf-gray-900': '#171717',

  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			ring: 'hsl(var(--ring))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  		},
  		boxShadow: {
  			soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
  			glow: '0 0 20px -5px rgb(var(--color-accent) / 0.4)',
  			'glow-lg': '0 0 40px -10px rgb(var(--color-accent) / 0.3)',
  			primary: '0 0 20px -5px hsl(var(--primary) / 0.4)',
  			glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        // Light mode shadows
        'light-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'light-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'light-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'light-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'orange-glow': '0 0 20px -5px rgba(234, 88, 12, 0.4)',
        'orange-glow-lg': '0 0 40px -10px rgba(234, 88, 12, 0.3)',
  		},
  		keyframes: {
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
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
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
  		},
  		animation: {
  			'fade-in': 'fade-in 0.5s ease-out',
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        'fade-up': 'fade-up 0.5s ease-out',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'blink': 'blink 1s step-end infinite',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")]
}
