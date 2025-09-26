import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { BarChart3, Plus, FileText, Calculator, Receipt, Settings, LogOut, Loader2, ChevronDown, ChevronRight, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Link, useLocation } from 'react-router-dom';

const Layout = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [machinesExpanded, setMachinesExpanded] = useState(true);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const menuItems = [
    {
      title: "Dashboard",
      icon: BarChart3,
      href: "/",
    },
    {
      title: "All Bills",
      icon: FileText,
      href: "/all-reports",
    },
    {
      title: "Machine Counter Report",
      icon: FileText,
      href: "/machine-counter-report",
    },
    {
      title: "Pay to Clowee",
      icon: Calculator,
      href: "/pay-to-clowee",
    },
    {
      title: "Invoices",
      icon: Receipt,
      href: "/invoices",
    },
  ];

  const machineItems = [
    {
      title: "Add Machines",
      icon: Plus,
      href: "/machines",
    },
    {
      title: "All Machines",
      icon: FileText,
      href: "/all-machines",
    },
    {
      title: "Manage Machines",
      icon: Settings,
      href: "/manage-machines",
    },
  ];

  const isMachineRoute = machineItems.some(item => location.pathname === item.href);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="sidebar-glow border-r border-slate-700/50">
          <SidebarHeader className="p-6 blue-gradient border-b border-sidebar-border">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Clowee Accounting</h1>
            <p className="text-sm text-sidebar-foreground/90 font-medium">{profile?.name}</p>
            <p className="text-xs text-sidebar-foreground/70 capitalize bg-sidebar-accent px-2 py-1 rounded-full inline-block">{profile?.role?.replace('_', ' ')}</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location.pathname === item.href}
                    className="hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:translate-x-1 group"
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setMachinesExpanded(!machinesExpanded)}
                  className="cursor-pointer hover:bg-primary/10 transition-all duration-300 group"
                >
                  {machinesExpanded ? 
                    <ChevronDown className="h-4 w-4 group-hover:text-primary transition-colors" /> : 
                    <ChevronRight className="h-4 w-4 group-hover:text-primary transition-colors" />
                  }
                  <span className="group-hover:text-primary transition-colors font-medium">Machines</span>
                </SidebarMenuButton>
                {machinesExpanded && (
                  <div className="ml-4 mt-2 space-y-1 border-l border-sidebar-border pl-4">
                    {machineItems.map((item) => (
                      <SidebarMenuButton 
                        key={item.href}
                        asChild
                        isActive={location.pathname === item.href}
                        size="sm"
                        className="hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:translate-x-1"
                      >
                        <Link to={item.href}>
                          <item.icon className="h-3 w-3" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    ))}
                  </div>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="mt-auto p-4 border-t border-sidebar-border">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-destructive/10 hover:text-destructive transition-all duration-300 group"
                onClick={signOut}
              >
                <LogOut className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                Sign Out
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex-1 flex flex-col">
          <header className="navbar-blur p-3 sm:p-4 flex items-center justify-between">
            <SidebarTrigger className="text-slate-200 hover:bg-slate-700/50 hover:text-white transition-all duration-300 hover:scale-110" />
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide hidden sm:block">
                Welcome to Clowee Accounting
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-slate-700/50 transition-all duration-300 hover:scale-110"
              >
                {theme === "light" ? (
                  <Moon className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                ) : (
                  <Sun className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
                )}
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto gradient-bg min-h-screen">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background/0 to-background/0 pointer-events-none"></div>
            <div className="relative z-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;