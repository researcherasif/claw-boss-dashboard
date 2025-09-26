import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { usePerformanceMonitor } from "./utils/performance";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import AddMachine from "./pages/AddMachine";
import AddFranchise from "./pages/AddFranchise";
import AllFranchises from "./pages/AllFranchises";
import Machines from "./pages/Machines";
import AllMachines from "./pages/AllMachines";
import AllReports from "./pages/AllReports";
import MachineReport from "./pages/MachineReport";
import PayToClowee from "./pages/PayToClowee";
import Invoices from "./pages/Invoices";
import ManageMachines from "./pages/ManageMachines";
import NotFound from "./pages/NotFound";
import "./sohub-theme.css";

const queryClient = new QueryClient();

const App = () => {
  // Enable performance monitoring in development
  usePerformanceMonitor();

  return (
    <ThemeProvider defaultTheme="dark" storageKey="clowee-theme">
      <div className="min-h-screen">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="/dashboard" />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="add-machine" element={<AddMachine />} />
                    <Route path="add-franchise" element={<AddFranchise />} />
                    <Route path="all-franchises" element={<AllFranchises />} />
                    <Route path="machines" element={<Machines />} />
                    <Route path="all-machines" element={<AllMachines />} />
                    <Route path="all-reports" element={<AllReports />} />
                    <Route path="machine-report" element={<MachineReport />} />
                    <Route path="pay-to-clowee" element={<PayToClowee />} />
                    <Route path="invoices" element={<Invoices />} />
                    <Route path="manage-machines" element={<ManageMachines />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </div>
    </ThemeProvider>
  );
};

export default App;