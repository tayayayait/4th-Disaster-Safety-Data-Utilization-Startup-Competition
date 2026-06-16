import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { canAccessOps, type AppRole } from "@/lib/auth/roles";

export type OperatorAccessStatus =
  | "checking"
  | "unauthenticated"
  | "forbidden"
  | "allowed"
  | "error";

export interface OperatorAccessState {
  status: OperatorAccessStatus;
  role: AppRole | null;
  message: string;
}

const loadOperatorAccess = async (): Promise<OperatorAccessState> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return {
      status: "error",
      role: null,
      message: "인증 상태를 확인하지 못했습니다.",
    };
  }

  if (!user) {
    return {
      status: "unauthenticated",
      role: null,
      message: "담당자 화면은 로그인이 필요합니다.",
    };
  }

  const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (error) {
    return {
      status: "error",
      role: null,
      message: "권한 정보를 확인하지 못했습니다.",
    };
  }

  const role = data.role;
  if (!canAccessOps(role)) {
    return {
      status: "forbidden",
      role,
      message: "담당자 권한이 없습니다.",
    };
  }

  return {
    status: "allowed",
    role,
    message: "담당자 권한 확인 완료",
  };
};

export const useOperatorAccess = () => {
  const query = useQuery({
    queryKey: ["operator-access"],
    queryFn: loadOperatorAccess,
    staleTime: 60_000,
    retry: false,
  });

  return (
    query.data ?? {
      status: "checking",
      role: null,
      message: "권한을 확인하는 중입니다.",
    }
  );
};
