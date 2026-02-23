-- action_logs 테이블의 type 제약조건에 'photo', 'video' 추가
ALTER TABLE action_logs DROP CONSTRAINT IF EXISTS action_logs_type_check;
ALTER TABLE action_logs
ADD CONSTRAINT action_logs_type_check CHECK (
        type IN (
            'check_in',
            'voice_cheer',
            'message',
            'photo',
            'video'
        )
    );