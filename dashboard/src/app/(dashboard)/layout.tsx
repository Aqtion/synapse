import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center h-[52px] px-8 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-6 w-full">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-[15px] tracking-tight"
          >
            <div
              className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-[13px] text-primary-foreground bg-primary"
              aria-hidden
            >
              S
            </div>
            Sandbox Studio
          </Link>
          <NavigationMenu viewport={false} className="flex-1 justify-start">
            <NavigationMenuList className="gap-1">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/">Sandboxes</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </header>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
