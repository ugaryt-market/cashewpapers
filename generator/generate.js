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
    Version Alpha 0.1.96
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
    statsmech: "stats.svg",
    written: "written.svg",
    practical: "practical.svg"
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
    "stats.svg",
    "written.svg",
    "practical.svg",
    "calendar.svg",
    "stackofbooks.svg"
];

/*
    ------------------------------------------------------------
    SUBJECT CATEGORIES

    Some subjects have an extra "component" level between the
    subject and the year (e.g. Mathematics splits into Pure and
    Statistics/Mechanics; the sciences split into Written and
    Practical). Any subject key listed here gets that extra
    level, using exactly the same algorithm.

    Repository layout for a categorized subject:

        papers/<subjectKey>/<categoryKey>/<year>/<session>/file.pdf

    Each entry is: [categoryKey, displayName, fallbackIcon, breadcrumbLabel]
    ------------------------------------------------------------
*/

const SUBJECT_CATEGORIES = {

    mathematics: [
        ["pure", "Pure", "📐", "pure"],
        ["statsmech", "Statistics / Mechanics", "📊", "stats/mech"]
    ],

    physics: [
        ["written", "Written", "📝", "written"],
        ["practical", "Practical", "🧪", "practical"]
    ],

    chemistry: [
        ["written", "Written", "📝", "written"],
        ["practical", "Practical", "🧪", "practical"]
    ],

    biology: [
        ["written", "Written", "📝", "written"],
        ["practical", "Practical", "🧪", "practical"]
    ]

};

/*
    Short label used for the subject's own breadcrumb crumb.
    Falls back to the lowercased subject name when not listed.
*/
const SUBJECT_SHORT_LABELS = {
    mathematics: "math"
};


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
    return SUBJECT_ICON_FILES[normalizeSubjectKey(subjectKey)] || null;
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

        fs.copyFileSync(source, path.join(targetDir, filename));
    }
}


/* ============================================================
   SUBJECT CATEGORY HELPERS
   ============================================================ */

function hasCategories(subjectKey) {
    return Object.prototype.hasOwnProperty.call(SUBJECT_CATEGORIES, subjectKey);
}

function getCategories(subjectKey) {
    return SUBJECT_CATEGORIES[subjectKey] || null;
}

function getCategoryInfo(subjectKey, categoryKey) {

    const categories = getCategories(subjectKey);

    if (!categories) {
        return null;
    }

    return categories.find(entry => entry[0] === categoryKey) || null;
}

function subjectShortLabel(subjectKey, subject) {
    return SUBJECT_SHORT_LABELS[subjectKey] || subject.name.toLowerCase();
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

function shortSessionName(code) {

    const type = code[0].toLowerCase();

    if (type === "m") {
        return "feb/march";
    }

    if (type === "w") {
        return "oct/nov";
    }

    if (type === "s") {
        return "may/june";
    }

    return code.toLowerCase();
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

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {

            results.push(...scanFiles(fullPath, base));

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

        const subjectPath = path.join(PAPERS_DIR, subjectKey);

        if (!fs.existsSync(subjectPath)) {
            continue;
        }

        database[subjectKey] = {
            subject,
            years: {}
        };

        const subjectFiles = scanFiles(subjectPath);

        for (const file of subjectFiles) {

            if (!file.relative.toLowerCase().endsWith(".pdf")) {
                continue;
            }

            const parts = file.relative.split(path.sep);

            let year;
            let sessionFolder;
            let filename;

            /*
                Categorized subjects (mathematics, sciences, etc):

                <subject>/
                <category>/
                <year>/
                <session>/
                file.pdf
            */

            if (hasCategories(subjectKey)) {

                if (parts.length < 4) {
                    continue;
                }

                year = parts[1];
                sessionFolder = parts[2];
                filename = parts[3];

            }

            /*
                Other subjects:

                <subject>/
                <year>/
                <session>/
                file.pdf
            */

            else {

                if (parts.length < 3) {
                    continue;
                }

                year = parts[0];
                sessionFolder = parts[1];
                filename = parts[2];

            }

            const parsed = parsePaperFilename(filename);

            if (!parsed) {
                continue;
            }

            if (parsed.code !== subject.code) {
                continue;
            }

            if (!database[subjectKey].years[year]) {
                database[subjectKey].years[year] = {};
            }

            const sessionCode = parsed.sessionCode;

            if (!database[subjectKey].years[year][sessionFolder]) {

                database[subjectKey].years[year][sessionFolder] = {
                    sessionCode,
                    papers: {}
                };

            }

            const session = database[subjectKey].years[year][sessionFolder];

            if (!session.papers[parsed.paper]) {

                session.papers[parsed.paper] = {
                    paper: parsed.paper,
                    question: null,
                    markScheme: null,
                    examinerReport: null,
                    insert: null
                };

            }

            const paper = session.papers[parsed.paper];

            const publicPath = path
                .join("papers", subjectKey, file.relative)
                .split(path.sep)
                .join("/");

            if (parsed.type === "qp") {
                paper.question = publicPath;
                paper.code = filename.replace(/\.pdf$/i, "");
            }

            if (parsed.type === "ms") {
                paper.markScheme = publicPath;
            }

            if (parsed.type === "er") {
                paper.examinerReport = publicPath;
            }

            if (parsed.type === "in") {
                paper.insert = publicPath;
            }

        }
    }

    return database;
}


/* ============================================================
   PAPER SEARCH INDEX
   ============================================================ */

let PAPER_SEARCH_INDEX = {};

function buildPaperSearchIndex(database) {

    const index = {};

    for (const [subjectKey, data] of Object.entries(database)) {

        for (const [year, sessions] of Object.entries(data.years || {})) {

            for (const session of Object.values(sessions || {})) {

                const slug = sessionSlug(session.sessionCode);

                for (const paper of Object.values(session.papers || {})) {

                    if (!paper.code) {
                        continue;
                    }

                    /*
                       Categorized subjects are handled separately because
                       their repository contains an extra category level.
                    */
                    if (hasCategories(subjectKey)) {
                        continue;
                    }

                    index[paper.code.toLowerCase()] = {
                        path: `${subjectKey}/${year}/${slug}/#paper-${paper.code}`,
                        code: paper.code,
                        subject: data.subject.name,
                        paper: paper.paper,
                        questionPath: paper.question || ""
                    };

                }

            }

        }

    }

    return index;
}

/*
    Populates PAPER_SEARCH_INDEX for every category of a categorized
    subject (mathematics' pure/statsmech, the sciences' written/practical,
    or any future entry added to SUBJECT_CATEGORIES). Exactly the same
    algorithm as the original mathematics-only version, just parameterized
    on subjectKey.
*/
function addCategorizedSearchIndex(subjectKey, subjectName) {

    const categories = getCategories(subjectKey);

    if (!categories) {
        return;
    }

    for (const [categoryKey] of categories) {

        const categoryPath = path.join(PAPERS_DIR, subjectKey, categoryKey);

        for (const file of scanFiles(categoryPath)) {

            if (!file.relative.toLowerCase().endsWith(".pdf")) {
                continue;
            }

            const parts = file.relative.split(path.sep);

            if (parts.length < 3) {
                continue;
            }

            const year = parts[0];
            const filename = parts[2];

            const parsed = parsePaperFilename(filename);

            if (!parsed || parsed.type !== "qp") {
                continue;
            }

            const code = filename.replace(/\.pdf$/i, "");

            PAPER_SEARCH_INDEX[code.toLowerCase()] = {
                path: `${subjectKey}/${categoryKey}/${year}/${sessionSlug(parsed.sessionCode)}/#paper-${code}`,
                code,
                subject: subjectName || subjectKey,
                paper: parsed.paper,
                questionPath: ""
            };

        }

    }

}

/*
   Every generated HTML page loads one external search script.
   This avoids embedding the search system into the page's
   executable inline JavaScript.
*/
function writeSearchScript() {

    const searchScript = `

let cashewPaperSearchIndex =
    ${JSON.stringify(PAPER_SEARCH_INDEX)};

function normalizePaperSearchCode(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\\\\s+/g, "");

}

function highlightPaper(code) {

    const normalized = normalizePaperSearchCode(code);

    const target = document.querySelector(
        "[data-paper-code=\\"" + normalized + "\\"]"
    );

    if (!target) {
        return false;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });

    target.classList.remove("search-highlight");

    void target.offsetWidth;

    target.classList.add("search-highlight");

    window.setTimeout(() => {
        target.classList.remove("search-highlight");
    }, 1200);

    return true;

}

function runPaperSearch(value) {

    const normalized = normalizePaperSearchCode(value);

    if (!normalized) {
        return;
    }

    const result = cashewPaperSearchIndex[normalized];

    if (!result) {

        const input = document.getElementById("paperSearchInput");

        if (input) {

            input.classList.remove("paper-search-error");

            void input.offsetWidth;

            input.classList.add("paper-search-error");

            input.focus();

        }

        console.warn("cashewpapers: paper not found:", normalized);

        return;

    }

    const prefix = document.body.dataset.searchPrefix || "";

    const currentPath = window.location.pathname;

    const targetPath = prefix + result.path.split("#")[0];

    if (currentPath.endsWith(result.path.split("#")[0])) {

        if (highlightPaper(result.code)) {
            return;
        }

    }

    window.location.assign(
        targetPath +
        "?search=" +
        encodeURIComponent(result.code) +
        "#paper-" +
        encodeURIComponent(result.code)
    );

}

function initializePaperSearch() {

    const form = document.getElementById("paperSearchForm");
    const input = document.getElementById("paperSearchInput");
    const button = document.getElementById("paperSearchButton");

    if (!form || !input || !button) {
        return;
    }

    function updateArrow() {
        form.classList.toggle("has-text", input.value.trim().length > 0);
    }

    input.addEventListener("input", updateArrow);

    input.addEventListener("keydown", event => {

        if (event.key === "Enter") {
            event.preventDefault();
            runPaperSearch(input.value);
        }

    });

    button.addEventListener("click", () => {
        runPaperSearch(input.value);
    });

    updateArrow();

}

window.runPaperSearch = runPaperSearch;
window.cashewPaperSearchIndex = cashewPaperSearchIndex;

document.addEventListener("DOMContentLoaded", initializePaperSearch);

function highlightSearchTargetAfterLoad() {

    const params = new URLSearchParams(window.location.search);
    const queryCode = params.get("search");
    const hash = window.location.hash;

    const hashCode =
        hash.indexOf("#paper-") === 0
            ? decodeURIComponent(hash.slice("#paper-".length))
            : "";

    const code = queryCode || hashCode;

    if (!code) {
        return;
    }

    /*
       Wait until the browser has laid out the paper cards.
       Two animation frames makes this reliable on GitHub Pages
       after navigation.
    */
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            highlightPaper(code);
        });
    });

}

window.addEventListener("load", highlightSearchTargetAfterLoad);

`;

    writeFile(path.join(DIST_DIR, "search.js"), searchScript);

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
    --shadow: 0 8px 25px rgba(0, 0, 0, 0.18);
}

/* ---------------- CUSTOM SCROLLBAR ---------------- */

html {
    scrollbar-width: thin;
    scrollbar-color: #646669 #2c2e31;
}

::-webkit-scrollbar {
    width: 9px;
    height: 9px;
}

::-webkit-scrollbar-track {
    background: #2c2e31;
}

::-webkit-scrollbar-thumb {
    background: #646669;
    border: 2px solid #2c2e31;
    border-radius: 999px;
}

::-webkit-scrollbar-thumb:hover {
    background: #737578;
}

::-webkit-scrollbar-corner {
    background: #2c2e31;
}

body {
    font-family: "Questrial", Arial, Helvetica, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    font-weight: 400;
    text-transform: lowercase;
}

.mobile-block-screen {
    display: none;
}

.mobile-block-screen-inner {
    width: min(520px, calc(100% - 40px));
    text-align: center;
}

.mobile-block-logo {
    width: 150px;
    height: auto;
    display: block;
    margin: 0 auto 28px;
}

.mobile-block-screen h1 {
    margin: 0;
    color: var(--text);
    font-size: clamp(32px, 8vw, 46px);
    font-weight: 400;
    letter-spacing: -1.5px;
}

.mobile-block-screen p {
    margin: 14px auto 0;
    max-width: 420px;
    color: var(--muted);
    font-size: 15px;
    line-height: 1.6;
}

body.mobile-device {
    overflow: hidden;
}

body.mobile-device > * {
    display: none !important;
}

body.mobile-device > .mobile-block-screen {
    display: flex !important;
    min-height: 100dvh;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--bg);
    color: var(--text);
}

a {
    color: inherit;
    text-decoration: none;
}

button,
input {
    font: inherit;
    text-transform: lowercase;
}

/* ---------------- PAPER SEARCH ---------------- */

nav .nav-inner {
    position: relative;
}

.paper-search {
    width: 100%;
    justify-self: center;
    position: relative;
    display: block;
}

.paper-search-field {
    position: relative;
    width: 100%;
}

.paper-search input {
    width: 100%;
    height: 38px;
    padding: 0 40px 0 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: #3a3c3f;
    color: var(--text);
    outline: none;
    font-size: 13px;
}

.paper-search input::placeholder {
    color: var(--muted);
}

.paper-search input:focus {
    border-color: var(--subdued);
    box-shadow: 0 0 0 2px rgba(147, 107, 60, 0.16);
}

.paper-search button {
    position: absolute;
    top: 50%;
    right: 5px;
    width: 28px;
    height: 28px;
    transform: translateY(-50%);
    border: none;
    border-radius: 50%;
    background: var(--primary);
    color: #333438;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 0;
}

.paper-search.has-text button {
    display: flex;
}

.paper-search:has(input:not(:placeholder-shown)) button {
    display: flex;
}

.paper-search button:hover {
    background: #ffa86c;
}

.paper-search-error {
    animation: paperSearchError 0.28s ease;
}

@keyframes paperSearchError {

    0%,
    100% {
        transform: translateX(0);
    }

    25% {
        transform: translateX(-4px);
    }

    75% {
        transform: translateX(4px);
    }
}

.paper-card.search-highlight {
    border-color: var(--primary);
    box-shadow:
        0 0 0 2px rgba(255, 150, 79, 0.24),
        0 12px 30px rgba(255, 150, 79, 0.12);
}

@media (max-width: 900px) {

    .nav-inner {
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .nav-inner .paper-search {
        grid-column: 1;
        grid-row: 2;
    }

    .nav-inner .nav-actions {
        grid-column: 1;
        grid-row: 3;
    }

    .paper-search {
        width: min(100%, 460px);
    }

    .nav-actions {
        justify-self: end;
    }

}

nav {
    background: var(--card);
    border-bottom: 1px solid var(--border);
}

.nav-inner {
    max-width: 1200px;
    margin: auto;
    padding: 18px 24px;
    display: grid;
    grid-template-columns: 1fr minmax(280px, 460px) 1fr;
    align-items: center;
    gap: 18px;
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.nav-inner .logo {
    justify-self: start;
}

.nav-inner .paper-search {
    grid-column: 2;
}

.nav-inner .nav-actions {
    justify-self: end;
    grid-column: 3;
}

.nav-account {
    color: white;
    background: var(--primary);
    padding: 9px 14px;
    border-radius: 9px;
    font-size: 14px;
    font-weight: 400;
}

.nav-account:hover {
    opacity: 0.9;
}

.nav-calendar-button {
    background: #3a3c3f;
    color: var(--text);
    border: 1px solid var(--border);
}

.nav-calendar-button:hover {
    background: #414346;
    opacity: 1;
    border-color: var(--subdued);
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
    width: 150px;
    height: 38px;
    display: block;
    object-fit: cover;
    object-position: center;
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
    font-weight: 400;
    color: var(--text);
    text-align: center;
    white-space: normal;
    line-height: 1.15;
}

.hero h1 span {
    color: var(--text);
    font-weight: 400;
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
    color: var(--subdued);
    font-weight: 400;
}

.page-header {
    margin-bottom: 30px;
}

.back {
    color: var(--primary);
    font-weight: 400;
    display: inline-block;
    margin-bottom: 18px;
}

.breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 9px;
    width: 100%;
    margin: 0 0 20px;
    font-size: 17px;
    line-height: 1.4;
    background: transparent;
    border: none;
}

.breadcrumb-item {
    color: var(--muted);
    transition: color 0.15s ease;
}

.breadcrumb-item:hover {
    color: var(--text);
}

.breadcrumb-item.current {
    color: var(--text);
    cursor: default;
}

.breadcrumb-arrow {
    color: var(--muted);
    font-size: 17px;
    user-select: none;
}

.page-header h1 {
    font-size: 36px;
    letter-spacing: -1px;
    color: var(--primary);
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
    background: var(--card);
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
    border-color: var(--subdued);
}

.subject-card h2,
.category-card h2 {
    margin-top: 18px;
    color: var(--primary);
}

.card-icon {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    background: #3a3c3f;
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 23px;
}

.card-icon-image {
    width: 34px;
    height: 34px;
    object-fit: cover;
    object-position: center;
    display: block;
}

.card-description {
    color: var(--muted);
    margin-top: 8px;
    line-height: 1.5;
}

/* ---------------- OVERVIEW PROGRESS ---------------- */

.progress-overview-card {
    overflow: visible;
}

.progress-overview-content {
    width: min(100%, 420px);
    min-width: 0;
}

.progress-overview-title {
    font-size: 29px;
    font-weight: 400;
    text-align: center;
    line-height: 1.15;
}

.progress-overview-bar {
    width: 100%;
    height: 7px;
    margin-top: 14px;
    border-radius: 999px;
    overflow: hidden;
    background: #3a3c3f;
    border: 1px solid var(--border);
}

.progress-overview-fill {
    width: 0%;
    height: 100%;
    border-radius: inherit;
    background: var(--primary);
    transition: width 0.25s ease;
}

.account-data-pending {
    visibility: hidden;
}

.paper-progress-loading {
    position: relative;
    min-width: 170px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: 14px;
    white-space: nowrap;
}

.paper-progress-loading::before {
    content: "loading attempts...";
}

.paper-progress-loading.ready {
    display: none;
}

.account-data-placeholder {
    display: inline-block;
    min-width: 96px;
    height: 12px;
    border-radius: 999px;
    background: #3a3c3f;
    vertical-align: middle;
}

.account-progress-pending {
    opacity: 0.65;
    pointer-events: none;
}

.progress-overview-label {
    margin-top: 7px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.3;
    text-align: center;
}

.year-session-card .progress-overview-content {
    width: min(100%, 360px);
}

.year-session-card .year-session-name {
    font-size: 17px;
    line-height: 1.4;
}

.year-session-card .progress-overview-bar {
    margin-top: 8px;
    height: 6px;
}

.year-session-card .progress-overview-label {
    margin-top: 5px;
    text-align: left;
}


/* ---------------- YEAR CARDS ---------------- */

.year-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

.year-link {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: var(--shadow);
    transition: 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 104px;
    font-family: "Questrial", Arial, Helvetica, sans-serif;
    font-size: 29px;
    font-weight: 400;
    text-align: center;
}

.year-link:hover {
    transform: translateY(-3px);
    border-color: var(--subdued);
    box-shadow: 0 14px 35px rgba(30, 35, 60, 0.12);
}

/* ---------------- YEAR SESSION CARDS ---------------- */

.year-session-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

.year-session-card {
    background: var(--card);
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
    background: #3a3c3f;
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 25px;
    flex-shrink: 0;
}

.year-session-name {
    font-size: 17px;
    font-weight: 400;
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

/* ---------------- ALL PAPERS PAGE ---------------- */

.all-papers-list {
    display:
        grid;

    gap:
        28px;
}

.all-papers-session-group {
    display:
        grid;

    gap:
        14px;
}

.all-papers-session-title {
    font-size:
        22px;

    font-weight:
        400;

    color:
        var(--text);

    text-transform:
        lowercase;
}


/* ---------------- SESSION / PAPER LISTS ---------------- */

.session-list,
.paper-list {
    display: grid;
    gap: 14px;
}

.session-card,
.paper-card {
    background: var(--card);
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
    background: #3a3c3f;
    border: 1px solid var(--border);
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

/*
   Attempt menus must sit above neighbouring paper cards.
   .paper-card:hover uses transform, which creates a stacking context.
   Raising the active card itself prevents later cards from painting
   over its attempt form/history.
*/
.paper-card:has(.attempt-form),
.paper-card:has(.attempt-history.open) {
    position: relative;
    z-index: 200;
}

.paper-card.group-break {
    margin-top: 18px;
}

.paper-code {
    font-family: "JetBrains Mono", monospace;
    color: var(--muted);
    font-size: 13px;
    margin-top: 7px;
    font-weight: 400;
}

.paper-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    position: relative;
}

.paper-button {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
    background: #3a3c3f;
    color: var(--text);
    cursor: pointer;
    position: relative;
    z-index: 1;
}

.paper-button.primary {
    background: var(--primary);
    color: white;
}

/* ---------------- PAPER SCHEDULE BUTTON ---------------- */

.paper-calendar-button {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: #3a3c3f;
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    cursor: pointer;
    flex-shrink: 0;
    text-decoration: none;
    transition: 0.15s ease;
}

.paper-calendar-button:hover {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    transform: translateY(-1px);
}

/* ---------------- PAPER PROGRESS ---------------- */

.paper-progress {
    position: relative;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
}

.paper-status {
    height: 42px;
    padding: 0 16px;
    border: 1px dashed #646669;
    border-radius: 999px;
    background: #2c2e31;
    color: var(--muted);
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    transition: 0.15s ease;
    flex-shrink: 0;
}

.paper-status:hover {
    transform: translateY(-1px);
    border-color: var(--muted);
    background: #3a3c3f;
}

.paper-status:disabled {
    cursor: wait;
}

.paper-status:disabled:hover {
    transform: none;
}

.paper-status.completed {
    background: #3a3127;
    border: 1px solid var(--subdued);
    color: var(--primary);
}

.paper-status.completed:hover {
    background: #40382e;
}

.paper-status.status-pop {
    animation: paperStatusPop 0.24s ease;
}

@keyframes paperStatusPop {

    0% {
        transform: scale(1);
    }

    45% {
        transform: scale(1.06);
    }

    100% {
        transform: scale(1);
    }
}

/*
   The attempt controls stay in the same row as the completion button.
   Expanded content is positioned out of flow, so the paper card keeps
   the exact same height.
*/
.paper-attempts {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
}

.attempt-button,
.attempt-summary {
    height: 42px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: #2c2e31;
    color: var(--text);
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    flex-shrink: 0;
    white-space: nowrap;
}

.attempt-button:hover,
.attempt-summary:hover {
    background: #3a3c3f;
}

.attempt-summary {
    color: var(--muted);
}

.attempt-history {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 300;

    width: 320px;
    max-width: min(320px, 84vw);
    max-height: 260px;
    overflow-y: auto;
    overflow-x: hidden;

    padding: 10px 12px;

    border: 1px solid var(--border);
    border-radius: 12px;

    background: #2c2e31;
    color: var(--text);

    font-size: 12px;
    line-height: 1.35;

    box-shadow:
        0 12px 30px rgba(0, 0, 0, 0.24);

    scrollbar-width: thin;
    scrollbar-color: #646669 #2c2e31;

    display: none;
}

.attempt-history.open {
    display: block;
}

.attempt-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 0;
}

.attempt-row + .attempt-row {
    border-top: 1px solid #46484b;
}

.attempt-row-text {
    min-width: 0;
    overflow-wrap: anywhere;
}

.attempt-remove {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}

.attempt-remove:hover {
    background: #3a3c3f;
    color: var(--text);
}

 .attempt-form {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 1000;
    pointer-events: auto;

    width: 320px;
    max-width: min(320px, 84vw);
    padding: 12px;

    border: 1px solid var(--border);
    border-radius: 12px;

    background: #2c2e31;

    box-shadow:
        0 12px 30px rgba(0, 0, 0, 0.24);

    display: flex;
    flex-direction: column;
    gap: 9px;
}

.attempt-form-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: var(--text);
    font-size: 13px;
}

.attempt-form-close {
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    font-size: 19px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.attempt-form-close:hover {
    background: #3a3c3f;
    color: var(--text);
}

.attempt-input {
    width: 100%;
    height: 40px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    color: var(--text);
    font-size: 14px;
    outline: none;
    accent-color: var(--primary);
}

.attempt-input::-webkit-inner-spin-button,
.attempt-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
}

.attempt-input {
    -moz-appearance: textfield;
}

.attempt-input:focus {
    border-color: var(--subdued);
}

.attempt-form-actions {
    display: flex;
    gap: 7px;
}

.attempt-save,
.attempt-cancel {
    height: 36px;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
}

.attempt-save {
    background: var(--primary);
    color: white;
}

.attempt-cancel {
    background: #3a3c3f;
    color: var(--text);
}

.paper-login-notice {
    margin-top: 1px;
    font-size: 13px;
    color: var(--muted);
}

.paper-login-notice a {
    color: var(--primary);
    font-weight: 400;
}


/* ---------------- SCHEDULER / CALENDAR ---------------- */

.calendar-scheduling-banner {
    background: #3a3127;
    border: 1px solid var(--subdued);
    color: var(--primary);
    padding: 14px 18px;
    border-radius: 12px;
    margin-bottom: 22px;
    font-size: 14px;
    line-height: 1.5;
}

.calendar-shell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 22px;
}

.calendar-nav-arrow {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--muted);
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: 0.15s ease;
}

.calendar-nav-arrow:hover {
    background: #3a3c3f;
    color: var(--text);
    border-color: var(--subdued);
}

.calendar-card {
    flex: 1;
    max-width: 900px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 28px;
    box-shadow: var(--shadow);
}

.calendar-month-title {
    text-align: center;
    font-size: 24px;
    margin-bottom: 20px;
    color: var(--primary);
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
}

.calendar-grid + .calendar-grid {
    margin-top: 8px;
}

.calendar-day-label {
    text-align: center;
    color: var(--muted);
    font-size: 12px;
    padding-bottom: 6px;
}

.calendar-cell {
    min-height: 96px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #2f3134;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    transition: 0.15s ease;
    overflow: hidden;
}

.calendar-cell:hover {
    border-color: var(--subdued);
    transform: translateY(-1px);
}

.calendar-cell.outside {
    opacity: 0.35;
}

.calendar-cell.today {
    border-color: var(--primary);
}

.calendar-date-num {
    font-size: 13px;
    color: var(--text);
}

.calendar-entry-pill {
    --calendar-entry-color: #3a3c3f;
    font-size: 11px;
    padding: 3px 6px;
    border-radius: 6px;
    background: var(--calendar-entry-color);
    color: var(--text);
    border: 1px solid transparent;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "JetBrains Mono", monospace;
    cursor: pointer;
    font-family: "JetBrains Mono", monospace;
    text-align: left;
    transition:
        background 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease,
        box-shadow 0.15s ease;
}

.calendar-entry-pill[data-calendar-color="orange"] {
    --calendar-entry-color: #8f4e25;
    color: #ffe4cf;
}

.calendar-entry-pill[data-calendar-color="blue"] {
    --calendar-entry-color: #34577c;
    color: #d9eaff;
}

.calendar-entry-pill[data-calendar-color="green"] {
    --calendar-entry-color: #35654d;
    color: #d7f5e5;
}

.calendar-entry-pill[data-calendar-color="purple"] {
    --calendar-entry-color: #5d467c;
    color: #eadfff;
}

.calendar-entry-pill[data-calendar-color="red"] {
    --calendar-entry-color: #7f3f43;
    color: #ffd9dc;
}

.calendar-entry-pill[data-calendar-color="yellow"] {
    --calendar-entry-color: #776027;
    color: #fff0bb;
}

.calendar-entry-pill:hover {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    transform: translateY(-1px);
    box-shadow:
        0 4px 12px rgba(255, 150, 79, 0.16);
}

.calendar-context-menu {
    position: fixed;
    display: none;
    width: 240px;
    max-width: calc(100vw - 20px);
    padding: 10px;
    background: #27292c;
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
    z-index: 900;
}

.calendar-context-menu.open {
    display: block;
}

.calendar-context-title {
    padding: 5px 7px 9px;
    color: var(--text);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
    border-bottom: 1px solid var(--border);
    margin-bottom: 6px;
}

.calendar-context-action {
    width: 100%;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 9px 10px;
    background: transparent;
    color: var(--text);
    text-align: left;
    cursor: pointer;
    font-size: 13px;
}

.calendar-context-action:hover {
    background: #3a3c3f;
    border-color: var(--border);
}

.calendar-context-delete:hover {
    background: #553234;
    color: #ffd9dc;
    border-color: #704145;
}

.calendar-context-move {
    display: grid;
    gap: 7px;
    padding: 7px 0;
}

.calendar-context-move label {
    padding: 0 7px;
    color: var(--muted);
    font-size: 11px;
}

.calendar-context-move-row {
    display: flex;
    gap: 6px;
}

.calendar-context-date {
    min-width: 0;
    flex: 1;
    height: 34px;
    padding: 0 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #3a3c3f;
    color: var(--text);
}

.calendar-context-confirm {
    width: auto;
    white-space: nowrap;
    background: var(--primary);
    color: white;
}

.calendar-context-confirm:hover {
    background: #ffa86c;
    color: white;
}

.calendar-context-colours {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    padding: 7px;
}

.calendar-context-colour {
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 7px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    cursor: pointer;
}

.calendar-context-colour:hover {
    transform: translateY(-1px);
    border-color: white;
}

.calendar-context-colour.default { background: #3a3c3f; }
.calendar-context-colour.orange { background: #8f4e25; }
.calendar-context-colour.blue { background: #34577c; }
.calendar-context-colour.green { background: #35654d; }
.calendar-context-colour.purple { background: #5d467c; }
.calendar-context-colour.red { background: #7f3f43; }
.calendar-context-colour.yellow { background: #776027; }

.scheduled-paper-link {
    color: var(--text);
}

.scheduled-paper-link:hover {
    color: var(--primary);
}

.calendar-day-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 500;
    padding: 20px;
}

.calendar-day-modal.open {
    display: flex;
}

.calendar-day-modal-content {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px;
    width: min(420px, 100%);
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: var(--shadow);
}

.calendar-modal-entries {
    display: grid;
    gap: 4px;
    margin: 14px 0;
}

.calendar-add-form {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.calendar-add-form .attempt-input {
    flex: 1;
}

.calendar-modal-error {
    margin-top: 8px;
    font-size: 12px;
    color: var(--primary);
    min-height: 14px;
}

.calendar-help-box {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 145px;
    padding: 12px 13px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #2c2e31;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
    box-shadow: var(--shadow);
}

.calendar-help-box strong {
    display: block;
    margin-bottom: 4px;
    color: var(--text);
    font-size: 11px;
    font-weight: 400;
}

@media (max-width: 1180px) {

    .calendar-shell {
        flex-wrap: wrap;
    }

    .calendar-help-box {
        position: static;
        transform: none;
        width: min(100%, 420px);
        flex-basis: 100%;
        order: -1;
        margin: 0 auto 2px;
    }

}


/* ---------------- NATIVE PDF VIEWER ---------------- */

body:has(.native-pdf-page) {
    overflow-y: auto;
    overflow-x: hidden;
}

body:has(.native-pdf-page) footer {
    display: none;
}

body:has(.native-pdf-page) main {
    height: 820px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 24px;
    overflow: visible;
}

.native-pdf-page {
    position: relative;
    width: min(900px, 100%);
    min-height: 820px;
    display: flex;
    flex-direction: column;
}

.native-pdf-window {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #242528;
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: var(--shadow);
    aspect-ratio: auto;
    max-height: none;
    margin-bottom: 48px;
}

.native-pdf-window iframe {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    min-width: 100%;
    min-height: 100%;
    border: 0;
    background: #242528;
}

@media (max-width: 700px) {

    body:has(.native-pdf-page) main {
        height: calc(100dvh - 96px);
        padding: 6px 10px;
        overflow: hidden;
    }

    .native-pdf-page {
        width: 100%;
    }

}

/* ---------------- PDF VIEWER CONTROLS ---------------- */

.native-pdf-controls {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 34px;
    flex-shrink: 0;
    margin-bottom: 8px;
    gap: 10px;
}

.native-pdf-return {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    line-height: 1;
    text-decoration: none;
    cursor: pointer;
}

.native-pdf-return:hover {
    background: #3a3c3f;
    color: var(--text);
    border-color: var(--subdued);
}

.native-pdf-fullscreen {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #3a3c3f;
    color: var(--text);
    font-size: 13px;
    line-height: 1;
    text-decoration: none;
    cursor: pointer;
}

.native-pdf-fullscreen:hover {
    background: #414346;
    border-color: var(--subdued);
}

.native-pdf-control-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
}

.native-pdf-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--primary);
    border-radius: 8px;
    background: var(--primary);
    color: white;
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
}

.native-pdf-mark:hover {
    background: #ffa86c;
    border-color: #ffa86c;
}

.native-pdf-mark:disabled {
    cursor: wait;
    opacity: 0.65;
}

.mcq-scan-modal {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.55);
}

.mcq-scan-modal.open {
    display: flex;
}

.mcq-scan-modal-content {
    width: min(680px, 100%);
    max-height: min(80vh, 720px);
    overflow-y: auto;
    padding: 20px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--card);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

.mcq-scan-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.mcq-scan-title {
    color: var(--primary);
    font-size: 22px;
}

.mcq-scan-paper {
    margin-top: 5px;
    color: var(--muted);
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
}

.mcq-scan-close {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
}

.mcq-scan-close:hover {
    background: #3a3c3f;
    color: var(--text);
}

.mcq-scan-status {
    margin-top: 16px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #3a3c3f;
    color: var(--text);
    font-size: 13px;
}

.mcq-scan-status.success {
    border-color: var(--subdued);
    color: var(--primary);
}

.mcq-scan-status.error {
    border-color: #704145;
    background: #553234;
    color: #ffd9dc;
}

.mcq-scan-answer-preview {
    margin-top: 12px;
    color: var(--text);
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    line-height: 1.6;
    word-break: break-word;
}

.mcq-scan-output {
    margin: 12px 0 0;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #242528;
    color: var(--muted);
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

/* ---------------- PAPER MARKING PAGE ---------------- */

.mark-page {
    width: min(1400px, 100%);
    margin: 0 auto;
}

.mark-page-header {
    margin-bottom: 22px;
}

.mark-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 20px;
    align-items: stretch;
    min-height: 650px;
    height: calc(100dvh - 230px);
}

.mark-panel {
    min-width: 0;
    min-height: 0;
}

.mark-controls-panel {
    overflow-y: auto;
    padding-right: 4px;
}

.mark-card,
.mark-pdf-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: var(--shadow);
}

.mark-card {
    padding: 24px;
}

.mark-pdf-card {
    height: 100%;
    min-height: 0;
    padding: 0;
    overflow: hidden;
}

.mark-pdf-frame {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 650px;
    border: none;
    background: #242528;
}

.mark-paper-meta {
    color: var(--muted);
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    margin-bottom: 22px;
    overflow-wrap: anywhere;
}

.mark-answer-label {
    display: block;
    color: var(--text);
    font-size: 14px;
    margin-bottom: 8px;
}

.mark-answer-input {
    width: 100%;
    min-height: 170px;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #242528;
    color: var(--text);
    outline: none;
    resize: vertical;
    font-family: "JetBrains Mono", monospace;
    font-size: 16px;
    line-height: 1.6;
    text-transform: uppercase;
}

.mark-answer-input:focus {
    border-color: var(--subdued);
    box-shadow: 0 0 0 2px rgba(147, 107, 60, 0.16);
}

.mark-answer-help {
    margin-top: 8px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
}

.mark-submit {
    width: 100%;
    margin-top: 18px;
    height: 44px;
    border: 1px solid var(--primary);
    border-radius: 10px;
    background: var(--primary);
    color: white;
    font-size: 14px;
    cursor: pointer;
}

.mark-submit:hover {
    background: #ffa86c;
    border-color: #ffa86c;
}

.mark-submit:disabled {
    cursor: wait;
    opacity: 0.65;
}

.mark-status {
    margin-top: 12px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #3a3c3f;
    color: var(--text);
    font-size: 13px;
    line-height: 1.4;
}

.mark-status.success {
    border-color: var(--subdued);
    color: var(--primary);
}

.mark-status.error {
    border-color: #704145;
    background: #553234;
    color: #ffd9dc;
}

.mark-result {
    margin-top: 14px;
    padding: 20px;
    border: 1px solid var(--subdued);
    border-radius: 14px;
    background: #3a3127;
    text-align: center;
}

.mark-result-score {
    color: var(--primary);
    font-size: 42px;
    line-height: 1.1;
}

.mark-result-detail {
    margin-top: 7px;
    color: var(--muted);
    font-size: 13px;
}

@media (max-width: 900px) {

    .mark-layout {
        grid-template-columns: 1fr;
        height: auto;
        min-height: 0;
    }

    .mark-controls-panel {
        overflow: visible;
        padding-right: 0;
    }

    .mark-pdf-card {
        height: 70vh;
        min-height: 520px;
    }

    .mark-pdf-frame {
        min-height: 520px;
    }

}

@media (max-width: 700px) {

    .mark-card {
        padding: 18px;
    }

    .mark-answer-input {
        min-height: 140px;
    }

}

/* ---------------- EMPTY ---------------- */

.empty {
    background: var(--card);
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

/* ---------------- HOME PAGE DESKTOP LAYOUT ---------------- */

.home-page {
    min-height: calc(100dvh - 118px);
    padding-top: 8px;
    overflow: hidden;
}

.home-page .home-scalable {
    --home-scale: 1;
    width: 100%;
    margin: 0 auto;
    transform: scale(var(--home-scale));
    transform-origin: top center;
}

.home-page .hero {
    width: 100%;
    margin-bottom: 30px;
    text-align: center;
}

.home-page .hero h1 {
    font-size: clamp(38px, 4.5vw, 54px);
    letter-spacing: -2px;
    margin-bottom: 10px;
    line-height: 1.12;
    min-height: 1.12em;
}

.home-page .typing-cursor {
    color: var(--text);
    display: inline-block;
    margin-left: 2px;
    animation: typingCursor 0.8s steps(1, end) infinite;
}

@keyframes typingCursor {

    0%,
    49% {
        opacity: 1;
    }

    50%,
    100% {
        opacity: 0;
    }
}

.home-page .hero p {
    font-size: 13px;
    line-height: 1.35;
    margin-top: 3px;
}

.home-page .version {
    margin-top: 7px;
    font-size: 11px;
}

.home-page .subject-grid.subjects-loading {
    position: relative;
}

.home-page .subject-grid.subjects-loading::before {
    content: "loading subjects...";
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: 14px;
    pointer-events: none;
}

.home-page .subject-grid.subjects-loading .subject-card {
    visibility: hidden;
}

.home-page .subject-grid {
    width: min(100%, 1080px);
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
}

.home-page .subject-card {
    width: 100%;
    height: 145px;
    min-height: 145px;
    border-radius: 14px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
}

.home-page .subject-card h2 {
    margin-top: 11px;
    font-size: 20px;
}

.home-page .card-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    font-size: 20px;
    flex-shrink: 0;
}

.home-page .card-icon-image {
    width: 31px;
    height: 31px;
}

.home-page .subject-card .muted {
    margin-top: 4px;
    font-size: 12px;
}

body:has(.home-page) {
    overflow: hidden;
}

body:has(.home-page) main {
    min-height: calc(100dvh - 118px);
    overflow: hidden;
    padding-bottom: 8px;
}

body:has(.home-page) footer {
    display: block;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 10px 20px;
    height: 40px;
    background: var(--bg);
    border-top: 1px solid var(--border);
    z-index: 10;
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

    .progress-overview-content {
        width: 100%;
    }

    .progress-overview-title {
        font-size: 27px;
    }

    .year-session-card .progress-overview-content {
        width: 100%;
    }

    .paper-actions {
        width: 100%;
    }

    .paper-button {
        flex: 1;
    }

    .paper-calendar-button {
        margin-left: auto;
    }

    .paper-progress {
        width: auto;
        max-width: 100%;
    }

    .paper-status,
    .attempt-button {
        flex-shrink: 0;
    }

    .attempt-history {
        width: 100%;
        min-width: 0;
    }

    .nav-actions {
        gap: 10px;
    }

    .nav-account {
        font-size: 12px;
    }

    .calendar-shell {
        flex-direction: column;
    }

    .calendar-nav-arrow {
        width: 44px;
        height: 44px;
    }

    .calendar-card {
        padding: 18px;
        width: 100%;
    }

    .calendar-cell {
        min-height: 72px;
        padding: 6px;
    }

}

`;


/* ============================================================
   HTML HELPERS
   ============================================================ */

function documentHTML(title, body, depth = 0) {

    const prefix = "../".repeat(depth);

    return `

<!DOCTYPE html>
<html lang="en">

<head>
        <meta name="viewport" content="width=device-width, initial-scale=1">


    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        ${String(title).toLowerCase()} · cashew papers
    </title>

    <link rel="stylesheet" href="${prefix}style.css?v=0.1.84">

    <link rel="preconnect" href="https://fonts.googleapis.com">

    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Questrial&display=swap"
        rel="stylesheet"
    >

    <link rel="icon" type="image/svg+xml" href="${prefix}assets/favicon.svg">

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

    <script src="${prefix}auth.js?v=0.1.84"></script>

    <script src="${prefix}user-data.js?v=0.1.84"></script>

    <script src="${prefix}search.js?v=0.1.84"></script>


<script>
(function () {

    const ua =
        navigator.userAgent || "";

    const uaData =
        navigator.userAgentData || null;

    const mobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i
            .test(ua);

    const mobileUAData =
        uaData &&
        (
            uaData.mobile === true ||
            /Android|iPhone|iPad|iPod/i.test(
                uaData.platform || ""
            )
        );

    const coarsePointer =
        window.matchMedia(
            "(pointer: coarse)"
        ).matches;

    const noHover =
        window.matchMedia(
            "(hover: none)"
        ).matches;

    const isMobileDevice =
        mobileUAData ||
        (
            mobileUA &&
            coarsePointer &&
            noHover
        );

    if (isMobileDevice) {

        const apply =
            () => {
                document.body.classList.add(
                    "mobile-device"
                );
            };

        if (document.body) {
            apply();
        } else {
            document.addEventListener(
                "DOMContentLoaded",
                apply,
                { once: true }
            );
        }
    }

})();
</script>

</head>

<body data-search-prefix="${prefix}">
        <div class="mobile-block-screen" aria-hidden="true">
            <div class="mobile-block-screen-inner">
                <img class="mobile-block-logo" src="${prefix}assets/cashewpapers.svg" alt="cashewpapers">
                <h1>desktop required</h1>
                <p>oops... cashewpapers is currently only designed for desktop screens. please open this website on a computer.</p>
            </div>
        </div>


<nav>

    <div class="nav-inner">

        <a class="logo" href="${prefix}index.html" aria-label="cashewpapers">
            <img
                class="brand-logo"
                src="${assetPath("cashewpapers.svg", depth)}"
                alt="cashewpapers"
            >
        </a>

        <div class="paper-search" id="paperSearchForm" role="search">

            <div class="paper-search-field">

                <input
                    id="paperSearchInput"
                    type="text"
                    inputmode="text"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="search paper code..."
                    aria-label="search paper code"
                >

                <button
                    type="button"
                    id="paperSearchButton"
                    aria-label="search"
                    title="search"
                >
                    →
                </button>

            </div>

        </div>

        <div class="nav-actions">

            <a
                href="${prefix}scheduler/"
                class="nav-account nav-calendar-button"
                title="my calendar"
            >
                my calendar
            </a>

            <a id="authNav" href="${prefix}login/" class="nav-account">
                Login / Signup
            </a>

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

    const authNav = document.getElementById("authNav");

    if (!authNav || typeof getCurrentUser !== "function") {
        return;
    }

    const user = await getCurrentUser();

    if (user) {

        authNav.href = "${prefix}account/";
        authNav.textContent = "Profile";

    } else {

        authNav.href = "${prefix}login/";
        authNav.textContent = "Login / Signup";

    }

}

let renderedAccountUserId =
    null;

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const user =
            await getCurrentUser();

        renderedAccountUserId =
            user
                ? String(user.id)
                : null;

        updateAuthNavigation();

        await Promise.all([
            initializePaperProgress(),
            initializeOverviewProgress()
        ]);

    }
);

window.addEventListener(
    "cashew-auth-change",
    async () => {

        const user =
            await getCurrentUser();

        const nextUserId =
            user
                ? String(user.id)
                : null;

        updateAuthNavigation();

        if (
            nextUserId ===
            renderedAccountUserId
        ) {
            return;
        }

        renderedAccountUserId =
            nextUserId;

        await Promise.all([
            initializePaperProgress(),
            initializeOverviewProgress()
        ]);

    }
);


async function getPaperStatus(key) {
    const user = await getCurrentUser();
    return user
        ? await CashewUserData.getPaperStatus(key)
        : "incomplete";
}

async function setPaperStatus(key, status) {
    return await CashewUserData.setPaperStatus(key, status);
}

async function getPaperAttempts(key) {
    const user = await getCurrentUser();
    return user
        ? await CashewUserData.getPaperAttempts(key)
        : [];
}

function formatAttemptDate(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
        return isoDate || "Unknown date";
    }
    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function clearLoginNotice(progress) {
    const existing = progress.querySelector(".paper-login-notice");
    if (existing) {
        existing.remove();
    }
}

function showLoginRequired() {
    window.location.href = "${prefix}login/";
}

function renderPaperStatus(
    button,
    status,
    keepHidden = false
) {

    if (!keepHidden) {
        button.classList.remove(
            "account-data-pending"
        );
    }

    button.classList.toggle(
        "completed",
        status === "completed"
    );

    if (status === "completed") {

        button.textContent =
            "✓ completed";

        button.title =
            "Click to mark as incomplete";

        button.setAttribute(
            "aria-label",
            "Mark paper as incomplete"
        );

    } else {

        button.textContent =
            "☐ Mark as completed";

        button.title =
            "Click to mark as completed";

        button.setAttribute(
            "aria-label",
            "Mark paper as completed"
        );

    }

}

async function renderPaperAttempts(
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

    attemptsContainer.classList.add(
        "account-data-pending"
    );

    attemptsContainer.innerHTML = "";

    const loader =
        progress.querySelector(
            ".paper-progress-loading"
        );

    if (loader) {
        loader.classList.remove(
            "ready"
        );
    }

    clearLoginNotice(progress);

    if (
        !completed ||
        !user
    ) {

        attemptsContainer.classList.remove(
            "account-data-pending"
        );

        return;
    }

    const attempts =
        await getPaperAttempts(key);

    const addButton =
        document.createElement(
            "button"
        );

    addButton.type =
        "button";

    addButton.className =
        "attempt-button";

    addButton.textContent =
        "+ Add attempt";

    addButton.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            openAttemptForm(
                progress,
                key
            );

        }
    );

    attemptsContainer.appendChild(
        addButton
    );

    if (attempts.length) {

        const previewAttempts =
            attempts.slice(
                0,
                Math.min(
                    6,
                    attempts.length
                )
            );

        const previewScores =
            previewAttempts
                .map(
                    attempt =>
                        String(
                            attempt.score
                        )
                )
                .join(" · ");

        const summaryButton =
            document.createElement(
                "button"
            );

        summaryButton.type =
            "button";

        summaryButton.className =
            "attempt-summary";

        summaryButton.textContent =
            String(
                attempts.length
            ) +
            " " +
            (
                attempts.length === 1
                    ? "attempt"
                    : "attempts"
            ) +
            (
                previewScores
                    ? " · " +
                      previewScores
                    : ""
            ) +
            (
                attempts.length > 6
                    ? " · see more"
                    : ""
            );

        const history =
            document.createElement(
                "div"
            );

        history.className =
            "attempt-history";

        attempts.forEach(
            (
                attempt,
                index
            ) => {

                history.appendChild(
                    createAttemptHistoryRow(
                        progress,
                        key,
                        attempt,
                        index
                    )
                );

            }
        );

        summaryButton.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                const isOpen =
                    history.classList.toggle(
                        "open"
                    );

                summaryButton.setAttribute(
                    "aria-expanded",
                    isOpen
                        ? "true"
                        : "false"
                );

            }
        );

        attemptsContainer.appendChild(
            summaryButton
        );

        attemptsContainer.appendChild(
            history
        );

    }

    /*
       Reveal the complete attempts UI in one operation after both the
       Supabase/cache read and DOM construction have finished.
    */
    attemptsContainer.classList.remove(
        "account-data-pending"
    );

    if (loader) {
        loader.classList.add(
            "ready"
        );
    }

    if (arguments.length >= 0) {
        const statusButton =
            progress.querySelector(
                ".paper-status"
            );

        if (statusButton) {
            statusButton.classList.remove(
                "account-data-pending"
            );
        }
    }

}
function createAttemptHistoryRow(progress, key, attempt, index) {
    const row = document.createElement("div");
    row.className = "attempt-row";

    const rowText = document.createElement("div");
    rowText.className = "attempt-row-text";
    rowText.textContent =
        "Attempt " +
        String(index + 1) +
        " / " +
        String(attempt.score) +
        " marks / " +
        formatAttemptDate(attempt.date);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "attempt-remove";
    removeButton.textContent = "×";
    removeButton.setAttribute(
        "aria-label",
        "Remove attempt " + String(index + 1)
    );

    removeButton.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();

        const currentUser = await getCurrentUser();
        if (!currentUser) {
            showLoginRequired();
            return;
        }

        try {
            await CashewUserData.deletePaperAttempt(
                key,
                attempt.id
            );

            await renderPaperAttempts(
                progress,
                key,
                (await getPaperStatus(key)) === "completed",
                currentUser
            );

            const newHistory =
                progress.querySelector(".attempt-history");
            if (newHistory) {
                newHistory.classList.add("open");
            }
        } catch (error) {
            console.error(
                "cashewpapers: unable to delete attempt",
                error
            );
        }
    });

    row.appendChild(rowText);
    row.appendChild(removeButton);
    return row;
}

function openAttemptForm(progress, key) {
    const attemptsContainer =
        progress.querySelector("[data-paper-attempts]");

    if (!attemptsContainer) {
        return;
    }

    const existingForm =
        attemptsContainer.querySelector(".attempt-form");

    if (existingForm) {
        return;
    }

    const form = document.createElement("form");
    form.className = "attempt-form";

    const title = document.createElement("div");
    title.className = "attempt-form-title";

    const titleText = document.createElement("span");
    titleText.textContent = "add attempt";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "attempt-form-close";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close add attempt");

    closeButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        form.remove();
    });

    title.appendChild(titleText);
    title.appendChild(closeButton);

    const input = document.createElement("input");
    input.className = "attempt-input";
    input.type = "number";
    input.step = "1";
    input.min = "0";
    input.max = "100";
    input.inputMode = "numeric";
    input.placeholder = "score";
    input.setAttribute("aria-label", "Attempt score");
    input.required = true;

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "attempt-save";
    saveButton.textContent = "save";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "attempt-cancel";
    cancelButton.textContent = "cancel";
    cancelButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        form.remove();
    });

    const actions = document.createElement("div");
    actions.className = "attempt-form-actions";
    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);

    form.appendChild(title);
    form.appendChild(input);
    form.appendChild(actions);

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const user = await getCurrentUser();
        if (!user) {
            showLoginRequired();
            return;
        }

        const numericScore = Number(input.value.trim());
        if (
            !Number.isFinite(numericScore) ||
            numericScore < 0 ||
            numericScore > 100
        ) {
            input.setCustomValidity(
                "Score must be between 0 and 100."
            );
            input.reportValidity();
            input.focus();
            return;
        }

        input.setCustomValidity("");

        try {
            await CashewUserData.addPaperAttempt(
                key,
                numericScore
            );

            form.remove();
            await renderPaperAttempts(
                progress,
                key,
                true,
                user
            );
        } catch (error) {
            console.error(
                "cashewpapers: unable to save attempt",
                error
            );
            input.setCustomValidity(
                error && error.message
                    ? error.message
                    : "Unable to save attempt."
            );
            input.reportValidity();
        }
    });

    attemptsContainer.appendChild(form);
    input.focus();
}

async function refreshPaperProgress(progress) {
    const button = progress.querySelector(".paper-status");
    const key = button.dataset.paperKey;
    const user = await getCurrentUser();
    const status = user
        ? await getPaperStatus(key)
        : "incomplete";

    renderPaperStatus(button, status);
    await renderPaperAttempts(
        progress,
        key,
        status === "completed",
        user
    );
}

async function getOverviewCompletedCount(keys) {
    const user = await getCurrentUser();
    if (!user) {
        return 0;
    }
    return await CashewUserData.getCompletedPaperCount(keys);
}

async function updateOverviewProgressCard(card, user) {
    const rawKeys = card.dataset.progressKeys || "";
    const keys = rawKeys
        ? rawKeys.split("|").filter(Boolean)
        : [];

    const total = Number(
        card.dataset.progressTotal || keys.length
    );

    const fill = card.querySelector(
        "[data-overview-progress-fill]"
    );

    const label = card.querySelector(
        "[data-overview-progress-label]"
    );

    if (!user) {
        if (fill) {
            fill.style.width = "0%";
        }
        if (label) {
            label.textContent =
                "log in to track your progress";
        }
        return;
    }

    const completed =
        await CashewUserData.getCompletedPaperCount(keys);

    const value = total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    if (fill) {
        fill.style.width = value + "%";
    }

    if (label) {
        label.textContent =
            String(completed) +
            "/" +
            String(total) +
            " papers completed";
    }
}

async function initializeOverviewProgress() {

    const cards =
        Array.from(
            document.querySelectorAll(
                "[data-progress-keys]"
            )
        );

    if (!cards.length) {
        return;
    }

    const user =
        await getCurrentUser();

    if (!user) {

        cards.forEach(card => {

            const fill =
                card.querySelector(
                    "[data-overview-progress-fill]"
                );

            const label =
                card.querySelector(
                    "[data-overview-progress-label]"
                );

            if (fill) {
                fill.style.width =
                    "0%";
                fill.classList.remove(
                    "account-progress-pending"
                );
            }

            if (label) {
                label.textContent =
                    "log in to track your progress";
                label.classList.remove(
                    "account-progress-pending"
                );
            }

        });

        return;
    }

    const allKeys =
        Array.from(
            new Set(
                cards.flatMap(
                    card =>
                        String(
                            card.dataset
                                .progressKeys ||
                            ""
                        )
                            .split("|")
                            .filter(Boolean)
                )
            )
        );

    const statuses =
        await CashewUserData
            .getPaperStatuses(
                allKeys
            );

    cards.forEach(card => {

        const keys =
            String(
                card.dataset
                    .progressKeys ||
                ""
            )
                .split("|")
                .filter(Boolean);

        const total =
            Number(
                card.dataset
                    .progressTotal ||
                keys.length
            );

        const completed =
            keys.filter(
                key =>
                    statuses[key] ===
                    "completed"
            ).length;

        const value =
            total > 0
                ? Math.round(
                    (
                        completed /
                        total
                    ) * 100
                )
                : 0;

        const fill =
            card.querySelector(
                "[data-overview-progress-fill]"
            );

        const label =
            card.querySelector(
                "[data-overview-progress-label]"
            );

        if (fill) {
            fill.style.width =
                value + "%";
            fill.classList.remove(
                "account-progress-pending"
            );
        }

        if (label) {
            label.textContent =
                String(completed) +
                "/" +
                String(total) +
                " papers completed";
            label.classList.remove(
                "account-progress-pending"
            );
        }

    });

}

let paperProgressInitializationPromise = null;

async function initializePaperProgress() {

    if (paperProgressInitializationPromise) {
        return paperProgressInitializationPromise;
    }

    paperProgressInitializationPromise =
        (async () => {

            const progressElements =
                Array.from(
                    document.querySelectorAll(
                        ".paper-progress"
                    )
                );

            if (!progressElements.length) {
                return;
            }

            const user =
                await getCurrentUser();

            const keys =
                progressElements
                    .map(progress => {

                        const button =
                            progress.querySelector(
                                ".paper-status"
                            );

                        return button
                            ? button.dataset
                                .paperKey
                            : "";

                    })
                    .filter(Boolean);

            const statuses =
                user
                    ? await CashewUserData
                        .getPaperStatuses(
                            keys
                        )
                    : {};

            await Promise.all(
                progressElements.map(
                    async progress => {

                        const button =
                            progress.querySelector(
                                ".paper-status"
                            );

                        const loader =
                            progress.querySelector(
                                ".paper-progress-loading"
                            );

                        if (!button) {
                            return;
                        }

                        const key =
                            button.dataset
                                .paperKey;

                        const status =
                            user
                                ? (
                                    statuses[key] ||
                                    "incomplete"
                                )
                                : "incomplete";

                        /*
                           Do not expose any account state yet.
                           The loader remains visible while the attempt
                           data is fetched and rendered.
                        */
                        renderPaperStatus(
                            button,
                            status,
                            true
                        );

                        await renderPaperAttempts(
                            progress,
                            key,
                            status ===
                                "completed",
                            user
                        );

                        if (loader) {
                            loader.classList.add(
                                "ready"
                            );
                        }

                        button.classList.remove(
                            "account-data-pending"
                        );

                    }
                )
            );

        })();

    try {

        return await
            paperProgressInitializationPromise;

    } finally {

        paperProgressInitializationPromise =
            null;

    }

}

async function togglePaperStatus(button) {

    const key =
        button.dataset.paperKey;

    const progress =
        button.closest(
            ".paper-progress"
        );

    const user =
        await getCurrentUser();

    if (!user) {
        showLoginRequired();
        return;
    }

    clearLoginNotice(progress);

    /*
       Give immediate visual feedback before any network request.
       The button itself does not change to completed until the
       Supabase write succeeds.
    */
    button.classList.remove(
        "status-pop"
    );

    void button.offsetWidth;

    button.classList.add(
        "status-pop"
    );

    window.setTimeout(
        () => {
            button.classList.remove(
                "status-pop"
            );
        },
        260
    );

    button.disabled = true;

    try {

        const current =
            button.classList.contains(
                "completed"
            )
                ? "completed"
                : (
                    await getPaperStatus(
                        key
                    )
                );

        const next =
            current === "completed"
                ? "incomplete"
                : "completed";

        await setPaperStatus(
            key,
            next
        );

        renderPaperStatus(
            button,
            next
        );

        await renderPaperAttempts(
            progress,
            key,
            next === "completed",
            user
        );

        const loader =
            progress.querySelector(
                ".paper-progress-loading"
            );

        if (loader) {
            loader.classList.add(
                "ready"
            );
        }

        await initializeOverviewProgress();

    } catch (error) {

        console.error(
            "cashewpapers: unable to update paper progress",
            error
        );

    } finally {

        button.disabled = false;

    }

}

</script>

</body>

</html>

    `;
}


/* ============================================================
   PAGE GENERATORS
   ============================================================ */

function generateHome(subjects) {

    const cards = Object.entries(subjects)
        .map(([key, subject]) => `

            <a class="subject-card" data-subject="${key}" href="${key}/">

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

                <h2>${subject.name}</h2>

                <div class="muted">Cambridge ${subject.code}</div>

            </a>

        `)
        .join("");

    return documentHTML(
        "Home",

        `

            <div class="home-page">

                <div class="home-scalable">

            <section class="hero">

                <h1 aria-label="by students, for students.">
                    <span id="heroTyping"></span><span class="typing-cursor" aria-hidden="true">|</span>
                </h1>

                <p>organized like a study tool, not a filing cabinet.</p>

                <p>all the papers, with none of the mess.</p>

                <div class="version">Version Alpha 0.1.96</div>

            </section>

            <div class="subject-grid subjects-loading">

                ${cards}

            </div>

                </div>

            </div>

            <script>

const heroTyping = document.getElementById("heroTyping");
const heroCursor = document.querySelector(".typing-cursor");
const heroText = "by students, for students.";

if (heroTyping) {

    let heroIndex = 0;

    function typeHeroText() {

        heroTyping.textContent = heroText.slice(0, heroIndex);

        heroIndex += 1;

        if (heroIndex <= heroText.length) {
            window.setTimeout(typeHeroText, 55);
        } else if (heroCursor) {
            window.setTimeout(() => {
                heroCursor.style.display = "none";
            }, 650);
        }

    }

    typeHeroText();
}

/* -------------------------------------------------------------
   HOMEPAGE CONTENT-AWARE SCALING
   ------------------------------------------------------------- */

function updateHomeScale() {

    const page = document.querySelector(".home-page");
    const scalable = document.querySelector(".home-scalable");

    if (!page || !scalable) {
        return;
    }

    const main = page.closest("main");

    if (!main) {
        return;
    }

    /*
       Measure the natural composition before applying a transform.
       This makes the calculation independent of previous resizes.
    */
    scalable.style.transform = "none";

    const contentHeight = scalable.scrollHeight;
    const contentWidth = scalable.scrollWidth;

    const availableHeight = Math.max(1, main.clientHeight - 18);
    const availableWidth = Math.max(1, main.clientWidth - 24);

    /*
       Use almost all of the available space, while leaving a
       small visual margin. Keep sensible lower/upper bounds.
    */
    const heightScale = (availableHeight * 0.99) / Math.max(1, contentHeight);
    const widthScale = (availableWidth * 0.98) / Math.max(1, contentWidth);

    const scale = Math.max(0.90, Math.min(1.40, heightScale, widthScale));

    scalable.style.setProperty("--home-scale", scale.toFixed(4));
    scalable.style.transform = "scale(" + scale.toFixed(4) + ")";
}

function scheduleHomeScale() {
    window.requestAnimationFrame(updateHomeScale);
}

scheduleHomeScale();

window.addEventListener("resize", scheduleHomeScale);
window.addEventListener("orientationchange", scheduleHomeScale);
window.addEventListener("load", scheduleHomeScale);

async function applySubjectFilter() {

    const subjectGrid =
        document.querySelector(
            ".subject-grid"
        );

    if (!subjectGrid) {
        return;
    }

    try {

        const user =
            typeof getCurrentUser ===
            "function"
                ? await getCurrentUser()
                : null;

        if (!user) {
            return;
        }

        const selectedSubjects =
            await CashewUserData
                .getSelectedSubjects();

        document
            .querySelectorAll(
                ".subject-card[data-subject]"
            )
            .forEach(card => {

                const subject =
                    card.dataset
                        .subject;

                card.style.display =
                    selectedSubjects
                        .includes(subject)
                        ? ""
                        : "none";

            });

    } catch (error) {

        console.error(
            "cashewpapers: unable to load selected subjects",
            error
        );

    } finally {

        subjectGrid.classList.remove(
            "subjects-loading"
        );

        scheduleHomeScale();

    }

}

applySubjectFilter();

</script>

        `,

        0
    );
}


/* ============================================================
   SUBJECT PAGE

   Any subject listed in SUBJECT_CATEGORIES (mathematics,
   physics, chemistry, biology, ...) gets a component-choice
   page here, generated the exact same way regardless of which
   subject it is or what its categories are called.
   ============================================================ */

function generateSubjectPage(subjectKey, data) {

    const subject = data.subject;

    if (hasCategories(subjectKey)) {

        const categories = getCategories(subjectKey);

        const cards = categories
            .map(([key, name, icon]) => `

                <a class="category-card" href="${key}/">

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

                    <h2>${name}</h2>

                    <div class="card-description">
                        Browse ${name.toLowerCase()} papers.
                    </div>

                </a>

            `)
            .join("");

        return documentHTML(
            subject.name,

            `

                <div class="page-header">

                    ${breadcrumbHTML([
                        { label: "subjects", href: "../" },
                        { label: subjectShortLabel(subjectKey, subject), current: true }
                    ])}

                    <h1>${subject.name} ${subject.code}</h1>

                    <p>Choose a ${subject.name} component.</p>

                </div>

                <div class="category-grid">

                    ${cards}

                </div>

            `,

            1
        );

    }

    const years = Object.keys(data.years).sort((a, b) => Number(b) - Number(a));

    const links = years
        .map(year => {

            const yearSessions =
                data.years[year] || {};

            const yearPaperKeys = [];

            for (const session of Object.values(yearSessions)) {

                for (const paper of Object.values(session.papers || {})) {

                    yearPaperKeys.push(
                        [
                            subject.code,
                            "",
                            year,
                            session.sessionCode,
                            paper.paper
                        ].join("-")
                    );

                }

            }

            return `

                <a
                    class="year-link progress-overview-card"
                    href="${year}/"
                    data-progress-keys="${yearPaperKeys.join("|")}"
                    data-progress-total="${yearPaperKeys.length}"
                >

                    <div class="progress-overview-content">

                        <div class="progress-overview-title">
                            ${year}
                        </div>

                        <div
                            class="progress-overview-bar"
                        >

                            <div
                                class="progress-overview-fill account-progress-pending"
                                data-overview-progress-fill
                            ></div>

                        </div>

                        <div
                            class="progress-overview-label"
                            data-overview-progress-label
                            class="account-progress-pending"
                        >
                            0/${yearPaperKeys.length} papers completed
                        </div>

                    </div>

                </a>

            `;

        })
        .join("");

    return documentHTML(
        subject.name,

        `

            <div class="page-header">

                ${breadcrumbHTML([
                    { label: "subjects", href: "../" },
                    { label: subjectShortLabel(subjectKey, subject), current: true }
                ])}

                <h1>${subject.name} ${subject.code}</h1>

                <p>${subject.description}</p>

            </div>

            <div class="year-grid">

                ${links}

            </div>

        `,

        1
    );
}


/* ============================================================
   BREADCRUMBS
   ============================================================ */

function breadcrumbHTML(items) {

    return `
        <nav class="breadcrumbs" aria-label="breadcrumb">
            ${items
                .map((item, index) => `
                    ${
                        index > 0
                            ? `
                                <span class="breadcrumb-arrow" aria-hidden="true">
                                    →
                                </span>
                            `
                            : ""
                    }

                    ${
                        item.current
                            ? `
                                <span class="breadcrumb-item current" aria-current="page">
                                    ${item.label}
                                </span>
                            `
                            : `
                                <a class="breadcrumb-item" href="${item.href}">
                                    ${item.label}
                                </a>
                            `
                    }
                `)
                .join("")}
        </nav>
    `;
}


/* ============================================================
   CATEGORY PAGE

   Generic for any categorized subject: renders the year grid
   for one component (e.g. mathematics/pure, physics/practical).
   ============================================================ */

function generateCategoryPage(subjectKey, subject, categoryKey, years) {

    const categoryInfo = getCategoryInfo(subjectKey, categoryKey);
    const categoryName = categoryInfo ? categoryInfo[1] : categoryKey;
    const breadcrumbLabel =
        categoryInfo && categoryInfo[3] ? categoryInfo[3] : categoryKey;

    const links = Object.keys(years)
        .sort((a, b) => Number(b) - Number(a))
        .map(year => {

            const yearSessions =
                years[year] || {};

            const yearPaperKeys = [];

            for (const session of Object.values(yearSessions)) {

                for (const paper of Object.values(session.papers || {})) {

                    yearPaperKeys.push(
                        [
                            subject.code,
                            categoryKey || "",
                            year,
                            session.sessionCode,
                            paper.paper
                        ].join("-")
                    );

                }

            }

            return `

                <a
                    class="year-link progress-overview-card"
                    href="${year}/"
                    data-progress-keys="${yearPaperKeys.join("|")}"
                    data-progress-total="${yearPaperKeys.length}"
                >

                    <div class="progress-overview-content">

                        <div class="progress-overview-title">
                            ${year}
                        </div>

                        <div
                            class="progress-overview-bar"
                        >

                            <div
                                class="progress-overview-fill account-progress-pending"
                                data-overview-progress-fill
                            ></div>

                        </div>

                        <div
                            class="progress-overview-label"
                            data-overview-progress-label
                            class="account-progress-pending"
                        >
                            0/${yearPaperKeys.length} papers completed
                        </div>

                    </div>

                </a>

            `;

        })
        .join("");

    return documentHTML(
        categoryName,

        `

            <div class="page-header">

                ${breadcrumbHTML([
                    { label: "subjects", href: "../../" },
                    { label: subjectShortLabel(subjectKey, subject), href: "../" },
                    { label: breadcrumbLabel, current: true }
                ])}

                <h1>${categoryName}</h1>

                <p>${subject.name} ${subject.code}</p>

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

function generateYearPage(subjectKey, subject, categoryKey, year, sessions) {

    const categoryInfo = categoryKey ? getCategoryInfo(subjectKey, categoryKey) : null;
    const categoryBreadcrumbLabel =
        categoryInfo && categoryInfo[3] ? categoryInfo[3] : categoryKey;

    const sessionCards = Object.entries(sessions)
        .map(([folder, session]) => {

            const slug = sessionSlug(session.sessionCode);
            const count = Object.keys(session.papers).length;

            const sessionPaperKeys =
                Object.values(session.papers || {})
                    .map(
                        paper =>
                            [
                                subject.code,
                                categoryKey || "",
                                year,
                                session.sessionCode,
                                paper.paper
                            ].join("-")
                    );

            return `

                <a
                    class="year-session-card progress-overview-card"
                    href="${slug}/"
                    data-progress-keys="${sessionPaperKeys.join("|")}"
                    data-progress-total="${count}"
                >

                    <div class="year-session-left">

                        <div class="year-session-icon">

                            <img
                                class="card-icon-image"
                                src="${assetPath("calendar.svg", 3)}"
                                alt=""
                            >

                        </div>

                        <div class="progress-overview-content">

                            <div class="year-session-name">
                                ${sessionName(session.sessionCode, year)}
                            </div>

                            <div class="progress-overview-bar">

                                <div
                                    class="progress-overview-fill account-progress-pending"
                                    data-overview-progress-fill
                                ></div>

                            </div>

                            <div
                                class="progress-overview-label"
                                data-overview-progress-label
                            >
                                0/${count} papers completed
                            </div>

                        </div>

                    </div>

                    <div class="year-session-arrow">→</div>

                </a>

            `;

        })
        .join("");

    return documentHTML(
        `${subject.name} ${year}`,

        `

            <div class="page-header">

                ${
                    categoryKey
                        ? breadcrumbHTML([
                            { label: "subjects", href: "../../../" },
                            { label: subjectShortLabel(subjectKey, subject), href: "../../" },
                            { label: categoryBreadcrumbLabel, href: "../" },
                            { label: String(year), current: true }
                        ])
                        : breadcrumbHTML([
                            { label: "subjects", href: "../../" },
                            { label: subjectShortLabel(subjectKey, subject), href: "../" },
                            { label: String(year), current: true }
                        ])
                }

                <h1>${subject.name} ${year}</h1>

                <p>${subject.code} · Choose a session to browse past papers.</p>

            </div>

            <div class="year-session-grid">

                ${sessionCards}

                <a class="year-session-card" href="all/">

                    <div class="year-session-left">

                        <div class="year-session-icon">

                            <img
                                class="card-icon-image"
                                src="${assetPath("stackofbooks.svg", 3)}"
                                alt=""
                            >

                        </div>

                        <div>

                            <div class="year-session-name">
                                See all
                            </div>

                            <div class="year-session-count">
                                ${Object.values(sessions).reduce(
                                    (total, session) =>
                                        total + Object.keys(session.papers).length,
                                    0
                                )} papers
                            </div>

                        </div>

                    </div>

                    <div class="year-session-arrow">→</div>

                </a>

            </div>

        `,

        3
    );
}


/* ============================================================
   ALL PAPERS PAGE
   ============================================================ */

function generateAllPapersPage(subjectKey, subject, categoryKey, year, sessions) {

    const categoryInfo =
        categoryKey
            ? getCategoryInfo(subjectKey, categoryKey)
            : null;

    const categoryBreadcrumbLabel =
        categoryInfo && categoryInfo[3]
            ? categoryInfo[3]
            : categoryKey;

    const categoryDisplayName =
        categoryInfo
            ? categoryInfo[1]
            : categoryKey;

    const groups =
        Object.entries(sessions)
            .sort((a, b) =>
                a[1].sessionCode.localeCompare(
                    b[1].sessionCode
                )
            );

    const totalCount =
        groups.reduce(
            (total, [, session]) =>
                total + Object.keys(session.papers).length,
            0
        );

    const groupHTML =
        groups
            .map(([folder, session]) => {

                const slug =
                    sessionSlug(
                        session.sessionCode
                    );

                const papers =
                    Object.values(session.papers).sort(
                        (a, b) =>
                            a.paper.localeCompare(
                                b.paper,
                                undefined,
                                { numeric: true }
                            )
                    );

                const cards =
                    papers
                        .map((paper, index) => {

                            const paperStatusKey = [
                                subject.code,
                                categoryKey || "",
                                year,
                                session.sessionCode,
                                paper.paper
                            ].join("-");

                            const paperDisplayCode =
                                paper.code || `Paper ${paper.paper}`;

                            const schedulerHref =
                                "../../../../scheduler/?key=" +
                                encodeURIComponent(paperStatusKey) +
                                "&code=" +
                                encodeURIComponent(paperDisplayCode) +
                                "&subject=" +
                                encodeURIComponent(subject.name) +
                                "&paper=" +
                                encodeURIComponent(paper.paper) +
                                "&path=" +
                                encodeURIComponent(
                                    `${subjectKey}/${categoryKey ? categoryKey + "/" : ""}${year}/${slug}/#paper-${paper.code}`
                                ) +
                                "&file=" +
                                encodeURIComponent(paper.question || "");

                            return `
                                <div
                                    class="paper-card"
                                    id="paper-${paper.code}"
                                    data-paper-code="${String(
                                        paper.code || ""
                                    ).toLowerCase()}"
                                >

                                    <div>

                                        <h3>
                                            Paper ${paper.paper}
                                        </h3>

                                        <div class="paper-code">
                                            ${paperDisplayCode}
                                        </div>

                                    </div>

                                    <div class="paper-actions">

                                        <div
                                            class="paper-progress"
                                            data-paper-progress
                                        >

                                            <div class="paper-progress-loading"></div>

                                            <button
                                                type="button"
                                                class="paper-status account-data-pending"
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
                                                class="paper-attempts account-data-pending"
                                                data-paper-attempts
                                            ></div>

                                        </div>

                                        ${
                                            paper.question
                                                ? `
                                                    <a
                                                        class="paper-button primary"
                                                        href="../../../../viewer/?file=${encodeURIComponent(
                                                            paper.question
                                                        )}"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
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
                                                        href="../../../../viewer/?file=${encodeURIComponent(
                                                            paper.markScheme
                                                        )}"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
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

                                        <a
                                            class="paper-calendar-button"
                                            href="${schedulerHref}"
                                            title="Schedule this paper"
                                            aria-label="Schedule this paper"
                                        >
                                            📅
                                        </a>

                                    </div>

                                </div>
                            `;

                        })
                        .join("");

                return `

                    <div class="all-papers-session-group">

                        <h2 class="all-papers-session-title">
                            ${shortSessionName(session.sessionCode)}
                        </h2>

                        <div class="paper-list">
                            ${cards}
                        </div>

                    </div>

                `;

            })
            .join("");

    return documentHTML(
        `${subject.name} ${year} · All Papers`,

        `
            <div class="page-header">

                ${
                    categoryKey
                        ? breadcrumbHTML([
                            { label: "subjects", href: "../../../../" },
                            { label: subjectShortLabel(subjectKey, subject), href: "../../../" },
                            { label: categoryBreadcrumbLabel, href: "../../" },
                            { label: String(year), href: "../" },
                            { label: "all", current: true }
                        ])
                        : breadcrumbHTML([
                            { label: "subjects", href: "../../../" },
                            { label: subjectShortLabel(subjectKey, subject), href: "../../" },
                            { label: String(year), href: "../" },
                            { label: "all", current: true }
                        ])
                }

                <h1>
                    all papers ${year}
                </h1>

                <p>
                    ${subject.name} ${subject.code}${categoryKey ? ` · ${categoryDisplayName}` : ""}
                    · ${totalCount} papers
                </p>

            </div>

            <div class="all-papers-list">
                ${groupHTML}
            </div>
        `,

        4
    );

}


/* ============================================================
   SESSION PAGE
   ============================================================ */

function generateSessionPage(subjectKey, subject, categoryKey, year, session) {

    const title = sessionName(session.sessionCode, year);

    const categoryInfo = categoryKey ? getCategoryInfo(subjectKey, categoryKey) : null;
    const categoryBreadcrumbLabel =
        categoryInfo && categoryInfo[3] ? categoryInfo[3] : categoryKey;
    const categoryDisplayName = categoryInfo ? categoryInfo[1] : categoryKey;

    const slug =
        sessionSlug(
            session.sessionCode
        );

    const papers = Object.values(session.papers).sort((a, b) =>
        a.paper.localeCompare(b.paper, undefined, { numeric: true })
    );

    const cards = papers
        .map((paper, index) => {

            const currentGroup = String(paper.paper).charAt(0);

            const previousGroup =
                index > 0 ? String(papers[index - 1].paper).charAt(0) : null;

            const groupBreak = index > 0 && currentGroup !== previousGroup;

            const paperStatusKey = [
                subject.code,
                categoryKey || "",
                year,
                session.sessionCode,
                paper.paper
            ].join("-");

            const paperDisplayCode =
                paper.code || `Paper ${paper.paper}`;

            const schedulerHref =
                "../../../../scheduler/?key=" +
                encodeURIComponent(paperStatusKey) +
                "&code=" +
                encodeURIComponent(paperDisplayCode) +
                "&subject=" +
                encodeURIComponent(subject.name) +
                "&paper=" +
                encodeURIComponent(paper.paper) +
                "&path=" +
                encodeURIComponent(
                    `${subjectKey}/${categoryKey ? categoryKey + "/" : ""}${year}/${slug}/#paper-${paper.code}`
                ) +
                "&file=" +
                encodeURIComponent(paper.question || "");

            return `

                <div
                    class="paper-card ${groupBreak ? "group-break" : ""}"
                    id="paper-${paper.code}"
                    data-paper-code="${String(paper.code || "").toLowerCase()}"
                >

                    <div>

                        <h3>Paper ${paper.paper}</h3>

                        <div class="paper-code">
                            ${paperDisplayCode}
                        </div>

                    </div>

                    <div class="paper-actions">

                        <div class="paper-progress" data-paper-progress>

                            <div class="paper-progress-loading"></div>

                            <button
                                type="button"
                                class="paper-status account-data-pending"
                                data-paper-key="${paperStatusKey}"
                                onclick="
                                    event.preventDefault();
                                    event.stopPropagation();
                                    togglePaperStatus(this);
                                "
                            >
                                ☐ Mark as completed
                            </button>

                            <div class="paper-attempts account-data-pending" data-paper-attempts></div>

                        </div>

                        ${
                            paper.question
                                ? `
                                    <a
                                        class="paper-button primary"
                                        href="../../../../viewer/?file=${encodeURIComponent(paper.question)}"
                                    
                                                target="_blank"
                                                rel="noopener noreferrer"
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
                                        href="../../../../viewer/?file=${encodeURIComponent(paper.markScheme)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
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

                        <a
                            class="paper-calendar-button"
                            href="${schedulerHref}"
                            title="Schedule this paper"
                            aria-label="Schedule this paper"
                        >
                            📅
                        </a>

                    </div>

                </div>

            `;

        })
        .join("");

    return documentHTML(
        title,

        `

            <div class="page-header">

                ${
                    categoryKey
                        ? breadcrumbHTML([
                            { label: "subjects", href: "../../../../" },
                            { label: subjectShortLabel(subjectKey, subject), href: "../../../" },
                            { label: categoryBreadcrumbLabel, href: "../../" },
                            { label: String(year), href: "../" },
                            { label: shortSessionName(session.sessionCode), current: true }
                        ])
                        : breadcrumbHTML([
                            { label: "subjects", href: "../../../" },
                            { label: subjectShortLabel(subjectKey, subject), href: "../../" },
                            { label: String(year), href: "../" },
                            { label: shortSessionName(session.sessionCode), current: true }
                        ])
                }

                <h1>${title}</h1>

                <p>
                    ${subject.name} ${subject.code}${categoryKey ? ` · ${categoryDisplayName}` : ""}
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
   NATIVE PDF VIEWER PAGE
   ============================================================ */

function generatePdfReaderPage() {

    return documentHTML(
        "PDF Viewer",
        `
            <div class="native-pdf-page">

                <div class="native-pdf-controls">

                    <a
                        class="native-pdf-return"
                        id="nativePdfReturn"
                        href="#"
                    >
                        ← return to paper selection
                    </a>

                    <div class="native-pdf-control-actions">

                        <button
                            type="button"
                            class="native-pdf-mark"
                            id="nativePdfMark"
                        >
                            mark paper
                        </button>

                        <a
                            class="native-pdf-fullscreen"
                            id="nativePdfFullscreen"
                            href="#"
                        >
                            go to fullscreen →
                        </a>

                    </div>

                </div>

                <div class="native-pdf-window">

                    <iframe
                        id="nativePdfFrame"
                        title="PDF viewer"
                        src="about:blank"
                    ></iframe>

                </div>

            </div>

            <script>
(function () {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const fileParam =
        params.get("file");

    const frame =
        document.getElementById(
            "nativePdfFrame"
        );

    const fullscreen =
        document.getElementById(
            "nativePdfFullscreen"
        );

    const returnButton =
        document.getElementById(
            "nativePdfReturn"
        );

    const markButton =
        document.getElementById(
            "nativePdfMark"
        );

    function hideMarkButton() {
        if (markButton) {
            markButton.style.display = "none";
        }
    }

    if (!fileParam) {
        hideMarkButton();
        return;
    }

    let decodedFile = "";
    let questionPaperUrl = "";

    try {

        decodedFile =
            decodeURIComponent(
                fileParam
            );

        questionPaperUrl =
            new URL(
                "../" +
                decodedFile,
                window.location.href
            ).href;

        if (frame) {
            frame.src =
                questionPaperUrl +
                "#zoom=page-fit&page=1";
        }

    } catch (error) {

        console.error(
            "cashewpapers: unable to load question paper",
            error
        );

        hideMarkButton();
        return;

    }

    /*
       Set up the marking button independently from the PDF viewer.
       The button is visible by default so a problem with another
       viewer control cannot silently hide it.
    */
    /*
       This script is emitted from a template literal, so regex
       backslashes must be escaped here to survive into viewer/index.html.
       Cambridge 9700, 9701 and 9702 Paper 1 variants are the MCQ papers
       supported by the answer-key parser.
    */
    function isSupportedMcqPaper(file) {
        const filename =
            String(file).split("/").pop() || "";

        return /^(9700|9701|9702)_[a-z]\\d{2}_qp_1[1-3]\\.pdf$/i
            .test(filename);
    }

    if (
        markButton &&
        isSupportedMcqPaper(decodedFile)
    ) {

        markButton.style.display =
            "inline-flex";

        const markPageUrl =
            "../mark/?file=" +
            encodeURIComponent(
                decodedFile
            );

        markButton.addEventListener(
            "click",
            event => {
                event.preventDefault();

                window.open(
                    markPageUrl,
                    "_blank",
                    "noopener,noreferrer"
                );
            }
        );

    } else {
        hideMarkButton();
    }

    if (fullscreen) {

        fullscreen.href =
            questionPaperUrl;

        fullscreen.addEventListener(
            "click",
            event => {
                event.preventDefault();
                window.location.replace(
                    questionPaperUrl
                );
            }
        );

    }

    if (returnButton) {

        returnButton.addEventListener(
            "click",
            event => {
                event.preventDefault();

                if (window.opener) {
                    window.close();
                } else {
                    window.history.back();
                }
            }
        );

    }

})();
            </script>
        `,
        1
    );
}


/* ============================================================
   MARKING PAGE
   ============================================================ */

function generateMarkingPage() {

    return documentHTML(
        "Mark Paper",
        `
            <div class="mark-page">

                <div class="page-header mark-page-header">

                    <a
                        class="native-pdf-return"
                        id="markReturn"
                        href="#"
                    >
                        ← return to PDF
                    </a>

                    <h1>mark paper</h1>

                    <p id="markPaperName">
                        enter your answers below.
                    </p>

                </div>

                <div class="mark-layout">

                    <div class="mark-panel mark-controls-panel">

                        <div class="mark-card">

                            <div class="mark-paper-meta" id="markPaperMeta">
                                loading paper...
                            </div>

                            <label
                                class="mark-answer-label"
                                for="markAnswerInput"
                            >
                                your answers
                            </label>

                            <textarea
                                id="markAnswerInput"
                                class="mark-answer-input"
                                spellcheck="false"
                                autocomplete="off"
                                autocapitalize="characters"
                                placeholder="ABCDABCD..."
                                rows="7"
                            ></textarea>

                            <div class="mark-answer-help">
                                enter one answer per question using A, B, C, or D. spaces and line breaks are ignored.
                            </div>

                            <button
                                type="button"
                                class="mark-submit"
                                id="markSubmit"
                            >
                                mark paper
                            </button>

                            <div
                                class="mark-status"
                                id="markStatus"
                            >
                                ready
                            </div>

                            <div
                                class="mark-result"
                                id="markResult"
                                hidden
                            >
                                <div class="mark-result-score" id="markScore"></div>
                                <div class="mark-result-detail" id="markDetail"></div>
                            </div>

                        </div>

                    </div>

                    <div class="mark-panel mark-pdf-panel">

                        <div class="mark-pdf-card">
                            <iframe
                                id="markPdfFrame"
                                class="mark-pdf-frame"
                                title="question paper"
                                src="about:blank"
                            ></iframe>
                        </div>

                    </div>

                </div>

            </div>

            <script>
(function () {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const fileParam =
        params.get("file");

    const answerInput =
        document.getElementById(
            "markAnswerInput"
        );

    const submitButton =
        document.getElementById(
            "markSubmit"
        );

    const status =
        document.getElementById(
            "markStatus"
        );

    const resultBox =
        document.getElementById(
            "markResult"
        );

    const score =
        document.getElementById(
            "markScore"
        );

    const detail =
        document.getElementById(
            "markDetail"
        );

    const paperName =
        document.getElementById(
            "markPaperName"
        );

    const paperMeta =
        document.getElementById(
            "markPaperMeta"
        );

    const returnButton =
        document.getElementById(
            "markReturn"
        );

    const pdfFrame =
        document.getElementById(
            "markPdfFrame"
        );

    let pdfjsLib = null;
    let pdfjsLoadPromise = null;
    let markSchemeUrl = "";
    let expectedAnswers = [];

    function setStatus(
        message,
        kind = ""
    ) {
        status.textContent = message;
        status.className =
            "mark-status" +
            (
                kind
                    ? " " + kind
                    : ""
            );
    }

    async function loadPdfJs() {

        if (pdfjsLib) {
            return pdfjsLib;
        }

        if (!pdfjsLoadPromise) {

            pdfjsLoadPromise =
                import(
                    "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs"
                )
                    .then(module => {
                        module.GlobalWorkerOptions.workerSrc =
                            "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs";

                        pdfjsLib = module;

                        return module;
                    })
                    .catch(error => {
                        pdfjsLoadPromise = null;
                        throw error;
                    });

        }

        return await pdfjsLoadPromise;

    }

    function lineText(items) {

        const rows = new Map();

        for (const item of items) {

            if (!item.str) {
                continue;
            }

            const y =
                Math.round(
                    item.transform[5] * 10
                ) / 10;

            if (!rows.has(y)) {
                rows.set(y, []);
            }

            rows.get(y).push(item);

        }

        return [...rows.entries()]
            .sort(
                (a, b) =>
                    b[0] - a[0]
            )
            .map(([, rowItems]) => {

                rowItems.sort(
                    (a, b) =>
                        a.transform[4] -
                        b.transform[4]
                );

                return rowItems
                    .map(item => item.str)
                    .join(" ")
                    .replace(/\\s+/g, " ")
                    .trim();

            })
            .filter(Boolean)
            .join("\\n");

    }

    async function extractPdfText(url) {

        await loadPdfJs();

        const pdf =
            await pdfjsLib
                .getDocument({
                    url
                })
                .promise;

        const pages = [];

        for (
            let pageNumber = 1;
            pageNumber <= pdf.numPages;
            pageNumber += 1
        ) {

            const page =
                await pdf.getPage(
                    pageNumber
                );

            const content =
                await page.getTextContent();

            pages.push(
                lineText(
                    content.items
                )
            );

        }

        return {
            pageCount: pdf.numPages,
            text: pages.join("\\n")
        };

    }

    function parseMarkScheme(text) {

        const maximumMatch =
            text.match(
                /Maximum Mark:\\s*(\\d+)/i
            );

        const maximumMark =
            maximumMatch
                ? Number(maximumMatch[1])
                : null;

        const matches = [
            ...text.matchAll(
                /^\\s*(\\d+)\\s+([A-D])\\s+(\\d+)\\s*$/gim
            )
        ];

        const answers = new Map();

        for (const match of matches) {

            const question =
                Number(match[1]);

            const answer =
                match[2].toUpperCase();

            const marks =
                Number(match[3]);

            if (
                question >= 1 &&
                !answers.has(question) &&
                marks === 1
            ) {
                answers.set(
                    question,
                    answer
                );
            }

        }

        const orderedQuestions =
            [...answers.keys()].sort(
                (a, b) => a - b
            );

        const errors = [];

        for (
            let i = 0;
            i < orderedQuestions.length;
            i += 1
        ) {
            if (
                orderedQuestions[i] !==
                i + 1
            ) {
                errors.push(
                    "missing question " +
                    (i + 1)
                );
            }
        }

        if (!orderedQuestions.length) {
            errors.push(
                "no MCQ answer rows were found"
            );
        }

        if (
            maximumMark !== null &&
            orderedQuestions.length !== maximumMark
        ) {
            errors.push(
                "found " +
                orderedQuestions.length +
                " answers but the mark scheme says " +
                maximumMark
            );
        }

        expectedAnswers =
            orderedQuestions.map(
                question =>
                    answers.get(question)
            );

        return {
            maximumMark,
            questionCount:
                expectedAnswers.length,
            errors
        };

    }

    function normalizeStudentAnswers(value) {

        return String(value || "")
            .toUpperCase()
            .replace(/[^A-D]/g, "");

    }

    function markStudentAnswers(value) {

        const studentAnswers =
            normalizeStudentAnswers(
                value
            );

        if (!expectedAnswers.length) {
            throw new Error(
                "the answer key is empty"
            );
        }

        if (
            !studentAnswers.length
        ) {
            throw new Error(
                "please enter your answers"
            );
        }

        const expectedCount =
            expectedAnswers.length;

        if (
            studentAnswers.length !==
            expectedCount
        ) {
            throw new Error(
                "expected " +
                expectedCount +
                " answers, but you entered " +
                studentAnswers.length
            );
        }

        let correct = 0;

        for (
            let i = 0;
            i < expectedAnswers.length;
            i += 1
        ) {
            if (
                studentAnswers[i] ===
                expectedAnswers[i]
            ) {
                correct += 1;
            }
        }

        return {
            correct,
            total: expectedCount,
            percentage:
                (correct / expectedCount) * 100
        };

    }

    async function runMarking() {

        resultBox.hidden = true;
        submitButton.disabled = true;

        setStatus(
            "loading mark scheme..."
        );

        try {

            const {
                pageCount,
                text
            } = await extractPdfText(
                markSchemeUrl
            );

            const parsed =
                parseMarkScheme(
                    text
                );

            if (parsed.errors.length) {
                throw new Error(
                    parsed.errors.join("; ")
                );
            }

            setStatus(
                "marking..."
            );

            const marked =
                markStudentAnswers(
                    answerInput.value
                );

            score.textContent =
                marked.correct +
                " / " +
                marked.total;

            detail.textContent =
                marked.percentage.toFixed(1) +
                "% · " +
                pageCount +
                " mark-scheme page" +
                (
                    pageCount === 1
                        ? ""
                        : "s"
                );

            resultBox.hidden = false;

            setStatus(
                "paper marked",
                "success"
            );

        } catch (error) {

            console.error(
                "cashewpapers: paper marking failed",
                error
            );

            setStatus(
                "ERROR — " +
                (
                    error &&
                    error.message
                        ? error.message
                        : String(error)
                ),
                "error"
            );

        } finally {
            submitButton.disabled =
                false;
        }

    }

    if (!fileParam) {
        paperName.textContent =
            "no question paper was supplied.";
        paperMeta.textContent =
            "open this page from a question paper viewer.";
        submitButton.disabled = true;
        return;
    }

    try {

        const decodedFile =
            decodeURIComponent(
                fileParam
            );

        /*
           Match the same papers exposed by the viewer button. This prevents
           direct links to unsupported, non-MCQ question papers.
        */
        const mcqFilename =
            String(decodedFile).split("/").pop() || "";

        if (
            !/^(9700|9701|9702)_[a-z]\\d{2}_qp_1[1-3]\\.pdf$/i
                .test(mcqFilename)
        ) {
            throw new Error(
                "marking is currently available only for Biology, Chemistry and Physics Paper 1 multiple-choice papers."
            );
        }

        const markSchemeFile =
            decodedFile.replace(
                /_qp_(\\d+)\\.pdf$/i,
                "_ms_$1.pdf"
            );

        if (
            markSchemeFile ===
            decodedFile
        ) {
            throw new Error(
                "this paper does not have a matching mark scheme"
            );
        }

        markSchemeUrl =
            new URL(
                "../" +
                markSchemeFile,
                window.location.href
            ).href;

        const questionPaperUrl =
            new URL(
                "../" +
                decodedFile,
                window.location.href
            ).href;

        if (pdfFrame) {
            pdfFrame.src =
                questionPaperUrl +
                "#zoom=page-fit&page=1";
        }

        const paperFileName =
            decodedFile
                .split("/")
                .pop();

        paperName.textContent =
            "enter your answers for " +
            paperFileName +
            ".";

        paperMeta.textContent =
            "matching mark scheme: " +
            markSchemeFile
                .split("/")
                .pop();

    } catch (error) {

        setStatus(
            "ERROR — " +
            (
                error &&
                error.message
                    ? error.message
                    : String(error)
            ),
            "error"
        );

        submitButton.disabled = true;

    }

    if (returnButton) {

        returnButton.addEventListener(
            "click",
            event => {
                event.preventDefault();

                const viewerUrl =
                    new URL(
                        "../viewer/?file=" +
                        encodeURIComponent(
                            decodeURIComponent(
                                fileParam
                            )
                        ),
                        window.location.href
                    ).href;

                window.location.href =
                    viewerUrl;
            }
        );

    }

    answerInput.addEventListener(
        "input",
        () => {
            resultBox.hidden = true;
            if (
                status.classList.contains(
                    "success"
                ) ||
                status.classList.contains(
                    "error"
                )
            ) {
                setStatus("ready");
            }
        }
    );

    submitButton.addEventListener(
        "click",
        runMarking
    );

})();
            </script>
        `,
        1
    );
}


/* ============================================================
   SCHEDULER / CALENDAR PAGE

   A lightweight, client-side scheduler stored entirely in
   ("YYYY-MM-DD") to an array of scheduled paper entries.

   Two ways in:
     1. General browsing via the nav "calendar" button:
        click any date to open a popover, search a paper code
        (using the same search index paper search uses) and
        add it to that date, or remove existing entries.
     2. From a specific paper's 📅 button on a session/all-papers
        page: arrives with ?key=&code=&subject= in the URL.
        A banner explains the paper being scheduled, and the
        very next date the person clicks gets that paper added
        automatically.
   ============================================================ */

function generateSchedulerPage() {

    return documentHTML(

        "My Calendar",

        `

            <div class="page-header">

                ${breadcrumbHTML([
                    { label: "subjects", href: "../" },
                    { label: "my calendar", current: true }
                ])}

                <h1>my calendar</h1>

                <p>plan out when you'll tackle each past paper.</p>

                

            </div>

            <div
                id="schedulingBanner"
                class="calendar-scheduling-banner"
                style="display:none;"
            ></div>

            <div class="calendar-shell">

                <div class="calendar-help-box">
                    <strong>calendar tip</strong>
                    right click a scheduled paper to move, delete, or change its colour.
                </div>

                <button
                    type="button"
                    class="calendar-nav-arrow"
                    id="calendarPrevMonth"
                    aria-label="previous month"
                >
                    ←
                </button>

                <div class="calendar-card">

                    <div class="calendar-month-title" id="calendarMonthTitle"></div>

                    <div class="calendar-grid" id="calendarDayLabels"></div>

                    <div class="calendar-grid" id="calendarGrid"></div>

                </div>

                <button
                    type="button"
                    class="calendar-nav-arrow"
                    id="calendarNextMonth"
                    aria-label="next month"
                >
                    →
                </button>

            </div>

            <div
                class="calendar-context-menu"
                id="calendarContextMenu"
                role="menu"
                aria-hidden="true"
            >
                <div class="calendar-context-title" id="calendarContextTitle">paper</div>

                <button
                    type="button"
                    class="calendar-context-action calendar-context-delete"
                    id="calendarContextDelete"
                >
                    delete
                </button>

                <div class="calendar-context-move">
                    <label for="calendarContextDate">move to date</label>
                    <div class="calendar-context-move-row">
                        <input
                            type="date"
                            id="calendarContextDate"
                            class="calendar-context-date"
                        >
                        <button
                            type="button"
                            class="calendar-context-action calendar-context-confirm"
                            id="calendarContextMove"
                        >
                            move
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    class="calendar-context-action"
                    id="calendarContextColourLabel"
                >
                    change colour
                </button>

                <div class="calendar-context-colours" id="calendarContextColours">
                    <button type="button" class="calendar-context-colour default" data-color="default" aria-label="default"></button>
                    <button type="button" class="calendar-context-colour orange" data-color="orange" aria-label="orange"></button>
                    <button type="button" class="calendar-context-colour blue" data-color="blue" aria-label="blue"></button>
                    <button type="button" class="calendar-context-colour green" data-color="green" aria-label="green"></button>
                    <button type="button" class="calendar-context-colour purple" data-color="purple" aria-label="purple"></button>
                    <button type="button" class="calendar-context-colour red" data-color="red" aria-label="red"></button>
                    <button type="button" class="calendar-context-colour yellow" data-color="yellow" aria-label="yellow"></button>
                </div>
            </div>

            <div class="calendar-day-modal" id="calendarDayModal">

                <div class="calendar-day-modal-content">

                    <div class="attempt-form-title">

                        <span id="calendarModalTitle">schedule</span>

                        <button
                            type="button"
                            class="attempt-form-close"
                            id="calendarModalClose"
                            aria-label="close"
                        >
                            ×
                        </button>

                    </div>

                    <div id="calendarModalEntries" class="calendar-modal-entries"></div>

                    <form id="calendarAddForm" class="calendar-add-form">

                        <input
                            id="calendarAddInput"
                            class="attempt-input"
                            type="text"
                            placeholder="enter paper code, e.g. 9709_w25_qp_12"
                            autocomplete="off"
                        >

                        <button
                            type="submit"
                            class="attempt-save"
                        >
                            add
                        </button>

                    </form>

                    <div
                        id="calendarModalError"
                        class="calendar-modal-error"
                    ></div>

                </div>

            </div>

            <script>

(async function () {

    const params = new URLSearchParams(
        window.location.search
    );

    const schedulingKey = params.get("key");
    const schedulingCode = params.get("code");
    const schedulingSubject = params.get("subject");
    const schedulingPaper = params.get("paper");
    const schedulingPath = params.get("path");
    const schedulingFile = params.get("file");

    let schedulingActive = Boolean(schedulingKey);
    let currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    let selectedDateKey = null;
    let schedule = {};

    async function loadSchedule() {
        const user = await getCurrentUser();
        if (!user) {
            schedule = {};
            return schedule;
        }
        schedule =
            await CashewUserData.getCalendarSchedule();
        return schedule;
    }

    async function refreshSchedule() {
        await loadSchedule();
        renderGrid();
        if (selectedDateKey) {
            renderModalEntries();
        }
    }

    function dateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function formatMonthTitle(date) {
        return date.toLocaleDateString(
            "en-US",
            { month: "long", year: "numeric" }
        );
    }

    const dayLabels = [
        "sun", "mon", "tue", "wed", "thu", "fri", "sat"
    ];

    function renderDayLabels() {
        const container =
            document.getElementById("calendarDayLabels");
        container.innerHTML = dayLabels
            .map(label =>
                '<div class="calendar-day-label">' +
                label +
                "</div>"
            )
            .join("");
    }

    function renderBanner() {
        const banner =
            document.getElementById("schedulingBanner");

        if (!schedulingActive) {
            banner.style.display = "none";
            return;
        }

        banner.style.display = "block";
        banner.textContent =
            "scheduling " +
            formatScheduledEntryLabel({
                code: schedulingCode,
                subject: schedulingSubject,
                paper: schedulingPaper
            }) +
            " — click a date to add it.";
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getScheduledPaperNumber(entry) {
        if (entry && entry.paper) {
            return String(entry.paper);
        }
        const code = String(entry && entry.code || "");
        const match = code.match(/_(?:qp|ms|er|in)_(\d+)$/i);
        return match ? match[1] : "";
    }

    function formatScheduledEntryLabel(entry) {
        const subject = String(
            entry && entry.subject || ""
        ).trim().toLowerCase();
        const paper = getScheduledPaperNumber(entry);
        if (subject && paper) {
            return subject + " p" + paper;
        }
        return String(
            entry && (entry.code || entry.label) || "paper"
        );
    }

    function getScheduledPaperHref(entry) {
        if (!entry) {
            return "";
        }
        if (entry.href) {
            return entry.href;
        }
        if (entry.path) {
            return "../" + entry.path;
        }
        if (entry.questionPath) {
            return "../viewer/?file=" +
                encodeURIComponent(entry.questionPath);
        }
        return "";
    }

    function navigateToScheduledPaper(entry) {
        const href = getScheduledPaperHref(entry);
        if (href) {
            window.location.assign(href);
        }
    }

    const calendarColours = [
        "default",
        "orange",
        "blue",
        "green",
        "purple",
        "red",
        "yellow"
    ];

    let contextEntry = null;
    let contextSourceDate = null;

    function normalizeCalendarColor(value) {
        const normalized = String(value || "default").toLowerCase();
        return calendarColours.includes(normalized)
            ? normalized
            : "default";
    }

    function closeCalendarContextMenu() {
        const menu = document.getElementById("calendarContextMenu");
        if (!menu) {
            return;
        }
        menu.classList.remove("open");
        menu.setAttribute("aria-hidden", "true");
        contextEntry = null;
        contextSourceDate = null;
    }

    function openCalendarContextMenu(event, entry, dateKeyValue) {
        event.preventDefault();
        event.stopPropagation();

        const menu = document.getElementById("calendarContextMenu");
        const title = document.getElementById("calendarContextTitle");
        const dateInput = document.getElementById("calendarContextDate");

        contextEntry = entry;
        contextSourceDate = dateKeyValue;

        title.textContent = formatScheduledEntryLabel(entry);
        dateInput.value = dateKeyValue;

        menu.classList.add("open");
        menu.setAttribute("aria-hidden", "false");

        const menuWidth = menu.offsetWidth || 240;
        const menuHeight = menu.offsetHeight || 260;
        const margin = 10;
        const left = Math.min(
            event.clientX,
            window.innerWidth - menuWidth - margin
        );
        const top = Math.min(
            event.clientY,
            window.innerHeight - menuHeight - margin
        );

        menu.style.left = Math.max(margin, left) + "px";
        menu.style.top = Math.max(margin, top) + "px";
    }

    async function deleteContextEntry() {
        if (!contextEntry) {
            return;
        }

        const entryId = contextEntry.id;
        closeCalendarContextMenu();

        try {
            await CashewUserData.deleteCalendarEvent(entryId);
            await refreshSchedule();
        } catch (error) {
            console.error(
                "cashewpapers: unable to delete calendar event",
                error
            );
        }
    }

    async function moveContextEntry() {
        if (!contextEntry) {
            return;
        }

        const dateInput = document.getElementById("calendarContextDate");
        const nextDate = String(dateInput.value || "");

        if (!nextDate || nextDate === contextSourceDate) {
            closeCalendarContextMenu();
            return;
        }

        const entryId = contextEntry.id;
        closeCalendarContextMenu();

        try {
            await CashewUserData.updateCalendarEvent(
                entryId,
                { date: nextDate }
            );
            await refreshSchedule();
        } catch (error) {
            console.error(
                "cashewpapers: unable to move calendar event",
                error
            );
        }
    }

    async function setContextEntryColor(color) {
        if (!contextEntry) {
            return;
        }

        const normalized = normalizeCalendarColor(color);
        const entryId = contextEntry.id;
        closeCalendarContextMenu();

        try {
            await CashewUserData.updateCalendarEvent(
                entryId,
                { color: normalized }
            );
            await refreshSchedule();
        } catch (error) {
            console.error(
                "cashewpapers: unable to colour calendar event",
                error
            );
        }
    }

    function initializeCalendarContextMenu() {
        document
            .getElementById("calendarContextDelete")
            .addEventListener("click", deleteContextEntry);

        document
            .getElementById("calendarContextMove")
            .addEventListener("click", moveContextEntry);

        document
            .getElementById("calendarContextColours")
            .addEventListener("click", event => {
                const button = event.target.closest("[data-color]");
                if (!button) {
                    return;
                }
                setContextEntryColor(button.dataset.color);
            });

        document
            .getElementById("calendarContextMenu")
            .addEventListener("contextmenu", event => {
                event.preventDefault();
            });

        document.addEventListener("click", event => {
            if (!event.target.closest("#calendarContextMenu")) {
                closeCalendarContextMenu();
            }

        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeCalendarContextMenu();
            }
        });

        window.addEventListener("resize", closeCalendarContextMenu);
        window.addEventListener("scroll", closeCalendarContextMenu, true);
    }

    function renderGrid() {
        const grid = document.getElementById("calendarGrid");
        const title = document.getElementById("calendarMonthTitle");

        title.textContent = formatMonthTitle(currentMonth);

        const firstOfMonth = new Date(currentMonth);
        const startOffset = firstOfMonth.getDay();
        const gridStart = new Date(firstOfMonth);
        gridStart.setDate(gridStart.getDate() - startOffset);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = "";

        for (let i = 0; i < 42; i++) {
            const cellDate = new Date(gridStart);
            cellDate.setDate(cellDate.getDate() + i);

            const key = dateKey(cellDate);
            const outside =
                cellDate.getMonth() !==
                currentMonth.getMonth();
            const isToday =
                cellDate.getTime() === today.getTime();
            const entries = schedule[key] || [];

            const renderEntryPill = entry => {
                const color = normalizeCalendarColor(entry.color);
                return (
                    '<div class="calendar-entry-pill" ' +
                    'data-scheduled-entry="true" ' +
                    'data-calendar-color="' +
                    escapeHtml(color) +
                    '" ' +
                    'data-event-id="' +
                    escapeHtml(entry.id) +
                    '">' +
                    escapeHtml(
                        formatScheduledEntryLabel(entry)
                    ) +
                    "</div>"
                );
            };

            const pills = entries
                .map(renderEntryPill)
                .join("");

            html +=
                '<div class="calendar-cell' +
                (outside ? " outside" : "") +
                (isToday ? " today" : "") +
                '" data-date="' + key + '">' +
                '<div class="calendar-date-num">' +
                cellDate.getDate() +
                "</div>" +
                pills +
                "</div>";
        }

        grid.innerHTML = html;

        grid.querySelectorAll(".calendar-cell")
            .forEach(cell => {
                cell.addEventListener("click", event => {
                    const entryElement =
                        event.target.closest(
                            "[data-scheduled-entry]"
                        );

                    if (entryElement) {
                        const entries =
                            schedule[cell.dataset.date] || [];
                        const entryId = entryElement.dataset.eventId;
                        const entry = entries.find(
                            item => String(item.id) === String(entryId)
                        );

                        if (entry) {
                            navigateToScheduledPaper(entry);
                            return;
                        }
                    }

                    openDayModal(cell.dataset.date);
                });
            });

        grid.querySelectorAll("[data-scheduled-entry]")
            .forEach(entryElement => {
                entryElement.addEventListener("contextmenu", event => {
                    const cell = entryElement.closest(".calendar-cell");
                    if (!cell) {
                        return;
                    }

                    const entries = schedule[cell.dataset.date] || [];
                    const entryId = entryElement.dataset.eventId;
                    const entry = entries.find(
                        item => String(item.id) === String(entryId)
                    );

                    if (!entry) {
                        return;
                    }

                    openCalendarContextMenu(
                        event,
                        entry,
                        cell.dataset.date
                    );
                });
            });
    }

    async function openDayModal(key) {
        selectedDateKey = key;

        const modal =
            document.getElementById("calendarDayModal");
        const modalTitle =
            document.getElementById("calendarModalTitle");
        const errorBox =
            document.getElementById("calendarModalError");

        errorBox.textContent = "";

        const parsed =
            new Date(key + "T00:00:00");

        modalTitle.textContent =
            parsed.toLocaleDateString(
                "en-US",
                {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                }
            );

        if (schedulingActive) {
            await addSchedulingPaperToDate(key);
        }

        renderModalEntries();
        modal.classList.add("open");
    }

    function closeDayModal() {
        document
            .getElementById("calendarDayModal")
            .classList.remove("open");

        document
            .getElementById("calendarModalError")
            .textContent = "";

        const input =
            document.getElementById("calendarAddInput");
        if (input) {
            input.value = "";
        }
    }

    function renderModalEntries() {
        const entries = schedule[selectedDateKey] || [];
        const container =
            document.getElementById("calendarModalEntries");

        if (!entries.length) {
            container.innerHTML =
                '<div class="muted">Nothing scheduled yet.</div>';
            return;
        }

        container.innerHTML = entries.map(entry => {
            const href = getScheduledPaperHref(entry);
            const label =
                formatScheduledEntryLabel(entry);
            const detail = entry.code || "";

            return (
                '<div class="attempt-row">' +
                '<div class="attempt-row-text">' +
                (
                    href
                        ? '<a href="' +
                          escapeHtml(href) +
                          '" class="scheduled-paper-link">' +
                          escapeHtml(label) +
                          "</a>"
                        : escapeHtml(label)
                ) +
                (
                    detail
                        ? '<div class="muted">' +
                          escapeHtml(detail) +
                          "</div>"
                        : ""
                ) +
                "</div>" +
                '<button type="button" class="attempt-remove" ' +
                'data-event-id="' +
                escapeHtml(entry.id) +
                '" aria-label="remove">×</button>' +
                "</div>"
            );
        }).join("");

        container.querySelectorAll(".attempt-remove")
            .forEach(button => {
                button.addEventListener("click", async event => {
                    event.preventDefault();
                    event.stopPropagation();

                    try {
                        await CashewUserData.deleteCalendarEvent(
                            button.dataset.eventId
                        );
                        await refreshSchedule();
                    } catch (error) {
                        document.getElementById(
                            "calendarModalError"
                        ).textContent =
                            "couldn't remove that paper.";
                    }
                });
            });
    }

    async function addEntryToDate(key, entry) {
        await CashewUserData.addCalendarEvent(
            key,
            entry
        );
        await loadSchedule();
    }

    async function addSchedulingPaperToDate(key) {
        try {
            await addEntryToDate(key, {
                code: schedulingCode || "paper",
                subject: schedulingSubject || "",
                paper: schedulingPaper || "",
                path: schedulingPath || "",
                questionPath: schedulingFile || "",
                paperKey: schedulingKey || ""
            });

            schedulingActive = false;
            renderBanner();
            renderGrid();

            const url = new URL(window.location.href);
            url.searchParams.delete("key");
            url.searchParams.delete("code");
            url.searchParams.delete("subject");
            window.history.replaceState({}, "", url.toString());
        } catch (error) {
            console.error(
                "cashewpapers: unable to schedule paper",
                error
            );
        }
    }

    async function handleAddFormSubmit(event) {
        event.preventDefault();

        const input =
            document.getElementById("calendarAddInput");
        const errorBox =
            document.getElementById("calendarModalError");
        const value =
            input.value.trim().toLowerCase();

        if (!value) {
            return;
        }

        const user = await getCurrentUser();
        if (!user) {
            window.location.href = "../login/";
            return;
        }

        const index =
            typeof cashewPaperSearchIndex !== "undefined"
                ? cashewPaperSearchIndex
                : {};
        const match = index[value];

        if (!match) {
            errorBox.textContent =
                "couldn't find a paper with that code.";
            return;
        }

        try {
            await addEntryToDate(selectedDateKey, {
                code: match.code,
                subject: match.subject || "",
                paper: match.paper || "",
                path: match.path || "",
                questionPath: match.questionPath || "",
                paperKey: match.code || ""
            });

            input.value = "";
            errorBox.textContent = "";
            renderModalEntries();
            renderGrid();
        } catch (error) {
            errorBox.textContent =
                "couldn't add that paper.";
        }
    }

    document
        .getElementById("calendarPrevMonth")
        .addEventListener("click", () => {
            currentMonth.setMonth(
                currentMonth.getMonth() - 1
            );
            renderGrid();
        });

    document
        .getElementById("calendarNextMonth")
        .addEventListener("click", () => {
            currentMonth.setMonth(
                currentMonth.getMonth() + 1
            );
            renderGrid();
        });

    document
        .getElementById("calendarModalClose")
        .addEventListener("click", closeDayModal);

    document
        .getElementById("calendarDayModal")
        .addEventListener("click", event => {
            if (
                event.target.id ===
                "calendarDayModal"
            ) {
                closeDayModal();
            }
        });

    document
        .getElementById("calendarAddForm")
        .addEventListener(
            "submit",
            handleAddFormSubmit
        );

    let calendarUserId =
        null;

    getCurrentUser()
        .then(user => {

            calendarUserId =
                user
                    ? String(user.id)
                    : null;

        });

    window.addEventListener(
        "cashew-auth-change",
        async () => {

            const user =
                await getCurrentUser();

            const nextUserId =
                user
                    ? String(user.id)
                    : null;

            if (
                nextUserId ===
                calendarUserId
            ) {
                return;
            }

            calendarUserId =
                nextUserId;

            try {
                await refreshSchedule();
            } catch (error) {
                schedule = {};
                renderGrid();
            }

        }
    );

    initializeCalendarContextMenu();
    renderDayLabels();
    renderBanner();

    /*
       Render the calendar shell immediately. Account-owned scheduled entries
       are filled from the cache/Supabase asynchronously afterward.
    */
    renderGrid();

    loadSchedule()
        .then(() => {

            renderGrid();

            if (selectedDateKey) {
                renderModalEntries();
            }

        })
        .catch(error => {

            console.error(
                "cashewpapers: unable to load calendar",
                error
            );

            schedule = {};
            renderGrid();

        });

})();

            </script>

        `,

        1

    );

}


/* ============================================================
   CATEGORIZED SUBJECT SCANNING

   Builds the per-category year/session/paper tree for one
   category of one subject, writes its pages, and adds its
   papers to the search index. This is exactly the algorithm
   the original generator used only for mathematics, now
   applied to any subject in SUBJECT_CATEGORIES.
   ============================================================ */

function buildCategoryYears(subjectKey, categoryKey) {

    const categoryYears = {};

    for (const file of scanFiles(path.join(PAPERS_DIR, subjectKey, categoryKey))) {

        if (!file.relative.toLowerCase().endsWith(".pdf")) {
            continue;
        }

        const parts = file.relative.split(path.sep);

        if (parts.length < 3) {
            continue;
        }

        const year = parts[0];
        const sessionFolder = parts[1];
        const filename = parts[2];

        const parsed = parsePaperFilename(filename);

        if (!parsed) {
            continue;
        }

        if (!categoryYears[year]) {
            categoryYears[year] = {};
        }

        if (!categoryYears[year][sessionFolder]) {

            categoryYears[year][sessionFolder] = {
                sessionCode: parsed.sessionCode,
                papers: {}
            };

        }

        const session = categoryYears[year][sessionFolder];

        if (!session.papers[parsed.paper]) {

            session.papers[parsed.paper] = {
                paper: parsed.paper,
                question: null,
                markScheme: null,
                examinerReport: null,
                insert: null,
                code: null
            };

        }

        const paper = session.papers[parsed.paper];

        const publicPath = path
            .join("papers", subjectKey, categoryKey, file.relative)
            .split(path.sep)
            .join("/");

        if (parsed.type === "qp") {
            paper.question = publicPath;
            paper.code = filename.replace(/\.pdf$/i, "");
        }

        if (parsed.type === "ms") {
            paper.markScheme = publicPath;
        }

        if (parsed.type === "er") {
            paper.examinerReport = publicPath;
        }

        if (parsed.type === "in") {
            paper.insert = publicPath;
        }

    }

    return categoryYears;

}

function writeCategorizedSubjectPages(subjectKey, data) {

    const categories = getCategories(subjectKey);

    for (const [categoryKey] of categories) {

        const categoryYears = buildCategoryYears(subjectKey, categoryKey);

        /* Keep the search index up to date for this category */

        for (const [year, sessions] of Object.entries(categoryYears)) {

            for (const session of Object.values(sessions)) {

                const slug = sessionSlug(session.sessionCode);

                for (const paper of Object.values(session.papers)) {

                    if (!paper.code) {
                        continue;
                    }

                    PAPER_SEARCH_INDEX[paper.code.toLowerCase()] = {
                        path: `${subjectKey}/${categoryKey}/${year}/${slug}/#paper-${paper.code}`,
                        code: paper.code
                    };

                }

            }

        }

        const categoryDir = path.join(DIST_DIR, subjectKey, categoryKey);

        writeFile(
            path.join(categoryDir, "index.html"),
            generateCategoryPage(subjectKey, data.subject, categoryKey, categoryYears)
        );

        for (const [year, sessions] of Object.entries(categoryYears)) {

            writeFile(
                path.join(categoryDir, year, "index.html"),
                generateYearPage(subjectKey, data.subject, categoryKey, year, sessions)
            );

            writeFile(
                path.join(categoryDir, year, "all", "index.html"),
                generateAllPapersPage(
                    subjectKey,
                    data.subject,
                    categoryKey,
                    year,
                    sessions
                )
            );

            for (const [folder, session] of Object.entries(sessions)) {

                const slug = sessionSlug(session.sessionCode);

                writeFile(
                    path.join(categoryDir, year, slug, "index.html"),
                    generateSessionPage(subjectKey, data.subject, categoryKey, year, session)
                );

            }

        }

    }

}

function writeUncategorizedSubjectPages(subjectKey, data) {

    for (const [year, sessions] of Object.entries(data.years)) {

        writeFile(
            path.join(DIST_DIR, subjectKey, year, "index.html"),
            generateYearPage(subjectKey, data.subject, null, year, sessions)
        );

        writeFile(
            path.join(DIST_DIR, subjectKey, year, "all", "index.html"),
            generateAllPapersPage(
                subjectKey,
                data.subject,
                null,
                year,
                sessions
            )
        );

        for (const [folder, session] of Object.entries(sessions)) {

            const slug = sessionSlug(session.sessionCode);

            writeFile(
                path.join(DIST_DIR, subjectKey, year, slug, "index.html"),
                generateSessionPage(subjectKey, data.subject, null, year, session)
            );

        }

    }

}


/* ============================================================
   GENERATE EVERYTHING
   ============================================================ */

function generate() {

    const subjects = readJSON(SUBJECTS_FILE);

    const database = buildDatabase(subjects);

    PAPER_SEARCH_INDEX = buildPaperSearchIndex(database);

    for (const subjectKey of Object.keys(SUBJECT_CATEGORIES)) {
        addCategorizedSearchIndex(subjectKey, subjects[subjectKey].name);
    }

    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }

    ensureDir(DIST_DIR);

    /* Search script */

    writeSearchScript();

    /* Image assets */

    copyImageAssets();

    /* Shared CSS */

    writeFile(path.join(DIST_DIR, "style.css"), CSS);

    /* Authentication */

    fs.copyFileSync(
        path.join(WEB_DIR, "auth.js"),
        path.join(DIST_DIR, "auth.js")
    );

    /* Account data layer */

    fs.copyFileSync(
        path.join(WEB_DIR, "user-data.js"),
        path.join(DIST_DIR, "user-data.js")
    );

    /* Home */

    writeFile(path.join(DIST_DIR, "index.html"), generateHome(subjects));

    /* Subject selection */

    writeFile(
        path.join(DIST_DIR, "select-subjects", "index.html"),
        generateSubjectSelectionPage(subjects)
    );

    /* Authentication pages */

    writeFile(path.join(DIST_DIR, "login", "index.html"), generateLoginPage());

    writeFile(path.join(DIST_DIR, "signup", "index.html"), generateSignupPage());

    writeFile(path.join(DIST_DIR, "account", "index.html"), generateAccountPage());

    writeFile(
        path.join(DIST_DIR, "email-confirmed", "index.html"),
        generateEmailConfirmedPage()
    );

    /* Native PDF Viewer */

    writeFile(path.join(DIST_DIR, "viewer", "index.html"), generatePdfReaderPage());

    /* Paper Marking */

    writeFile(path.join(DIST_DIR, "mark", "index.html"), generateMarkingPage());

    /* Scheduler / calendar */

    writeFile(path.join(DIST_DIR, "scheduler", "index.html"), generateSchedulerPage());

    /* Copy PDFs */

    for (const file of scanFiles(PAPERS_DIR)) {

        const target = path.join(DIST_DIR, "papers", file.relative);

        ensureDir(path.dirname(target));

        fs.copyFileSync(file.absolute, target);

    }

    /* Generate subject pages */

    for (const [subjectKey, data] of Object.entries(database)) {

        const subjectDir = path.join(DIST_DIR, subjectKey);

        /* Subject homepage */

        writeFile(
            path.join(subjectDir, "index.html"),
            generateSubjectPage(subjectKey, data)
        );

        /* Categorized subjects (mathematics, sciences, ...) */

        if (hasCategories(subjectKey)) {

            writeCategorizedSubjectPages(subjectKey, data);

        }

        /* Normal subjects */

        else {

            writeUncategorizedSubjectPages(subjectKey, data);

        }

    }

    console.log("Cashew Papers build complete.");

}


/* ============================================================
   RUN
   ============================================================ */

generate();
