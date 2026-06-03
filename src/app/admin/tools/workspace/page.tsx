import { ToolsSubNav } from "@/components/admin/ToolsSubNav";
import { WorkspaceBoard } from "@/components/admin/WorkspaceBoard";
import { getWorkspaceNotesAction } from "./actions";

export default async function AdminWorkspacePage() {
  const initialNotes = await getWorkspaceNotesAction();
  return (
    <div className="space-y-6">
      <ToolsSubNav active="workspace" />
      <WorkspaceBoard initialNotes={initialNotes as any} />
    </div>
  );
}
