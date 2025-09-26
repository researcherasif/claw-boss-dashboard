import { Outlet, Link, useLocation } from "react-router-dom";
import { SidebarProvider, useSidebar } from "./ui/sidebar";
import { Button } from "./ui/button";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarItem,
} from "./ui/sidebar";
import {
  Home,
  Settings,
  Users,
  LogOut,
  BarChart,
  DollarSign,
  Truck,
  FileText,
  Sun,
  Moon,
  DollarSignIcon,
  FuelIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "./ThemeProvider"; // Make sure this path is correct

const Layout = () => {
  const { user, signOut } = useAuth();
  const { setTheme, theme } = useTheme();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    C
                  </span>
                </div>
                <div>
                  <h1 className="text-foreground font-bold text-xl">CLOWEE</h1>
                  <p className="text-muted-foreground text-sm">
                    Business Management
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <div className="mb-6">
              <p className="text-muted-foreground text-xs px-4 mb-2">
                Navigation
              </p>
              <NavItem to="/dashboard" icon={<Home size={18} />}>
                Dashboard
              </NavItem>
              <NavItem to="/all-reports" icon={<BarChart size={18} />}>
                All Reports
              </NavItem>
              <NavItem to="/pay-to-clowee" icon={<FuelIcon size={18} />}>
                Pay to Clowee
              </NavItem>
              <NavItem to="/invoices" icon={<FileText size={18} />}>
                Invoices
              </NavItem>
            </div>
            <div className="mb-6">
              <p className="text-muted-foreground text-xs px-4 mb-2">
                Management
              </p>
              <NavItem to="/all-machines" icon={<Truck size={18} />}>
                All Machines
              </NavItem>
              <NavItem to="/machine-report" icon={<FileText size={18} />}>
                Machine Report
              </NavItem>
            </div>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-secondary-foreground font-bold">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">
                  {user?.email}
                </p>
                <p className="text-muted-foreground text-xs">Operator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={signOut}
            >
              <LogOut size={18} />
            </Button>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 flex flex-col">
          <header className="h-16 flex items-center px-6 border-b lg:hidden">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold ml-4">Dashboard</h1>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

const NavItem = ({ to, icon, children }) => {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <Link
      to={to}
      className={`
        flex items-center gap-3 px-4 py-2 rounded-lg transition-colors
        ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
        }
      `}
    >
      {icon}
      <span className="font-medium">{children}</span>
    </Link>
  );
};

export default Layout;