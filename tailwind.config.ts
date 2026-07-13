import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme surface palette
        bg: "#0b0f17",
        surface: "#141a24",
        "surface-2": "#1c2431",
        border: "#2a3444",
        muted: "#8b95a5",
        // Semantic status colours reused across the app
        trained: "#22c55e",
        iso: "#3b82f6",
        rest: "#6b7280",
        missed: "#ef4444",
        elbow: "#ef4444",
        knee: "#f59e0b",
        accent: "#6366f1",
      },
    },
  },
  plugins: [],
};

export default config;
