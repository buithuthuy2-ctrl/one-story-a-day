import { withSupabase } from "npm:@supabase/server@^1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const authorized = withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { data: caller, error: callerError } = await ctx.supabase.auth.getUser();
    if (callerError || caller.user?.app_metadata?.role !== "admin") {
      return json({ error: "Chỉ quản trị viên được cấp tài khoản học sinh." }, 403);
    }

    let input: { email?: unknown; password?: unknown; display_name?: unknown };
    try { input = await req.json(); }
    catch { return json({ error: "Dữ liệu không hợp lệ." }, 400); }

    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const displayName = typeof input.display_name === "string" ? input.display_name.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !displayName || displayName.length > 100) {
      return json({ error: "Nhập tên, email hợp lệ và mật khẩu ít nhất 8 ký tự." }, 400);
    }

    const { data, error } = await ctx.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
      app_metadata: { role: "student" },
    });
    if (error || !data.user) return json({ error: error?.message || "Không tạo được tài khoản." }, 400);

    const { error: profileError } = await ctx.supabaseAdmin.from("student_profiles").insert({
      id: data.user.id,
      email,
      display_name: displayName,
    });
    if (profileError) {
      await ctx.supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return json({ error: "Không lưu được hồ sơ học sinh." }, 500);
    }
    return json({ id: data.user.id, email, display_name: displayName }, 201);
});

const handler = {
  fetch(req: Request) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    return authorized(req);
  },
};

export default handler;
