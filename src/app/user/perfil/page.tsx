import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ui/ProfileForm";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function UserProfilePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role, phone, company_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin/dashboard");

  return <ProfileForm role="user" profile={profile} success={params.success} error={params.error} />;
}
