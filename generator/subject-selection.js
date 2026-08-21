function generateSubjectSelectionPage(subjects) {

    const cards =
        Object.entries(subjects)
            .map(
                ([key, subject]) => `

                    <button
                        type="button"
                        class="subject-card"
                        data-subject="${key}"
                        onclick="toggleSubject('${key}')"
                    >

                        <div class="subject-icon">
                            ${subject.icon}
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

                `
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
        Choose Subjects · Cashew Papers
    </title>

    <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
    >

    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
    >

    <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
    >

    <style>

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        :root {
            --bg: #f7f8fc;
            --card: #ffffff;
            --text: #202536;
            --muted: #73798c;
            --primary: #ff3976;
            --border: #e7e9f0;
            --shadow:
                0 8px 25px rgba(30, 35, 60, 0.08);
        }

        body {
            font-family:
                Arial,
                Helvetica,
                sans-serif;

            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
        }

        .nav {
            background: white;
            border-bottom:
                1px solid var(--border);
        }

        .nav-inner {
            max-width: 1200px;
            margin: auto;
            padding: 18px 24px;
        }

        .logo {
            font-size: 22px;
            font-weight: 800;
            text-decoration: none;
            color: var(--text);
        }

        .logo span {
            color: var(--primary);
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
            font-size:
                clamp(36px, 6vw, 56px);

            letter-spacing: -2px;
            margin-bottom: 14px;
        }

        .hero p {
            color: var(--muted);
            font-size: 17px;
            line-height: 1.6;
        }

        .subject-grid {
            display: grid;
            grid-template-columns:
                repeat(2, 1fr);

            gap: 20px;
        }

        .subject-card {
            position: relative;

            background: white;

            border:
                1px solid var(--border);

            border-radius: 20px;

            padding: 26px;

            box-shadow: var(--shadow);

            cursor: pointer;

            text-align: left;

            transition:
                0.2s ease;
        }

        .subject-card:hover {
            transform: translateY(-3px);
            border-color: #ffd0df;
        }

        .subject-card.selected {
            border:
                2px solid var(--primary);

            box-shadow:
                0 10px 30px
                rgba(255, 57, 118, 0.12);
        }

        .subject-icon {
            width: 52px;
            height: 52px;

            border-radius: 14px;

            background: #fff0f5;

            display: flex;
            align-items: center;
            justify-content: center;

            font-size: 25px;

            margin-bottom: 18px;
        }

        .subject-info h2 {
            font-size: 22px;
            margin-bottom: 5px;
        }

        .subject-code {
            color: var(--muted);
            font-size: 14px;
            margin-bottom: 10px;
        }

        .subject-info p {
            color: var(--muted);
            font-size: 14px;
            line-height: 1.5;
        }

        .checkmark {
            position: absolute;

            top: 22px;
            right: 22px;

            width: 30px;
            height: 30px;

            border:
                1px solid var(--border);

            border-radius: 50%;

            background: #f7f8fc;

            color: transparent;

            display: flex;
            align-items: center;
            justify-content: center;

            font-weight: 700;
        }

        .subject-card.selected
        .checkmark {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
        }

        .continue-wrapper {
            margin-top: 35px;
            text-align: center;
        }

        .continue-button {
            border: none;

            background: var(--primary);
            color: white;

            padding:
                13px 26px;

            border-radius: 10px;

            font-size: 16px;
            font-weight: 700;

            cursor: pointer;

            transition:
                0.15s ease;
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
        }

        @media (max-width: 700px) {

            main {
                padding:
                    40px 16px 70px;
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
        >
            Cashew<span>Papers</span>
        </a>

    </div>

</nav>


<main>

    <section class="hero">

        <h1>
            What subjects are you studying?
        </h1>

        <p>
            Select all the subjects you want
            to see on your Cashew Papers homepage.
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

const STORAGE_KEY =
    "cashew-selected-subjects";


const selectedSubjects =
    new Set(
        JSON.parse(
            localStorage.getItem(
                STORAGE_KEY
            ) || "[]"
        )
    );


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

        selectedSubjects.delete(key);

    } else {

        selectedSubjects.add(key);

    }


    updateUI();

}


function saveSubjects() {

    if (
        selectedSubjects.size === 0
    ) {
        return;
    }


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            [...selectedSubjects]
        )
    );


    localStorage.setItem(
        "cashew-subject-selection-complete",
        "true"
    );


    window.location.href =
        "../";

}


updateUI();

</script>

</body>

</html>

    `;
}


module.exports =
    generateSubjectSelectionPage;
