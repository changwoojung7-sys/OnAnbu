-- 프로필 사진 관련 권한 및 저장소 설정 최종 수정본
-- 1. Profiles 테이블 UPDATE 권한 강화
-- 본인의 프로필에 대해서는 모든 필드 수정 가능하도록 허용
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR
UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- 2. Storage media 버킷 권한 상세화
-- avatars/ 경로에 대한 권한을 명확히 설정
-- 기존 정책들 정리
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
-- 2-1. [조회] 모든 미디어는 누구나 읽을 수 있음 (Public Bucket)
CREATE POLICY "Public Access" ON storage.objects FOR
SELECT TO public USING (bucket_id = 'media');
-- 2-2. [업로드] 인증된 사용자는 누구나 버킷에 파일 추가 가능
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'media');
-- 2-3. [수정/삭제] 본인이 소유(owner)한 파일이거나, 경로명에 본인의 ID가 포함된 경우 수정 가능
CREATE POLICY "Users can manage own media" ON storage.objects FOR ALL TO authenticated USING (
    bucket_id = 'media'
    AND (
        auth.uid() = owner
        OR (storage.foldername(name)) [1] = 'avatars'
        AND name LIKE '%' || auth.uid()::text || '%'
    )
);
SELECT 'Profile & Storage RLS Final Fix Applied ✅' as Result;