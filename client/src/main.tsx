import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PerformanceMonitor } from "./components/performance/performance-monitor";

createRoot(document.getElementById("root")!).render(
  <>
    <PerformanceMonitor />
    <App />
  </>
);
