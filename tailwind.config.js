export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "Geist", "ui-sans-serif", "system-ui"] },
      colors: { paper: "#FAFAFA", ink: "#1B1B1F", line: "#E5E5E5" },
      boxShadow: { soft: "0 1px 2px rgba(15,15,15,.04)" }
    }
  },
  plugins: []
};