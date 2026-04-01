import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
      <h1 className="mb-1 text-xl font-semibold">เข้าสู่ระบบ</h1>
      <p className="mb-4 text-sm text-slate-600">กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ</p>
      <LoginForm />
    </div>
  );
}
