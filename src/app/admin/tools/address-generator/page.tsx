import { AddressGenerator } from "@/components/admin/AddressGenerator";
import { ToolsSubNav } from "@/components/admin/ToolsSubNav";

export default function AdminAddressGeneratorPage() {
  return (
    <div className="space-y-6">
      <ToolsSubNav active="address-generator" />
      <AddressGenerator />
    </div>
  );
}
