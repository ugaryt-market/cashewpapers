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
Version Alpha 0.1.76
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
let PAPER_SEARCH_SUBJECTS = {};

function buildPaperSearchIndex(database) {

PAPER_SEARCH_SUBJECTS = Object.fromEntries(
    Object.entries(database).map(([key, data]) => [key, data.subject])
);

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
                    subjectKey,
                    subjectName: data.subject.name,
                    categoryKey: null,
                    year,
                    sessionCode: session.sessionCode,
                    paperNumber: paper.paper
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
function addCategorizedSearchIndex(subjectKey) {

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

        const subjectInfo = PAPER_SEARCH_SUBJECTS[subjectKey] || {};

        PAPER_SEARCH_INDEX[code.toLowerCase()] = {
            path: `${subjectKey}/${categoryKey}/${year}/${sessionSlug(parsed.sessionCode)}/#paper-${code}`,
            code,
            subjectKey,
            subjectName: subjectInfo.name || subjectKey,
            categoryKey,
            year,
            sessionCode: parsed.sessionCode,
            paperNumber: parsed.paper
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
    .replace(/\\s+/g, "");

}

function escapeSearchHtml(value) {

return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function getPaperSearchItems() {

return Object.values(cashewPaperSearchIndex || {})
    .filter(item => item && item.code && item.path);

}

function getPaperSuggestionLabel(item) {

const subject = String(item.subjectName || item.subjectKey || "paper")
    .toLowerCase();

const number = String(item.paperNumber || "");
const component = number ? "p" + number.charAt(0) : "paper";

return subject + " " + component;

}

function scorePaperSuggestion(item, query) {

const q = String(query || "").trim().toLowerCase();

if (!q) {
    return 0;
}

const normalized = normalizePaperSearchCode(q);
const code = String(item.code || "").toLowerCase();
const label = getPaperSuggestionLabel(item);
const subject = String(item.subjectName || item.subjectKey || "").toLowerCase();
const category = String(item.categoryKey || "").toLowerCase();
const year = String(item.year || "").toLowerCase();
const session = String(item.sessionCode || "").toLowerCase();
const paper = String(item.paperNumber || "").toLowerCase();

if (code === normalized) {
    return 1000;
}

const terms = q
    .split(/\\s+/)
    .map(term => term.trim())
    .filter(Boolean);

let score = 0;

if (code.startsWith(normalized)) score += 180;
if (code.includes(normalized)) score += 120;
if (label.startsWith(q)) score += 110;
if (subject.startsWith(q)) score += 90;
if (subject.includes(q)) score += 60;
if (category.includes(q)) score += 25;
if (year === q) score += 45;
if (session === q) score += 40;
if (paper === q || (paper && ("p" + paper.charAt(0)) === q)) score += 60;

for (const term of terms) {
    if (code.includes(term)) score += 28;
    if (label.includes(term)) score += 24;
    if (subject.includes(term)) score += 20;
    if (category.includes(term)) score += 10;
    if (year.includes(term)) score += 12;
    if (session.includes(term)) score += 12;
    if (paper.includes(term)) score += 15;
}

return score;

}

function getPaperSuggestions(query, limit = 8) {

const q = String(query || "").trim();

if (!q) {
    return [];
}

return getPaperSearchItems()
    .map(item => ({ item, score: scorePaperSuggestion(item, q) }))
    .filter(result => result.score > 0)
    .sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }

        return String(a.item.code).localeCompare(String(b.item.code));
    })
    .slice(0, limit)
    .map(result => result.item);

}

function closePaperSuggestions(container) {

if (!container) {
    return;
}

container.classList.remove("open");
container.innerHTML = "";

}

function attachPaperSuggestions(input, container, onPick) {

if (!input || !container) {
    return;
}

function render() {

    const query = input.value.trim();
    const suggestions = getPaperSuggestions(query);

    if (!query || !suggestions.length) {
        closePaperSuggestions(container);
        return;
    }

    container.innerHTML = suggestions
        .map(item =>
            '<button type="button" class="paper-search-suggestion" ' +
            'data-search-code="' + escapeSearchHtml(item.code) + '">' +
                '<span class="paper-search-suggestion-main">' +
                    escapeSearchHtml(getPaperSuggestionLabel(item)) +
                '</span>' +
                '<span class="paper-search-suggestion-code">' +
                    escapeSearchHtml(item.code) +
                '</span>' +
            '</button>'
        )
        .join("");

    container.classList.add("open");

    container.querySelectorAll(".paper-search-suggestion").forEach(button => {
        button.addEventListener("mousedown", event => {
            event.preventDefault();
        });

        button.addEventListener("click", () => {
            const code = button.dataset.searchCode || "";
            input.value = code;
            closePaperSuggestions(container);

            if (typeof onPick === "function") {
                onPick(code);
            }
        });
    });

}

input.addEventListener("input", render);
input.addEventListener("focus", render);

input.addEventListener("blur", () => {
    window.setTimeout(() => closePaperSuggestions(container), 120);
});

return render;

}

function highlightPaper(code) {

const normalized = normalizePaperSearchCode(code);

const target = document.querySelector(
    "[data-paper-code=\\\"" + normalized + "\\\"]"
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

const suggestionContainer = document.createElement("div");
suggestionContainer.className = "paper-search-suggestions";
suggestionContainer.setAttribute("role", "listbox");
form.appendChild(suggestionContainer);

function updateArrow() {
    form.classList.toggle("has-text", input.value.trim().length > 0);
}

attachPaperSuggestions(input, suggestionContainer, code => {
    runPaperSearch(code);
});

input.addEventListener("input", updateArrow);

input.addEventListener("keydown", event => {

    if (event.key === "Enter") {
        event.preventDefault();
        runPaperSearch(input.value);
    }

    if (event.key === "Escape") {
        closePaperSuggestions(suggestionContainer);
    }

});

button.addEventListener("click", () => {
    runPaperSearch(input.value);
});

updateArrow();

}

window.runPaperSearch = runPaperSearch;
window.cashewPaperSearchIndex = cashewPaperSearchIndex;
window.getPaperSuggestions = getPaperSuggestions;
window.getPaperSuggestionLabel = getPaperSuggestionLabel;
window.attachPaperSuggestions = attachPaperSuggestions;
window.closePaperSuggestions = closePaperSuggestions;

(function bindScheduleAuthCleanup() {

function getAuthClient() {
    try {
        if (typeof supabaseClient !== "undefined" && supabaseClient && supabaseClient.auth) {
            return supabaseClient;
        }
    } catch (error) {}

    try {
        if (typeof supabase !== "undefined" && supabase && supabase.auth) {
            return supabase;
        }
    } catch (error) {}

    if (window.cashewSupabase && window.cashewSupabase.auth) {
        return window.cashewSupabase;
    }

    return null;
}

const authClient = getAuthClient();

if (authClient && typeof authClient.auth.onAuthStateChange === "function") {
    authClient.auth.onAuthStateChange(event => {
        if (event === "SIGNED_OUT") {
            localStorage.removeItem("cashew-schedule");
        }
    });
}

})();

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

{
box-sizing: border-box;
margin: 0;
padding: 0;
}

 {
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

::-webkit-scrollbar-thumb {
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

.paper-search input {
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

.paper-search(input()) button {
display: flex;
}

.paper-search button {
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

.nav-account {
opacity: 0.9;
}

.nav-calendar-button {
background: #3a3c3f;
color: var(--text);
border: 1px solid var(--border);
}

.nav-calendar-button {
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

.breadcrumb-item {
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

.subject-card,
.category-card,
.session-card,
.paper-card,
.year-session-card {
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

.year-link {
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
.paper-card uses transform, which creates a stacking context.
Raising the active card itself prevents later cards from painting
over its attempt form/history.
*/
.paper-card(.attempt-form),
.paper-card(.attempt-history.open) {
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

.paper-calendar-button {
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

.paper-status {
transform: translateY(-1px);
border-color: var(--muted);
background: #3a3c3f;
}

.paper-status.completed {
background: #3a3127;
border: 1px solid var(--subdued);
color: var(--primary);
}

.paper-status.completed {
background: #40382e;
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

.attempt-button,
.attempt-summary {
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

.attempt-remove {
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

.attempt-form-close {
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

.attempt-input {
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

.calendar-nav-arrow {
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

.calendar-cell {
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

.paper-search-suggestions {
position: absolute;
top: calc(100% + 8px);
left: 0;
right: 0;
z-index: 1200;
display: none;
overflow: hidden;
border: 1px solid var(--border);
border-radius: 12px;
background: #2c2e31;
box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);
}

.paper-search-suggestions.open {
display: block;
}

.calendar-add-suggestions {
position: static;
width: 100%;
margin-top: 8px;
}

.paper-search-suggestion {
width: 100%;
border: none;
border-bottom: 1px solid var(--border);
background: transparent;
color: var(--text);
padding: 10px 12px;
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
text-align: left;
cursor: pointer;
}

.paper-search-suggestion {
border-bottom: none;
}

.paper-search-suggestion,
.paper-search-suggestion {
background: #3a3c3f;
outline: none;
}

.paper-search-suggestion-main {
font-size: 13px;
color: var(--text);
}

.paper-search-suggestion-code {
color: var(--muted);
font-family: "JetBrains Mono", monospace;
font-size: 11px;
white-space: nowrap;
}

.calendar-entry-button {
width: 100%;
border: none;
text-align: left;
cursor: pointer;
}

.calendar-entry-pill {
background: #414346;
border-color: var(--subdued);
}

.calendar-entry-pill {
font-size: 11px;
padding: 3px 6px;
border-radius: 6px;
background: #3a3c3f;
color: var(--text);
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
font-family: "JetBrains Mono", monospace;
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
position: relative;
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

.calendar-modal-entry-link {
color: var(--text);
font-size: 13px;
}

.calendar-modal-entry-link {
color: var(--primary);
}

.calendar-add-suggestions {
position: relative;
top: auto;
left: auto;
right: auto;
width: 100%;
margin-top: 8px;
z-index: 900;
}

/* ---------------- NATIVE PDF VIEWER ---------------- */

body(.native-pdf-page) {
overflow-y: auto;
overflow-x: hidden;
}

body(.native-pdf-page) footer {
display: none;
}

body(.native-pdf-page) main {
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

.native-pdf-return {
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

.native-pdf-fullscreen {
background: #414346;
border-color: var(--subdued);
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

body(.home-page) {
overflow: hidden;
}

body(.home-page) main {
min-height: calc(100dvh - 118px);
overflow: hidden;
padding-bottom: 8px;
}

body(.home-page) footer {
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

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
    ${String(title).toLowerCase()} · cashew papers
</title>

<link rel="stylesheet" href="${prefix}style.css?v=0.1.76">

<link rel="preconnect" href="https://fonts.googleapis.com">

<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<link
    href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Questrial&display=swap"
    rel="stylesheet"
>

<link rel="icon" type="image/svg+xml" href="${prefix}assets/favicon.svg">

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script src="${prefix}auth.js?v=0.1.76"></script>

<script src="${prefix}search.js?v=0.1.76"></script>

</head>

<body data-search-prefix="${prefix}">

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
            title="scheduler"
        >
            calendar
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

document.addEventListener("DOMContentLoaded", () => {
    updateAuthNavigation();
    initializePaperProgress();
    initializeOverviewProgress();
});

window.addEventListener("cashew-auth-change", () => {
    updateAuthNavigation();
    initializePaperProgress();
    initializeOverviewProgress();
});

function getPaperStatus(key) {
    return localStorage.getItem("cashew-paper-status-" + key) || "incomplete";
}

function setPaperStatus(key, status) {
    localStorage.setItem("cashew-paper-status-" + key, status);
}

function getPaperAttempts(key) {

    try {

        const value = localStorage.getItem("cashew-paper-attempts-" + key);

        if (!value) {
            return [];
        }

        const attempts = JSON.parse(value);

        return Array.isArray(attempts) ? attempts : [];

    } catch (error) {

        return [];

    }

}

function setPaperAttempts(key, attempts) {
    localStorage.setItem(
        "cashew-paper-attempts-" + key,
        JSON.stringify(attempts)
    );
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

function renderPaperStatus(button, status) {

    button.classList.remove("completed");

    if (status === "completed") {

        button.classList.add("completed");
        button.innerHTML = "✓ Completed";
        button.title = "Click to mark as incomplete";
        button.setAttribute("aria-label", "Mark paper as incomplete");

    } else {

        button.innerHTML = "☐ Mark as completed";
        button.title = "Click to mark as completed";
        button.setAttribute("aria-label", "Mark paper as completed");

    }

}

function renderPaperAttempts(progress, key, completed, user) {

    const attemptsContainer =
        progress.querySelector("[data-paper-attempts]");

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

    if (attempts.length === 0) {
        return;
    }

    /*
       Keep the card preview compact. The first ten scores remain visible;
       when there are more than ten attempts, "see more" is appended.
       It opens the history popup only; the Add Attempt GUI remains the
       same compact score-entry GUI regardless of attempt count.
    */
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
                    String(attempt.score)
            )
            .join(" · ");

    const summaryButton =
        document.createElement("button");

    summaryButton.type =
        "button";

    summaryButton.className =
        "attempt-summary";

    summaryButton.textContent =
        String(attempts.length) +
        " " +
        (
            attempts.length === 1
                ? "attempt"
                : "attempts"
        ) +
        (
            previewScores
                ? " · " + previewScores
                : ""
        ) +
        (
            attempts.length > 6
                ? " · see more"
                : ""
        );

    summaryButton.setAttribute(
        "aria-expanded",
        "false"
    );

    const history =
        document.createElement("div");

    history.className =
        "attempt-history";

    attempts.forEach(
        (attempt, index) => {

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

function createAttemptHistoryRow(
    progress,
    key,
    attempt,
    index
) {

    const row =
        document.createElement("div");

    row.className =
        "attempt-row";

    const rowText =
        document.createElement("div");

    rowText.className =
        "attempt-row-text";

    rowText.textContent =
        "Attempt " +
        String(index + 1) +
        " / " +
        String(attempt.score) +
        " marks / " +
        formatAttemptDate(
            attempt.date
        );

    const removeButton =
        document.createElement("button");

    removeButton.type =
        "button";

    removeButton.className =
        "attempt-remove";

    removeButton.textContent =
        "×";

    removeButton.setAttribute(
        "aria-label",
        "Remove attempt " +
        String(index + 1)
    );

    removeButton.title =
        "Remove attempt";

    removeButton.addEventListener(
        "click",
        async event => {

            event.preventDefault();
            event.stopPropagation();

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

            const attempts =
                getPaperAttempts(key);

            attempts.splice(
                index,
                1
            );

            setPaperAttempts(
                key,
                attempts
            );

            const historyWasOpen =
                row.parentElement &&
                row.parentElement.classList.contains(
                    "open"
                );

            renderPaperAttempts(
                progress,
                key,
                getPaperStatus(key) ===
                    "completed",
                currentUser
            );

            if (historyWasOpen) {

                const newHistory =
                    progress.querySelector(
                        ".attempt-history"
                    );

                if (newHistory) {
                    newHistory.classList.add(
                        "open"
                    );
                }

            }

        }
    );

    row.appendChild(
        rowText
    );

    row.appendChild(
        removeButton
    );

    return row;

}

function openAttemptForm(progress, key) {

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

    const title =
        document.createElement("div");

    title.className =
        "attempt-form-title";

    const titleText =
        document.createElement("span");

    titleText.textContent =
        "add attempt";

    const closeButton =
        document.createElement("button");

    closeButton.type =
        "button";

    closeButton.className =
        "attempt-form-close";

    closeButton.textContent =
        "×";

    closeButton.setAttribute(
        "aria-label",
        "Close add attempt"
    );

    closeButton.title =
        "Close";

    closeButton.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            form.remove();

        }
    );

    title.appendChild(
        titleText
    );

    title.appendChild(
        closeButton
    );

    const input =
        document.createElement("input");

    input.className =
        "attempt-input";

    input.type =
        "number";

    input.step =
        "1";

    input.min =
        "0";

    input.max =
        "100";

    input.inputMode =
        "numeric";

    input.placeholder =
        "score";

    input.setAttribute(
        "aria-label",
        "Attempt score"
    );

    input.required =
        true;

    const saveButton =
        document.createElement("button");

    saveButton.type =
        "submit";

    saveButton.className =
        "attempt-save";

    saveButton.textContent =
        "save";

    const cancelButton =
        document.createElement("button");

    cancelButton.type =
        "button";

    cancelButton.className =
        "attempt-cancel";

    cancelButton.textContent =
        "cancel";

    cancelButton.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            form.remove();

        }
    );

    const actions =
        document.createElement("div");

    actions.className =
        "attempt-form-actions";

    actions.appendChild(
        saveButton
    );

    actions.appendChild(
        cancelButton
    );

    form.appendChild(
        title
    );

    form.appendChild(
        input
    );

    form.appendChild(
        actions
    );

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

            const numericScore =
                Number(score);

            if (
                !score ||
                !Number.isFinite(
                    numericScore
                ) ||
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

            const attempts =
                getPaperAttempts(key);

            attempts.push({
                score,
                date:
                    new Date().toISOString()
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

async function refreshPaperProgress(progress) {

    const button = progress.querySelector(".paper-status");
    const key = button.dataset.paperKey;

    const user = await getCurrentUser();

    const status = user ? getPaperStatus(key) : "incomplete";

    renderPaperStatus(button, status);

    renderPaperAttempts(progress, key, status === "completed", user);

}

async 
function getOverviewCompletedCount(keys) {

    return keys.reduce(
        (count, key) =>
            getPaperStatus(key) === "completed"
                ? count + 1
                : count,
        0
    );

}

async function updateOverviewProgressCard(
    card,
    user
) {

    const rawKeys =
        card.dataset.progressKeys || "";

    const keys =
        rawKeys
            ? rawKeys.split("|").filter(Boolean)
            : [];

    const total =
        Number(
            card.dataset.progressTotal ||
            keys.length
        );

    const fill =
        card.querySelector(
            "[data-overview-progress-fill]"
        );

    const label =
        card.querySelector(
            "[data-overview-progress-label]"
        );

    /*
       Progress tracking is tied to the signed-in user's local progress.
       Guests always see a zeroed bar with an explicit login prompt.
    */
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
        getOverviewCompletedCount(keys);

    const value =
        total > 0
            ? Math.round(
                (completed / total) * 100
            )
            : 0;

    if (fill) {

        fill.style.width =
            value + "%";

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
        document.querySelectorAll(
            "[data-progress-keys]"
        );

    if (!cards.length) {
        return;
    }

    const user =
        typeof getCurrentUser === "function"
            ? await getCurrentUser()
            : null;

    await Promise.all(
        Array.from(cards).map(
            card =>
                updateOverviewProgressCard(
                    card,
                    user
                )
        )
    );

}


async function initializePaperProgress() {

    const progressElements = document.querySelectorAll(".paper-progress");

    if (!progressElements.length) {
        return;
    }

    await Promise.all(
        Array.from(progressElements).map(
            refreshPaperProgress
        )
    );

}

async function togglePaperStatus(button) {

    const key = button.dataset.paperKey;
    const progress = button.closest(".paper-progress");

    const user = await getCurrentUser();

    if (!user) {
        showLoginRequired(button);
        return;
    }

    clearLoginNotice(progress);

    const current = getPaperStatus(key);
    const next = current === "completed" ? "incomplete" : "completed";

    setPaperStatus(key, next);

    renderPaperStatus(button, next);

    renderPaperAttempts(progress, key, next === "completed", user);

    initializeOverviewProgress();

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

            <div class="version">Version Alpha 0.1.76</div>

        </section>

        <div class="subject-grid">

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

const user =
    typeof getCurrentUser === "function" ? await getCurrentUser() : null;

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
const selectedSubjects = JSON.parse(
    localStorage.getItem("cashew-selected-subjects") || "[]"
);

const selectionComplete = localStorage.getItem(
    "cashew-subject-selection-complete"
);

if (!selectionComplete || selectedSubjects.length === 0) {
    return;
}

document.querySelectorAll("[data-subject]").forEach(card => {

    const subject = card.dataset.subject;

    if (!selectedSubjects.includes(subject)) {
        card.style.display = "none";
    }

});

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

                    <div class="progress-overview-bar">

                        <div
                            class="progress-overview-fill"
                            data-overview-progress-fill
                        ></div>

                    </div>

                    <div
                        class="progress-overview-label"
                        data-overview-progress-label
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

                    <div class="progress-overview-bar">

                        <div
                            class="progress-overview-fill"
                            data-overview-progress-fill
                        ></div>

                    </div>

                    <div
                        class="progress-overview-label"
                        data-overview-progress-label
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
                                class="progress-overview-fill"
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
                            "&path=" +
                            encodeURIComponent(
                                PAPER_SEARCH_INDEX[String(paperDisplayCode).toLowerCase()]
                                    ? PAPER_SEARCH_INDEX[String(paperDisplayCode).toLowerCase()].path
                                    : ""
                            );

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
            "&path=" +
            encodeURIComponent(
                PAPER_SEARCH_INDEX[String(paperDisplayCode).toLowerCase()]
                    ? PAPER_SEARCH_INDEX[String(paperDisplayCode).toLowerCase()].path
                    : ""
            );

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

                        <div class="paper-attempts" data-paper-attempts></div>

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

                <a class="native-pdf-return" id="nativePdfReturn" href="#">
                    ← return to paper selection
                </a>

                <a class="native-pdf-fullscreen" id="nativePdfFullscreen" href="#">
                    go to fullscreen →
                </a>

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

const params = new URLSearchParams(window.location.search);
const fileParam = params.get("file");

const frame = document.getElementById("nativePdfFrame");
const fullscreen = document.getElementById("nativePdfFullscreen");
const returnButton = document.getElementById("nativePdfReturn");

/*
   The past paper always opens in its own tab (target="_blank"
   from the paper card links). Returning to paper selection
   means closing this tab so the original tab regains focus.
   If, for whatever reason, this page was not opened as a
   new tab (no window.opener), fall back to browser history.
*/
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

if (!fileParam) {
    return;
}

try {

    const decodedFile = decodeURIComponent(fileParam);

    const pdfUrl = new URL("../" + decodedFile, window.location.href).href;

    frame.src = pdfUrl + "#zoom=page-fit&page=1";

    fullscreen.href = pdfUrl;

    fullscreen.addEventListener(
        "click",
        event => {

            event.preventDefault();

            window.location.replace(
                pdfUrl
            );

        }
    );

} catch (error) {

    console.error("cashewpapers native PDF viewer error:", error);

}

})();

        </script>

    `,

    1

);

}

/* ============================================================
SCHEDULER / CALENDAR PAGE

A lightweight, client-side scheduler stored entirely in
localStorage (key: "cashew-schedule"), mapping ISO dates
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

    "Scheduler",

    `
        <div class="page-header">

            ${breadcrumbHTML([
                { label: "subjects", href: "../" },
                { label: "scheduler", current: true }
            ])}

            <h1>scheduler</h1>

            <p>plan out when you'll tackle each past paper.</p>

        </div>

        <div
            id="schedulingBanner"
            class="calendar-scheduling-banner"
            style="display:none;"
        ></div>

        <div
            id="schedulerLoginNotice"
            class="calendar-scheduling-banner"
            style="display:none;"
        >
            log in to save and restore your schedule across devices.
        </div>

        <div class="calendar-shell">

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
                        placeholder="search paper code or subject..."
                        autocomplete="off"
                        spellcheck="false"
                    >

                    <button
                        type="submit"
                        class="attempt-save"
                    >
                        add
                    </button>

                </form>

                <div
                    id="calendarAddSuggestions"
                    class="paper-search-suggestions calendar-add-suggestions"
                    role="listbox"
                ></div>

                <div
                    id="calendarModalError"
                    class="calendar-modal-error"
                ></div>

            </div>

        </div>

        <script>

(function () {

const STORAGE_KEY = "cashew-schedule";
const SUPABASE_TABLE = "cashew_schedules";

const params = new URLSearchParams(window.location.search);

const schedulingKey = params.get("key");
const schedulingCode = params.get("code");
const schedulingSubject = params.get("subject");
const schedulingPath = params.get("path");

let schedulingActive = Boolean(schedulingKey);
let currentMonth = new Date();

currentMonth.setDate(1);
currentMonth.setHours(0, 0, 0, 0);

let selectedDateKey = null;
let currentUser = null;
let scheduleReady = false;

function getSupabaseClient() {

    try {

        if (typeof supabaseClient !== "undefined" && supabaseClient && typeof supabaseClient.from === "function") {
            return supabaseClient;
        }

    } catch (error) {}

    try {

        if (typeof supabase !== "undefined" && supabase && typeof supabase.from === "function") {
            return supabase;
        }

    } catch (error) {}

    if (window.cashewSupabase && typeof window.cashewSupabase.from === "function") {
        return window.cashewSupabase;
    }

    return null;

}

function loadLocalSchedule() {

    try {

        const value = localStorage.getItem(STORAGE_KEY);
        return value ? JSON.parse(value) : {};

    } catch (error) {

        return {};

    }

}

function loadSchedule() {
    return currentUser ? loadLocalSchedule() : {};
}

function saveLocalSchedule(schedule) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

function clearLocalSchedule() {
    localStorage.removeItem(STORAGE_KEY);
}

async function loadRemoteSchedule(user) {

    const client = getSupabaseClient();

    if (!client || !user) {
        return {};
    }

    const { data, error } = await client
        .from(SUPABASE_TABLE)
        .select("schedule")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("cashewpapers: could not load schedule:", error);
        return {};
    }

    return data && data.schedule && typeof data.schedule === "object"
        ? data.schedule
        : {};

}

async function persistSchedule(schedule) {

    if (!currentUser) {
        return false;
    }

    const client = getSupabaseClient();

    if (!client) {
        console.warn("cashewpapers: Supabase client was not found; schedule remains local for this session.");
        return true;
    }

    const { error } = await client
        .from(SUPABASE_TABLE)
        .upsert(
            {
                user_id: currentUser.id,
                schedule,
                updated_at: new Date().toISOString()
            },
            { onConflict: "user_id" }
        );

    if (error) {
        console.error("cashewpapers: could not save schedule:", error);
        return false;
    }

    return true;

}

function scheduleEntryLabel(entry) {

    const subject = String(entry.subject || entry.subjectName || "paper").toLowerCase();
    const number = String(entry.paperNumber || "");
    const component = number ? "p" + number.charAt(0) : "paper";

    return subject + " " + component;

}

function scheduleEntryCode(entry) {
    return String(entry.code || entry.label || "paper");
}

function scheduleEntryHref(entry) {

    const prefix = document.body.dataset.searchPrefix || "";
    const path = String(entry.path || "");
    const code = scheduleEntryCode(entry);

    let resolvedPath = path;

    if (!resolvedPath && typeof cashewPaperSearchIndex !== "undefined") {
        const match = cashewPaperSearchIndex[String(code).toLowerCase()];
        resolvedPath = match ? match.path : "";
    }

    if (!resolvedPath) {
        return "";
    }

    const cleanPath = resolvedPath.split("#")[0];

    return prefix + cleanPath +
        "?search=" + encodeURIComponent(code) +
        "#paper-" + encodeURIComponent(code);

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

const dayLabels = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function renderDayLabels() {

    const container = document.getElementById("calendarDayLabels");

    container.innerHTML = dayLabels
        .map(label => '<div class="calendar-day-label">' + label + "</div>")
        .join("");

}

function renderBanner() {

    const banner = document.getElementById("schedulingBanner");

    if (!schedulingActive) {
        banner.style.display = "none";
        return;
    }

    banner.style.display = "block";

    banner.textContent =
        "scheduling " +
        (schedulingCode || "this paper") +
        (schedulingSubject ? " · " + schedulingSubject : "") +
        " — click a date to add it.";

}

function renderAuthNotice() {

    const notice = document.getElementById("schedulerLoginNotice");

    if (!notice) {
        return;
    }

    notice.style.display = currentUser ? "none" : "block";

}

function renderGrid() {

    const grid = document.getElementById("calendarGrid");
    const title = document.getElementById("calendarMonthTitle");
    const schedule = loadSchedule();

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
        const outside = cellDate.getMonth() !== currentMonth.getMonth();
        const isToday = cellDate.getTime() === today.getTime();

        const entries = schedule[key] || [];

        const pills = entries
            .slice(0, 3)
            .map((entry, index) => {

                const href = scheduleEntryHref(entry);

                return href
                    ? '<button type="button" class="calendar-entry-pill calendar-entry-button" data-entry-index="' + index + '">' +
                        scheduleEntryLabel(entry) +
                      "</button>"
                    : '<div class="calendar-entry-pill">' +
                        scheduleEntryLabel(entry) +
                      "</div>";

            })
            .join("");

        const more =
            entries.length > 3
                ? '<div class="calendar-entry-pill">+' + (entries.length - 3) + " more</div>"
                : "";

        html +=
            '<div class="calendar-cell' +
            (outside ? " outside" : "") +
            (isToday ? " today" : "") +
            '" data-date="' + key + '">' +
            '<div class="calendar-date-num">' + cellDate.getDate() + "</div>" +
            pills +
            more +
            "</div>";

    }

    grid.innerHTML = html;

    grid.querySelectorAll(".calendar-entry-button").forEach(button => {

        button.addEventListener("click", event => {

            event.preventDefault();
            event.stopPropagation();

            const cell = button.closest(".calendar-cell");
            const entries = loadSchedule()[cell.dataset.date] || [];
            const entry = entries[Number(button.dataset.entryIndex)];
            const href = entry ? scheduleEntryHref(entry) : "";

            if (href) {
                window.location.assign(href);
            }

        });

    });

    grid.querySelectorAll(".calendar-cell").forEach(cell => {

        cell.addEventListener("click", () => {
            openDayModal(cell.dataset.date);
        });

    });

}

async function openDayModal(key) {

    selectedDateKey = key;

    const modal = document.getElementById("calendarDayModal");
    const modalTitle = document.getElementById("calendarModalTitle");
    const errorBox = document.getElementById("calendarModalError");

    errorBox.textContent = "";

    const parsed = new Date(key + "T00:00:00");

    modalTitle.textContent = parsed.toLocaleDateString(
        "en-US",
        { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    );

    if (schedulingActive) {
        if (!currentUser) {
            errorBox.textContent = "log in before scheduling papers.";
        } else {
            await addSchedulingPaperToDate(key);
        }
    }

    renderModalEntries();
    modal.classList.add("open");

}

function closeDayModal() {

    document.getElementById("calendarDayModal").classList.remove("open");
    document.getElementById("calendarModalError").textContent = "";

    const input = document.getElementById("calendarAddInput");

    if (input) {
        input.value = "";
    }

    const suggestions = document.getElementById("calendarAddSuggestions");

    if (suggestions) {
        window.closePaperSuggestions(suggestions);
    }

}

function renderModalEntries() {

    const schedule = loadSchedule();
    const entries = schedule[selectedDateKey] || [];
    const container = document.getElementById("calendarModalEntries");

    if (entries.length === 0) {

        container.innerHTML =
            '<div class="muted">Nothing scheduled yet.</div>';

        return;

    }

    container.innerHTML = entries
        .map((entry, index) => {

            const href = scheduleEntryHref(entry);
            const label = scheduleEntryLabel(entry);
            const code = scheduleEntryCode(entry);

            return
                '<div class="attempt-row">' +
                    '<div class="attempt-row-text">' +
                        '<a href="' + href + '" class="calendar-modal-entry-link">' +
                            label +
                        '</a>' +
                        '<div class="muted">' + code + '</div>' +
                    '</div>' +
                    '<button type="button" class="attempt-remove" data-index="' + index + '" aria-label="remove">×</button>' +
                '</div>';

        })
        .join("");

    container.querySelectorAll(".attempt-remove").forEach(button => {

        button.addEventListener("click", async () => {

            const schedule = loadSchedule();
            const list = schedule[selectedDateKey] || [];

            list.splice(Number(button.dataset.index), 1);

            if (list.length === 0) {
                delete schedule[selectedDateKey];
            } else {
                schedule[selectedDateKey] = list;
            }

            saveLocalSchedule(schedule);
            await persistSchedule(schedule);

            renderModalEntries();
            renderGrid();

        });

    });

}

async function addEntryToDate(key, entry) {

    if (!currentUser) {
        return false;
    }

    const schedule = loadSchedule();

    if (!schedule[key]) {
        schedule[key] = [];
    }

    const duplicate = schedule[key].some(existing =>
        scheduleEntryCode(existing).toLowerCase() === scheduleEntryCode(entry).toLowerCase()
    );

    if (!duplicate) {
        schedule[key].push(entry);
    }

    saveLocalSchedule(schedule);
    await persistSchedule(schedule);

    return true;

}

async function addSchedulingPaperToDate(key) {

    if (!currentUser || !schedulingActive) {
        return false;
    }

    const index =
        typeof cashewPaperSearchIndex !== "undefined"
            ? cashewPaperSearchIndex
            : {};

    const match =
        index[String(schedulingCode || "").toLowerCase()] || null;

    await addEntryToDate(key, {
        code: schedulingCode || "paper",
        subject: schedulingSubject || "",
        subjectName: schedulingSubject || "",
        path: schedulingPath || (match ? match.path : ""),
        paperNumber: match ? match.paperNumber : String(schedulingKey || "").split("-").pop()
    });

    schedulingActive = false;

    renderBanner();
    renderGrid();

    const url = new URL(window.location.href);

    url.searchParams.delete("key");
    url.searchParams.delete("code");
    url.searchParams.delete("subject");
    url.searchParams.delete("path");

    window.history.replaceState({}, "", url.toString());

    return true;

}

async function handleAddFormSubmit(event) {

    event.preventDefault();

    const input = document.getElementById("calendarAddInput");
    const errorBox = document.getElementById("calendarModalError");

    const value = input.value.trim().toLowerCase();

    if (!value) {
        return;
    }

    if (!currentUser) {
        errorBox.textContent = "log in to add papers to your schedule.";
        return;
    }

    const index =
        typeof cashewPaperSearchIndex !== "undefined"
            ? cashewPaperSearchIndex
            : {};

    const match = index[value];

    if (!match) {
        errorBox.textContent = "couldn't find a paper with that code.";
        return;
    }

    await addEntryToDate(selectedDateKey, {
        code: match.code,
        subject: match.subjectName || match.subjectKey || "",
        subjectName: match.subjectName || match.subjectKey || "",
        path: match.path,
        paperNumber: match.paperNumber || ""
    });

    input.value = "";
    errorBox.textContent = "";

    const suggestions = document.getElementById("calendarAddSuggestions");
    if (suggestions) {
        window.closePaperSuggestions(suggestions);
    }

    renderModalEntries();
    renderGrid();

}

async function initializeScheduler() {

    if (typeof getCurrentUser !== "function") {
        currentUser = null;
        clearLocalSchedule();
        scheduleReady = true;
        renderAuthNotice();
        renderGrid();
        return;
    }

    currentUser = await getCurrentUser();

    if (!currentUser) {
        clearLocalSchedule();
        scheduleReady = true;
        renderAuthNotice();
        renderBanner();
        renderGrid();
        return;
    }

    const remoteSchedule = await loadRemoteSchedule(currentUser);
    saveLocalSchedule(remoteSchedule);
    scheduleReady = true;

    renderAuthNotice();
    renderBanner();
    renderGrid();

}

document
    .getElementById("calendarPrevMonth")
    .addEventListener("click", () => {

        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderGrid();

    });

document
    .getElementById("calendarNextMonth")
    .addEventListener("click", () => {

        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderGrid();

    });

document
    .getElementById("calendarModalClose")
    .addEventListener("click", closeDayModal);

document
    .getElementById("calendarDayModal")
    .addEventListener("click", event => {

        if (event.target.id === "calendarDayModal") {
            closeDayModal();
        }

    });

document
    .getElementById("calendarAddForm")
    .addEventListener("submit", handleAddFormSubmit);

const addInput = document.getElementById("calendarAddInput");
const addSuggestions = document.getElementById("calendarAddSuggestions");

if (addInput && addSuggestions && typeof window.attachPaperSuggestions === "function") {

    window.attachPaperSuggestions(addInput, addSuggestions, async code => {

        if (!currentUser) {
            document.getElementById("calendarModalError").textContent =
                "log in to add papers to your schedule.";
            return;
        }

        const index = cashewPaperSearchIndex || {};
        const match = index[String(code).toLowerCase()];

        if (!match || !selectedDateKey) {
            return;
        }

        await addEntryToDate(selectedDateKey, {
            code: match.code,
            subject: match.subjectName || match.subjectKey || "",
            subjectName: match.subjectName || match.subjectKey || "",
            path: match.path,
            paperNumber: match.paperNumber || ""
        });

        addInput.value = "";
        document.getElementById("calendarModalError").textContent = "";
        window.closePaperSuggestions(addSuggestions);
        renderModalEntries();
        renderGrid();

    });

}

const authClient = getSupabaseClient();

if (authClient && typeof authClient.auth?.onAuthStateChange === "function") {

    authClient.auth.onAuthStateChange(async (event, session) => {

        if (event === "SIGNED_OUT") {
            currentUser = null;
            clearLocalSchedule();
            renderAuthNotice();
            renderGrid();
            return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            currentUser = session?.user || null;

            if (currentUser) {
                const remoteSchedule = await loadRemoteSchedule(currentUser);
                saveLocalSchedule(remoteSchedule);
                renderAuthNotice();
                renderGrid();
            }
        }

    });

}

renderDayLabels();
renderAuthNotice();
renderBanner();
renderGrid();
initializeScheduler();

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
    addCategorizedSearchIndex(subjectKey);
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
