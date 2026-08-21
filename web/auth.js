const SUPABASE_URL =
    "https://bbchhwjftvwomwnicwhj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_b1gQuYfPVWB74DJG0WB5Gg_E7itdOMn";


const supabase =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
