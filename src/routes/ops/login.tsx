import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ops/login")({
  component: OpsLogin,
});

function OpsLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      navigate({ to: "/ops" });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] px-4">
      <div className="w-full max-w-[400px] bg-white p-6 rounded-[12px] border border-[var(--border-soft)] shadow-sm">
        <h1 className="text-[20px] font-extrabold text-center">담당자 로그인</h1>
        <p className="text-[13px] text-[var(--text-muted)] text-center mt-2">
          권한이 부여된 담당자 계정으로 로그인하세요.
        </p>

        <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-bold mb-1">이메일</label>
            <input
              type="email"
              className="w-full border rounded p-2 text-[14px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-1">비밀번호</label>
            <input
              type="password"
              className="w-full border rounded p-2 text-[14px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-[12px] text-[#991b1b] font-bold">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--primary)] text-white font-extrabold rounded-[8px] h-11 mt-2"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
