"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, Bell, Globe, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { useCountry } from "@/components/providers/country-provider";
import { countries, type CountryCode } from "@/lib/countries";
import { GlobalSearch } from "@/components/layout/global-search";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { countryCode, country, setCountry } = useCountry();

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "AD";

  return (
    <div className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 lg:gap-4 lg:px-8">
      {/* Left: menu + welcome */}
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden min-w-0 sm:block">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Welcome back
          </p>
          <p className="truncate font-semibold">{session?.user?.name ?? "Admin"}</p>
        </div>
      </div>

      {/* Center: search */}
      <div className="hidden min-w-0 flex-1 md:flex md:justify-center">
        <GlobalSearch className="w-full max-w-lg" />
      </div>

      {/* Right: country, notifications, theme, profile */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-10 gap-1.5 rounded-xl border-border/60 bg-card px-2.5 shadow-sm hover:bg-muted/50 sm:gap-2 sm:px-3"
            >
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-base leading-none">{country.flag}</span>
              <span className="hidden font-medium lg:inline">{country.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Select Country
            </p>
            <DropdownMenuSeparator />
            {countries.map((c) => (
              <DropdownMenuItem
                key={c.code}
                onClick={() => setCountry(c.code as CountryCode)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-lg",
                  countryCode === c.code && "bg-primary/10 text-primary"
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                </span>
                {countryCode === c.code && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-highlight ring-2 ring-background" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-xl p-0">
              <Avatar className="h-9 w-9 ring-2 ring-border/60">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-xs text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>

      <div className="border-t border-border/40 px-4 py-2.5 md:hidden">
        <GlobalSearch className="w-full max-w-none" />
      </div>
    </div>
  );
}
