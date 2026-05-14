/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 2px 20px -4px rgba(0,0,0,0.08), 0 1px 4px -1px rgba(0,0,0,0.04)',
        glass: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-sm': '0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
        modal: '0 24px 64px -12px rgba(0,0,0,0.7)',
        'orange-glow': '0 0 24px rgba(255,107,0,0.5), 0 4px 16px rgba(0,0,0,0.4)',
        fab: '0 8px 32px rgba(255,107,0,0.45), 0 2px 8px rgba(0,0,0,0.4)',
      },
      colors: {
        // Tripsy palette
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        // Deep night purple (map overlay base)
        night: {
          900: '#0a0a14',
          800: '#0f0f22',
          700: '#141432',
          600: '#1a1a40',
          500: '#22224e',
        },
        // Glass panel colors
        glass: {
          dark: 'rgba(10, 10, 20, 0.78)',
          medium: 'rgba(15, 15, 30, 0.70)',
          light: 'rgba(20, 20, 45, 0.55)',
          border: 'rgba(255,255,255,0.10)',
        },
        // Accent orange (Tripsy)
        accent: {
          DEFAULT: '#FF6B00',
          light: '#FF8C38',
          dark: '#D95800',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      backdropBlur: {
        xs: '4px',
        glass: '24px',
        heavy: '40px',
      },
    },
  },
  plugins: [],
}
