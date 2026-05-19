-- 1. projects 테이블 생성
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. RLS(Row Level Security) 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 3. 누구나 데이터를 읽고 쓸 수 있는 정책 설정 (개발용)
-- 실 서비스 시에는 인증된 사용자만 가능하도록 권한을 조정해야 합니다.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read'
    ) THEN
        CREATE POLICY "Allow public read" ON projects FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert'
    ) THEN
        CREATE POLICY "Allow public insert" ON projects FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update'
    ) THEN
        CREATE POLICY "Allow public update" ON projects FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END $$;
