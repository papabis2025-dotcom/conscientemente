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
                // Modern Minimalist Dark Scale (Neutral/Zinc-like)
                slate: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1c252e', // Lighter Surface
                    900: '#11181c', // Requested Base
                    950: '#09090b', // Deepest
                },
            }
        },
    },
    plugins: [],
}
