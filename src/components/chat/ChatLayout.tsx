"use client";

import { ReactNode } from "react";
import { MobileSidebarProvider, useMobileSidebar } from "./MobileSidebarContext";
import { MobileBackdrop } from "@/components/ui/MobileBackdrop";
import { ChatSidebar } from "./ChatSidebar";
import { ChatHeader } from "./ChatHeader";

interface ConnectedMarketplace {
  marketplace: string;
  name: string;
}

interface ChatLayoutProps {
  userName: string;
  userEmail: string;
  connectedMarketplaces: ConnectedMarketplace[];
  marketplaceCount: number;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
  children: ReactNode;
}

function ChatLayoutInner({
  userName,
  userEmail,
  connectedMarketplaces,
  marketplaceCount,
  subscriptionStatus,
  trialEndsAt,
  children,
}: ChatLayoutProps) {
  const { isOpen, close, toggle } = useMobileSidebar();

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Mobile backdrop */}
      <MobileBackdrop isOpen={isOpen} onClose={close} />

      {/* Sidebar */}
      <ChatSidebar
        userName={userName}
        userEmail={userEmail}
        connectedMarketplaces={connectedMarketplaces}
        isOpen={isOpen}
        onClose={close}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header with user profile */}
        <ChatHeader
          userName={userName}
          userEmail={userEmail}
          marketplaceCount={marketplaceCount}
          subscriptionStatus={subscriptionStatus}
          trialEndsAt={trialEndsAt}
          onMenuToggle={toggle}
        />

        {/* Chat container */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export function ChatLayout(props: ChatLayoutProps) {
  return (
    <MobileSidebarProvider>
      <ChatLayoutInner {...props} />
    </MobileSidebarProvider>
  );
}
