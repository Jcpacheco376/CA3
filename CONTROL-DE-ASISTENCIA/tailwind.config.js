/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-out': { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'scale-out': { '0%': { opacity: '1', transform: 'scale(1)' }, '100%': { opacity: '0', transform: 'scale(.95)' } },
        'fade-in-right': { '0%': { opacity: '0', transform: 'translateX(24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        'fade-out-right': { '0%': { opacity: '1', transform: 'translateX(0)' }, '100%': { opacity: '0', transform: 'translateX(24px)' } },
        'ring': {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '10%, 30%, 50%, 70%': { transform: 'rotate(-10deg) scale(1.15)' },
          '20%, 40%, 60%, 80%': { transform: 'rotate(10deg) scale(1.15)' },
        },
        'progress-bar': { '0%': { width: '100%' }, '100%': { width: '0%' } },
        'drop-in': {
          '0%': { opacity: '0', transform: 'translateY(-20px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        }
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
        'fade-in': 'fade-in .2s ease-out forwards',
        'fade-out': 'fade-out .2s ease-in forwards',
        'scale-in': 'scale-in .2s ease-out forwards',
        'scale-out': 'scale-out .2s ease-in forwards',
        'fade-in-right': 'fade-in-right 0.4s ease-out forwards',
        'fade-out-right': 'fade-out-right 0.4s ease-in forwards',
        'ring': 'ring 0.6s ease-in-out',
        'progress-bar': 'progress-bar 5s linear forwards',
        'drop-in': 'drop-in 0.3s ease-out forwards',
      }
    },
  },
  plugins: [],
}

