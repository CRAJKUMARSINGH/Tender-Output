import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Building2, 
  FileText, 
  Users, 
  Home, 
  Menu,
  FileSignature
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/sessions", label: "NIT Sessions", icon: FileText },
  { href: "/contractors", label: "Contractor Register", icon: Users },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Header representing Government Authority */}
      <header className="bg-secondary text-secondary-foreground border-b border-sidebar-border sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded flex items-center justify-center shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold uppercase tracking-wider text-white">Government of Rajasthan</h1>
              <h2 className="text-xs text-sidebar-primary tracking-wide">P.W.D. District Division-II, Udaipur</h2>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className="flex items-center">
                  <span className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/sessions/new">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-wide">
                <FileSignature className="w-4 h-4 mr-2" />
                New NIT
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border bg-white py-6 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>Official NIT Document Generation System</p>
          <p>Office of the Executive Engineer, PWD DD-II, Udaipur</p>
        </div>
      </footer>
    </div>
  );
}
