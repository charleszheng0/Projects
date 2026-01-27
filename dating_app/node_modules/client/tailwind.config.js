/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'cinematic-beige': '#F5F1E8',
                'deep-charcoal': '#2E2E2E',
            }
        },
    },
    plugins: [],
}
