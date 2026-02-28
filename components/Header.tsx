"use client";

import { useState } from "react";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { Moon, Sun, Blend, Menu } from "lucide-react";

export function Header() {
  const { user, isPending } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-4">
      <div className="flex flex-col overflow-hidden rounded-md border border-border/80 bg-background/50 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-background/40">
        {/* Navbar bar */}
        <div className="flex h-14 w-full items-center justify-between px-4">
          {/* Mobile: icon only on left */}
          <Link
            href="/"
            className="flex md:hidden size-8 items-center justify-center rounded-lg font-semibold text-foreground hover:bg-muted"
            aria-label="Home"
          >
            <Blend className="size-4 transition-transform duration-300 hover:-rotate-180" aria-hidden />
          </Link>

          {/* Desktop: full nav on left */}
          <NavigationMenu className="hidden max-w-max md:block">
            <NavigationMenuList className="gap-6">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/"
                    className="flex size-8 items-center justify-center rounded-lg font-semibold text-foreground hover:bg-transparent"
                    aria-label="Home"
                  >
                    <Blend className="size-4 transition-transform duration-300 hover:-rotate-180" aria-hidden />
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/" className={navigationMenuTriggerStyle()}>
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/dashboard" className={navigationMenuTriggerStyle()}>
                    Dashboard
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Mobile: Sign in/out + hamburger */}
            <div className="flex md:hidden items-center gap-2">
              {!isPending &&
                (user ? (
                  <Button asChild variant="outline" size="lg">
                    <Link href="/logout">Sign out</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="lg">
                    <Link href="/signin">Sign In</Link>
                  </Button>
                ))}
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="size-4" aria-hidden />
                ) : (
                  <Moon className="size-4" aria-hidden />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="size-5" aria-hidden />
              </Button>
            </div>

            {/* Desktop: Sign in/out + theme */}
            <div className="hidden items-center gap-2 md:flex">
              {!isPending &&
                  <Button asChild variant="outline" size="lg">
                    {user ? (
                      <Link href="/logout">Sign out</Link>
                    ) : (
                      <Link href="/signin">Sign In</Link>
                    )}
                  </Button>
              }
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="size-4" aria-hidden />
                ) : (
                  <Moon className="size-4" aria-hidden />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile: dropdown pane underneath, same width as navbar */}
        <div
          className="grid md:hidden transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: mobileMenuOpen ? "1fr" : "0fr" }}
          aria-hidden={!mobileMenuOpen}
        >
          <div className="overflow-hidden">
            <nav
              className="bg-background/40 px-4 pb-3 backdrop-blur-sm"
              aria-label="Mobile menu"
            >
              <ul className="flex flex-col gap-0.5">
                <li>
                  <Link
                    href="/"
                    className="block rounded-lg px-3 py-2 text-foreground hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="block rounded-lg px-3 py-2 text-foreground hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                </li>
                {/* <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-foreground hover:bg-muted"
                    onClick={() => toggleTheme()}
                  >
                    {theme === "dark" ? (
                      <Sun className="size-4" aria-hidden />
                    ) : (
                      <Moon className="size-4" aria-hidden />
                    )}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </button>
                </li> */}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
