const SUBJECT_ICON_FILES = {
    mathematics: "16.svg",
    physics: "17.svg",
    biology: "18.svg",
    chemistry: "19.svg",
    economics: "20.svg",
    computerscience: "21.svg",
    psychology: "22.svg",
    business: "23.svg"
};


function normalizeSubjectKey(key) {
    return String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}


function getSubjectIconFile(subjectKey) {
    return SUBJECT_ICON_FILES[
        normalizeSubjectKey(subjectKey)
    ] || null;
}


function generateSubjectSelectionPage(subjects) {

    const cards =
        Object.entries(subjects)
            .map(
                ([key, subject]) => {

                    const iconFile =
                        getSubjectIconFile(key);

                    return `

                    <button
                        type="button"
                        class="subject-card"
                        data-subject="${key}"
                        onclick="toggleSubject('${key}')"
                    >

                        <div class="subject-icon">
                            ${
                                iconFile
                                    ? `
                                        <img
                                            class="subject-icon-image"
                                            src="../assets/${iconFile}"
                                            alt=""
                                        >
                                    `
                                    : subject.icon
                            }
                        </div>

                        <div class="subject-info">

                            <h2>
                                ${subject.name}
                            </h2>

                            <div class="subject-code">
                                Cambridge ${subject.code}
                            </div>

                            <p>
                                ${subject.description}
                            </p>

                        </div>

                        <div class="checkmark">
                            ✓
                        </div>

                    </button>

                `;
                }
            )
            .join("");


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
        choose subjects · cashew papers
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
    >

    <link
        href="https://fonts.googleapis.com/css2?family=Questrial&display=swap"
        rel="stylesheet"
    >

    <script
        src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
    ></script>

    <script src="../auth.js"></script>

    <script src="../user-data.js?v=0.1.84"></script>

    <style>

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family:
                "Questrial",
                Arial,
                Helvetica,
                sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            font-weight: 400;
            text-transform: lowercase;
        }

        button,
        input {
            font: inherit;
            text-transform: lowercase;
        }

        .nav {
            background: var(--card);
            border-bottom: 1px solid var(--border);
        }

        .nav-inner {
            max-width: 1200px;
            margin: auto;
            padding: 18px 24px;
            display: flex;
            align-items: center;
        }

        .logo {
            display: inline-flex;
            align-items: center;
        }

        .brand-logo {
            width: 150px;
            height: 38px;
            display: block;
            object-fit: cover;
            object-position: center;
        }

        main {
            max-width: 1000px;
            margin: auto;
            padding: 60px 24px 90px;
        }

        .hero {
            text-align: center;
            margin-bottom: 45px;
        }

        .hero h1 {
            font-size: clamp(36px, 6vw, 56px);
            letter-spacing: -2px;
            margin-bottom: 14px;
            color: var(--primary);
            font-weight: 400;
        }

        .hero p {
            color: var(--muted);
            font-size: 17px;
            line-height: 1.6;
            font-weight: 400;
        }

        .subject-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }

        .subject-card {
            position: relative;
            background: var(--card);
            color: var(--text);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 26px;
            box-shadow: var(--shadow);
            cursor: pointer;
            text-align: left;
            transition: 0.2s ease;
            font-weight: 400;
        }

        .subject-card:hover {
            transform: translateY(-3px);
            border-color: var(--subdued);
        }

        .subject-card.selected {
            border: 2px solid var(--primary);
            box-shadow: 0 10px 30px rgba(255, 150, 79, 0.12);
        }

        .subject-icon {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: #3a3c3f;
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 18px;
        }

        .subject-icon-image {
            width: 38px;
            height: 38px;
            object-fit: cover;
            object-position: center;
            display: block;
        }

        .subject-info h2 {
            font-size: 22px;
            margin-bottom: 5px;
            color: var(--primary);
            font-weight: 400;
        }

        .subject-code {
            color: var(--muted);
            font-size: 14px;
            margin-bottom: 10px;
            font-weight: 400;
        }

        .subject-info p {
            color: var(--text);
            font-size: 14px;
            line-height: 1.5;
            font-weight: 400;
        }

        .checkmark {
            position: absolute;
            top: 22px;
            right: 22px;
            width: 30px;
            height: 30px;
            border: 1px solid var(--border);
            border-radius: 50%;
            background: #3a3c3f;
            color: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 400;
        }

        .subject-card.selected .checkmark {
            background: var(--primary);
            border-color: var(--primary);
            color: #333438;
        }

        .continue-wrapper {
            margin-top: 35px;
            text-align: center;
        }

        .continue-button {
            border: none;
            background: var(--primary);
            color: #333438;
            padding: 13px 26px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 400;
            cursor: pointer;
            transition: 0.15s ease;
        }

        .continue-button:hover {
            transform: translateY(-1px);
            opacity: 0.92;
        }

        .continue-button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
            transform: none;
        }

        .selection-count {
            color: var(--muted);
            margin-top: 12px;
            font-size: 13px;
            font-weight: 400;
        }

        @media (max-width: 700px) {

            main {
                padding: 40px 16px 70px;
            }

            .subject-grid {
                grid-template-columns: 1fr;
            }

            .hero h1 {
                font-size: 40px;
            }

        }

    </style>

</head>

<body>

<nav class="nav">

    <div class="nav-inner">

        <a
            href="../"
            class="logo"
            aria-label="cashewpapers"
        >
            <img
                class="brand-logo"
                src="../assets/cashewpapers.svg"
                alt="cashewpapers"
            >
        </a>

    </div>

</nav>

<main>

    <section class="hero">

        <h1>
            What subjects are you studying?
        </h1>

        <p>
            Select all the subjects you want to see on your Cashew Papers homepage.
        </p>

    </section>

<div class="subject-grid">
    ${cards}
</div>

<div class="continue-wrapper">

    <button
        id="continueButton"
        class="continue-button"
        type="button"
        onclick="saveSubjects()"
        disabled
    >
        Continue
    </button>

    <div
        id="selectionCount"
        class="selection-count"
    >
        Select at least one subject.
    </div>

</div>

</main>

<script>

let selectedSubjects =
    new Set();

async function loadSubjects() {

    try {

        const user =
            typeof getCurrentUser ===
            "function"
                ? await getCurrentUser()
                : null;

        if (!user) {
            window.location.href =
                "../login/";
            return;
        }

        const saved =
            await CashewUserData
                .getSelectedSubjects();

        selectedSubjects =
            new Set(
                saved || []
            );

        updateUI();

    } catch (error) {

        console.error(
            "cashewpapers: unable to load selected subjects",
            error
        );

        updateUI();

    }

}

function updateUI() {

    document
        .querySelectorAll(
            ".subject-card"
        )
        .forEach(card => {

            const key =
                card.dataset.subject;

            card.classList.toggle(
                "selected",
                selectedSubjects.has(key)
            );

        });

    const count =
        selectedSubjects.size;

    const continueButton =
        document.getElementById(
            "continueButton"
        );

    const selectionCount =
        document.getElementById(
            "selectionCount"
        );

    continueButton.disabled =
        count === 0;

    if (count === 0) {

        selectionCount.textContent =
            "Select at least one subject.";

    } else {

        selectionCount.textContent =
            count === 1
                ? "1 subject selected."
                : count + " subjects selected.";

    }

}

function toggleSubject(key) {

    if (
        selectedSubjects.has(key)
    ) {

        selectedSubjects.delete(
            key
        );

    } else {

        selectedSubjects.add(
            key
        );

    }

    updateUI();

}

async function saveSubjects() {

    if (
        selectedSubjects.size === 0
    ) {
        return;
    }

    const user =
        typeof getCurrentUser === "function"
            ? await getCurrentUser()
            : null;

    if (!user) {

        window.location.href =
            "../login/";

        return;

    }

    const continueButton =
        document.getElementById(
            "continueButton"
        );

    continueButton.disabled =
        true;

    try {

        await CashewUserData
            .saveSelectedSubjects(
                [...selectedSubjects]
            );

        window.location.href =
            "../";

    } catch (error) {

        console.error(
            "cashewpapers: unable to save selected subjects",
            error
        );

        continueButton.disabled =
            false;

        const selectionCount =
            document.getElementById(
                "selectionCount"
            );

        selectionCount.textContent =
            "Unable to save subjects. Please try again.";

    }

}

window.addEventListener(
    "cashew-auth-change",
    event => {

        const authEvent =
            event &&
            event.detail &&
            event.detail.event;

        if (
            authEvent === "SIGNED_OUT"
        ) {

            window.location.href =
                "../login/";

            return;

        }

        loadSubjects();

    }
);

loadSubjects();

</script>

</body>

</html>

    `;
}


module.exports =
    generateSubjectSelectionPage;
