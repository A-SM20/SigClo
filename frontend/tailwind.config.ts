import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        signal: {
          blue: '#2C6BED',
          blueHover: '#2058CC',
          dark: '#121212',
          darkPanel: '#1E1E1E',
          darkBorder: '#2B2B2B',
          gray: '#EBEBEB',
          grayHover: '#F5F5F5',
          textDark: '#E9E9E9',
          textMuted: '#9CA3AF'
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
