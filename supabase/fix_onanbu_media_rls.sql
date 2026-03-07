-- onanbu_media 버킷에 대한 저장소 정책(RLS) 설정 스크립트
-- 버킷을 새로 만들면 RLS 정책이 없어서 업로드(INSERT)나 조회(SELECT)가 차단됩니다.

-- 1. [조회] 모든 미디어는 누구나 읽을 수 있음 (Public Bucket 용도)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR
SELECT TO public USING (bucket_id = 'onanbu_media');

-- 2. [업로드] 인증된 사용자는 누구나 버킷에 파일 추가 가능
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'onanbu_media');

-- 3. [수정/삭제] 본인이 소유(owner)한 파일이거나, 경로명에 본인의 ID가 포함된 경우 (프로필 등) 수정/삭제 가능
DROP POLICY IF EXISTS "Users can manage own media" ON storage.objects;
CREATE POLICY "Users can manage own media" ON storage.objects FOR ALL TO authenticated USING (
    bucket_id = 'onanbu_media'
    AND (
        auth.uid() = owner
        OR (storage.foldername(name)) [1] = 'avatars'
        AND name LIKE '%' || auth.uid()::text || '%'
    )
);

SELECT 'onanbu_media 버킷 RLS 설정 완료 ✅' as Result;
