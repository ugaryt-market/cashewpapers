/* ============================================================
   CASHEW PAPERS
   Version Alpha 0.0.04
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const SITE_BASE = "/cashewpapers/";

const GITHUB_OWNER = "ugaryt-market";
const GITHUB_REPO = "cashewpapers";
const GITHUB_BRANCH = "main";

const GITHUB_TREE_URL =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;

const RAW_BASE =
    `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;


/* ============================================================
   SUBJECTS
   ============================================================ */

const subjects = {

    mathematics: {
        name: "Mathematics",
        code: "9709",
        icon: "📐",
        description:
            "AS & A Level Mathematics past papers."
    },

    physics: {
        name: "Physics",
        code: "9702",
        icon: "⚛️",
        description:
            "AS & A Level Physics past papers."
    },

    chemistry: {
        name: "Chemistry",
        code: "9701",
        icon: "🧪",
        description:
            "AS & A Level Chemistry past papers."
    },

    biology: {
        name: "Biology",
        code: "9700",
        icon: "🧬",
        description:
            "AS & A Level Biology past papers."
    }

};


/* ============================================================
   MATHEMATICS CATEGORIES
   ============================================================ */

const mathematicsCategories = {

    pure: {
        name: "Pure",
        icon: "📐",
        description:
            "Pure Mathematics papers and mark schemes."
    },

    statsmech: {
        name: "Statistics / Mechanics",
        icon: "📊",
        description:
            "Statistics and Mechanics papers and mark schemes."
    }

};


/* ============================================================
   DATABASE
   ============================================================ */

let repositoryFiles = [];
let paperDatabase = {};

let repositoryLoaded = false;


/* ============================================================
   GLOBAL STYLES
   ============================================================ */

function injectStyles() {

    if (
        document.getElementById("cashew-styles")
    ) {
        return;
    }


    const style =
        document.createElement("style");

    style.id =
        "cashew-styles";


    style.textContent = `

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
                0 8px 25px rgba(
                    30,
                    35,
                    60,
                    0.08
                );
        }

        body {
            font-family:
                Arial,
                Helvetica,
                sans-serif;

            background:
                var(--bg);

            color:
                var(--text);

            min-height:
                100vh;
        }

        button,
        input {
            font: inherit;
        }

        button {
            cursor: pointer;
        }

        a {
            text-decoration:
                none;

            color:
                inherit;
        }

        nav {
            background:
                white;

            border-bottom:
                1px solid var(--border);

            position:
                sticky;

            top:
                0;

            z-index:
                100;
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

            align-items:
                center;

            justify-content:
                space-between;
        }

        .logo {
            font-size:
                22px;

            font-weight:
                800;

            letter-spacing:
                -0.5px;
        }

        .logo span {
            color:
                var(--primary);
        }

        .nav-links {
            display:
                flex;

            gap:
                24px;

            color:
                var(--muted);

            font-size:
                14px;
        }

        .nav-links a:hover {
            color:
                var(--primary);
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
            text-align:
                center;

            margin-bottom:
                40px;
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
        }

        .hero h1 span {
            color:
                var(--primary);
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
                #9a9ead;

            font-weight:
                600;
        }

        .search-wrapper {
            max-width:
                750px;

            margin:
                0 auto 50px;
        }

        .search-box {
            background:
                white;

            border:
                1px solid var(--border);

            border-radius:
                16px;

            box-shadow:
                var(--shadow);

            padding:
                6px 18px;

            display:
                flex;

            align-items:
                center;
        }

        .search-icon {
            font-size:
                20px;

            margin-right:
                12px;
        }

        .search-box input {
            width:
                100%;

            border:
                none;

            outline:
                none;

            background:
                transparent;

            padding:
                14px 5px;

            font-size:
                16px;

            color:
                var(--text);
        }

        .section-title {
            margin-bottom:
                20px;
        }

        .section-title h2 {
            font-size:
                25px;
        }

        .section-title p {
            color:
                var(--muted);

            margin-top:
                5px;
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
                white;

            border:
                1px solid var(--border);

            border-radius:
                20px;

            padding:
                28px;

            box-shadow:
                var(--shadow);

            cursor:
                pointer;

            transition:
                0.2s ease;
        }

        .category-card {
            border-radius:
                18px;

            padding:
                24px;
        }

        .subject-card:hover,
        .category-card:hover {
            transform:
                translateY(-4px);

            box-shadow:
                0 14px 35px
                rgba(
                    30,
                    35,
                    60,
                    0.12
                );

            border-color:
                #ffd0df;
        }

        .subject-top {
            display:
                flex;

            justify-content:
                space-between;

            align-items:
                center;
        }

        .subject-icon,
        .category-icon {
            width:
                52px;

            height:
                52px;

            border-radius:
                14px;

            background:
                #fff0f5;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            font-size:
                25px;
        }

        .category-icon {
            width:
                48px;

            height:
                48px;

            font-size:
                22px;

            border-radius:
                13px;
        }

        .arrow {
            color:
                var(--muted);

            font-size:
                22px;
        }

        .subject-card h3 {
            margin-top:
                20px;

            font-size:
                23px;
        }

        .category-card h3 {
            margin-top:
                18px;

            font-size:
                21px;
        }

        .subject-code {
            color:
                var(--muted);

            margin-top:
                5px;

            font-size:
                14px;
        }

        .subject-description,
        .category-card p {
            color:
                var(--muted);

            font-size:
                14px;

            line-height:
                1.5;

            margin-top:
                14px;
        }

        .category-card p {
            margin-top:
                7px;
        }

        .page-header {
            margin-bottom:
                25px;
        }

        .back-btn {
            background:
                transparent;

            border:
                none;

            color:
                var(--primary);

            font-weight:
                700;

            margin-bottom:
                18px;

            padding:
                0;
        }

        .page-header h1 {
            font-size:
                36px;

            letter-spacing:
                -1px;
        }

        .page-header p {
            color:
                var(--muted);

            margin-top:
                8px;
        }

        .breadcrumbs {
            display:
                flex;

            flex-wrap:
                wrap;

            gap:
                6px;

            margin-bottom:
                20px;

            color:
                var(--muted);

            font-size:
                13px;
        }

        .breadcrumbs a {
            color:
                var(--primary);
        }

        .filters {
            display:
                flex;

            flex-wrap:
                wrap;

            gap:
                8px;

            margin:
                24px 0 30px;
        }

        .filter-btn {
            background:
                white;

            border:
                1px solid var(--border);

            color:
                var(--muted);

            padding:
                9px 15px;

            border-radius:
                9px;
        }

        .filter-btn:hover,
        .filter-btn.active {
            background:
                var(--primary);

            color:
                white;

            border-color:
                var(--primary);
        }

        .year-section {
            margin-bottom:
                35px;
        }

        .year-title {
            font-size:
                25px;

            margin-bottom:
                14px;
        }

        .session-list {
            display:
                grid;

            gap:
                12px;
        }

        .session-card {
            background:
                white;

            border:
                1px solid var(--border);

            border-radius:
                14px;

            padding:
                18px;

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                center;

            cursor:
                pointer;

            transition:
                0.2s ease;
        }

        .session-card:hover {
            transform:
                translateX(3px);

            border-color:
                #ffd0df;
        }

        .session-left {
            display:
                flex;

            align-items:
                center;

            gap:
                14px;
        }

        .folder-icon {
            width:
                44px;

            height:
                44px;

            background:
                #eefbfc;

            border-radius:
                10px;

            display:
                flex;

            justify-content:
                center;

            align-items:
                center;

            font-size:
                21px;
        }

        .session-name {
            font-weight:
                700;
        }

        .session-count {
            margin-top:
                4px;

            color:
                var(--muted);

            font-size:
                13px;
        }

        .session-arrow {
            color:
                var(--muted);
        }

        .paper-list {
            display:
                grid;

            gap:
                14px;

            margin-top:
                25px;
        }

        .paper-card {
            background:
                white;

            border:
                1px solid var(--border);

            border-radius:
                15px;

            padding:
                20px;

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                center;

            gap:
                20px;
        }

        .paper-info h3 {
            font-size:
                18px;
        }

        .paper-code {
            color:
                var(--muted);

            font-family:
                "JetBrains Mono",
                monospace;

            font-size:
                13px;

            margin-top:
                6px;

            font-weight:
                600;
        }

        .paper-actions {
            display:
                flex;

            gap:
                8px;

            flex-wrap:
                wrap;
        }

        .paper-btn {
            border:
                none;

            background:
                #f0f1f6;

            padding:
                9px 13px;

            border-radius:
                8px;

            color:
                var(--text);
        }

        .paper-btn.primary {
            background:
                var(--primary);

            color:
                white;
        }

        .paper-btn:hover {
            opacity:
                0.85;
        }

        .loading {
            text-align:
                center;

            padding:
                60px 20px;

            color:
                var(--muted);
        }

        .spinner {
            width:
                32px;

            height:
                32px;

            border:
                4px solid #ececf2;

            border-top-color:
                var(--primary);

            border-radius:
                50%;

            margin:
                0 auto 15px;

            animation:
                spin
                0.8s linear infinite;
        }

        @keyframes spin {
            to {
                transform:
                    rotate(360deg);
            }
        }

        .empty {
            background:
                white;

            border:
                1px dashed var(--border);

            border-radius:
                15px;

            padding:
                50px 20px;

            text-align:
                center;

            color:
                var(--muted);
        }

        .error-message {
            background:
                #fff3f5;

            border:
                1px solid #ffd4de;

            border-radius:
                15px;

            padding:
                25px;

            color:
                #a52645;

            line-height:
                1.6;
        }

        footer {
            text-align:
                center;

            padding:
                35px;

            border-top:
                1px solid var(--border);

            color:
                var(--muted);

            font-size:
                13px;
        }

        @media (max-width: 700px) {

            main {
                padding:
                    40px 16px 60px;
            }

            .nav-links {
                display:
                    none;
            }

            .subject-grid,
            .category-grid {
                grid-template-columns:
                    1fr;
            }

            .hero h1 {
                font-size:
                    46px;
            }

            .paper-card {
                flex-direction:
                    column;

                align-items:
                    flex-start;
            }

            .paper-actions {
                width:
                    100%;
            }

            .paper-btn {
                flex:
                    1;
            }
        }

    `;


    document.head.appendChild(
        style
    );

}


/* ============================================================
   APP SHELL
   ============================================================ */

function createShell() {

    const app =
        document.getElementById(
            "app"
        );


    if (!app) {
        return;
    }


    app.innerHTML = `

        <nav>

            <div class="nav-inner">

                <a
                    href="${SITE_BASE}"
                    onclick="
                        navigateHome(event)
                    "
                    class="logo"
                >
                    Cashew<span>Papers</span>
                </a>


                <div class="nav-links">

                    <a
                        href="${SITE_BASE}"
                        onclick="
                            navigateHome(event)
                        "
                    >
                        Home
                    </a>

                </div>

            </div>

        </nav>


        <main id="page"></main>


        <footer>
            Cashew Papers · Built for students
        </footer>

    `;

}


/* ============================================================
   GITHUB DATA
   ============================================================ */

async function loadRepository() {

    if (repositoryLoaded) {
        return;
    }


    const response =
        await fetch(
            GITHUB_TREE_URL,
            {
                cache:
                    "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `GitHub returned ${response.status}`
        );

    }


    const data =
        await response.json();


    if (!data.tree) {

        throw new Error(
            "GitHub did not return a repository tree."
        );

    }


    repositoryFiles =
        data.tree.filter(
            item =>
                item.type === "blob" &&
                /^papers\//i.test(
                    item.path
                ) &&
                /\.pdf$/i.test(
                    item.path
                )
        );


    buildPaperDatabase();


    repositoryLoaded = true;

}


/* ============================================================
   PARSE FILENAMES
   ============================================================ */

function parseFilename(
    filename
) {

    const match =
        filename.match(
            /^(\d+)_([a-z]\d{2})_(qp|ms|er|in)_(\d+)\.pdf$/i
        );


    if (!match) {
        return null;
    }


    return {

        code:
            match[1],

        sessionCode:
            match[2].toLowerCase(),

        type:
            match[3].toLowerCase(),

        paper:
            match[4],

        filename:
            filename

    };

}


/* ============================================================
   BUILD PAPER DATABASE
   ============================================================ */

function buildPaperDatabase() {

    paperDatabase = {};


    for (
        const file
        of repositoryFiles
    ) {

        const parts =
            file.path.split("/");


        if (parts.length < 5) {
            continue;
        }


        const subjectKey =
            parts[1].toLowerCase();


        if (!subjects[subjectKey]) {
            continue;
        }


        let categoryKey =
            null;

        let year;
        let folder;
        let filename;


        /* ---------------- MATHEMATICS ---------------- */

        if (
            subjectKey ===
            "mathematics"
        ) {

            if (
                parts.length < 6
            ) {
                continue;
            }


            categoryKey =
                parts[2]
                    .toLowerCase();


            if (
                categoryKey ===
                    "statistics" ||
                categoryKey ===
                    "statsmech" ||
                categoryKey ===
                    "stats-mech" ||
                categoryKey ===
                    "statistics-mechanics"
            ) {

                categoryKey =
                    "statsmech";

            }


            if (
                categoryKey ===
                "pure"
            ) {

                categoryKey =
                    "pure";

            }


            year =
                parts[3];

            folder =
                parts[4];

            filename =
                parts
                    .slice(5)
                    .join("/");

        }


        /* ---------------- OTHER SUBJECTS ---------------- */

        else {

            year =
                parts[2];

            folder =
                parts[3];

            filename =
                parts
                    .slice(4)
                    .join("/");

        }


        const parsed =
            parseFilename(
                filename
            );


        if (!parsed) {
            continue;
        }


        if (
            parsed.code !==
            subjects[
                subjectKey
            ].code
        ) {
            continue;
        }


        /* ---------------- MATHEMATICS ---------------- */

        if (
            subjectKey ===
            "mathematics"
        ) {

            if (
                !paperDatabase
                    .mathematics
            ) {

                paperDatabase
                    .mathematics = {};

            }


            if (
                !paperDatabase
                    .mathematics
                    [categoryKey]
            ) {

                paperDatabase
                    .mathematics
                    [categoryKey] =
                        {};

            }


            if (
                !paperDatabase
                    .mathematics
                    [categoryKey]
                    [year]
            ) {

                paperDatabase
                    .mathematics
                    [categoryKey]
                    [year] =
                        {};

            }


            if (
                !paperDatabase
                    .mathematics
                    [categoryKey]
                    [year]
                    [folder]
            ) {

                paperDatabase
                    .mathematics
                    [categoryKey]
                    [year]
                    [folder] = {

                        sessionCode:
                            parsed
                                .sessionCode,

                        papers: {}

                    };

            }


            addPaper(
                paperDatabase
                    .mathematics
                    [categoryKey]
                    [year]
                    [folder],

                parsed,

                file.path
            );

        }


        /* ---------------- OTHER SUBJECTS ---------------- */

        else {

            if (
                !paperDatabase[
                    subjectKey
                ]
            ) {

                paperDatabase[
                    subjectKey
                ] = {};

            }


            if (
                !paperDatabase[
                    subjectKey
                ][year]
            ) {

                paperDatabase[
                    subjectKey
                ][year] = {};

            }


            if (
                !paperDatabase[
                    subjectKey
                ][year][folder]
            ) {

                paperDatabase[
                    subjectKey
                ][year][folder] = {

                    sessionCode:
                        parsed
                            .sessionCode,

                    papers: {}

                };

            }


            addPaper(
                paperDatabase[
                    subjectKey
                ][year][folder],

                parsed,

                file.path
            );

        }

    }

}


/* ============================================================
   ADD PAPER
   ============================================================ */

function addPaper(
    session,
    parsed,
    path
) {

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

            questionFilename:
                null,

            markSchemeFilename:
                null

        };

    }


    const paper =
        session.papers[
            parsed.paper
        ];


    if (
        parsed.type ===
        "qp"
    ) {

        paper.question =
            path;

        paper.questionFilename =
            parsed.filename;

    }


    if (
        parsed.type ===
        "ms"
    ) {

        paper.markScheme =
            path;

        paper.markSchemeFilename =
            parsed.filename;

    }


    if (
        parsed.type ===
        "er"
    ) {

        paper.examinerReport =
            path;

    }


    if (
        parsed.type ===
        "in"
    ) {

        paper.insert =
            path;

    }

}


/* ============================================================
   SESSION HELPERS
   ============================================================ */

function sessionName(
    sessionCode
) {

    const code =
        sessionCode.toLowerCase();

    const type =
        code[0];

    const year =
        `20${code.slice(1)}`;


    if (type === "s") {
        return `May / June ${year}`;
    }

    if (type === "w") {
        return `October / November ${year}`;
    }

    if (type === "m") {
        return `March ${year}`;
    }

    return code.toUpperCase();

}


function sessionSlug(
    sessionCode
) {

    const type =
        sessionCode[0]
            .toLowerCase();


    if (type === "s") {
        return "may-june";
    }

    if (type === "w") {
        return "october-november";
    }

    if (type === "m") {
        return "march";
    }

    return sessionCode
        .toLowerCase();

}


function slugToSessionCode(
    slug,
    year
) {

    if (
        slug ===
        "may-june"
    ) {
        return `s${String(year).slice(-2)}`;
    }


    if (
        slug ===
        "october-november"
    ) {
        return `w${String(year).slice(-2)}`;
    }


    if (
        slug ===
        "march"
    ) {
        return `m${String(year).slice(-2)}`;
    }


    return slug;

}


function getPaperCode(
    paper
) {

    if (
        paper.questionFilename
    ) {

        return paper.questionFilename
            .replace(
                /\.pdf$/i,
                ""
            );

    }


    if (
        paper.markSchemeFilename
    ) {

        return paper.markSchemeFilename
            .replace(
                /\.pdf$/i,
                ""
            );

    }


    return `Paper ${paper.paper}`;

}


/* ============================================================
   NAVIGATION
   ============================================================ */

function cleanPath(
    path
) {

    let result =
        path;


    if (
        !result.startsWith(
            "/"
        )
    ) {

        result =
            "/" + result;

    }


    return result
        .replace(
            /\/+/g,
            "/"
        );

}


function navigate(
    path
) {

    const clean =
        cleanPath(
            path
        );


    history.pushState(
        {},
        "",
        clean
    );


    renderRoute();

}


function navigateHome(
    event
) {

    event.preventDefault();

    navigate(
        SITE_BASE
    );

}


window.addEventListener(
    "popstate",
    renderRoute
);


/* ============================================================
   ROUTE PARSER
   ============================================================ */

function getRoute() {

    let path =
        window.location.pathname;


    const base =
        SITE_BASE
            .replace(
                /\/$/,
                ""
            );


    if (
        path.startsWith(
            base
        )
    ) {

        path =
            path.slice(
                base.length
            );

    }


    path =
        path.replace(
            /^\/+|\/+$/g,
            ""
        );


    if (!path) {

        return {
            type:
                "home"
        };

    }


    const parts =
        path.split("/");


    if (
        parts[0] ===
        "mathematics"
    ) {

        if (
            parts.length === 1
        ) {

            return {
                type:
                    "subject",

                subject:
                    "mathematics"

            };

        }


        if (
            parts.length === 2
        ) {

            return {
                type:
                    "category",

                subject:
                    "mathematics",

                category:
                    parts[1]

            };

        }


        if (
            parts.length === 3
        ) {

            return {
                type:
                    "year",

                subject:
                    "mathematics",

                category:
                    parts[1],

                year:
                    parts[2]

            };

        }


        if (
            parts.length === 4
        ) {

            return {
                type:
                    "session",

                subject:
                    "mathematics",

                category:
                    parts[1],

                year:
                    parts[2],

                session:
                    parts[3]

            };

        }

    }


    const subject =
        parts[0];


    if (
        subjects[subject]
    ) {

        if (
            parts.length === 1
        ) {

            return {
                type:
                    "subject",

                subject:
                    subject

            };

        }


        if (
            parts.length === 2
        ) {

            return {
                type:
                    "year",

                subject:
                    subject,

                year:
                    parts[1]

            };

        }


        if (
            parts.length === 3
        ) {

            return {
                type:
                    "session",

                subject:
                    subject,

                year:
                    parts[1],

                session:
                    parts[2]

            };

        }

    }


    return {
        type:
            "not-found"
    };

}


/* ============================================================
   PAGE HELPERS
   ============================================================ */

function backButton(
    path,
    text
) {

    return `

        <button
            class="back-btn"
            onclick="
                navigate('${path}')
            "
        >
            ← ${text}
        </button>

    `;

}


function pageHeader(
    backPath,
    backText,
    title,
    subtitle
) {

    return `

        <div
            class="page-header"
        >

            ${
                backPath !== null

                    ? backButton(
                        backPath,
                        backText
                    )

                    : ""
            }


            <h1>
                ${title}
            </h1>


            ${
                subtitle
                    ? `
                        <p>
                            ${subtitle}
                        </p>
                    `
                    : ""
            }

        </div>

    `;

}


/* ============================================================
   HOME
   ============================================================ */

function renderHome() {

    const page =
        document.getElementById(
            "page"
        );


    page.innerHTML = `

        <section class="hero">

            <h1>
                Find your
                <span>
                    past papers.
                </span>
            </h1>


            <p>
                A simple, modern place to find
                past papers and mark schemes.
            </p>


            <div class="version">
                Version Alpha 0.0.04
            </div>

        </section>


        <div class="search-wrapper">

            <div class="search-box">

                <div class="search-icon">
                    🔍
                </div>


                <input
                    id="subjectSearch"
                    type="text"
                    placeholder="Search subjects..."
                >

            </div>

        </div>


        <div
            class="section-title"
        >

            <h2>
                Subjects
            </h2>


            <p>
                Choose a subject to browse
                past papers.
            </p>

        </div>


        <div
            class="subject-grid"
            id="subjectGrid"
        >

            ${renderSubjectCards()}

        </div>

    `;


    document
        .getElementById(
            "subjectSearch"
        )
        .addEventListener(
            "input",
            event => {

                document
                    .getElementById(
                        "subjectGrid"
                    )
                    .innerHTML =
                        renderSubjectCards(
                            event.target.value
                        );

            }
        );

}


/* ============================================================
   SUBJECT CARDS
   ============================================================ */

function renderSubjectCards(
    filter = ""
) {

    const query =
        filter
            .toLowerCase()
            .trim();


    return Object.entries(
        subjects
    )
        .filter(
            ([key, subject]) =>
                subject.name
                    .toLowerCase()
                    .includes(
                        query
                    ) ||
                subject.code
                    .includes(
                        query
                    )
        )
        .map(
            ([key, subject]) => `

                <div
                    class="subject-card"
                    onclick="
                        navigate(
                            '${SITE_BASE}${key}/'
                        )
                    "
                >

                    <div
                        class="subject-top"
                    >

                        <div
                            class="subject-icon"
                        >
                            ${subject.icon}
                        </div>


                        <div
                            class="arrow"
                        >
                            →
                        </div>

                    </div>


                    <h3>
                        ${subject.name}
                    </h3>


                    <div
                        class="subject-code"
                    >
                        Cambridge
                        ${subject.code}
                    </div>


                    <div
                        class="subject-description"
                    >
                        ${subject.description}
                    </div>

                </div>

            `
        )
        .join("");

}


/* ============================================================
   SUBJECT PAGE
   ============================================================ */

function renderSubject(
    subjectKey
) {

    const subject =
        subjects[
            subjectKey
        ];


    if (
        !subject
    ) {

        renderNotFound();

        return;

    }


    if (
        subjectKey ===
        "mathematics"
    ) {

        renderMathCategories();

        return;

    }


    const years =
        Object.keys(
            paperDatabase[
                subjectKey
            ] || {}
        )
            .sort(
                (a, b) =>
                    Number(b) -
                    Number(a)
            );


    const page =
        document.getElementById(
            "page"
        );


    page.innerHTML = `

        ${
            pageHeader(
                SITE_BASE,
                "Back to subjects",
                `${subject.name} ${subject.code}`,
                subject.description
            )
        }


        ${
            years.length === 0

                ? `
                    <div class="empty">
                        No papers have been added yet.
                    </div>
                `

                : `

                    <div
                        class="filters"
                    >

                        ${years.map(
                            year => `

                                <button
                                    class="filter-btn"
                                    onclick="
                                        navigate(
                                            '${SITE_BASE}${subjectKey}/${year}/'
                                        )
                                    "
                                >
                                    ${year}
                                </button>

                            `
                        ).join("")}

                    </div>

                `
        }

    `;

}


/* ============================================================
   MATHEMATICS CATEGORY PAGE
   ============================================================ */

function renderMathCategories() {

    const page =
        document.getElementById(
            "page"
        );


    page.innerHTML = `

        ${
            pageHeader(
                SITE_BASE,
                "Back to subjects",
                "Mathematics 9709",
                "Choose a Mathematics component."
            )
        }


        <div
            class="category-grid"
        >

            ${
                Object.entries(
                    mathematicsCategories
                )
                .map(
                    ([key, category]) => `

                        <div
                            class="category-card"
                            onclick="
                                navigate(
                                    '${SITE_BASE}mathematics/${key}/'
                                )
                            "
                        >

                            <div
                                class="category-icon"
                            >
                                ${category.icon}
                            </div>


                            <h3>
                                ${category.name}
                            </h3>


                            <p>
                                ${category.description}
                            </p>

                        </div>

                    `
                )
                .join("")
            }

        </div>

    `;

}


/* ============================================================
   CATEGORY PAGE
   ============================================================ */

function renderCategory(
    categoryKey
) {

    const data =
        paperDatabase
            .mathematics
            ?.[categoryKey] ||
        {};


    const category =
        mathematicsCategories[
            categoryKey
        ];


    if (
        !category
    ) {

        renderNotFound();

        return;

    }


    const years =
        Object.keys(data)
            .sort(
                (a, b) =>
                    Number(b) -
                    Number(a)
            );


    const page =
        document.getElementById(
            "page"
        );


    page.innerHTML = `

        ${
            pageHeader(
                `${SITE_BASE}mathematics/`,
                "Back to Mathematics",
                category.name,
                "Mathematics 9709"
            )
        }


        <div
            class="filters"
        >

            ${
                years.length

                    ? years.map(
                        year => `

                            <button
                                class="filter-btn"
                                onclick="
                                    navigate(
                                        '${SITE_BASE}mathematics/${categoryKey}/${year}/'
                                    )
                                "
                            >
                                ${year}
                            </button>

                        `
                    ).join("")

                    : ""
            }

        </div>


        ${
            years.length === 0

                ? `
                    <div class="empty">
                        No papers have been added yet.
                    </div>
                `

                : ""
        }

    `;

}


/* ============================================================
   YEAR PAGE
   ============================================================ */

function renderYear(
    subjectKey,
    categoryKey,
    year
) {

    let data;


    if (
        subjectKey ===
        "mathematics"
    ) {

        data =
            paperDatabase
                .mathematics
                ?.[categoryKey]
                ?.[year];

    }

    else {

        data =
            paperDatabase
                ?.[subjectKey]
                ?.[year];

    }


    const subject =
        subjects[
            subjectKey
        ];


    if (
        !data
    ) {

        renderNotFound();

        return;

    }


    const sessions =
        Object.entries(
            data
        );


    let backPath;
    let backText;
    let title;


    if (
        subjectKey ===
        "mathematics"
    ) {

        backPath =
            `${SITE_BASE}mathematics/${categoryKey}/`;

        backText =
            "Back to category";

        title =
            `${subject.name} ${year}`;

    }

    else {

        backPath =
            `${SITE_BASE}${subjectKey}/`;

        backText =
            `Back to ${subject.name}`;

        title =
            `${subject.name} ${year}`;

    }


    const page =
        document.getElementById(
            "page"
        );


    page.innerHTML = `

        ${
            pageHeader(
                backPath,
                backText,
                title,
                subject.code
            )
        }


        <div
            class="session-list"
        >

            ${
                sessions.length

                    ? sessions
                        .map(
                            ([folder, session]) => {

                                const slug =
                                    sessionSlug(
                                        session.sessionCode
                                    );


                                const route =
                                    subjectKey ===
                                    "mathematics"

                                        ? `${SITE_BASE}mathematics/${categoryKey}/${year}/${slug}/`

                                        : `${SITE_BASE}${subjectKey}/${year}/${slug}/`;


                                return `

                                    <div
                                        class="session-card"
                                        onclick="
                                            navigate(
                                                '${route}'
                                            )
                                        "
                                    >

                                        <div
                                            class="session-left"
                                        >

                                            <div
                                                class="folder-icon"
                                            >
                                                📁
                                            </div>


                                            <div>

                                                <div
                                                    class="session-name"
                                                >
                                                    ${sessionName(
                                                        session.sessionCode
                                                    )}
                                                </div>


                                                <div
                                                    class="session-count"
                                                >
                                                    ${
                                                        Object.keys(
                                                            session.papers
                                                        ).length
                                                    }

                                                    paper${
                                                        Object.keys(
                                                            session.papers
                                                        ).length !== 1
                                                            ? "s"
                                                            : ""
                                                    }
                                                </div>

                                            </div>

                                        </div>


                                        <div
                                            class="session-arrow"
                                        >
                                            →
                                        </div>

                                    </div>

                                `;

                            }
                        )
                        .join("")

                    : `
                        <div class="empty">
                            No exam sessions have
                            been added yet.
                        </div>
                    `
            }

        </div>

    `;

}


/* ============================================================
   SESSION PAGE
   ============================================================ */

function renderSession(
    subjectKey,
    categoryKey,
    year,
    sessionSlugValue
) {

    let data;


    if (
        subjectKey ===
        "mathematics"
    ) {

        data =
            paperDatabase
                .mathematics
                ?.[categoryKey]
                ?.[year];

    }

    else {

        data =
            paperDatabase
                ?.[subjectKey]
                ?.[year];

    }


    if (
        !data
    ) {

        renderNotFound();

        return;

    }


    const desiredCode =
        slugToSessionCode(
            sessionSlugValue,
            year
        );


    let session = null;


    for (
        const value
        of Object.values(data)
    ) {

        if (
            value.sessionCode
                .toLowerCase() ===
            desiredCode
                .toLowerCase()
        ) {

            session =
                value;

            break;

        }

    }


    if (!session) {

        renderNotFound();

        return;

    }


    const subject =
        subjects[
            subjectKey
        ];


    const title =
        sessionName(
            session.sessionCode
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
                            numeric:
                                true
                        }
                    )
            );


    let backPath;


    if (
        subjectKey ===
        "mathematics"
    ) {

        backPath =
            `${SITE_BASE}mathematics/${categoryKey}/${year}/`;

    }

    else {

        backPath =
            `${SITE_BASE}${subjectKey}/${year}/`;

    }


    let categoryText =
        "";


    if (
        subjectKey ===
        "mathematics"
    ) {

        categoryText =
            categoryKey === "pure"

                ? "Pure"

                : categoryKey ===
                    "statsmech"

                    ? "Statistics / Mechanics"

                    : categoryKey;

    }


    const page =
        document.getElementById(
            "page"
        );


    page.innerHTML = `

        ${
            pageHeader(
                backPath,
                "Back to year",
                title,
                `${subject.name} ${subject.code}${categoryText ? ` · ${categoryText}` : ""}`
            )
        }


        <div
            class="paper-list"
        >

            ${
                papers.length

                    ? papers
                        .map(
                            paper =>
                                renderPaper(
                                    paper
                                )
                        )
                        .join("")

                    : `
                        <div class="empty">
                            No papers found.
                        </div>
                    `
            }

        </div>

    `;

}


/* ============================================================
   PAPER CARD
   ============================================================ */

function renderPaper(
    paper
) {

    const paperCode =
        getPaperCode(
            paper
        );


    return `

        <div
            class="paper-card"
        >

            <div
                class="paper-info"
            >

                <h3>
                    Paper ${paper.paper}
                </h3>


                <div
                    class="paper-code"
                >
                    ${paperCode}
                </div>

            </div>


            <div
                class="paper-actions"
            >

                ${
                    paper.question

                        ? `

                            <button
                                class="
                                    paper-btn
                                    primary
                                "
                                onclick='openPDF(
                                    "${paper.question}"
                                )'
                            >
                                📄 Question Paper
                            </button>

                        `

                        : ""
                }


                ${
                    paper.markScheme

                        ? `

                            <button
                                class="
                                    paper-btn
                                "
                                onclick='openPDF(
                                    "${paper.markScheme}"
                                )'
                            >
                                ✅ Mark Scheme
                            </button>

                        `

                        : ""
                }


                ${
                    paper.examinerReport

                        ? `

                            <button
                                class="
                                    paper-btn
                                "
                                onclick='openPDF(
                                    "${paper.examinerReport}"
                                )'
                            >
                                📋 Examiner Report
                            </button>

                        `

                        : ""
                }


                ${
                    paper.insert

                        ? `

                            <button
                                class="
                                    paper-btn
                                "
                                onclick='openPDF(
                                    "${paper.insert}"
                                )'
                            >
                                📎 Insert
                            </button>

                        `

                        : ""
                }

            </div>

        </div>

    `;

}


/* ============================================================
   PDF
   ============================================================ */

function openPDF(
    path
) {

    const url =
        `${RAW_BASE}/${path
            .split("/")
            .map(
                part =>
                    encodeURIComponent(
                        part
                    )
            )
            .join("/")
        }`;


    window.open(
        url,
        "_blank"
    );

}


/* ============================================================
   NOT FOUND
   ============================================================ */

function renderNotFound() {

    const page =
        document.getElementById(
            "page"
        );


    page.innerHTML = `

        <div class="empty">

            <h2>
                Page not found
            </h2>

            <br>

            <button
                class="filter-btn active"
                onclick="
                    navigate(
                        '${SITE_BASE}'
                    )
                "
            >
                Return home
            </button>

        </div>

    `;

}


/* ============================================================
   ROUTER
   ============================================================ */

async function renderRoute() {

    const route =
        getRoute();


    const page =
        document.getElementById(
            "page"
        );


    if (!page) {
        return;
    }


    if (
        route.type !==
        "home"
    ) {

        page.innerHTML = `

            <div class="loading">

                <div class="spinner"></div>

                Loading papers...

            </div>

        `;


        try {

            await loadRepository();

        }

        catch (error) {

            page.innerHTML = `

                <div
                    class="error-message"
                >

                    <strong>
                        Could not load papers.
                    </strong>

                    ${error.message}

                </div>

            `;

            return;

        }

    }


    switch (
        route.type
    ) {

        case "home":

            renderHome();

            break;


        case "subject":

            renderSubject(
                route.subject
            );

            break;


        case "category":

            renderCategory(
                route.category
            );

            break;


        case "year":

            renderYear(
                route.subject,
                route.category,
                route.year
            );

            break;


        case "session":

            renderSession(
                route.subject,
                route.category,
                route.year,
                route.session
            );

            break;


        default:

            renderNotFound();

            break;

    }

}


/* ============================================================
   START
   ============================================================ */

injectStyles();

createShell();

renderRoute();
