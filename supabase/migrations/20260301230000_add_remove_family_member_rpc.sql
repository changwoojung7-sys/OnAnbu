CREATE OR REPLACE FUNCTION remove_family_member(p_group_id UUID, p_guardian_id UUID) RETURNS jsonb AS $$
DECLARE v_user_id UUID;
v_is_primary BOOLEAN;
v_target_role TEXT;
BEGIN v_user_id := auth.uid();
IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', '로그인이 필요합니다.');
END IF;
-- 1. Check the target's role
SELECT role INTO v_target_role
FROM public.family_members
WHERE group_id = p_group_id
    AND guardian_id = p_guardian_id;
IF v_target_role IS NULL THEN RETURN jsonb_build_object(
    'success',
    false,
    'message',
    '가족 구성원을 찾을 수 없습니다.'
);
END IF;
IF v_target_role = 'primary' THEN RETURN jsonb_build_object(
    'success',
    false,
    'message',
    '주 보호자는 내보내거나 나갈 수 없습니다.'
);
END IF;
-- 2. Authorization check
IF v_user_id != p_guardian_id THEN -- If removing someone else, must be a primary guardian of the same group
SELECT EXISTS (
        SELECT 1
        FROM public.family_members
        WHERE group_id = p_group_id
            AND guardian_id = v_user_id
            AND role = 'primary'
    ) INTO v_is_primary;
IF NOT v_is_primary THEN RETURN jsonb_build_object(
    'success',
    false,
    'message',
    '권한이 없습니다 (주 보호자만 가능).'
);
END IF;
END IF;
-- 3. Proceed with deletion
DELETE FROM public.family_members
WHERE group_id = p_group_id
    AND guardian_id = p_guardian_id;
RETURN jsonb_build_object('success', true, 'message', '성공적으로 처리되었습니다.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;