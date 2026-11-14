"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isDemo, supabase } from "@/lib/data";

function RecoveryLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">✦</span><span>one story<span className="brand-light"> a day</span><small>Góc đọc mỗi ngày</small></span></Link><Link href="/admin" className="account-link">Đăng nhập</Link></header>
    <main className="page login-page"><div className="login-card password-card">{children}</div></main>
  </div>;
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const db = supabase();
    if (!db) { setError("Website chưa kết nối Supabase."); return; }
    setBusy(true);
    try {
      const { error: authError } = await db.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (authError) throw authError;
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể gửi email khôi phục.");
    } finally { setBusy(false); }
  }

  return <RecoveryLayout>
    <span className="login-icon">✦</span><span className="kicker">KHÔI PHỤC TÀI KHOẢN</span>
    <h1>Quên mật khẩu?</h1>
    <p>Nhập email đăng nhập để nhận liên kết đặt mật khẩu mới.</p>
    {sent ? <p className="success-message" role="status">Nếu email này có tài khoản, hãy kiểm tra hộp thư đến và thư rác để mở liên kết khôi phục.</p> : <form onSubmit={submit}>
      <label>Email<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email tài khoản của bạn" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary full" disabled={busy}>{busy ? "Đang gửi..." : "Gửi liên kết khôi phục →"}</button>
    </form>}
    <Link href="/admin">← Quay lại đăng nhập</Link>
  </RecoveryLayout>;
}

export function ResetPassword() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(!isDemo);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const db = supabase();
    if (!db) return;
    let active = true;
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => {
      if (active) { setEmail(session?.user.email ?? null); setChecking(false); }
    });
    void db.auth.getSession().then(({ data, error: authError }) => {
      if (active) { setEmail(data.session?.user.email ?? null); setError(authError?.message ?? ""); setChecking(false); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) { setError("Mật khẩu cần ít nhất 8 ký tự."); return; }
    if (password !== confirmation) { setError("Hai lần nhập mật khẩu chưa khớp."); return; }
    const db = supabase();
    if (!db) { setError("Website chưa kết nối Supabase."); return; }
    setBusy(true);
    try {
      const { error: authError } = await db.auth.updateUser({ password });
      if (authError) throw authError;
      setPassword(""); setConfirmation(""); setDone(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đặt mật khẩu mới."); }
    finally { setBusy(false); }
  }

  return <RecoveryLayout>
    <span className="login-icon">✦</span><span className="kicker">KHÔI PHỤC TÀI KHOẢN</span>
    <h1>Đặt mật khẩu mới</h1>
    {checking ? <p>Đang kiểm tra liên kết khôi phục...</p> : done ? <><p className="success-message" role="status">Đã đặt mật khẩu mới thành công.</p><Link href="/admin">Đến trang quản trị →</Link></> : email ? <>
      <p>Tài khoản: <strong>{email}</strong></p>
      <form onSubmit={submit}>
        <label>Mật khẩu mới<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label>Nhập lại mật khẩu mới<input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary full" disabled={busy}>{busy ? "Đang lưu..." : "Lưu mật khẩu mới →"}</button>
      </form>
    </> : <><p className="form-error" role="alert">Liên kết khôi phục không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.</p><Link href="/forgot-password">Gửi lại liên kết →</Link></>}
  </RecoveryLayout>;
}
