/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // Circular approximation
            },
            borderRadius: {
                'lg': '6px',
                'xl': '8px',
                '2xl': '12px',
                '3xl': '16px', // Supabase is less rounded
                '4xl': '24px',
            },
            colors: {
                // Supabase Gray Scale (Dark Mode Foundation)
                slate: {
                    50: '#f8f9fa',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1c1c1c', // Card / Panel Background
                    900: '#121212', // Main Background
                    950: '#000000',
                },
                // Supabase Green (Replacing Blue Primary)
                blue: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#3ecf8e', // Supabase Brand
                    600: '#10b981', // Darker Green
                    700: '#059669',
                    800: '#065f46',
                    900: '#064e3b',
                    950: '#022c22',
                },
            }
        },
    },
    plugins: [],
}
