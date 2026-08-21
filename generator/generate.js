const fs = require("fs");
const path = require("path");

const generateSubjectSelectionPage =
    require("./subject-selection");

/*
    Cashew Papers Static Site Generator
    Version Alpha 0.0.08
*/

const ROOT = path.resolve(__dirname, "..");
const PAPERS_DIR = path.join(ROOT, "papers");
const DIST_DIR = path.join(ROOT, "dist");
const SUBJECTS_FILE = path.join(ROOT, "subjects.json");




/* ============================================================
   BASIC HELPERS
   ============================================================ */

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}


function writeFile(file, content) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, content, "utf8");
}


function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8")
    );
}


function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}


/* ============================================================
   SESSION HANDLING
   ============================================================ */

function sessionName(code, year) {

    const type = code[0].toLowerCase();

    if (type === "s") {
        return `May / June ${year}`;
    }

    if (type === "w") {
        return `October / November ${year}`;
    }

    if (type === "m") {
        return `February / March ${year}`;
    }

    return code.toUpperCase();
}


function sessionSlug(code) {

    const type = code[0].toLowerCase();

    if (type === "s") {
        return "may-june";
    }

    if (type === "w") {
        return "october-november";
    }

    if (type === "m") {
        return "february-march";
    }

    return code.toLowerCase();
}


/* ============================================================
   FILE PARSING
   ============================================================ */

function parsePaperFilename(filename) {

    const match = filename.match(
        /^(\d+)_([a-z]\d{2})_(qp|ms|er|in)_(\d+)\.pdf$/i
    );

    if (!match) {
        return null;
    }

    return {
        code: match[1],
        sessionCode: match[2].toLowerCase(),
        type: match[3].toLowerCase(),
        paper: match[4]
    };
}


/* ============================================================
   REPOSITORY SCANNER
   ============================================================ */

function scanFiles(dir, base = dir) {

    const results = [];

    if (!fs.existsSync(dir)) {
        return results;
    }

    for (const entry of fs.readdirSync(dir, {
        withFileTypes: true
    })) {

        const fullPath =
            path.join(dir, entry.name);

        if (entry.isDirectory()) {

            results.push(
                ...scanFiles(fullPath, base)
            );

        } else {

            results.push({
                absolute: fullPath,
                relative: path.relative(base, fullPath)
            });

        }
    }

    return results;
}


/* ============================================================
   DATABASE
   ============================================================ */

function buildDatabase(subjects) {

    const database = {};

    for (const [subjectKey, subject] of Object.entries(subjects)) {

        const subjectPath =
            path.join(
                PAPERS_DIR,
                subjectKey
            );

        if (!fs.existsSync(subjectPath)) {
            continue;
        }

        database[subjectKey] = {
            subject,
            years: {}
        };


        const subjectFiles =
            scanFiles(subjectPath);


        for (const file of subjectFiles) {

            if (
                !file.relative
                    .toLowerCase()
                    .endsWith(".pdf")
            ) {
                continue;
            }


            const parts =
                file.relative.split(
                    path.sep
                );


            let category = null;
            let year;
            let sessionFolder;
            let filename;


            /*
                Mathematics:

                mathematics/
                pure/
                2025/
                mj/
                file.pdf
            */

            if (
                subjectKey ===
                "mathematics"
            ) {

                if (parts.length < 4) {
                    continue;
                }

                category =
                    parts[0]
                        .toLowerCase();

                year =
                    parts[1];

                sessionFolder =
                    parts[2];

                filename =
                    parts[3];

            }


            /*
                Other subjects:

                physics/
                2025/
                mj/
                file.pdf
            */

            else {

                if (parts.length < 3) {
                    continue;
                }

                year =
                    parts[0];

                sessionFolder =
                    parts[1];

                filename =
                    parts[2];

            }


            const parsed =
                parsePaperFilename(
                    filename
                );


            if (!parsed) {
                continue;
            }


            if (
                parsed.code !==
                subject.code
            ) {
                continue;
            }


            if (!database[
                subjectKey
            ].years[year]) {

                database[
                    subjectKey
                ].years[year] = {};

            }


            const sessionCode =
                parsed.sessionCode;


            if (
                !database[
                    subjectKey
                ].years[year][
                    sessionFolder
                ]
            ) {

                database[
                    subjectKey
                ].years[year][
                    sessionFolder
                ] = {
                    sessionCode,
                    papers: {}
                };

            }


            const session =
                database[
                    subjectKey
                ].years[
                    year
                ][
                    sessionFolder
                ];


            if (
                !session.papers[
                    parsed.paper
                ]
            ) {

                session.papers[
                    parsed.paper
                ] = {

                    paper:
                        parsed.paper,

                    question:
                        null,

                    markScheme:
                        null,

                    examinerReport:
                        null,

                    insert:
                        null

                };

            }


            const paper =
                session.papers[
                    parsed.paper
                ];


            const publicPath =
                path
                    .join(
                        "papers",
                        subjectKey,
                        file.relative
                    )
                    .split(
                        path.sep
                    )
                    .join("/");


            if (
                parsed.type ===
                "qp"
            ) {

                paper.question =
                    publicPath;

                paper.code =
                    filename.replace(
                        /\.pdf$/i,
                        ""
                    );

            }


            if (
                parsed.type ===
                "ms"
            ) {

                paper.markScheme =
                    publicPath;

            }


            if (
                parsed.type ===
                "er"
            ) {

                paper.examinerReport =
                    publicPath;

            }


            if (
                parsed.type ===
                "in"
            ) {

                paper.insert =
                    publicPath;

            }

        }
    }


    return database;
}


/* ============================================================
   CSS
   ============================================================ */

const CSS = `

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
    --shadow: 0 8px 25px rgba(30, 35, 60, 0.08);
}

body {
    font-family: Arial, Helvetica, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
}

a {
    color: inherit;
    text-decoration: none;
}

nav {
    background: white;
    border-bottom: 1px solid var(--border);
}

.nav-inner {
    max-width: 1200px;
    margin: auto;
    padding: 18px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-subjects {
    color: var(--primary);
    font-weight: 700;
    font-size: 14px;
}

.logo {
    font-size: 22px;
    font-weight: 800;
}

.logo span {
    color: var(--primary);
}

main {
    max-width: 1200px;
    margin: auto;
    padding: 50px 24px 80px;
}

.hero {
    text-align: center;
    margin-bottom: 45px;
}

.hero h1 {
    font-size: clamp(42px, 7vw, 68px);
    letter-spacing: -3px;
    margin-bottom: 18px;
}

.hero h1 span {
    color: var(--primary);
}

.hero p {
    max-width: 650px;
    margin: auto;
    color: var(--muted);
    font-size: 17px;
    line-height: 1.6;
}

.version {
    margin-top: 10px;
    font-size: 12px;
    color: #9a9ead;
    font-weight: 600;
}

.page-header {
    margin-bottom: 30px;
}

.back {
    color: var(--primary);
    font-weight: 700;
    display: inline-block;
    margin-bottom: 18px;
}

.page-header h1 {
    font-size: 36px;
    letter-spacing: -1px;
}

.page-header p {
    color: var(--muted);
    margin-top: 8px;
    line-height: 1.5;
}

.subject-grid,
.category-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

.subject-card,
.category-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 28px;
    box-shadow: var(--shadow);
    transition: 0.2s ease;
}

.subject-card:hover,
.category-card:hover,
.session-card:hover,
.paper-card:hover,
.year-session-card:hover {
    transform: translateY(-3px);
    border-color: #ffd0df;
}

.subject-card h2,
.category-card h2 {
    margin-top: 18px;
}

.card-icon {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    background: #fff0f5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 23px;
}

.card-description {
    color: var(--muted);
    margin-top: 8px;
    line-height: 1.5;
}


/* ---------------- YEAR CARDS ---------------- */

.year-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

.year-link {
    background: white;
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: var(--shadow);
    transition: 0.2s ease;

    display: flex;
    align-items: center;
    justify-content: center;

    min-height: 104px;

    font-family: Arial, Helvetica, sans-serif;
    font-size: 29px;
    font-weight: 700;
    text-align: center;
}

.year-link:hover {
    transform: translateY(-3px);
    border-color: #ffd0df;
    box-shadow: 0 14px 35px rgba(30, 35, 60, 0.12);
}

.year-link-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.year-link-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: #fff0f5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 25px;
    flex-shrink: 0;
}

.year-link-info strong {
    font-size: 19px;
    line-height: 1.4;
}

.year-link-meta {
    color: var(--muted);
    margin-top: 5px;
    font-size: 13px;
}

.year-link-arrow {
    color: var(--muted);
    font-size: 22px;
    margin-left: 16px;
    flex-shrink: 0;
}


/* ---------------- YEAR SESSION CARDS ---------------- */

.year-session-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

.year-session-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: var(--shadow);
    transition: 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 104px;
}

.year-session-left {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
}

.year-session-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: #eefbfc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 25px;
    flex-shrink: 0;
}

.year-session-name {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.4;
}

.year-session-count {
    color: var(--muted);
    font-size: 13px;
    margin-top: 6px;
}

.year-session-arrow {
    color: var(--muted);
    font-size: 22px;
    margin-left: 16px;
    flex-shrink: 0;
}


/* ---------------- SESSION / PAPER LISTS ---------------- */

.session-list,
.paper-list {
    display: grid;
    gap: 14px;
}

.session-card,
.paper-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: 15px;
    padding: 20px;
    box-shadow: var(--shadow);
    transition: 0.2s ease;
}

.session-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.session-left {
    display: flex;
    gap: 14px;
    align-items: center;
}

.folder {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: #eefbfc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.muted {
    color: var(--muted);
    margin-top: 5px;
    font-size: 13px;
}


/* ---------------- PAPER CARDS ---------------- */

.paper-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
}

.paper-card.group-break {
    margin-top: 18px;
}

.paper-code {
    font-family: "JetBrains Mono", monospace;
    color: var(--muted);
    font-size: 13px;
    margin-top: 7px;
    font-weight: 600;
}

.paper-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.paper-button {
    border: none;
    border-radius: 8px;
    padding: 10px 14px;
    background: #f0f1f6;
    cursor: pointer;
}

.paper-button.primary {
    background: var(--primary);
    color: white;
}


/* ---------------- PAPER STATUS ---------------- */

.paper-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.paper-status {
    height: 42px;
    padding: 0 16px;
    border: 1px dashed #cfd2dc;
    border-radius: 999px;
    background: #fafbfc;
    color: #73798c;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    transition: 0.15s ease;
    flex-shrink: 0;
    margin-right: 14px;
}

.paper-status:hover {
    transform: translateY(-1px);
    border-color: #b9becb;
    background: #f5f6f9;
}

.paper-status.completed {
    background: #e8f8ee;
    border: 1px solid #b9e8c8;
    color: #2e9b52;
}

.paper-status.completed:hover {
    background: #def4e6;
}


/* ---------------- EMPTY ---------------- */

.empty {
    background: white;
    border: 1px dashed var(--border);
    border-radius: 15px;
    padding: 50px 20px;
    text-align: center;
    color: var(--muted);
}


/* ---------------- FOOTER ---------------- */

footer {
    text-align: center;
    padding: 35px;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 13px;
}


/* ---------------- MOBILE ---------------- */

@media (max-width: 700px) {

    main {
        padding: 40px 16px 60px;
    }

    .subject-grid,
    .category-grid,
    .year-grid,
    .year-session-grid {
        grid-template-columns: 1fr;
    }

    .paper-card,
    .session-card {
        flex-direction: column;
        align-items: flex-start;
    }

    .year-session-card {
        padding: 20px;
    }

    .year-session-name {
        font-size: 16px;
    }

    .paper-actions {
        width: 100%;
    }

    .paper-button {
        flex: 1;
    }

    .paper-status {
        margin-right: 0;
        margin-bottom: 4px;
    }

}

`;


/* ============================================================
   HTML HELPERS
   ============================================================ */

function documentHTML(
    title,
    body,
    depth = 0
) {

    const prefix =
        "../".repeat(depth);

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
        href="${prefix}style.css"
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

</head>

<body>

<nav>

    <div class="nav-inner">

        <a
            class="logo"
            href="${prefix}index.html"
        >
            Cashew<span>Papers</span>
        </a>

        <a
            href="${prefix}select-subjects/"
            class="nav-subjects"
        >
            Edit subjects
        </a>

    </div>

</nav>

<main>

${body}

</main>

<footer>
    Cashew Papers · Built for students
</footer>


<script>

function getPaperStatus(key) {

    return localStorage.getItem(
        "cashew-paper-status-" + key
    ) || "incomplete";

}


function renderPaperStatus(button, status) {

    button.classList.remove(
        "completed"
    );

    if (status === "completed") {

        button.classList.add(
            "completed"
        );

        button.innerHTML =
            "✓ Completed";

        button.title =
            "Click to mark as incomplete";

        button.setAttribute(
            "aria-label",
            "Mark paper as incomplete"
        );

    } else {

        button.innerHTML =
            "☐ Mark as completed";

        button.title =
            "Click to mark as completed";

        button.setAttribute(
            "aria-label",
            "Mark paper as completed"
        );

    }
}


function togglePaperStatus(button) {

    const key =
        button.dataset.paperKey;

    const current =
        getPaperStatus(key);


    const next =
        current === "completed"
            ? "incomplete"
            : "completed";


    localStorage.setItem(
        "cashew-paper-status-" + key,
        next
    );


    renderPaperStatus(
        button,
        next
    );

}


document.addEventListener(
    "DOMContentLoaded",
    () => {

        document
            .querySelectorAll(
                ".paper-status"
            )
            .forEach(button => {

                renderPaperStatus(
                    button,
                    getPaperStatus(
                        button.dataset.paperKey
                    )
                );

            });

    }
);

</script>

</body>

</html>

    `;
}


/* ============================================================
   PAGE GENERATORS
   ============================================================ */

function generateHome(subjects) {

    const cards =
        Object.entries(subjects)
            .map(
                ([key, subject]) => `

                    <a
                        class="subject-card"
                        data-subject="${key}"
                        href="${key}/"
                    >

                        <div class="card-icon">
                            ${subject.icon}
                        </div>

                        <h2>
                            ${subject.name}
                        </h2>

                        <div class="muted">
                            Cambridge ${subject.code}
                        </div>

                        <div class="card-description">
                            ${subject.description}
                        </div>

                    </a>

                `
            )
            .join("");


    return documentHTML(
        "Home",

        `

            <section class="hero">

                <h1>
                    Find your
                    <span>past papers.</span>
                </h1>

                <p>
                    A simple, modern place to find
                    past papers and mark schemes.
                </p>

                <div class="version">
                    Version Alpha 0.0.08
                </div>

            </section>


            <div class="subject-grid">

                ${cards}

            </div>


            <script>

                const selectedSubjects =
                    JSON.parse(
                        localStorage.getItem(
                            "cashew-selected-subjects"
                        ) || "[]"
                    );


                const selectionComplete =
                    localStorage.getItem(
                        "cashew-subject-selection-complete"
                    );


                if (!selectionComplete) {

                    window.location.href =
                        "select-subjects/";

                } else {

                    document
                        .querySelectorAll(
                            "[data-subject]"
                        )
                        .forEach(card => {

                            const subject =
                                card.dataset.subject;

                            if (
                                !selectedSubjects.includes(
                                    subject
                                )
                            ) {

                                card.style.display =
                                    "none";

                            }

                        });

                }

            </script>

        `,

        0
    );
}


/* ============================================================
   SUBJECT PAGE
   ============================================================ */

function generateSubjectPage(
    subjectKey,
    data
) {

    const subject =
        data.subject;


    if (
        subjectKey ===
        "mathematics"
    ) {

        const categories =
            [
                ["pure", "Pure", "📐"],
                [
                    "statsmech",
                    "Statistics / Mechanics",
                    "📊"
                ]
            ];


        const cards =
            categories
                .map(
                    ([key, name, icon]) => `

                        <a
                            class="category-card"
                            href="${key}/"
                        >

                            <div class="card-icon">
                                ${icon}
                            </div>

                            <h2>
                                ${name}
                            </h2>

                            <div class="card-description">
                                Browse ${name.toLowerCase()}
                                papers.
                            </div>

                        </a>

                    `
                )
                .join("");


        return documentHTML(
            subject.name,

            `

                <div class="page-header">

                    <a
                        class="back"
                        href="../"
                    >
                        ← Back to subjects
                    </a>

                    <h1>
                        ${subject.name}
                        ${subject.code}
                    </h1>

                    <p>
                        Choose a Mathematics component.
                    </p>

                </div>


                <div class="category-grid">

                    ${cards}

                </div>

            `,

            1
        );
    }


    const years =
        Object.keys(
            data.years
        )
            .sort(
                (a, b) =>
                    Number(b) -
                    Number(a)
            );


    const links =
        years
            .map(
                year => `

                    <a
                        class="year-link"
                        href="${year}/"
                    >
                        ${year}
                    </a>

                `
            )
            .join("");


    return documentHTML(
        subject.name,

        `

            <div class="page-header">

                <a
                    class="back"
                    href="../"
                >
                    ← Back to subjects
                </a>

                <h1>
                    ${subject.name}
                    ${subject.code}
                </h1>

                <p>
                    ${subject.description}
                </p>

            </div>


            <div class="year-grid">
                ${links}
            </div>

        `,

        1
    );
}


/* ============================================================
   CATEGORY PAGE
   ============================================================ */

function generateCategoryPage(
    subject,
    categoryKey,
    years
) {

    const categoryName =
        categoryKey === "pure"
            ? "Pure"
            : "Statistics / Mechanics";


    const links =
        Object.keys(years)
            .sort(
                (a, b) =>
                    Number(b) -
                    Number(a)
            )
            .map(
                year => `

                    <a
                        class="year-link"
                        href="${year}/"
                    >
                        ${year}
                    </a>

                `
            )
            .join("");


    return documentHTML(
        categoryName,

        `

            <div class="page-header">

                <a
                    class="back"
                    href="../"
                >
                    ← Back to Mathematics
                </a>

                <h1>
                    ${categoryName}
                </h1>

                <p>
                    Mathematics ${subject.code}
                </p>

            </div>


            <div class="year-grid">
                ${links}
            </div>

        `,

        2
    );
}


/* ============================================================
   YEAR PAGE
   ============================================================ */

function generateYearPage(
    subject,
    categoryKey,
    year,
    sessions
) {

    const sessionCards =
        Object.entries(
            sessions
        )
        .map(
            ([folder, session]) => {

                const slug =
                    sessionSlug(
                        session.sessionCode
                    );

                const count =
                    Object.keys(
                        session.papers
                    ).length;

                return `

                    <a
                        class="year-session-card"
                        href="${slug}/"
                    >

                        <div
                            class="year-session-left"
                        >

                            <div class="year-session-icon">
                                📅
                            </div>

                            <div>

                                <div class="year-session-name">
                                    ${sessionName(
                                        session.sessionCode,
                                        year
                                    )}
                                </div>

                                <div class="year-session-count">
                                    ${count}
                                    paper${count !== 1 ? "s" : ""}
                                </div>

                            </div>

                        </div>

                        <div class="year-session-arrow">
                            →
                        </div>

                    </a>

                `;

            }
        )
        .join("");


    let backPath =
        "../";


    let backText =
        "Back";


    if (
        subject.name ===
        "Mathematics"
    ) {

        backPath =
            "../";

        backText =
            "Back to category";

    }


    return documentHTML(
        `${subject.name} ${year}`,

        `

            <div class="page-header">

                <a
                    class="back"
                    href="${backPath}"
                >
                    ← ${backText}
                </a>

                <h1>
                    ${subject.name}
                    ${year}
                </h1>

                <p>
                    ${subject.code}
                    · Choose a session to browse past papers.
                </p>

            </div>


            <div class="year-session-grid">

                ${sessionCards}

            </div>

        `,

        3
    );
}


/* ============================================================
   SESSION PAGE
   ============================================================ */

function generateSessionPage(
    subject,
    categoryKey,
    year,
    session
) {

    const title =
        sessionName(
            session.sessionCode,
            year
        );


    const papers =
        Object.values(
            session.papers
        )
        .sort(
            (a, b) =>
                a.paper.localeCompare(
                    b.paper,
                    undefined,
                    {
                        numeric: true
                    }
                )
        );


    const cards =
        papers
            .map(
                (paper, index) => {

                    const currentGroup =
                        String(
                            paper.paper
                        ).charAt(0);

                    const previousGroup =
                        index > 0
                            ? String(
                                papers[index - 1].paper
                            ).charAt(0)
                            : null;

                    const groupBreak =
                        index > 0 &&
                        currentGroup !==
                            previousGroup;


                    const paperStatusKey =
                        [
                            subject.code,
                            categoryKey || "",
                            year,
                            session.sessionCode,
                            paper.paper
                        ]
                            .join("-");


                    return `

                        <div
                            class="
                                paper-card
                                ${groupBreak ? "group-break" : ""}
                            "
                        >

                            <div>

                                <h3>
                                    Paper ${paper.paper}
                                </h3>

                                <div class="paper-code">
                                    ${
                                        paper.code ||
                                        `Paper ${paper.paper}`
                                    }
                                </div>

                            </div>


                            <div
                                class="paper-actions"
                            >

                                <button
                                    type="button"
                                    class="paper-status"
                                    data-paper-key="${paperStatusKey}"
                                    onclick="
                                        event.preventDefault();
                                        event.stopPropagation();
                                        togglePaperStatus(this);
                                    "
                                >
                                ☐ Mark as completed
                            </button>


                                ${
                                    paper.question
                                        ? `
                                            <a
                                                class="
                                                    paper-button
                                                    primary
                                                "
                                                href="../${paper.question
                                                    .split("/")
                                                    .slice(-4)
                                                    .join("/")
                                                }"
                                            >
                                                📄 Question Paper
                                            </a>
                                        `
                                        : ""
                                }


                                ${
                                    paper.markScheme
                                        ? `
                                            <a
                                                class="paper-button"
                                                href="../${paper.markScheme
                                                    .split("/")
                                                    .slice(-4)
                                                    .join("/")
                                                }"
                                            >
                                                ✅ Mark Scheme
                                            </a>
                                        `
                                        : ""
                                }


                                ${
                                    paper.examinerReport
                                        ? `
                                            <a
                                                class="paper-button"
                                                href="../${paper.examinerReport
                                                    .split("/")
                                                    .slice(-4)
                                                    .join("/")
                                                }"
                                            >
                                                📋 Examiner Report
                                            </a>
                                        `
                                        : ""
                                }


                                ${
                                    paper.insert
                                        ? `
                                            <a
                                                class="paper-button"
                                                href="../${paper.insert
                                                    .split("/")
                                                    .slice(-4)
                                                    .join("/")
                                                }"
                                            >
                                                📎 Insert
                                            </a>
                                        `
                                        : ""
                                }

                            </div>

                        </div>

                    `;
                }
            )
            .join("");


    return documentHTML(
        title,

        `

            <div class="page-header">

                <a
                    class="back"
                    href="../"
                >
                    ← Back to ${year}
                </a>

                <h1>
                    ${title}
                </h1>

                <p>
                    ${subject.name}
                    ${subject.code}
                    ${
                        categoryKey
                            ? ` · ${
                                categoryKey === "pure"
                                    ? "Pure"
                                    : "Statistics / Mechanics"
                            }`
                            : ""
                    }
                </p>

            </div>


            <div class="paper-list">

                ${cards}

            </div>

        `,

        4
    );
}


/* ============================================================
   GENERATE EVERYTHING
   ============================================================ */

function generate() {

    const subjects =
        readJSON(
            SUBJECTS_FILE
        );


    const database =
        buildDatabase(
            subjects
        );


    if (
        fs.existsSync(
            DIST_DIR
        )
    ) {

        fs.rmSync(
            DIST_DIR,
            {
                recursive: true,
                force: true
            }
        );

    }


    ensureDir(
        DIST_DIR
    );


    /* Shared CSS */

    writeFile(
        path.join(
            DIST_DIR,
            "style.css"
        ),
        CSS
    );


    /* Home */

    writeFile(
    path.join(
        DIST_DIR,
        "index.html"
    ),
    generateHome(
        subjects
    )
);


/* Subject selection */

writeFile(
    path.join(
        DIST_DIR,
        "select-subjects",
        "index.html"
    ),
    generateSubjectSelectionPage(
        subjects
    )
);


    /* Copy PDFs */

    for (
        const file
        of scanFiles(PAPERS_DIR)
    ) {

        const target =
            path.join(
                DIST_DIR,
                "papers",
                file.relative
            );


        ensureDir(
            path.dirname(
                target
            )
        );


        fs.copyFileSync(
            file.absolute,
            target
        );

    }


    /* Generate subject pages */

    for (
        const [
            subjectKey,
            data
        ]
        of Object.entries(
            database
        )
    ) {

        const subjectDir =
            path.join(
                DIST_DIR,
                subjectKey
            );


        /* Subject homepage */

        writeFile(
            path.join(
                subjectDir,
                "index.html"
            ),
            generateSubjectPage(
                subjectKey,
                data
            )
        );


        /* Mathematics category pages */

        if (
            subjectKey ===
            "mathematics"
        ) {

            for (
                const categoryKey
                of [
                    "pure",
                    "statsmech"
                ]
            ) {

                const categoryData =
                    data.years;


                /*
                    Split mathematics data
                    by category.

                    The current database scanner
                    needs category-aware storage.
                */

                const categoryYears =
                    {};

                for (
                    const file
                    of scanFiles(
                        path.join(
                            PAPERS_DIR,
                            subjectKey,
                            categoryKey
                        )
                    )
                ) {

                    const parts =
                        file.relative.split(
                            path.sep
                        );


                    if (
                        parts.length < 3
                    ) {
                        continue;
                    }


                    const year =
                        parts[0];


                    const sessionFolder =
                        parts[1];


                    const filename =
                        parts[2];


                    const parsed =
                        parsePaperFilename(
                            filename
                        );


                    if (!parsed) {
                        continue;
                    }


                    if (
                        !categoryYears[
                            year
                        ]
                    ) {

                        categoryYears[
                            year
                        ] = {};

                    }


                    if (
                        !categoryYears[
                            year
                        ][
                            sessionFolder
                        ]
                    ) {

                        categoryYears[
                            year
                        ][
                            sessionFolder
                        ] = {

                            sessionCode:
                                parsed.sessionCode,

                            papers: {}

                        };

                    }


                    const session =
                        categoryYears[
                            year
                        ][
                            sessionFolder
                        ];


                    if (
                        !session.papers[
                            parsed.paper
                        ]
                    ) {

                        session.papers[
                            parsed.paper
                        ] = {

                            paper:
                                parsed.paper,

                            question:
                                null,

                            markScheme:
                                null,

                            examinerReport:
                                null,

                            insert:
                                null,

                            code:
                                null

                        };

                    }


                    const paper =
                        session.papers[
                            parsed.paper
                        ];


                    const publicPath =
                        path
                            .join(
                                "papers",
                                subjectKey,
                                categoryKey,
                                file.relative
                            )
                            .split(
                                path.sep
                            )
                            .join("/");


                    if (
                        parsed.type ===
                        "qp"
                    ) {

                        paper.question =
                            publicPath;

                        paper.code =
                            filename.replace(
                                /\.pdf$/i,
                                ""
                            );

                    }


                    if (
                        parsed.type ===
                        "ms"
                    ) {

                        paper.markScheme =
                            publicPath;

                    }


                    if (
                        parsed.type ===
                        "er"
                    ) {

                        paper.examinerReport =
                            publicPath;

                    }


                    if (
                        parsed.type ===
                        "in"
                    ) {

                        paper.insert =
                            publicPath;

                    }

                }


                const categoryDir =
                    path.join(
                        DIST_DIR,
                        "mathematics",
                        categoryKey
                    );


                writeFile(
                    path.join(
                        categoryDir,
                        "index.html"
                    ),
                    generateCategoryPage(
                        data.subject,
                        categoryKey,
                        categoryYears
                    )
                );


                for (
                    const [
                        year,
                        sessions
                    ]
                    of Object.entries(
                        categoryYears
                    )
                ) {

                    writeFile(
                        path.join(
                            categoryDir,
                            year,
                            "index.html"
                        ),
                        generateYearPage(
                            data.subject,
                            categoryKey,
                            year,
                            sessions
                        )
                    );


                    for (
                        const [
                            folder,
                            session
                        ]
                        of Object.entries(
                            sessions
                        )
                    ) {

                        const slug =
                            sessionSlug(
                                session.sessionCode
                            );


                        writeFile(
                            path.join(
                                categoryDir,
                                year,
                                slug,
                                "index.html"
                            ),
                            generateSessionPage(
                                data.subject,
                                categoryKey,
                                year,
                                session
                            )
                        );

                    }

                }

            }

        }


        /* Normal subjects */

        else {

            for (
                const [
                    year,
                    sessions
                ]
                of Object.entries(
                    data.years
                )
            ) {

                writeFile(
                    path.join(
                        DIST_DIR,
                        subjectKey,
                        year,
                        "index.html"
                    ),
                    generateYearPage(
                        data.subject,
                        null,
                        year,
                        sessions
                    )
                );


                for (
                    const [
                        folder,
                        session
                    ]
                    of Object.entries(
                        sessions
                    )
                ) {

                    const slug =
                        sessionSlug(
                            session.sessionCode
                        );


                    writeFile(
                        path.join(
                            DIST_DIR,
                            subjectKey,
                            year,
                            slug,
                            "index.html"
                        ),
                        generateSessionPage(
                            data.subject,
                            null,
                            year,
                            session
                        )
                    );

                }

            }

        }

    }


    console.log(
        "Cashew Papers build complete."
    );

}


/* ============================================================
   RUN
   ============================================================ */

generate();
