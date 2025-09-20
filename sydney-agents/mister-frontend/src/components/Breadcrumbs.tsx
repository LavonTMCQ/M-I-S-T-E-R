"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  
  // Don't show breadcrumbs on landing page
  if (pathname === '/') {
    return null;
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  
  const breadcrumbItems = [
    { label: 'Home', href: '/', icon: Home }
  ];

  // Map path segments to readable labels
  const segmentLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'trading': 'Trading',
    'chat': 'AI Chat',
    'login': 'Sign In'
  };

  pathSegments.forEach((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbItems.push({ label, href });
  });

  return (
    <nav className="flex items-center justify-center space-x-1 text-sm text-muted-foreground mt-8 py-4 border-t border-border/50">
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground/60" />}
          {index === breadcrumbItems.length - 1 ? (
            <span className="text-foreground font-semibold flex items-center px-3 py-1.5 bg-primary/10 rounded-md">
              {item.icon && <item.icon className="w-4 h-4 mr-2" />}
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors flex items-center px-3 py-1.5 rounded-md hover:bg-muted/50"
            >
              {item.icon && <item.icon className="w-4 h-4 mr-2" />}
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
