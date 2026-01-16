import { redirect } from "next/navigation";
import { getStore } from "@/lib/auth/session";
import { ChatContainer } from "@/components/chat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";

export const runtime = "nodejs";

export default async function ChatPage() {
  const store = await getStore();

  // If sync not complete, redirect to sync page
  if (store && store.syncStatus !== "COMPLETED") {
    redirect("/sync");
  }

  const isConnected = !!store;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - only show when connected */}
      {isConnected && (
        <ChatSidebar storeName={store.name} storeDomain={store.domain} />
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header with Connect button when not connected */}
        <ChatHeader isConnected={isConnected} />

        {/* Chat container */}
        <main className="flex-1 overflow-hidden">
          <ChatContainer
            storeName={store?.name || "your store"}
            isConnected={isConnected}
          />
        </main>
      </div>
    </div>
  );
}
