"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, Globe, Check } from "lucide-react";
import Link from "next/link";
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
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationBell } from "@/components/layout/notification-bell";
import { usePageTitle } from "@/components/layout/breadcrumbs";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
}

const iconBtn =
  "h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground";

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { countryCode, country, setCountry } = useCountry();
  const pageTitle = usePageTitle();

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "AD";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <header className="sticky top-0 z-30 glass-header">
      <div className="flex h-14 min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className={cn(iconBtn, "lg:hidden")}
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 shrink sm:max-w-[12rem] md:max-w-[14rem] lg:max-w-[16rem]">
          <h1 className="truncate text-sm font-semibold capitalize sm:text-base">{pageTitle}</h1>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
          <CommandPalette variant="trigger" className="h-9 w-full max-w-sm lg:max-w-md" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <CommandPalette variant="inline" className="md:hidden" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={iconBtn}
                aria-label={`Region: ${country.name}`}
                title={country.name}
              >
                <span className="text-base leading-none">{country.flag}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Region</p>
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
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  {countryCode === c.code && <Check className="h-4 w-4 shrink-0" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-0.5 hidden h-5 w-px bg-border/60 sm:block" aria-hidden />

          <NotificationBell />

          <Button
            variant="ghost"
            size="icon"
            className={cn(iconBtn, "relative")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-[17px] w-[17px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[17px] w-[17px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg p-0"
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8 ring-2 ring-primary/15">
                  <AvatarImage src={session?.user?.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-gradient-to-br from-[#006F5F] to-[#0E8A72] text-[11px] text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold">{session?.user?.name ?? "Admin"}</p>
                <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{greeting}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
