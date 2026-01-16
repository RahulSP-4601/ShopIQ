import { redirect } from "next/navigation";
import { getStore } from "@/lib/auth/session";
import { ChatContainer } from "@/components/chat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

export const runtime = "nodejs";

interface ChatConversationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatConversationPage({
  params,
}: ChatConversationPageProps) {
  const store = await getStore();

  if (!store) {
    redirect("/chat");
  }

  if (store.syncStatus !== "COMPLETED") {
    redirect("/sync");
  }

  const { id } = await params;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <ChatSidebar storeName={store.name} storeDomain={store.domain} />

      {/* Main chat area */}
      <main className="flex-1 overflow-hidden">
        <ChatContainer
          initialConversationId={id}
          storeName={store.name}
          isConnected={true}
        />
      </main>
    </div>
  );
}
