const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'calamus7@naver.com',
        password: 'password123'
    });
    if (authErr) {
        console.error('Login failed:', authErr.message);
        return;
    }

    const uid = auth.user.id;
    console.log('Logged in UID:', uid);

    const { data: members, error: mErr } = await supabase.from('family_members').select('*');
    console.log('\n--- Family Members ---');
    console.log(members);
    if (mErr) console.log('Err:', mErr);

    const { data: invites, error: iErr } = await supabase.from('parent_invitations').select('*');
    console.log('\n--- Parent Invitations ---');
    console.log(invites);
    if (iErr) console.log('Err:', iErr);

    if (invites && invites.length > 0) {
        const parentIds = invites.map(i => i.accepted_by).filter(Boolean);

        if (parentIds.length > 0) {
            const { data: groups, error: gErr } = await supabase.from('family_groups').select('*').in('parent_id', parentIds);
            console.log('\n--- Family Groups ---');
            console.log(groups);
            if (gErr) console.log('Err:', gErr);

            const { data: profs, error: pErr } = await supabase.from('profiles').select('id, name, role').in('id', parentIds);
            console.log('\n--- Parent Profiles ---');
            console.log(profs);
            if (pErr) console.log('Err:', pErr);
        }
    }
}
check();
