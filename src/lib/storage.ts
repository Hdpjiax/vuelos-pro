export function slugFileName(fileName: string) {
  const safe = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return safe || "archivo.jpg";
}

export async function createSignedFlightFileUrl(supabase: any, filePath?: string | null) {
  if (!filePath) return null;

  const { data, error } = await supabase.storage
    .from("flight-files")
    .createSignedUrl(filePath, 60 * 30);

  if (error) return null;

  return data?.signedUrl ?? null;
}

export async function createSignedAttachmentUrls<T extends { file_path?: string | null }>(
  supabase: any,
  attachments: T[] | null | undefined
) {
  const items = attachments ?? [];

  return Promise.all(
    items.map(async (attachment) => ({
      ...attachment,
      signedUrl: await createSignedFlightFileUrl(supabase, attachment.file_path),
    }))
  );
}
