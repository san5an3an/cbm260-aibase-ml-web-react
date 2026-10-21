"use client";

import { useEffect } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export interface NavigationSidebarScreen {
  key: string;
  label: string;
  href: string;
  isActive: boolean;
}

export interface NavigationSidebarGroup {
  key: string;
  label: string;
  icon: SvgIconComponent;
  screens: readonly NavigationSidebarScreen[];
}

interface NavigationSidebarProps {
  id: string;
  title: string;
  groups: readonly NavigationSidebarGroup[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// 놓인 영역을 흐리게 덮고 그 위에 전체 Menu를 펼쳐 표시
export function NavigationSidebar({ id, title, groups, isOpen, onOpenChange }: NavigationSidebarProps) {
  // 열려 있는 동안 Esc Key로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange]);

  return (
    <SidebarProvider
      open={isOpen}
      onOpenChange={onOpenChange}
      className="pointer-events-none absolute inset-0 z-40 min-h-0 overflow-hidden"
    >
      <div
        data-slot="navigation-sidebar-backdrop"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-scrim/10 backdrop-blur-[0.25rem] transition-opacity timing-move",
          isOpen ? "pointer-events-auto opacity-100" : "opacity-0",
        )}
      />
      <Sidebar
        id={id}
        role="navigation"
        aria-label={title}
        inert={!isOpen}
        aria-hidden={isOpen ? undefined : true}
        className="pointer-events-auto absolute h-full border-sidebar-border duration-(--motion-duration-base) ease-(--motion-ease-in-out) group-data-[side=left]:border-r-[0.0625rem] motion-reduce:transition-none"
      >
        <SidebarHeader className="h-[3.625rem] flex-none justify-center border-b border-sidebar-border px-5">
          <span data-slot="navigation-sidebar-title" className="text-base font-bold">
            {title}
          </span>
        </SidebarHeader>
        <SidebarContent className="gap-1 px-1 py-2">
          {groups.map((group) => (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel className="gap-2 text-xs font-semibold text-muted-foreground">
                <group.icon />
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.screens.map((screen) => (
                    <SidebarMenuItem key={screen.key}>
                      <SidebarMenuButton
                        isActive={screen.isActive}
                        className="h-9 pr-3 pl-8 timing-micro transition-colors data-active:bg-rail-active data-active:font-semibold data-active:text-primary-foreground data-active:hover:bg-rail-active data-active:hover:text-primary-foreground"
                        render={
                          <Link
                            href={screen.href}
                            aria-current={screen.isActive ? "page" : undefined}
                            onClick={() => onOpenChange(false)}
                          />
                        }
                      >
                        <span>{screen.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
