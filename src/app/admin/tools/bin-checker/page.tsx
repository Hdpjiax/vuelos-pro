import { BinChecker } from "@/components/admin/BinChecker";
import { ToolsSubNav } from "@/components/admin/ToolsSubNav";

export default function AdminBinCheckerPage() {
  return (
    <div className="space-y-6">
      <ToolsSubNav active="bin-checker" />
      <BinChecker />
    </div>
  );
}
