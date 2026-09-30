import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeModeProvider } from "../helpers/themeMode";
import { TooltipProvider } from "./Tooltip";
import { SonnerToaster } from "./SonnerToaster";
import { ScrollToHashElement } from "./ScrollToHashElement";
import { AuthProvider } from "../helpers/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

export const GlobalContextProviders = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <ScrollToHashElement />
        <TooltipProvider>
          <AuthProvider>
            {children}
            <SonnerToaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
};