function authPageHTML(
    title,
    body,
    script
) {

    return `

<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        ${title} · Cashew Papers
    </title>


    <link
        rel="stylesheet"
        href="../style.css"
    >


    <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
    >

    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin
    >


    <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
    >


    <script
        src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
    ></script>


    <script
        src="../auth.js"
    ></script>


    <style>

        .auth-page {
            max-width: 460px;
            margin: 70px auto;
        }


        .auth-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 32px;
            box-shadow: var(--shadow);
        }


        .auth-card h1 {
            margin-bottom: 10px;
        }


        .auth-subtitle {
            color: var(--muted);
            margin-bottom: 28px;
            line-height: 1.5;
        }


        .auth-field {
            margin-bottom: 18px;
        }


        .auth-field label {
            display: block;
            font-weight: 700;
            margin-bottom: 7px;
        }


        .auth-field input {
            width: 100%;
            padding: 12px 14px;
            border: 1px solid var(--border);
            border-radius: 10px;
            font-size: 15px;
        }


        .auth-submit {
            width: 100%;
            border: none;
            border-radius: 10px;
            padding: 13px;
            background: var(--primary);
            color: white;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
        }


        .auth-message {
            margin-top: 15px;
            font-size: 14px;
            color: var(--muted);
            line-height: 1.5;
        }


        .auth-switch {
            margin-top: 20px;
            text-align: center;
            color: var(--muted);
            font-size: 14px;
        }


        .auth-switch a {
            color: var(--primary);
            font-weight: 700;
        }


        .account-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }


        .secondary-button {
            width: 100%;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 13px;
            background: #f0f1f6;
            color: var(--text);
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
        }


        .confirmation-icon {
            width: 64px;
            height: 64px;
            border-radius: 18px;
            background: #e8f8ee;
            color: #2e9b52;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            margin-bottom: 22px;
        }

    </style>

</head>


<body>

<nav>

    <div class="nav-inner">

        <a
            class="logo"
            href="../"
        >
            Cashew<span>Papers</span>
        </a>

    </div>

</nav>


<main>

    ${body}

</main>


<footer>

    Cashew Papers · Built for students

</footer>


${script}


</body>

</html>

    `;

}


/* ============================================================
   LOGIN
   ============================================================ */

function generateLoginPage() {

    return authPageHTML(

        "Log In",

        `

        <div class="auth-page">

            <div class="auth-card">

                <h1>
                    Log in
                </h1>


                <p class="auth-subtitle">
                    Log in to save your subjects,
                    completed papers and future progress.
                </p>


                <form id="loginForm">

                    <div class="auth-field">

                        <label for="email">
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            autocomplete="email"
                            required
                        >

                    </div>


                    <div class="auth-field">

                        <label for="password">
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            autocomplete="current-password"
                            required
                        >

                    </div>


                    <button
                        class="auth-submit"
                        type="submit"
                    >
                        Log in
                    </button>

                </form>


                <div
                    id="authMessage"
                    class="auth-message"
                ></div>


                <div class="auth-switch">

                    Don't have an account?

                    <a href="../signup/">
                        Create one
                    </a>

                </div>

            </div>

        </div>

        `,

        `

        <script>

        document
            .getElementById("loginForm")
            .addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const email =
                        document
                            .getElementById("email")
                            .value
                            .trim();


                    const password =
                        document
                            .getElementById("password")
                            .value;


                    const message =
                        document
                            .getElementById(
                                "authMessage"
                            );


                    message.textContent =
                        "Logging in...";


                    try {

                        await signInUser(
                            email,
                            password
                        );


                        window.location.href =
                            "../";

                    } catch (error) {

                        message.textContent =
                            error.message;

                    }

                }
            );

        </script>

        `

    );

}


/* ============================================================
   SIGN UP
   ============================================================ */

function generateSignupPage() {

    return authPageHTML(

        "Create Account",

        `

        <div class="auth-page">

            <div class="auth-card">

                <h1>
                    Create your account
                </h1>


                <p class="auth-subtitle">
                    Create an account to save your
                    Cashew Papers progress across devices.
                </p>


                <form id="signupForm">

                    <div class="auth-field">

                        <label for="email">
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            autocomplete="email"
                            required
                        >

                    </div>


                    <div class="auth-field">

                        <label for="password">
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            autocomplete="new-password"
                            minlength="6"
                            required
                        >

                    </div>


                    <div class="auth-field">

                        <label for="confirmPassword">
                            Confirm password
                        </label>

                        <input
                            id="confirmPassword"
                            type="password"
                            autocomplete="new-password"
                            minlength="6"
                            required
                        >

                    </div>


                    <button
                        class="auth-submit"
                        type="submit"
                    >
                        Create account
                    </button>

                </form>


                <div
                    id="authMessage"
                    class="auth-message"
                ></div>


                <div class="auth-switch">

                    Already have an account?

                    <a href="../login/">
                        Log in
                    </a>

                </div>

            </div>

        </div>

        `,

        `

        <script>

        document
            .getElementById("signupForm")
            .addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const email =
                        document
                            .getElementById("email")
                            .value
                            .trim();


                    const password =
                        document
                            .getElementById("password")
                            .value;


                    const confirmPassword =
                        document
                            .getElementById(
                                "confirmPassword"
                            )
                            .value;


                    const message =
                        document
                            .getElementById(
                                "authMessage"
                            );


                    if (
                        password !==
                        confirmPassword
                    ) {

                        message.textContent =
                            "Passwords do not match.";

                        return;

                    }


                    message.textContent =
                        "Creating your account...";


                    try {

                        const data =
                            await signUpUser(
                                email,
                                password
                            );


                        /*
                            No session means email
                            confirmation is required.
                        */

                        if (
                            !data.session
                        ) {

                            message.innerHTML =
                                "Account created successfully.<br><br>" +
                                "Please check your email and click the verification link before continuing.";

                            return;

                        }


                        /*
                            Fallback for projects where
                            email confirmation is disabled.
                        */

                        window.location.href =
                            "../select-subjects/";

                    } catch (error) {

                        message.textContent =
                            error.message;

                    }

                }
            );

        </script>

        `

    );

}


/* ============================================================
   EMAIL CONFIRMED
   ============================================================ */

function generateEmailConfirmedPage() {

    return authPageHTML(

        "Email Verified",

        `

        <div class="auth-page">

            <div class="auth-card">

                <div
                    class="confirmation-icon"
                >
                    ✓
                </div>


                <h1>
                    Email verified
                </h1>


                <p
                    class="auth-subtitle"
                    id="confirmationMessage"
                >
                    Your email has been verified.
                    Taking you to subject selection...
                </p>

            </div>

        </div>

        `,

        `

        <script>

        async function finishVerification() {

            const message =
                document.getElementById(
                    "confirmationMessage"
                );


            const user =
                await getCurrentUser();


            if (!user) {

                message.textContent =
                    "Your email was verified, but your session could not be loaded. Please log in to continue.";

                setTimeout(
                    () => {

                        window.location.href =
                            "../login/";

                    },
                    2500
                );

                return;

            }


            setTimeout(
                () => {

                    window.location.href =
                        "../select-subjects/";

                },
                1200
            );

        }


        finishVerification();

        </script>

        `

    );

}


/* ============================================================
   ACCOUNT
   ============================================================ */

function generateAccountPage() {

    return authPageHTML(

        "Profile",

        `

        <div class="auth-page">

            <div class="auth-card">

                <h1>
                    Profile
                </h1>


                <p
                    id="accountEmail"
                    class="auth-subtitle"
                >
                    Loading...
                </p>


                <div
                    class="account-actions"
                >

                    <button
                        id="editSubjects"
                        class="secondary-button"
                        type="button"
                    >
                        Edit subjects
                    </button>


                    <button
                        id="logoutButton"
                        class="auth-submit"
                        type="button"
                    >
                        Log out
                    </button>

                </div>

            </div>

        </div>

        `,

        `

        <script>

        async function loadAccount() {

            const user =
                await getCurrentUser();


            if (!user) {

                window.location.href =
                    "../login/";

                return;

            }


            document
                .getElementById(
                    "accountEmail"
                )
                .textContent =
                    user.email ||
                    "Account";

        }


        document
            .getElementById(
                "editSubjects"
            )
            .addEventListener(
                "click",
                () => {

                    window.location.href =
                        "../select-subjects/";

                }
            );


        document
            .getElementById(
                "logoutButton"
            )
            .addEventListener(
                "click",
                async () => {

                    try {

                        await signOutUser();

                        window.location.href =
                            "../";

                    } catch (error) {

                        alert(
                            error.message
                        );

                    }

                }
            );


        loadAccount();

        </script>

        `

    );

}


module.exports = {

    generateLoginPage,

    generateSignupPage,

    generateEmailConfirmedPage,

    generateAccountPage

};
