import { DomainProviderLauncher } from "@/components/admin/DomainProviderLauncher";
import { ToolsSubNav } from "@/components/admin/ToolsSubNav";

export default function AdminContactPatternsPage() {
  return (
    <div className="space-y-6">
      <ToolsSubNav active="contact-patterns" />
      <DomainProviderLauncher />
    </div>
  );
}
