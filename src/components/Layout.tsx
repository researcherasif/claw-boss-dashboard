import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { BarChart3, Plus, FileText, Calculator, Receipt, LogOut, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Layout = () => {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

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
      title: "Machines",
      icon: Plus,
      href: "/machines",
    },
    {
      title: "All Machines",
      icon: FileText,
      href: "/all-machines",
    },
    {
      title: "All Bills",
      icon: FileText,
      href: "/all-reports",
    },
    {
      title: "Coin & Prize Count",
      icon: FileText,
      href: "/machine-report",
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-6">
            <h1 className="text-xl font-bold text-sidebar-foreground">Clawee Business</h1>
            <p className="text-sm text-sidebar-foreground/70">{profile?.name}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{profile?.role?.replace('_', ' ')}</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="mt-auto p-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={signOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-background p-4 flex items-center justify-between">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">
              Welcome to Clawee Business Management
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;