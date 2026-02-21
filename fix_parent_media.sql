-- 부모님이 보낸 사진/동영상(이전 기록)의 타입을 'message'로 올바르게 수정하는 쿼리입니다.
-- 기존에 잘못 분류되어 [보호자] 이름으로 표시되던 기록들을 [부모님] 이름으로 되돌려줍니다.
UPDATE action_logs
SET type = 'message'
WHERE type IN ('photo', 'video')
    AND message IN ('📷 사진을 보냈습니다', '🎥 동영상을 보냈습니다');