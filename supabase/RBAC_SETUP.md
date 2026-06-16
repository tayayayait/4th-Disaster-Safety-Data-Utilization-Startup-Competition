# 침수퇴로 AI - Phase 3 담당자 로그인 셋업 가이드

## 1. Supabase Auth 설정

1. Supabase Dashboard > Authentication > Providers에서 Email 제공자 활성화
2. (선택) 이메일 인증 절차(Confirm email) 해제 또는 활성화 구성

## 2. 권한 관련 테이블 및 트리거(RLS) 구성

담당자 접근을 제한하려면 `profiles` 테이블에 `role` 컬럼이 있어야 합니다.
SQL Editor에 아래 스크립트를 실행하세요.

```sql
-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text default 'CITIZEN' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'CITIZEN');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## 3. 담당자 권한 부여

가입된 유저에게 담당자 권한(`OPERATOR`, `ADMIN`)을 주려면 다음 쿼리를 실행하세요.

```sql
UPDATE public.profiles
SET role = 'OPERATOR'
WHERE id = '가입한-유저-UUID';
```

이후 `http://localhost:8080/ops/login`에서 로그인하면 정상적으로 담당자 화면을 볼 수 있습니다.
