"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function saveBankAccountAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const bankAccountId = cleanText(formData.get("bank_account_id"));
  const bankName = cleanText(formData.get("bank_name"));
  const accountHolder = cleanText(formData.get("account_holder"));
  const clabe = cleanText(formData.get("clabe")).replace(/\s+/g, "");

  if (!bankName || !accountHolder || !clabe) redirect("/admin/pagos");

  if (bankAccountId) {
    await supabase
      .from("bank_accounts")
      .update({
        bank_name: bankName,
        account_holder: accountHolder,
        clabe,
        active: true,
      })
      .eq("id", bankAccountId);
  } else {
    await supabase.from("bank_accounts").insert({
      admin_id: user.id,
      bank_name: bankName,
      account_holder: accountHolder,
      clabe,
      active: true,
    });
  }

  revalidatePath("/admin/pagos");
  revalidatePath("/admin/vuelos");
  redirect("/admin/pagos?saved=1");
}
