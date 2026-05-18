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
                sans: ['Comfortaa', 'cursive', 'sans-serif'],
            },
            borderRadius: {
                'lg': '6px',
                'xl': '8px',
                '2xl': '12px',
                '3xl': '16px',
                '4xl': '24px',
            },
            colors: {
                slate: {
                    50: '#fdfdfd',
                    100: '#eceef0',
                    200: '#dfe3e6',
                    300: '#c1c8cd',
                    400: '#97a1a7',
                    500: '#687076',
                    600: '#434a51',
                    700: '#2d3339',
                    800: '#202a33',
                    900: '#182128',
                    950: '#11181c',
                },
            }
        },
    },
    plugins: [],
}
