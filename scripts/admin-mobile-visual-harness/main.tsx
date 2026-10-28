import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/app/globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HarnessApp } from "./HarnessApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <HarnessApp />
    </ThemeProvider>
  </StrictMode>,
);
