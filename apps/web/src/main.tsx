import { createRoot } from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { App } from "./app.js";
import { Toaster } from "./components/ui/sonner.js";
import "./style.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("app")!).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  </BrowserRouter>,
);
