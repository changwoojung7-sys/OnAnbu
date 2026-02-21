-- 초대 코드 확인 함수
-- 로그인하지 않은 사용자도 실행 가능해야 하므로 SECURITY DEFINER 사용
create or replace function check_invite_code(code_input text, type_input text) returns json language plpgsql security definer as $$
declare result json;
begin -- 부모 초대 코드 확인
if type_input = 'parent' then
select row_to_json(t) into result
from (
    select invite_code,
      parent_name,
      inviter_id,
      status
    from parent_invitations
    where invite_code = code_input
      and (
        status = 'pending'
        or status = 'accepted'
      ) -- accepted 상태도 허용
  ) t;
-- 보조 양육자 초대 코드 확인
elsif type_input = 'guardian' then
select row_to_json(t) into result
from (
    select gi.invite_code,
      gi.group_id,
      gi.status,
      fg.parent_id,
      p.name as parent_name,
      p.avatar_url as parent_avatar
    from guardian_invitations gi
      join family_groups fg on gi.group_id = fg.id
      join profiles p on fg.parent_id = p.id
    where gi.invite_code = code_input
      and (
        gi.status = 'pending'
        or gi.status = 'accepted'
      ) -- accepted 상태도 허용
  ) t;
end if;
return result;
end;
$$;