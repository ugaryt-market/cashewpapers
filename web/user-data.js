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

    async function getUser() {
        if (typeof getCurrentUser !== "function") {
            return null;
        }
        return await getCurrentUser();
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
        const user = await requireUser();

        const { data, error } =
            await client
                .from(TABLES.subjects)
                .select("subject_key")
                .eq("user_id", user.id)
                .order("created_at", { ascending: true });

        checkError(error, "Unable to load selected subjects");

        return (data || []).map(row =>
            String(row.subject_key)
        );
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

            checkError(insertError, "Unable to save selected subjects");
        }

        return values;
    }

    async function getPaperStatus(paperKey) {
        const user = await requireUser();

        const { data, error } =
            await client
                .from(TABLES.progress)
                .select("status")
                .eq("user_id", user.id)
                .eq("paper_key", String(paperKey))
                .maybeSingle();

        checkError(error, "Unable to load paper progress");

        return data && data.status === "completed"
            ? "completed"
            : "incomplete";
    }

    async function getPaperStatuses(paperKeys) {
        const user = await requireUser();
        const keys = Array.from(
            new Set(
                (paperKeys || [])
                    .map(value => String(value))
                    .filter(Boolean)
            )
        );

        const result = {};
        keys.forEach(key => {
            result[key] = "incomplete";
        });

        if (!keys.length) {
            return result;
        }

        const { data, error } =
            await client
                .from(TABLES.progress)
                .select("paper_key,status")
                .eq("user_id", user.id)
                .in("paper_key", keys);

        checkError(error, "Unable to load paper progress");

        (data || []).forEach(row => {
            if (row.status === "completed") {
                result[String(row.paper_key)] = "completed";
            }
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

            checkError(error, "Unable to save paper progress");
            return "completed";
        }

        const { error } =
            await client
                .from(TABLES.progress)
                .delete()
                .eq("user_id", user.id)
                .eq("paper_key", key);

        checkError(error, "Unable to clear paper progress");
        return "incomplete";
    }

    async function getPaperAttempts(paperKey) {
        const user = await requireUser();
        const key = String(paperKey);

        const { data, error } =
            await client
                .from(TABLES.attempts)
                .select("id,score,attempted_at,created_at")
                .eq("user_id", user.id)
                .eq("paper_key", key)
                .order("created_at", { ascending: true });

        checkError(error, "Unable to load paper attempts");

        return (data || []).map(row => ({
            id: row.id,
            score: String(row.score),
            date: row.attempted_at || row.created_at
        }));
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

        checkError(error, "Unable to save attempt");

        return {
            id: data.id,
            score: String(data.score),
            date: data.attempted_at || data.created_at
        };
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

        checkError(error, "Unable to delete attempt");
    }

    async function getCalendarSchedule() {
        const user = await requireUser();

        const { data, error } =
            await client
                .from(TABLES.calendar)
                .select(
                    "id,date,paper_key,paper_code,subject,paper,path,file"
                )
                .eq("user_id", user.id)
                .order("date", { ascending: true })
                .order("created_at", { ascending: true });

        checkError(error, "Unable to load calendar");

        const schedule = {};

        (data || []).forEach(row => {
            const key = String(row.date);

            if (!schedule[key]) {
                schedule[key] = [];
            }

            schedule[key].push({
                id: row.id,
                code: row.paper_code || "",
                subject: row.subject || "",
                paper: row.paper || "",
                path: row.path || "",
                questionPath: row.file || "",
                paperKey: row.paper_key || ""
            });
        });

        return schedule;
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

        checkError(error, "Unable to schedule paper");

        return {
            id: data.id,
            code: data.paper_code || "",
            subject: data.subject || "",
            paper: data.paper || "",
            path: data.path || "",
            questionPath: data.file || "",
            paperKey: data.paper_key || ""
        };
    }

    async function deleteCalendarEvent(eventId) {
        const user = await requireUser();

        const { error } =
            await client
                .from(TABLES.calendar)
                .delete()
                .eq("user_id", user.id)
                .eq("id", eventId);

        checkError(error, "Unable to remove calendar event");
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
