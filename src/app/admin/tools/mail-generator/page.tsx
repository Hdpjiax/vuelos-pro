import { EmailGenerator } from "@/components/admin/EmailGenerator";
import { ToolsSubNav } from "@/components/admin/ToolsSubNav";

export default function AdminMailGeneratorPage() {
  return (
    <div className="space-y-6">
      <ToolsSubNav active="mail-generator" />
      <EmailGenerator />
    </div>
  );
}
