import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "hsl(210 40% 98%)",
        ink: "hsl(210 20% 18%)",
        brand: "hsl(204 78% 42%)",
        accent: "hsl(177 60% 40%)"
      },
      boxShadow: {
        soft: "0 20px 50px -30px rgba(15, 23, 42, 0.35)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
