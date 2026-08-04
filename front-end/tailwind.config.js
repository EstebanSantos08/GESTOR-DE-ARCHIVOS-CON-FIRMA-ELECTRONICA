/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {

        // PALETA ORIGINAL (AZUL / NAVY) - Descomentar si deseas volver al tema original
        navy: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        }


        /* PALETA ROJO, BLANCO Y PLOMO (ACTIVA)
        navy: {
          50: '#fef2f2',   // Fondo rojo muy suave
          100: '#fee2e2',  // Fondo rojo claro / badges
          500: '#ef4444',  // Rojo medio
          600: '#dc2626',  // Rojo principal
          700: '#b91c1c',  // Rojo intenso
          800: '#991b1b',  // Rojo oscuro (hover)
          900: '#7f1d1d',  // Rojo borgoña corporativo (Sidebar y Encabezado)
          950: '#450a0a',  // Rojo profundo
        }*/
      }
    }
  },
  plugins: []
}
