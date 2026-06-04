import { ToolsSubNav } from "@/components/admin/ToolsSubNav";
import { ZipCodesClient } from "@/components/admin/ZipCodesClient";

export const metadata = { title: "ZIP Codes | Tools" };

export default function ZipCodesPage() {
  return (
    <div className="space-y-6">
      <ToolsSubNav active="zip-codes" />
      <ZipCodesClient />
    </div>
  );
}
