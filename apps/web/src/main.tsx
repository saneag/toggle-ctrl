import { createRoot } from "react-dom/client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { App } from "./app.js";
import { Toaster } from "./components/ui/sonner.js";
import "./style.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("app")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster position="top-right" />
  </QueryClientProvider>,
);
