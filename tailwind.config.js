export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.25rem',
        lg: '1.5rem',
        xl: '2rem'
      }
    },
    extend: {
      colors: {
        primary: '#ff6666',
        info: '#64E9F5',
        warning: '#204272',
        light: '#f6f8fc',
        dark: '#0b1320'
      },
      fontFamily: {
        sans: ['Lato', 'sans-serif']
      },
      fontSize: {
        'display-1': 'calc(1.625rem + 4.5vw)'
      },
      boxShadow: {
        soft: '0 24px 70px rgba(20, 41, 73, 0.18)',
        panel: '0 18px 40px rgba(17, 36, 66, 0.16)'
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at top left, rgba(255,102,102,.22), transparent 30%), radial-gradient(circle at top right, rgba(100,233,245,.22), transparent 28%), linear-gradient(180deg, #f9fbff 0%, #eef5ff 100%)'
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        revealRight: {
          from: { opacity: '0', transform: 'translate3d(42px,0,0)' },
          to: { opacity: '1', transform: 'translate3d(0,0,0)' }
        },
        pulseWinner: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(255,102,102,0)' },
          '50%': { transform: 'scale(1.02)', boxShadow: '0 18px 55px rgba(255,102,102,0.28)' }
        }
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        'reveal-right': 'revealRight .8s ease both',
        'pulse-winner': 'pulseWinner 1.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};