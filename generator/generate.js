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
