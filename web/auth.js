const SUPABASE_URL =
    "https://bbchhwjftvwomwnicwhj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_b1gQuYfPVWB74DJG0WB5Gg_E7itdOMn";


const supabase =
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
        await supabase.auth.signUp({
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
        await supabase.auth.signInWithPassword({
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
        await supabase.auth.signOut();


    if (error) {
        throw error;
    }

}


async function getCurrentUser() {

    const {
        data,
        error
    } =
        await supabase.auth.getUser();


    if (error) {
        return null;
    }


    return data.user;
}


supabase.auth.onAuthStateChange(
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
