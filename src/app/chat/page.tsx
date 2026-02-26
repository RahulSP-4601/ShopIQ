import { redirect } from "next/navigation";
import { getUserWithMarketplaces } from "@/lib/auth/session";
import { checkSubscription } from "@/lib/auth/subscription";
import { ChatContainer } from "@/components/chat";
import { ChatLayout } from "@/components/chat/ChatLayout";

export const runtime = "nodejs";

export default async function ChatPage() {
  const user = await getUserWithMarketplaces();

  // If not logged in, redirect to signin
  if (!user) {
    redirect("/signin");
  }

  // Check if user has connected marketplaces
  const connectedMarketplaces = user.marketplaceConns.filter(
    (m) => m.status === "CONNECTED"
  );

  // If no marketplaces connected, redirect to onboarding
  if (connectedMarketplaces.length === 0) {
    redirect("/onboarding/connect");
  }

  // Check for active subscription
  const { hasActiveSubscription, subscription } = await checkSubscription();
  if (!hasActiveSubscription) {
    redirect("/onboarding/payment");
  }

  return (
    <ChatLayout
      userName={user.name ?? ""}
      userEmail={user.email ?? ""}
      connectedMarketplaces={connectedMarketplaces.map((m) => ({
        marketplace: m.marketplace,
        name: m.externalName || m.marketplace,
      }))}
      marketplaceCount={connectedMarketplaces?.length ?? 0}
      subscriptionStatus={subscription?.status ?? null}
      trialEndsAt={subscription?.currentPeriodEnd?.toISOString() ?? null}
    >
      <ChatContainer
        storeName={connectedMarketplaces[0]?.externalName || "your store"}
        isConnected={true}
      />
    </ChatLayout>
  );
}
