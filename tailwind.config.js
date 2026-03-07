/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/renderer/index.html",
        "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "SF Pro Display", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
                mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
            },
            colors: {
                slate: {
                    850: "#172033",
                    925: "#0d1117",
                    950: "#0a0e1a",
                },
            },
            animation: {
                "fade-in": "fadeIn 0.15s ease-out",
                "slide-in": "slideIn 0.2s ease-out",
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                slideIn: {
                    from: { opacity: "0", transform: "translateY(-4px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
};
