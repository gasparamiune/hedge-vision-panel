import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardHeader } from "@/components/DashboardHeader";
import { PortfolioTab } from "@/components/PortfolioTab";
import { OpportunitiesTab } from "@/components/OpportunitiesTab";
import { SignalsTab } from "@/components/SignalsTab";
import { DecisionsTab } from "@/components/DecisionsTab";
import { SystemStatusTab } from "@/components/SystemStatusTab";
import { useDashboardData, type TabKey } from "@/hooks/use-dashboard-data";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("portfolio");
  const { data, loading, error, refresh, assetClassFilter, setAssetClassFilter, lastRefreshTime } = useDashboardData();

  const renderTab = () => {
    switch (activeTab) {
      case "portfolio": return <PortfolioTab items={data.portfolio} />;
      case "opportunities": return <OpportunitiesTab items={data.opportunities} />;
      case "signals": return <SignalsTab items={data.signals} />;
      case "decisions": return <DecisionsTab items={data.decisions} />;
      case "status": return <SystemStatusTab items={data.status} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={refresh}
        loading={loading}
        assetClassFilter={assetClassFilter}
        onAssetClassFilterChange={setAssetClassFilter}
        lastRefreshTime={lastRefreshTime}
      />

      <main className="max-w-[1600px] mx-auto p-6">
        {error && (
          <div className="mb-4 px-4 py-2 border border-terminal-red/30 bg-terminal-red/5 text-terminal-red text-xs font-mono rounded-sm">
            CONNECTION ERROR // {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
