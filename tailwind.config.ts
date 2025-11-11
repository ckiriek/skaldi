import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          hover: 'hsl(var(--secondary-hover))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Status colors
        success: {
          DEFAULT: 'hsl(var(--success))',
          bg: 'hsl(var(--success-bg))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          bg: 'hsl(var(--warning-bg))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          bg: 'hsl(var(--error-bg))',
          foreground: 'hsl(var(--error-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          bg: 'hsl(var(--info-bg))',
          foreground: 'hsl(var(--info-foreground))',
        },
        // Gray scale
        gray: {
          50: 'hsl(var(--gray-50))',
          100: 'hsl(var(--gray-100))',
          200: 'hsl(var(--gray-200))',
          300: 'hsl(var(--gray-300))',
          400: 'hsl(var(--gray-400))',
          500: 'hsl(var(--gray-500))',
          600: 'hsl(var(--gray-600))',
          700: 'hsl(var(--gray-700))',
          800: 'hsl(var(--gray-800))',
          900: 'hsl(var(--gray-900))',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      // 8px spacing grid system
      spacing: {
        '0': '0',
        '0.5': '4px',   // 0.5 unit (for fine-tuning)
        '1': '8px',     // 1 unit
        '1.5': '12px',  // 1.5 units
        '2': '16px',    // 2 units
        '2.5': '20px',  // 2.5 units
        '3': '24px',    // 3 units
        '3.5': '28px',  // 3.5 units
        '4': '32px',    // 4 units
        '5': '40px',    // 5 units
        '6': '48px',    // 6 units
        '7': '56px',    // 7 units
        '8': '64px',    // 8 units
        '9': '72px',    // 9 units
        '10': '80px',   // 10 units
        '11': '88px',   // 11 units
        '12': '96px',   // 12 units
        '14': '112px',  // 14 units
        '16': '128px',  // 16 units
        '20': '160px',  // 20 units
        '24': '192px',  // 24 units
        '28': '224px',  // 28 units
        '32': '256px',  // 32 units
      },
      // Typography scale
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],      // 1.5 units
        sm: ['14px', { lineHeight: '20px' }],      // 1.75 units
        base: ['16px', { lineHeight: '24px' }],    // 2 units
        lg: ['18px', { lineHeight: '28px' }],      // 2.25 units
        xl: ['20px', { lineHeight: '28px' }],      // 2.5 units
        '2xl': ['24px', { lineHeight: '32px' }],   // 3 units
        '3xl': ['30px', { lineHeight: '36px' }],   // 3.75 units
        '4xl': ['36px', { lineHeight: '40px' }],   // 4.5 units
        '5xl': ['48px', { lineHeight: '1' }],      // 6 units
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
  },
  plugins: [],
}

export default config
