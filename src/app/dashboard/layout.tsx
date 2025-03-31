"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Logo from "@/components/logo";
import { Toaster } from "@/components/ui/toaster";

interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    href: string;
    title: string;
    icon: React.ReactNode;
  }[];
}

function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        className,
      )}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center justify-center rounded-lg py-2 text-sm font-medium hover:bg-slate-800/50 text-slate-300 hover:text-white transition-colors group relative"
        >
          {item.icon}
          <span className="fixed left-16 scale-0 rounded bg-slate-800 border border-slate-700/50 p-2 text-xs text-slate-300 group-hover:scale-100 z-50 ml-2">
            {item.title}
          </span>
        </Link>
      ))}
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="z-50 w-full bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo href="/dashboard" />
            </div>
            <div>
              <a
                href="https://github.com/spelltastic/spelltastic"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-300 hover:text-orange-100 transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className="flex">
        <aside className="top-14 left-0 z-40 w-16">
          <div className="h-full min-h-screen py-4 overflow-y-auto bg-slate-900/80 backdrop-blur-sm border-r border-slate-700/50">
            <div className="space-y-4">
              <div className="px-3">
                <SidebarNav items={sidebarNavItems} />
              </div>
            </div>
          </div>
        </aside>
        {/* Main Content */}
        <div className="sm:mx-16 mt-10 w-full">
          <div className="p-4 mx-auto max-w-[1600px]">{children}</div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
