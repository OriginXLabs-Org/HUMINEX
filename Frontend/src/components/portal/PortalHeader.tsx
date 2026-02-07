import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { Menu, Search, Plus, LogOut, Settings, User, LogIn, PanelLeft, PanelLeftClose } from "lucide-react";
import { NotificationBell } from "@/components/portal/NotificationBell";
import { useEmployeeRole } from "@/hooks/useEmployeeRole";

interface PortalHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  userId?: string;
  user?: { email?: string | null } | null;
  profile?: {
    full_name?: string;
    email?: string;
    designation?: string;
    department?: string;
  } | null;
  signOut: () => void;
}

export const PortalHeader = ({
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  userId,
  user,
  profile,
  signOut,
}: PortalHeaderProps) => {
  const { role } = useEmployeeRole();
  const isSimpleEmployeeView = role === "staff";
  const fullName = profile?.full_name || "Employee";
  const email = profile?.email || user?.email || "employee@gethuminex.com";
  const initials = fullName
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border/60">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 text-foreground hover:bg-muted/50 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            className="hidden lg:inline-flex p-2 text-foreground hover:bg-muted/50 rounded-lg"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          
          {!isSimpleEmployeeView && (
            <div className="hidden sm:flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 w-64">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell userId={userId} />
          {!isSimpleEmployeeView && (
            <Button size="sm" className="gap-2 hidden sm:flex">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40">
                <Avatar className="h-9 w-9 border border-border/70">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="space-y-0.5">
                <p className="text-sm font-semibold">{fullName}</p>
                <p className="text-xs text-muted-foreground font-normal truncate">{email}</p>
                <p className="text-[11px] text-primary font-medium">
                  {profile?.designation || "Employee"} • {profile?.department || "Organization"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/portal/settings" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/portal/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/portal/login" className="cursor-pointer">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login Screen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-rose-600 focus:text-rose-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
