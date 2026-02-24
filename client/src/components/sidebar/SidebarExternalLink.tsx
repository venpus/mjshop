import type { ReactNode } from "react";

export interface SidebarExternalLinkProps {
  href: string;
  icon: ReactNode;
  label: ReactNode;
  isCollapsed: boolean;
  title?: string;
}

export function SidebarExternalLink({
  href,
  icon,
  label,
  isCollapsed,
  title,
}: SidebarExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`w-full flex items-center ${isCollapsed ? "justify-center" : "gap-3"} px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50`}
      title={title}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!isCollapsed && <span>{label}</span>}
    </a>
  );
}
