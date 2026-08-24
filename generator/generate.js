const fs = require("fs");
const path = require("path");

const generateSubjectSelectionPage =
    require("./subject-selection");

const {
    generateLoginPage,
    generateSignupPage,
    generateEmailConfirmedPage,
    generateAccountPage
} = require("./auth-pages");

/*
    Cashew Papers Static Site Generator
    Version Alpha 0.0.17
*/

const ROOT = path.resolve(__dirname, "..");
const PAPERS_DIR = path.join(ROOT, "papers");
const DIST_DIR = path.join(ROOT, "dist");
const SUBJECTS_FILE = path.join(ROOT, "subjects.json");
const WEB_DIR = path.join(ROOT, "web");
const ASSETS_DIR = path.join(ROOT, "assets");

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

const CATEGORY_ICON_FILES = {
    pure: "pure.svg",
    statsmech: "stats.svg"
};

const IMAGE_ASSETS = [
    "cashewpapers.svg",
    "email-logo.png",
    "favicon.svg",
    "16.svg",
    "17.svg",
    "18.svg",
    "19.svg",
    "20.svg",
    "21.svg",
    "22.svg",
    "23.svg",
    "pure.svg",
    "stats.svg"
];


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
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeSubjectKey(key) {
    return String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function assetPath(filename, depth = 0) {
    return ("../".repeat(depth)) + "assets/" + filename;
}

function getSubjectIconFile(subjectKey) {
    return SUBJECT_ICON_FILES[
        normalizeSubjectKey(subjectKey)
    ] || null;
}

function getCategoryIconFile(categoryKey) {
    return CATEGORY_ICON_FILES[categoryKey] || null;
}

function copyImageAssets() {

    const targetDir = path.join(DIST_DIR, "assets");
    ensureDir(targetDir);

    for (const filename of IMAGE_ASSETS) {

        const source = path.join(ASSETS_DIR, filename);

        if (!fs.existsSync(source)) {
            throw new Error(`Missing image asset: ${source}`);
        }

        fs.copyFileSync(
            source,
            path.join(targetDir, filename)
        );
    }
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

    for (
        const entry
        of fs.readdirSync(
            dir,
            {
                withFileTypes: true
            }
        )
    ) {

        const fullPath =
            path.join(
                dir,
                entry.name
            );

        if (entry.isDirectory()) {

            results.push(
                ...scanFiles(
                    fullPath,
                    base
                )
            );

        } else {

            results.push({

                absolute:
                    fullPath,

                relative:
                    path.relative(
                        base,
                        fullPath
                    )

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

    for (
        const [
            subjectKey,
            subject
        ]
        of Object.entries(
            subjects
        )
    ) {

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
            scanFiles(
                subjectPath
            );


        for (
            const file
            of subjectFiles
        ) {

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

                if (
                    parts.length < 4
                ) {
                    continue;
                }

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

                if (
                    parts.length < 3
                ) {
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


            if (
                !database[
                    subjectKey
                ].years[
                    year
                ]
            ) {

                database[
                    subjectKey
                ].years[
                    year
                ] = {};

            }


            const sessionCode =
                parsed.sessionCode;


            if (
                !database[
                    subjectKey
                ].years[
                    year
                ][
                    sessionFolder
                ]
            ) {

                database[
                    subjectKey
                ].years[
                    year
                ][
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
    --bg: #333438;
    --card: #2c2e31;
    --text: #c5c4ba;
    --muted: #646669;
    --primary: #ff964f;
    --subdued: #936b3c;
    --border: #46484b;
    --shadow:
        0 8px 25px
        rgba(0, 0, 0, 0.18);
}

body {
    font-family:
        "Questrial",
        Arial,
        Helvetica,
        sans-serif;

    background:
        var(--bg);

    color:
        var(--text);

    min-height:
        100vh;

    font-weight:
        400;

    text-transform:
        lowercase;
}

a {
    color:
        inherit;

    text-decoration:
        none;
}

button,
input {
    font: inherit;
    text-transform: lowercase;
}

nav {
    background:
        var(--card);

    border-bottom:
        1px solid
        var(--border);
}

.nav-inner {
    max-width:
        1200px;

    margin:
        auto;

    padding:
        18px 24px;

    display:
        flex;

    justify-content:
        space-between;

    align-items:
        center;
}

.nav-actions {
    display:
        flex;

    align-items:
        center;

    gap:
        18px;
}

.nav-account {
    color:
        white;

    background:
        var(--primary);

    padding:
        9px 14px;

    border-radius:
        9px;

    font-size:
        14px;

    font-weight:
        400;
}

.nav-account:hover {
    opacity:
        0.9;
}

.logo {
    display: flex;
    align-items: center;
    text-decoration: none;
}

.logo img {
    height: 40px;
    width: auto;
    display: block;
}

.brand-logo {
    width:
        150px;

    height:
        38px;

    display:
        block;

    object-fit:
        cover;

    object-position:
        center;
}

main {
    max-width:
        1200px;

    margin:
        auto;

    padding:
        50px 24px 80px;
}

.hero {
    text-align: center;
    margin-bottom: 45px;
}

.hero h1 {
    font-size:
        clamp(
            42px,
            7vw,
            68px
        );

    letter-spacing:
        -3px;

    margin-bottom:
        18px;

    font-weight:
        400;

    color:
        var(--text);

    text-align:
        center;

    white-space:
        normal;

    line-height:
        1.15;
}

.hero h1 span {
    color:
        var(--text);

    font-weight:
        400;
}

.hero p {
    max-width:
        650px;

    margin:
        auto;

    color:
        var(--muted);

    font-size:
        17px;

    line-height:
        1.6;
}

.version {
    margin-top:
        10px;

    font-size:
        12px;

    color:
        var(--subdued);

    font-weight:
        400;
}

.page-header {
    margin-bottom:
        30px;
}

.back {
    color:
        var(--primary);

    font-weight:
        400;

    display:
        inline-block;

    margin-bottom:
        18px;
}

.page-header h1 {
    font-size:
        36px;

    letter-spacing:
        -1px;

    color:
        var(--primary);
}

.page-header p {
    color:
        var(--muted);

    margin-top:
        8px;

    line-height:
        1.5;
}

.subject-grid,
.category-grid {
    display:
        grid;

    grid-template-columns:
        repeat(
            2,
            1fr
        );

    gap:
        20px;
}

.subject-card,
.category-card {
    background:
        var(--card);

    border:
        1px solid
        var(--border);

    border-radius:
        20px;

    padding:
        28px;

    box-shadow:
        var(--shadow);

    transition:
        0.2s ease;
}

.subject-card:hover,
.category-card:hover,
.session-card:hover,
.paper-card:hover,
.year-session-card:hover {

    transform:
        translateY(
            -3px
        );

    border-color:
        var(--subdued);
}

.subject-card h2,
.category-card h2 {
    margin-top:
        18px;

    color:
        var(--primary);
}

.card-icon {
    width:
        50px;

    height:
        50px;

    border-radius:
        14px;

    background:
        #3a3c3f;

    border:
        1px solid var(--border);

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    font-size:
        23px;
}

.card-icon-image {
    width:
        34px;

    height:
        34px;

    object-fit:
        cover;

    object-position:
        center;

    display:
        block;
}

.card-description {
    color:
        var(--muted);

    margin-top:
        8px;

    line-height:
        1.5;
}


/* ---------------- YEAR CARDS ---------------- */

.year-grid {
    display:
        grid;

    grid-template-columns:
        repeat(
            2,
            1fr
        );

    gap:
        20px;
}

.year-link {
    background:
        var(--card);

    border:
        1px solid
        var(--border);

    border-radius:
        20px;

    padding:
        24px;

    box-shadow:
        var(--shadow);

    transition:
        0.2s ease;

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    min-height:
        104px;

    font-family:
        "Questrial",
        Arial,
        Helvetica,
        sans-serif;

    font-size:
        29px;

    font-weight:
        400;

    text-align:
        center;
}

.year-link:hover {

    transform:
        translateY(
            -3px
        );

    border-color:
        var(--subdued);

    box-shadow:
        0 14px 35px
        rgba(
            30,
            35,
            60,
            0.12
        );
}


/* ---------------- YEAR SESSION CARDS ---------------- */

.year-session-grid {
    display:
        grid;

    grid-template-columns:
        repeat(
            2,
            1fr
        );

    gap:
        20px;
}

.year-session-card {
    background:
        var(--card);

    border:
        1px solid
        var(--border);

    border-radius:
        20px;

    padding:
        24px;

    box-shadow:
        var(--shadow);

    transition:
        0.2s ease;

    display:
        flex;

    justify-content:
        space-between;

    align-items:
        center;

    min-height:
        104px;
}

.year-session-left {
    display:
        flex;

    align-items:
        center;

    gap:
        16px;

    min-width:
        0;
}

.year-session-icon {
    width:
        52px;

    height:
        52px;

    border-radius:
        14px;

    background:
        #3a3c3f;

    border:
        1px solid var(--border);

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    font-size:
        25px;

    flex-shrink:
        0;
}

.year-session-name {
    font-size:
        17px;

    font-weight:
        400;

    line-height:
        1.4;
}

.year-session-count {
    color:
        var(--muted);

    font-size:
        13px;

    margin-top:
        6px;
}

.year-session-arrow {
    color:
        var(--muted);

    font-size:
        22px;

    margin-left:
        16px;

    flex-shrink:
        0;
}


/* ---------------- SESSION / PAPER LISTS ---------------- */

.session-list,
.paper-list {
    display:
        grid;

    gap:
        14px;
}

.session-card,
.paper-card {
    background:
        var(--card);

    border:
        1px solid
        var(--border);

    border-radius:
        15px;

    padding:
        20px;

    box-shadow:
        var(--shadow);

    transition:
        0.2s ease;
}

.session-card {
    display:
        flex;

    justify-content:
        space-between;

    align-items:
        center;
}

.session-left {
    display:
        flex;

    gap:
        14px;

    align-items:
        center;
}

.folder {
    width:
        44px;

    height:
        44px;

    border-radius:
        10px;

    background:
        #3a3c3f;

    border:
        1px solid var(--border);

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;
}

.muted {
    color:
        var(--muted);

    margin-top:
        5px;

    font-size:
        13px;
}


/* ---------------- PAPER CARDS ---------------- */

.paper-card {
    display:
        flex;

    justify-content:
        space-between;

    align-items:
        center;

    gap:
        20px;
}

.paper-card.group-break {
    margin-top:
        18px;
}

.paper-code {
    font-family:
        "JetBrains Mono",
        monospace;

    color:
        var(--muted);

    font-size:
        13px;

    margin-top:
        7px;

    font-weight:
        400;
}

.paper-actions {
    display:
        flex;

    flex-wrap:
        wrap;

    gap:
        8px;

    align-items:
        center;
}

.paper-button {
    border:
        1px solid var(--border);

    border-radius:
        8px;

    padding:
        10px 14px;

    background:
        #3a3c3f;

    color:
        var(--text);

    cursor:
        pointer;
}

.paper-button.primary {
    background:
        var(--primary);

    color:
        white;
}


/* ---------------- PAPER PROGRESS ---------------- */

.paper-progress {
    display:
        flex;

    flex-direction:
        row;

    align-items:
        flex-start;

    gap:
        8px;

    max-width:
        100%;
}

.paper-status {
    height:
        42px;

    padding:
        0 16px;

    border:
        1px dashed
        #646669;

    border-radius:
        999px;

    background:
        #2c2e31;

    color:
        var(--muted);

    font-size:
        14px;

    font-weight:
        400;

    cursor:
        pointer;

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    gap:
        7px;

    transition:
        0.15s ease;

    flex-shrink:
        0;
}

.paper-status:hover {
    transform:
        translateY(
            -1px
        );

    border-color:
        var(--muted);

    background:
        #3a3c3f;
}

.paper-status.completed {
    background:
        #3a3127;

    border:
        1px solid
        var(--subdued);

    color:
        var(--primary);
}

.paper-status.completed:hover {
    background:
        #40382e;
}

.paper-attempts {
    display:
        flex;

    flex-direction:
        column;

    align-items:
        flex-start;

    gap:
        8px;

    max-width:
        100%;
}

.attempt-button {
    height:
        42px;

    padding:
        0 14px;

    border:
        1px solid
        var(--border);

    border-radius:
        999px;

    background:
        #2c2e31;

    color:
        var(--text);

    font-size:
        14px;

    font-weight:
        400;

    cursor:
        pointer;

    flex-shrink:
        0;
}

.attempt-button:hover {
    background:
        #3a3c3f;
}

.attempt-history {
    min-width:
        230px;

    max-width:
        100%;

    padding:
        9px 12px;

    border:
        1px solid
        #46484b;

    border-radius:
        12px;

    background:
        #2c2e31;

    color:
        var(--text);

    font-size:
        12px;

    line-height:
        1.35;
}

.attempt-row {
    display:
        flex;

    align-items:
        center;

    justify-content:
        space-between;

    gap:
        12px;

    padding:
        5px 0;
}

.attempt-row + .attempt-row {
    border-top:
        1px solid
        #46484b;
}

.attempt-row-text {
    min-width:
        0;

    overflow-wrap:
        anywhere;
}

.attempt-remove {
    width:
        24px;

    height:
        24px;

    flex-shrink:
        0;

    border:
        none;

    border-radius:
        50%;

    background:
        transparent;

    color:
        var(--muted);

    font-size:
        18px;

    line-height:
        1;

    cursor:
        pointer;

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    padding:
        0;
}

.attempt-remove:hover {
    background:
        #3a3c3f;

    color:
        var(--text);
}

.attempt-form {
    display:
        flex;

    align-items:
        center;

    flex-wrap:
        wrap;

    gap:
        7px;
}

.attempt-input {
    width:
        110px;

    height:
        42px;

    padding:
        0 12px;

    border:
        1px solid
        var(--border);

    border-radius:
        10px;

    background:
        var(--card);

    color:
        var(--text);

    font-size:
        14px;
}

.attempt-save,
.attempt-cancel {
    height:
        42px;

    padding:
        0 12px;

    border:
        none;

    border-radius:
        10px;

    font-size:
        13px;

    font-weight:
        400;

    cursor:
        pointer;
}

.attempt-save {
    background:
        var(--primary);

    color:
        white;
}

.attempt-cancel {
    background:
        #2c2e31;

    color:
        var(--text);
}

.paper-login-notice {
    margin-top:
        1px;

    font-size:
        13px;

    color:
        var(--muted);
}

.paper-login-notice a {
    color:
        var(--primary);

    font-weight:
        400;
}


/* ---------------- EMPTY ---------------- */

.empty {
    background:
        var(--card);

    border:
        1px dashed
        var(--border);

    border-radius:
        15px;

    padding:
        50px 20px;

    text-align:
        center;

    color:
        var(--muted);
}


/* ---------------- FOOTER ---------------- */

footer {
    text-align:
        center;

    padding:
        35px;

    border-top:
        1px solid
        var(--border);

    color:
        var(--muted);

    font-size:
        13px;
}


/* ---------------- HOME PAGE COMPACT LAYOUT ---------------- */

.home-page {
    padding-top: 4px;
}

.home-page .hero {
    margin-bottom: 22px;
}

.home-page .hero h1 {
    font-size:
        clamp(32px, 4.2vw, 48px);

    letter-spacing:
        -2px;

    margin-bottom:
        7px;

    line-height:
        1.1;
}

.home-page .hero p {
    font-size:
        12px;

    line-height:
        1.3;

    margin-top:
        2px;
}

.home-page .version {
    margin-top:
        5px;

    font-size:
        10px;
}

.home-page .subject-grid {
    grid-template-columns:
        repeat(
            4,
            1fr
        );

    gap:
        12px;
}

.home-page .subject-card {
    border-radius:
        12px;

    padding:
        14px;
}

.home-page .subject-card h2 {
    margin-top:
        9px;

    font-size:
        18px;
}

.home-page .card-icon {
    width:
        42px;

    height:
        42px;

    border-radius:
        11px;

    font-size:
        19px;
}

.home-page .card-icon-image {
    width:
        28px;

    height:
        28px;
}

.home-page .subject-card .muted {
    margin-top:
        4px;

    font-size:
        11px;
}

/* ---------------- MOBILE ---------------- */

@media (max-width: 700px) {

    main {
        padding:
            40px 16px 60px;
    }

    .subject-grid,
    .category-grid,
    .year-grid,
    .year-session-grid {
        grid-template-columns:
            1fr;
    }

    .paper-card,
    .session-card {
        flex-direction:
            column;

        align-items:
            flex-start;
    }

    .year-session-card {
        padding:
            20px;
    }

    .year-session-name {
        font-size:
            16px;
    }

    .paper-actions {
        width:
            100%;
    }

    .paper-button {
        flex:
            1;
    }

    .paper-progress {
        width:
            auto;

        max-width:
            100%;
    }

    .paper-status,
    .attempt-button {
        flex-shrink:
            0;
    }

    .attempt-history {
        width:
            100%;

        min-width:
            0;
    }

    .nav-actions {
        gap:
            10px;
    }

    .nav-account {
        font-size:
            12px;
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
        "../".repeat(
            depth
        );


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
        ${String(title).toLowerCase()} · cashew papers
    </title>

    <link
        rel="stylesheet"
        href="${prefix}style.css?v=0.0.17"
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
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Questrial&display=swap"
        rel="stylesheet"
    >

    <link
    rel="icon"
    type="image/svg+xml"
    href="${prefix}assets/favicon.svg"
>

    <script
        src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
    ></script>

    <script
        src="${prefix}auth.js?v=0.0.17"
    ></script>

</head>

<body>

<nav>

    <div class="nav-inner">

        <a
            class="logo"
            href="${prefix}index.html"
            aria-label="cashewpapers"
        >
            <img
                class="brand-logo"
                src="${assetPath("cashewpapers.svg", depth)}"
                alt="cashewpapers"
            >
        </a>

        <div class="nav-actions">

            <a
                id="authNav"
                 href="${prefix}login/"
                class="nav-account"
            >
                Login / Signup
            </a>

</div>

</div>

    </div>

</nav>

<main>

${body}

</main>

<footer>

    cashew papers · built for students

</footer>


<script>

async function updateAuthNavigation() {

    const authNav =
        document.getElementById(
            "authNav"
        );


    if (
        !authNav ||
        typeof getCurrentUser !==
            "function"
    ) {

        return;

    }


    const user =
        await getCurrentUser();


    if (user) {

        authNav.href =
            "${prefix}account/";

        authNav.textContent =
            "Profile";

    } else {

        authNav.href =
            "${prefix}login/";

        authNav.textContent =
            "Login / Signup";

    }

}


document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateAuthNavigation();
        initializePaperProgress();

    }
);


window.addEventListener(
    "cashew-auth-change",
    () => {

        updateAuthNavigation();
        initializePaperProgress();

    }
);


function getPaperStatus(
    key
) {

    return localStorage.getItem(
        "cashew-paper-status-" +
        key
    ) || "incomplete";

}


function setPaperStatus(
    key,
    status
) {

    localStorage.setItem(
        "cashew-paper-status-" +
        key,
        status
    );

}


function getPaperAttempts(
    key
) {

    try {

        const value =
            localStorage.getItem(
                "cashew-paper-attempts-" +
                key
            );

        if (!value) {
            return [];
        }

        const attempts =
            JSON.parse(value);

        return Array.isArray(attempts)
            ? attempts
            : [];

    } catch (error) {

        return [];

    }

}


function setPaperAttempts(
    key,
    attempts
) {

    localStorage.setItem(
        "cashew-paper-attempts-" +
        key,
        JSON.stringify(attempts)
    );

}


function formatAttemptDate(
    isoDate
) {

    const date =
        new Date(isoDate);

    if (Number.isNaN(date.getTime())) {
        return isoDate || "Unknown date";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );

}


function clearLoginNotice(
    progress
) {

    const existing =
        progress.querySelector(
            ".paper-login-notice"
        );

    if (existing) {
        existing.remove();
    }

}


function showLoginRequired() {

    window.location.href =
        "${prefix}login/";

}


function renderPaperStatus(
    button,
    status
) {

    button.classList.remove(
        "completed"
    );


    if (
        status ===
        "completed"
    ) {

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


function renderPaperAttempts(
    progress,
    key,
    completed,
    user
) {

    const attemptsContainer =
        progress.querySelector(
            "[data-paper-attempts]"
        );

    if (!attemptsContainer) {
        return;
    }

    attemptsContainer.innerHTML = "";

    clearLoginNotice(progress);

    if (!completed || !user) {
        return;
    }

    const attempts =
        getPaperAttempts(key);

    const addButton =
        document.createElement("button");

    addButton.type = "button";
    addButton.className = "attempt-button";
    addButton.textContent = "+ Add attempt";
    addButton.addEventListener(
        "click",
        () => {
            openAttemptForm(
                progress,
                key
            );
        }
    );

    attemptsContainer.appendChild(
        addButton
    );

    if (attempts.length === 0) {
        return;
    }

    const history =
        document.createElement("div");

    history.className =
        "attempt-history";

    attempts.forEach(
        (attempt, index) => {

            const row =
                document.createElement("div");

            row.className =
                "attempt-row";

            const text =
                document.createElement("div");

            text.className =
                "attempt-row-text";

            text.textContent =
                \`Attempt \${index + 1} / \${attempt.score} / \${formatAttemptDate(attempt.date)}\`;

            const removeButton =
                document.createElement("button");

            removeButton.type = "button";
            removeButton.className =
                "attempt-remove";
            removeButton.textContent = "×";
            removeButton.setAttribute(
                "aria-label",
                \`Remove attempt \${index + 1}\`
            );
            removeButton.title =
                "Remove attempt";

            removeButton.addEventListener(
                "click",
                async () => {

                    const currentUser =
                        await getCurrentUser();

                    if (!currentUser) {

                        showLoginRequired(
                            progress.querySelector(
                                ".paper-status"
                            )
                        );

                        return;

                    }

                    const currentAttempts =
                        getPaperAttempts(key);

                    currentAttempts.splice(
                        index,
                        1
                    );

                    setPaperAttempts(
                        key,
                        currentAttempts
                    );

                    renderPaperAttempts(
                        progress,
                        key,
                        getPaperStatus(key) === "completed",
                        currentUser
                    );

                }
            );

            row.appendChild(
                text
            );

            row.appendChild(
                removeButton
            );

            history.appendChild(
                row
            );

        }
    );

    attemptsContainer.appendChild(
        history
    );

}


function openAttemptForm(
    progress,
    key
) {

    const attemptsContainer =
        progress.querySelector(
            "[data-paper-attempts]"
        );

    if (!attemptsContainer) {
        return;
    }

    const existingForm =
        attemptsContainer.querySelector(
            ".attempt-form"
        );

    if (existingForm) {
        return;
    }

    const form =
        document.createElement("form");

    form.className =
        "attempt-form";

    const input =
        document.createElement("input");

    input.className =
        "attempt-input";

    input.type = "number";
    input.step = "any";
    input.inputMode = "decimal";
    input.placeholder = "Score";
    input.setAttribute(
        "aria-label",
        "Attempt score"
    );
    input.required = true;

    const saveButton =
        document.createElement("button");

    saveButton.type = "submit";
    saveButton.className =
        "attempt-save";
    saveButton.textContent = "Save";

    const cancelButton =
        document.createElement("button");

    cancelButton.type = "button";
    cancelButton.className =
        "attempt-cancel";
    cancelButton.textContent = "Cancel";

    cancelButton.addEventListener(
        "click",
        async () => {

            const user =
                await getCurrentUser();

            renderPaperAttempts(
                progress,
                key,
                getPaperStatus(key) === "completed",
                user
            );

        }
    );

    form.appendChild(input);
    form.appendChild(saveButton);
    form.appendChild(cancelButton);

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const user =
                await getCurrentUser();

            if (!user) {

                showLoginRequired(
                    progress.querySelector(
                        ".paper-status"
                    )
                );

                return;

            }

            const score =
                input.value.trim();

            if (!score) {
                input.focus();
                return;
            }

            const attempts =
                getPaperAttempts(key);

            attempts.push({
                score,
                date: new Date().toISOString()
            });

            setPaperAttempts(
                key,
                attempts
            );

            renderPaperAttempts(
                progress,
                key,
                true,
                user
            );

        }
    );

    attemptsContainer.appendChild(
        form
    );

    input.focus();

}


async function refreshPaperProgress(
    progress
) {

    const button =
        progress.querySelector(
            ".paper-status"
        );

    const key =
        button.dataset.paperKey;

    const user =
        await getCurrentUser();

    const status =
        user
            ? getPaperStatus(key)
            : "incomplete";

    renderPaperStatus(
        button,
        status
    );

    renderPaperAttempts(
        progress,
        key,
        status === "completed",
        user
    );

}


async function initializePaperProgress() {

    const progressElements =
        document.querySelectorAll(
            ".paper-progress"
        );

    if (!progressElements.length) {
        return;
    }

    await Promise.all(
        Array.from(
            progressElements
        ).map(
            refreshPaperProgress
        )
    );

}


async function togglePaperStatus(
    button
) {

    const key =
        button.dataset.paperKey;

    const progress =
        button.closest(
            ".paper-progress"
        );

    const user =
        await getCurrentUser();

    if (!user) {

        showLoginRequired(button);
        return;

    }

    clearLoginNotice(progress);

    const current =
        getPaperStatus(key);

    const next =
        current === "completed"
            ? "incomplete"
            : "completed";

    setPaperStatus(
        key,
        next
    );

    renderPaperStatus(
        button,
        next
    );

    renderPaperAttempts(
        progress,
        key,
        next === "completed",
        user
    );

}

</script>

</body>

</html>

    `;
}


/* ============================================================
   PAGE GENERATORS
   ============================================================ */

function generateHome(
    subjects
) {

    const cards =
        Object.entries(
            subjects
        )
        .map(
            ([key, subject]) => `

                <a
                    class="subject-card"
                    data-subject="${key}"
                    href="${key}/"
                >

                    <div class="card-icon">
                        ${
                            getSubjectIconFile(key)
                                ? `
                                    <img
                                        class="card-icon-image"
                                        src="${assetPath(getSubjectIconFile(key), 0)}"
                                        alt=""
                                    >
                                `
                                : subject.icon
                        }
                    </div>

                    <h2>
                        ${subject.name}
                    </h2>

                    <div class="muted">
                        Cambridge ${subject.code}
                    </div>


                </a>

            `
        )
        .join("");


    return documentHTML(
        "Home",

        `

            <div class="home-page">

            <section class="hero">

                <h1>
                    by students, 
                    <span>for students.</span>
                </h1>

                <p>
                    organized like a study tool, not a filing cabinet.
                </p>

                <p>
                    all the papers, with none of the mess.
                </p>

                <div class="version">
                    Version Alpha 0.0.17
                </div>

            </section>


            <div class="subject-grid">

                ${cards}

            </div>

            </div>


            <script>

async function applySubjectFilter() {

    const user =
        typeof getCurrentUser === "function"
            ? await getCurrentUser()
            : null;


    /*
        Guests always see every subject.
    */

    if (!user) {
        return;
    }


    /*
        Signed-in users only see their
        selected subjects.
    */

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


    if (
        !selectionComplete ||
        selectedSubjects.length === 0
    ) {
        return;
    }


    document
        .querySelectorAll(
            "[data-subject]"
        )
        .forEach(
            card => {

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

            }
        );

}


applySubjectFilter();

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
                [
                    "pure",
                    "Pure",
                    "📐"
                ],
                [
                    "statsmech",
                    "Statistics / Mechanics",
                    "📊"
                ]
            ];


        const cards =
            categories
                .map(
                    (
                        [
                            key,
                            name,
                            icon
                        ]
                    ) => `

                        <a
                            class="category-card"
                            href="${key}/"
                        >

                            <div class="card-icon">
                                ${
                                    getCategoryIconFile(key)
                                        ? `
                                            <img
                                                class="card-icon-image"
                                                src="${assetPath(getCategoryIconFile(key), 1)}"
                                                alt=""
                                            >
                                        `
                                        : icon
                                }
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
            (
                a,
                b
            ) =>
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
        Object.keys(
            years
        )
        .sort(
            (
                a,
                b
            ) =>
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
            (
                [
                    folder,
                    session
                ]
            ) => {

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

                            <div
                                class="year-session-icon"
                            >
                                📅
                            </div>

                            <div>

                                <div
                                    class="year-session-name"
                                >
                                    ${sessionName(
                                        session.sessionCode,
                                        year
                                    )}
                                </div>

                                <div
                                    class="year-session-count"
                                >
                                    ${count}
                                    paper${count !== 1 ? "s" : ""}
                                </div>

                            </div>

                        </div>

                        <div
                            class="year-session-arrow"
                        >
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


            <div
                class="year-session-grid"
            >

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
            (
                a,
                b
            ) =>
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
                (
                    paper,
                    index
                ) => {

                    const currentGroup =
                        String(
                            paper.paper
                        ).charAt(0);


                    const previousGroup =
                        index > 0
                            ? String(
                                papers[
                                    index - 1
                                ].paper
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
                                ${
                                    groupBreak
                                        ? "group-break"
                                        : ""
                                }
                            "
                        >

                            <div>

                                <h3>
                                    Paper ${paper.paper}
                                </h3>

                                <div
                                    class="paper-code"
                                >
                                    ${
                                        paper.code ||
                                        `Paper ${paper.paper}`
                                    }
                                </div>

                            </div>


                            <div
                                class="paper-actions"
                            >

                                <div
                                    class="paper-progress"
                                    data-paper-progress
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

                                    <div
                                        class="paper-attempts"
                                        data-paper-attempts
                                    ></div>

                                </div>


                                ${
                                    paper.question
                                        ? `
                                            <a
                                                class="
                                                    paper-button
                                                    primary
                                                "
                                                href="../../../../${paper.question}"
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
                                                href="../../../../${paper.markScheme}"
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
                                                href="../../../../${paper.examinerReport}"
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
                                                href="../../../../${paper.insert}"
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

            <div
                class="page-header"
            >

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
                                categoryKey ===
                                    "pure"
                                    ? "Pure"
                                    : "Statistics / Mechanics"
                            }`
                            : ""
                    }

                </p>

            </div>


            <div
                class="paper-list"
            >

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
                recursive:
                    true,

                force:
                    true
            }
        );

    }


    ensureDir(
        DIST_DIR
    );


    /* Image assets */

    copyImageAssets();


    /* Shared CSS */

    writeFile(
        path.join(
            DIST_DIR,
            "style.css"
        ),
        CSS
    );


    /* Authentication */

    fs.copyFileSync(
        path.join(
            WEB_DIR,
            "auth.js"
        ),
        path.join(
            DIST_DIR,
            "auth.js"
        )
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


    /* Authentication pages */

    writeFile(
        path.join(
            DIST_DIR,
            "login",
            "index.html"
        ),
        generateLoginPage()
    );


    writeFile(
        path.join(
            DIST_DIR,
            "signup",
            "index.html"
        ),
        generateSignupPage()
    );


    writeFile(
        path.join(
            DIST_DIR,
            "account",
            "index.html"
        ),
        generateAccountPage()
    );

    writeFile(
        path.join(
            DIST_DIR,
            "email-confirmed",
            "index.html"
        ),
        generateEmailConfirmedPage()
    );


    /* Copy PDFs */

    for (
        const file
        of scanFiles(
            PAPERS_DIR
        )
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
