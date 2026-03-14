import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DataTable } from "@/components/DataTable";
import { SummaryBar } from "@/components/SummaryBar";
import { useDashboardData, type TabKey } from "@/hooks/use-dashboard-data";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("decisions");
  const { data, loading, error, refresh, lastRefresh } = useDashboardData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={refresh}
        loading={loading}
        lastRefresh={lastRefresh}
      />

      <main className="max-w-[1600px] mx-auto p-6">
        {error && (
          <div className="mb-4 px-4 py-2 border border-terminal-red/30 bg-terminal-red/5 text-terminal-red text-[13px] font-mono rounded-sm">
            CONNECTION ERROR // {error}
          </div>
        )}

        <SummaryBar data={data} activeTab={activeTab} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <DataTable type={activeTab} items={data[activeTab]} />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
