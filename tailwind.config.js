/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,jsx,mdx}",
    "./src/components/**/*.{js,jsx,mdx}",
    "./src/app/**/*.{js,jsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // JECRC Core Brand (Black/Red/White)
        'jecrc-red': '#C41E3A',
        'jecrc-red-dark': '#8B0000',
        'jecrc-red-light': '#E02849',
        'jecrc-red-bright': '#FF3366',
        'jecrc-pink': '#FFE5E9',
        'jecrc-rose': '#FFD1D9',
        
        'pure-black': '#000000',
        'deep-black': '#050505',
        'ink-black': '#0A0A0A',
        
        'pure-white': '#FFFFFF',
        'off-white': '#F8F8F8',
        'soft-white': '#F0F0F0',
        'cream': '#FFF8F8',
        
        // Complementary (Functional Status Colors)
        'success': {
          light: '#2D7A45',
          dark: '#00FF88',
        },
        'warning': {
          light: '#D97706',
          dark: '#FFB020',
        },
        'error': {
          light: '#C41E3A',
          dark: '#FF3366',
        },
        'info': {
          light: '#1E40C4',
          dark: '#4D9FFF',
        },
      },
      fontFamily: {
        serif: ['Cinzel', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        // Light Mode - Black Shadows (3D Depth)
        'sharp-black': '5px 5px 15px rgba(0, 0, 0, 0.15), -2px -2px 10px rgba(255, 255, 255, 0.8)',
        'sharp-black-lg': '8px 8px 25px rgba(0, 0, 0, 0.2), -3px -3px 15px rgba(255, 255, 255, 0.9)',
        'sharp-black-xl': '12px 12px 35px rgba(0, 0, 0, 0.25), -4px -4px 20px rgba(255, 255, 255, 1)',
        
        // Dark Mode - Red Neon Glow
        'neon-red': '0 0 15px rgba(196, 30, 58, 0.4), 0 0 30px rgba(196, 30, 58, 0.2)',
        'neon-red-lg': '0 0 25px rgba(196, 30, 58, 0.5), 0 0 50px rgba(196, 30, 58, 0.3)',
        'neon-red-xl': '0 0 35px rgba(255, 51, 102, 0.6), 0 0 70px rgba(255, 51, 102, 0.4)',
        
        // Dark Mode - White Subtle Glow
        'neon-white': '0 0 10px rgba(255, 255, 255, 0.1), 0 0 20px rgba(255, 255, 255, 0.05)',
        'neon-white-lg': '0 0 20px rgba(255, 255, 255, 0.15), 0 0 40px rgba(255, 255, 255, 0.08)',
        'neon-white-xl': '0 0 30px rgba(255, 255, 255, 0.2), 0 0 60px rgba(255, 255, 255, 0.1)',
      },
      backgroundImage: {
        // Light Mode - Elegant Pink/White Gradients
        'glass-light': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,248,248,0.85) 100%)',
        'glass-light-hover': 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,229,233,0.9) 100%)',
        'light-gradient': 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F8 50%, #FFE5E9 100%)',
        
        // JECRC Red Gradients
        'jecrc-primary': 'linear-gradient(135deg, #C41E3A 0%, #8B0000 100%)',
        'jecrc-primary-hover': 'linear-gradient(135deg, #E02849 0%, #C41E3A 100%)',
        'jecrc-border': 'linear-gradient(90deg, #C41E3A 0%, #000000 50%, #C41E3A 100%)',
        'jecrc-radial': 'radial-gradient(circle at center, #C41E3A 0%, #000000 100%)',
        
        // Dark Mode - Black with Red & White Glow
        'dark-subtle': 'linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(0,0,0,0.98) 100%)',
        'dark-glow-red': 'radial-gradient(circle at center, rgba(196, 30, 58, 0.15) 0%, transparent 70%)',
        'dark-ambient-red': 'radial-gradient(circle at top, rgba(196, 30, 58, 0.08) 0%, transparent 50%)',
        'dark-glow-white': 'radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
      },
      transitionDuration: {
        '700': '700ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out',
        'fade-in-slow': 'fadeIn 1.2s ease-out',
        'slide-up': 'slideUp 0.8s ease-out',
        'slide-in-right': 'slideInRight 0.8s ease-out',
        'scale-in': 'scaleIn 0.6s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'glow-pulse-white': 'glowPulseWhite 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(-40px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(196, 30, 58, 0.4), 0 0 30px rgba(196, 30, 58, 0.2)'
          },
          '50%': {
            boxShadow: '0 0 25px rgba(255, 51, 102, 0.6), 0 0 50px rgba(255, 51, 102, 0.3)'
          },
        },
        glowPulseWhite: {
          '0%, 100%': {
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.1), 0 0 20px rgba(255, 255, 255, 0.05)'
          },
          '50%': {
            boxShadow: '0 0 20px rgba(255, 255, 255, 0.2), 0 0 40px rgba(255, 255, 255, 0.1)'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
