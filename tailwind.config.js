/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand: {50:'#eef3ff',100:'#dae5ff',200:'#b5caff',300:'#8faeff',400:'#6a93ff',500:'#5b8cff',600:'#3a6ef1',700:'#2d57c1',800:'#204091',900:'#142a61'} },
      borderRadius: { '2xl':'1.25rem' },
      boxShadow: { soft:'0 12px 30px rgba(0,0,0,0.25)' }
    }
  },
  plugins: []
};
