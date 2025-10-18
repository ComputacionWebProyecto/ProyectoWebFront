/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        exo: ['"Exo 2"', 'sans-serif'],
      },
      keyframes: {
        typing: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'typing-hide-cursor': {
          '0%': { width: '0%', borderColor: 'black' },
          '95%': { borderColor: 'black' },
          '100%': { width: '100%', borderColor: 'transparent' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'typing-with-fade': {
          '0%': { width: '0%', opacity: '1' },
          '100%': { width: '100%', opacity: '1' },
        },
        blink: {
          '50%': { borderColor: 'transparent' },
        },
      },
      animation: {
        typing: 'typing-hide-cursor 2.5s steps(25) forwards',
        'typing-delay': 'fadeIn 0.01s linear 2.5s forwards, typing-with-fade 2.5s steps(25) 2.5s forwards, blink .7s infinite 2.5s',
      },
    },
  },
  plugins: [
  ],
}