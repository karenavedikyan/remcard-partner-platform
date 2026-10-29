import { createRoot } from "react-dom/client";
import { HarnessApp } from "./HarnessApp";
import "@/app/globals.css";

createRoot(document.getElementById("root")!).render(<HarnessApp />);
