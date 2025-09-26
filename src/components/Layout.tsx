import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { BarChart3, Plus, FileText, Calculator, Receipt, Settings, LogOut, Loader2, ChevronDown, ChevronRight, Edit, Bell, User, Building2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Link, useLocation } from 'react-router-dom';

const Layout = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [machinesExpanded, setMachinesExpanded] = useState(true);
  const [franchisesExpanded, setFranchisesExpanded] = useState(true);

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

  const franchiseItems = [
    {
      title: "Add Franchise",
      icon: Plus,
      href: "/add-franchise",
    },
    {
      title: "All Franchises",
      icon: Building2,
      href: "/all-franchises",
    },
  ];

  const machineItems = [
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full" style={{background: '#0f1419'}}>
        <Sidebar className="sohub-sidebar">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">CLOWEE CONTROLS</h1>
                <p className="text-gray-400 text-xs">Business Management</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <div className="mb-6">
              <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Overview</h3>
            </div>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild
                    className={`sohub-nav-item ${location.pathname === item.href ? 'active' : ''}`}
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <div className="mt-6">
                <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Business & Control</h3>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setFranchisesExpanded(!franchisesExpanded)}
                    className="sohub-nav-item cursor-pointer"
                  >
                    {franchisesExpanded ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                    <span>Franchises</span>
                  </SidebarMenuButton>
                  {franchisesExpanded && (
                    <div className="ml-6 mt-2 space-y-1">
                      {franchiseItems.map((item) => (
                        <SidebarMenuButton 
                          key={item.href}
                          asChild
                          size="sm"
                          className={`sohub-nav-item ${location.pathname === item.href ? 'active' : ''}`}
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

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setMachinesExpanded(!machinesExpanded)}
                    className="sohub-nav-item cursor-pointer"
                  >
                    {machinesExpanded ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                    <span>Machines</span>
                  </SidebarMenuButton>
                  {machinesExpanded && (
                    <div className="ml-6 mt-2 space-y-1">
                      {machineItems.map((item) => (
                        <SidebarMenuButton 
                          key={item.href}
                          asChild
                          size="sm"
                          className={`sohub-nav-item ${location.pathname === item.href ? 'active' : ''}`}
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
              </div>
            </SidebarMenu>
            <div className="mt-auto p-4">
              <Button
                variant="ghost"
                className="sohub-nav-item w-full justify-start text-red-400 hover:text-red-300"
                onClick={signOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex-1 flex flex-col">
          <header className="sohub-topbar p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-gray-400 hover:text-white" />
              <div className="text-gray-400 text-sm">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button className="sohub-button flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Dashboard
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <User className="h-4 w-4" />
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto" style={{background: '#0f1419'}}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};



export default Layout;