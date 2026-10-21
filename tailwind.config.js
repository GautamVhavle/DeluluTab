import containerQueries from '@tailwindcss/container-queries'
import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  // Class-based theming: toggle the `dark` class on <html> to switch themes at runtime.
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        // --font-sans is set by the font picker (see lib/fonts); the stack after it is the pre-load default.
        sans: ['var(--font-sans)', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // The variables are real colours so light and dark can ease. hsl(from …) is the old
        // hsl(var(--token) / alpha) stroke: color-mix was painting borders and rings twice.
        border: 'hsl(from var(--border) h s l / <alpha-value>)',
        input: 'hsl(from var(--input) h s l / <alpha-value>)',
        ring: 'hsl(from var(--ring) h s l / <alpha-value>)',
        background: 'hsl(from var(--background) h s l / <alpha-value>)',
        foreground: 'hsl(from var(--foreground) h s l / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(from var(--primary) h s l / <alpha-value>)',
          foreground: 'hsl(from var(--primary-foreground) h s l / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(from var(--secondary) h s l / <alpha-value>)',
          foreground: 'hsl(from var(--secondary-foreground) h s l / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(from var(--destructive) h s l / <alpha-value>)',
          foreground: 'hsl(from var(--destructive-foreground) h s l / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(from var(--muted) h s l / <alpha-value>)',
          foreground: 'hsl(from var(--muted-foreground) h s l / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(from var(--accent) h s l / <alpha-value>)',
          foreground: 'hsl(from var(--accent-foreground) h s l / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(from var(--popover) h s l / <alpha-value>)',
          foreground: 'hsl(from var(--popover-foreground) h s l / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(from var(--card) h s l / <alpha-value>)',
          foreground: 'hsl(from var(--card-foreground) h s l / <alpha-value>)',
        },
      },
      keyframes: {
        // Slow wander for the gradient light blobs.
        drift: {
          '0%': { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)' },
          '100%': { transform: 'translate3d(-4%, 3%, 0) rotate(5deg) scale(1.1)' },
        },
      },
      animation: {
        drift: 'drift 48s ease-in-out infinite alternate',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate, containerQueries],
}
