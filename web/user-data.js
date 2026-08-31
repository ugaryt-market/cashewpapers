/*
 * Cashew Papers
 * Account data layer
 *
 * Supabase is the source of truth for all account-owned data.
 */
(function () {

    const SUPABASE_URL =
        "https://bbchhwjftvwomwnicwhj.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_b1gQuYfPVWB74DJG0WB5Gg_E7itdOMn";

    const client =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        );

    const TABLES = {
        subjects: "user_subjects",
        progress: "paper_progress",
        attempts: "paper_attempts",
        calendar: "calendar_events"
    };

    const CACHE_VERSION = "1";
    const CACHE_TTL_MS = 30 * 60 * 1000;
    const CACHE_PREFIX = "cashewpapers:account-cache:";

    let activeUserId = null;
    let memoryCache = null;

    function cacheKey(userId) {
        return CACHE_PREFIX + CACHE_VERSION + ":" + userId;
    }

    function emptyCache(userId) {
        return {
            userId,
            savedAt: Date.now(),
            subjects: null,
            progress: {},
            attempts: {},
            calendar: null
        };
    }

    function readStoredCache(userId) {

        if (!userId) {
            return null;
        }

        try {

            const raw =
                sessionStorage.getItem(
                    cacheKey(userId)
                );

            if (!raw) {
                return null;
            }

            const parsed =
                JSON.parse(raw);

            if (
                !parsed ||
                parsed.userId !== userId ||
                !parsed.savedAt ||
                Date.now() - parsed.savedAt > CACHE_TTL_MS
            ) {
                sessionStorage.removeItem(
                    cacheKey(userId)
                );
                return null;
            }

            return parsed;

        } catch (error) {

            console.warn(
                "cashewpapers: unable to read account cache",
                error
            );

            return null;

        }

    }

    function writeStoredCache() {

        if (!memoryCache || !activeUserId) {
            return;
        }

        memoryCache.savedAt =
            Date.now();

        try {

            sessionStorage.setItem(
                cacheKey(activeUserId),
                JSON.stringify(memoryCache)
            );

        } catch (error) {

            /*
               Cache failure must never affect the actual Supabase
               data path. The cache is only an optimization.
            */
            console.warn(
                "cashewpapers: unable to write account cache",
                error
            );

        }

    }

    function ensureCache(user) {

        const userId =
            user
                ? String(user.id)
                : null;

        if (activeUserId === userId && memoryCache) {
            return memoryCache;
        }

        activeUserId = userId;

        if (!userId) {
            memoryCache = null;
            return null;
        }

        memoryCache =
            readStoredCache(userId) ||
            emptyCache(userId);

        return memoryCache;
    }

    function clearAccountCache() {
        activeUserId = null;
        memoryCache = null;
    }

    function setCachedProgress(key, status) {

        if (!memoryCache) {
            return;
        }

        memoryCache.progress[String(key)] =
            status;

    }

    function setCachedAttempts(key, attempts) {

        if (!memoryCache) {
            return;
        }

        memoryCache.attempts[String(key)] =
            (attempts || []).map(
                attempt => ({ ...attempt })
            );

    }

    async function getUser() {

        if (
            typeof getCurrentUser !==
            "function"
        ) {
            clearAccountCache();
            return null;
        }

        const user =
            await getCurrentUser();

        ensureCache(user);

        return user;

    }

    async function requireUser() {
        const user = await getUser();
        if (!user) {
            throw new Error("You must be signed in.");
        }
        return user;
    }

    function checkError(error, action) {
        if (error) {
            throw new Error(
                (action ? action + ": " : "") +
                (error.message || String(error))
            );
        }
    }

    async function getSelectedSubjects() {

        const user =
            await requireUser();

        const cache =
            ensureCache(user);

        if (
            Array.isArray(cache.subjects)
        ) {
            return cache.subjects.slice();
        }

        const { data, error } =
            await client
                .from(TABLES.subjects)
                .select("subject_key")
                .eq("user_id", user.id)
                .order(
                    "created_at",
                    { ascending: true }
                );

        checkError(
            error,
            "Unable to load selected subjects"
        );

        cache.subjects =
            (data || []).map(
                row =>
                    String(
                        row.subject_key
                    )
            );

        writeStoredCache();

        return cache.subjects.slice();
    }

    async function saveSelectedSubjects(subjectKeys) {
        const user = await requireUser();
        const values = Array.from(
            new Set(
                (subjectKeys || [])
                    .map(value => String(value))
                    .filter(Boolean)
            )
        );

        const { error: deleteError } =
            await client
                .from(TABLES.subjects)
                .delete()
                .eq("user_id", user.id);

        checkError(deleteError, "Unable to replace selected subjects");

        if (values.length) {
            const { error: insertError } =
                await client
                    .from(TABLES.subjects)
                    .insert(
                        values.map(subject_key => ({
                            user_id: user.id,
                            subject_key
                        }))
                    );

            checkError(
                insertError,
                "Unable to save selected subjects"
            );
        }

        const cache =
            ensureCache(user);

        cache.subjects =
            values.slice();

        writeStoredCache();

        return values;
    }

    async function getPaperStatus(paperKey) {

        const key =
            String(paperKey);

        const statuses =
            await getPaperStatuses([key]);

        return statuses[key] ||
            "incomplete";
    }

    async function getPaperStatuses(paperKeys) {

        const user =
            await requireUser();

        const cache =
            ensureCache(user);

        const keys =
            Array.from(
                new Set(
                    (paperKeys || [])
                        .map(
                            value =>
                                String(value)
                        )
                        .filter(Boolean)
                )
            );

        const result = {};

        const missingKeys = [];

        keys.forEach(key => {

            if (
                Object.prototype.hasOwnProperty
                    .call(
                        cache.progress,
                        key
                    )
            ) {
                result[key] =
                    cache.progress[key];
            } else {
                result[key] =
                    "incomplete";
                missingKeys.push(key);
            }

        });

        if (!missingKeys.length) {
            return result;
        }

        const { data, error } =
            await client
                .from(TABLES.progress)
                .select(
                    "paper_key,status"
                )
                .eq(
                    "user_id",
                    user.id
                )
                .in(
                    "paper_key",
                    missingKeys
                );

        checkError(
            error,
            "Unable to load paper progress"
        );

        missingKeys.forEach(key => {
            cache.progress[key] =
                "incomplete";
        });

        (data || []).forEach(row => {

            const key =
                String(row.paper_key);

            cache.progress[key] =
                row.status ===
                    "completed"
                    ? "completed"
                    : "incomplete";

        });

        writeStoredCache();

        keys.forEach(key => {
            result[key] =
                cache.progress[key] ||
                "incomplete";
        });

        return result;
    }

    async function getCompletedPaperCount(paperKeys) {
        const statuses = await getPaperStatuses(paperKeys);
        return Object.values(statuses).filter(
            status => status === "completed"
        ).length;
    }

    async function setPaperStatus(paperKey, status) {
        const user = await requireUser();
        const key = String(paperKey);

        if (status === "completed") {
            const { error } =
                await client
                    .from(TABLES.progress)
                    .upsert(
                        {
                            user_id: user.id,
                            paper_key: key,
                            status: "completed"
                        },
                        {
                            onConflict: "user_id,paper_key"
                        }
                    );

            checkError(
                error,
                "Unable to save paper progress"
            );

            const cache =
                ensureCache(user);

            cache.progress[key] =
                "completed";

            writeStoredCache();

            return "completed";
        }

        const { error } =
            await client
                .from(TABLES.progress)
                .delete()
                .eq("user_id", user.id)
                .eq("paper_key", key);

        checkError(
            error,
            "Unable to clear paper progress"
        );

        const cache =
            ensureCache(user);

        cache.progress[key] =
            "incomplete";

        writeStoredCache();

        return "incomplete";
    }

    async function getPaperAttempts(paperKey) {

        const user =
            await requireUser();

        const key =
            String(paperKey);

        const cache =
            ensureCache(user);

        if (
            Object.prototype.hasOwnProperty
                .call(
                    cache.attempts,
                    key
                )
        ) {
            return cache.attempts[key]
                .map(
                    attempt =>
                        ({ ...attempt })
                );
        }

        const { data, error } =
            await client
                .from(TABLES.attempts)
                .select(
                    "id,score,attempted_at,created_at"
                )
                .eq(
                    "user_id",
                    user.id
                )
                .eq(
                    "paper_key",
                    key
                )
                .order(
                    "created_at",
                    { ascending: true }
                );

        checkError(
            error,
            "Unable to load paper attempts"
        );

        const attempts =
            (data || []).map(
                row => ({
                    id: row.id,
                    score: String(
                        row.score
                    ),
                    date:
                        row.attempted_at ||
                        row.created_at
                })
            );

        setCachedAttempts(
            key,
            attempts
        );

        writeStoredCache();

        return attempts.map(
            attempt =>
                ({ ...attempt })
        );
    }

    async function addPaperAttempt(paperKey, score) {
        const user = await requireUser();
        const numericScore = Number(score);

        if (
            !Number.isFinite(numericScore) ||
            numericScore < 0 ||
            numericScore > 100
        ) {
            throw new Error("Score must be between 0 and 100.");
        }

        const { data, error } =
            await client
                .from(TABLES.attempts)
                .insert({
                    user_id: user.id,
                    paper_key: String(paperKey),
                    score: numericScore,
                    attempted_at: new Date()
                        .toISOString()
                        .slice(0, 10)
                })
                .select("id,score,attempted_at,created_at")
                .single();

        checkError(
            error,
            "Unable to save attempt"
        );

        const attempt = {
            id: data.id,
            score: String(data.score),
            date:
                data.attempted_at ||
                data.created_at
        };

        const cache =
            ensureCache(user);

        const key =
            String(paperKey);

        if (!Array.isArray(
            cache.attempts[key]
        )) {
            cache.attempts[key] = [];
        }

        cache.attempts[key].push(
            { ...attempt }
        );

        writeStoredCache();

        return { ...attempt };
    }

    async function deletePaperAttempt(paperKey, attemptId) {
        const user = await requireUser();

        const { error } =
            await client
                .from(TABLES.attempts)
                .delete()
                .eq("user_id", user.id)
                .eq("id", attemptId)
                .eq("paper_key", String(paperKey));

        checkError(
            error,
            "Unable to delete attempt"
        );

        const cache =
            ensureCache(user);

        const key =
            String(paperKey);

        if (
            Array.isArray(
                cache.attempts[key]
            )
        ) {
            cache.attempts[key] =
                cache.attempts[key]
                    .filter(
                        attempt =>
                            String(
                                attempt.id
                            ) !==
                            String(
                                attemptId
                            )
                    );

            writeStoredCache();
        }
    }

    async function getCalendarSchedule() {

        const user =
            await requireUser();

        const cache =
            ensureCache(user);

        if (cache.calendar) {
            return cloneCalendar(
                cache.calendar
            );
        }

        const { data, error } =
            await client
                .from(TABLES.calendar)
                .select(
                    "id,date,paper_key,paper_code,subject,paper,path,file"
                )
                .eq(
                    "user_id",
                    user.id
                )
                .order(
                    "date",
                    { ascending: true }
                )
                .order(
                    "created_at",
                    { ascending: true }
                );

        checkError(
            error,
            "Unable to load calendar"
        );

        const schedule = {};

        (data || []).forEach(row => {

            const key =
                String(row.date);

            if (!schedule[key]) {
                schedule[key] = [];
            }

            schedule[key].push({
                id: row.id,
                code:
                    row.paper_code || "",
                subject:
                    row.subject || "",
                paper:
                    row.paper || "",
                path:
                    row.path || "",
                questionPath:
                    row.file || "",
                paperKey:
                    row.paper_key || ""
            });

        });

        cache.calendar =
            schedule;

        writeStoredCache();

        return cloneCalendar(
            schedule
        );
    }

    function cloneCalendar(schedule) {

        const clone = {};

        Object.keys(
            schedule || {}
        ).forEach(key => {

            clone[key] =
                (schedule[key] || [])
                    .map(
                        entry =>
                            ({ ...entry })
                    );

        });

        return clone;
    }

    async function addCalendarEvent(date, entry) {
        const user = await requireUser();

        const { data, error } =
            await client
                .from(TABLES.calendar)
                .insert({
                    user_id: user.id,
                    date: String(date),
                    paper_key: entry.paperKey || "",
                    paper_code: entry.code || "",
                    subject: entry.subject || "",
                    paper: entry.paper || "",
                    path: entry.path || "",
                    file: entry.questionPath || ""
                })
                .select(
                    "id,date,paper_key,paper_code,subject,paper,path,file"
                )
                .single();

        checkError(
            error,
            "Unable to schedule paper"
        );

        const entryValue = {
            id: data.id,
            code:
                data.paper_code || "",
            subject:
                data.subject || "",
            paper:
                data.paper || "",
            path:
                data.path || "",
            questionPath:
                data.file || "",
            paperKey:
                data.paper_key || ""
        };

        const cache =
            ensureCache(user);

        if (!cache.calendar) {
            cache.calendar = {};
        }

        const key =
            String(data.date);

        if (!cache.calendar[key]) {
            cache.calendar[key] = [];
        }

        cache.calendar[key].push(
            { ...entryValue }
        );

        writeStoredCache();

        return { ...entryValue };
    }

    async function deleteCalendarEvent(eventId) {
        const user = await requireUser();

        const { error } =
            await client
                .from(TABLES.calendar)
                .delete()
                .eq("user_id", user.id)
                .eq("id", eventId);

        checkError(
            error,
            "Unable to remove calendar event"
        );

        const cache =
            ensureCache(user);

        if (cache.calendar) {

            Object.keys(
                cache.calendar
            ).forEach(dateKey => {

                cache.calendar[dateKey] =
                    cache.calendar[dateKey]
                        .filter(
                            entry =>
                                String(
                                    entry.id
                                ) !==
                                String(
                                    eventId
                                )
                        );

                if (
                    cache.calendar[dateKey]
                        .length === 0
                ) {
                    delete cache.calendar[
                        dateKey
                    ];
                }

            });

            writeStoredCache();
        }
    }

    window.CashewUserData = {
        getUser,
        getSelectedSubjects,
        saveSelectedSubjects,
        getPaperStatus,
        getPaperStatuses,
        getCompletedPaperCount,
        setPaperStatus,
        getPaperAttempts,
        addPaperAttempt,
        deletePaperAttempt,
        getCalendarSchedule,
        addCalendarEvent,
        deleteCalendarEvent
    };

})();
