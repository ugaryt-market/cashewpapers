const SUPABASE_URL =
    "https://bbchhwjftvwomwnicwhj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_b1gQuYfPVWB74DJG0WB5Gg_E7itdOMn";


const cashewSupabase =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


async function signUpUser(
    email,
    password
) {

    const {
        data,
        error
    } =
        await cashewSupabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo:
                    "https://ugaryt-market.github.io/cashewpapers/"
            }
        });


    if (error) {
        throw error;
    }


    /*
        Supabase can return an obfuscated user
        when the email already belongs to an
        existing account.

        A normal newly-created email account
        has an email identity.
    */

    if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
    ) {

        throw new Error(
            "An account with this email already exists. Please log in instead."
        );

    }


    return data;
}

async function signInUser(
    email,
    password
) {

    const {
        data,
        error
    } =
        await cashewSupabase.auth.signInWithPassword({
            email,
            password
        });


    if (error) {
        throw error;
    }


    return data;
}


async function signOutUser() {

    const {
        error
    } =
        await cashewSupabase.auth.signOut();


    if (error) {
        throw error;
    }

}


async function getCurrentUser() {

    const {
        data,
        error
    } =
        await cashewSupabase.auth.getUser();


    if (error) {
        return null;
    }


    return data.user;
}


cashewSupabase.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        window.dispatchEvent(
            new CustomEvent(
                "cashew-auth-change",
                {
                    detail: {
                        event,
                        session
                    }
                }
            )
        );

    }
);
