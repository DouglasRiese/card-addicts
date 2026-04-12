const allowedGameChoices = ["War 2", "Solitaire", "Blackjack", "None"];
const feedbackRegex = /^[a-zA-Z0-9 !.,\r\n\t'-]+$/;
const SESSION_COOKIE_NAME = "session";
const WAR_COOKIE_NAME = "war_state";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/") {
            return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
        }

        if (url.pathname === "/api/signup" && request.method === "POST") {
            return handleSignup(request, env);
        }

        if (url.pathname === "/api/login" && request.method === "POST") {
            return handleLogin(request, env);
        }

        if (url.pathname === "/api/logout" && request.method === "POST") {
            return handleLogout();
        }

        if (url.pathname === "/api/me" && request.method === "GET") {
            return handleMe(request, env);
        }

        if (url.pathname === "/api/survey" && request.method === "POST") {
            return handleSurveySubmission(request, env);
        }

        if (url.pathname === "/api/survey/submissions" && request.method === "GET") {
            return handleGetSurveySubmissions(request, env, url);
        }

        if (url.pathname === "/api/war/state" && request.method === "GET") {
            return handleWarState(request, env);
        }

        if (url.pathname === "/api/war/start" && request.method === "POST") {
            return handleWarStart(request, env);
        }

        if (url.pathname === "/api/war/draw" && request.method === "POST") {
            return handleWarDraw(request, env);
        }

        if (url.pathname === "/api/war/reset" && request.method === "POST") {
            return handleWarReset(request, env);
        }

        return env.ASSETS.fetch(request);
    }
};

async function handleSignup(request, env) {
    try {
        const body = await request.json();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        const errors = validateAuthInput(email, password);
        if (Object.keys(errors).length > 0) {
            return jsonResponse({errors}, 400);
        }

        const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
        if (existing) {
            return jsonResponse({errors: {email: "An account with this email already exists"}}, 400);
        }

        const passwordHash = await hashPassword(password);

        const result = await env.DB
            .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
            .bind(email, passwordHash)
            .run();

        const userId = result.meta?.last_row_id;
        const cookie = await createSessionCookie({userId, email}, env.SESSION_SECRET);

        return jsonResponse(
            {success: true, user: {id: userId, email}},
            201,
            {"Set-Cookie": cookie}
        );
    } catch (error) {
        console.error("Signup failed:", error);
        return jsonResponse({error: "Invalid request body."}, 400);
    }
}

async function handleLogin(request, env) {
    try {
        const body = await request.json();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        const errors = validateAuthInput(email, password);
        if (Object.keys(errors).length > 0) {
            return jsonResponse({errors}, 400);
        }

        const user = await env.DB
            .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
            .bind(email)
            .first();

        if (!user) {
            return jsonResponse({errors: {email: "Invalid email or password"}}, 401);
        }

        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) {
            return jsonResponse({errors: {email: "Invalid email or password"}}, 401);
        }

        const cookie = await createSessionCookie(
            {userId: user.id, email: user.email},
            env.SESSION_SECRET
        );

        return jsonResponse(
            {success: true, user: {id: user.id, email: user.email}},
            200,
            {"Set-Cookie": cookie}
        );
    } catch (error) {
        console.error("Login failed:", error);
        return jsonResponse({error: "Invalid request body."}, 400);
    }
}

async function handleLogout() {
    return jsonResponse(
        {success: true},
        200,
        {
            "Set-Cookie": clearSessionCookie()
        }
    );
}

async function handleMe(request, env) {
    const session = await getSessionFromRequest(request, env.SESSION_SECRET);

    if (!session) {
        return jsonResponse({authenticated: false, user: null}, 200);
    }

    return jsonResponse({
        authenticated: true,
        user: {
            id: session.userId,
            email: session.email
        }
    });
}

async function handleSurveySubmission(request, env) {
    const session = await getSessionFromRequest(request, env.SESSION_SECRET);

    if (!session) {
        return jsonResponse({error: "You must be logged in to submit the survey."}, 401);
    }

    try {
        const contentType = request.headers.get("content-type") || "";
        let payload;

        if (contentType.includes("application/json")) {
            payload = await request.json();
        } else if (
            contentType.includes("application/x-www-form-urlencoded") ||
            contentType.includes("multipart/form-data")
        ) {
            const formData = await request.formData();
            payload = {
                email: String(formData.get("email") || "").trim(),
                feedback: String(formData.get("feedback") || "").trim(),
                rating: String(formData.get("rating") || "").trim(),
                gameChoice: String(formData.get("gameChoice") || "").trim(),
                agreed: formData.get("agreed") === "yes"
            };
        } else {
            return jsonResponse({error: "Unsupported content type."}, 415);
        }

        const cleanedPayload = {
            email: String(payload.email || "").trim(),
            feedback: String(payload.feedback || "").trim(),
            rating: String(payload.rating || "").trim(),
            gameChoice: String(payload.gameChoice || "").trim(),
            agreed: Boolean(payload.agreed)
        };

        const errors = validateSurvey(cleanedPayload);
        if (Object.keys(errors).length > 0) {
            return jsonResponse({errors}, 400);
        }

        const ratingNumber = Number(cleanedPayload.rating);

        const result = await env.DB
            .prepare(
                `INSERT INTO survey_submissions
                     (user_id, email, feedback, rating, game_choice, agreed)
                 VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(
                session.userId,
                cleanedPayload.email || null,
                cleanedPayload.feedback,
                ratingNumber,
                cleanedPayload.gameChoice,
                cleanedPayload.agreed ? 1 : 0
            )
            .run();

        return jsonResponse({
            success: true,
            message: "Survey submitted successfully.",
            id: result.meta?.last_row_id ?? null
        });
    } catch (error) {
        console.error("Survey submission failed:", error);
        return jsonResponse({error: "Invalid request body."}, 400);
    }
}

async function handleGetSurveySubmissions(request, env, url) {
    const session = await getSessionFromRequest(request, env.SESSION_SECRET);

    if (!session) {
        return jsonResponse({error: "You must be logged in."}, 401);
    }

    try {
        const limitParam = Number(url.searchParams.get("limit") || "20");
        const limit = Number.isInteger(limitParam)
            ? Math.min(Math.max(limitParam, 1), 100)
            : 20;

        const result = await env.DB
            .prepare(`
                SELECT s.id,
                       s.user_id,
                       u.email AS user_email,
                       s.email,
                       s.feedback,
                       s.rating,
                       s.game_choice,
                       s.agreed,
                       s.submitted_at
                FROM survey_submissions s
                         LEFT JOIN users u ON u.id = s.user_id
                ORDER BY s.id DESC LIMIT ?
            `)
            .bind(limit)
            .all();

        return jsonResponse({
            success: true,
            submissions: result.results ?? []
        });
    } catch (error) {
        console.error("Fetching submissions failed:", error);
        return jsonResponse({error: "Could not fetch survey submissions."}, 500);
    }
}

async function handleWarState(request, env) {
    const session = await getSessionFromRequest(request, env.SESSION_SECRET);
    if (!session) {
        return jsonResponse({error: "You must be logged in to play War."}, 401);
    }

    const state = await getWarStateFromRequest(request, env.SESSION_SECRET);
    return jsonResponse({success: true, state: state || emptyWarState()});
}

async function handleWarStart(request, env) {
    const session = await getSessionFromRequest(request, env.SESSION_SECRET);
    if (!session) {
        return jsonResponse({error: "You must be logged in to play War."}, 401);
    }

    try {
        const body = await request.json();
        const victoryCondition = Number(body.victoryCondition || 5);

        if (![5, 10, 20, 30].includes(victoryCondition)) {
            return jsonResponse({error: "Invalid victory condition."}, 400);
        }

        const response = await fetch("https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1");
        if (!response.ok) {
            return jsonResponse({error: "Could not create a new deck."}, 502);
        }

        const data = await response.json();

        const state = {
            deckId: data.deck_id,
            victoryCondition,
            cardsRemaining: Math.floor(Number(data.remaining || 52) / 2),
            playerCapturesCount: 0,
            computerCapturesCount: 0,
            lastPlayerCardImage: null,
            lastComputerCardImage: null,
            result: "Game started. Draw a card.",
            gameOver: false
        };

        const cookie = await createWarCookie(state, env.SESSION_SECRET);

        return jsonResponse(
            {success: true, state},
            200,
            {"Set-Cookie": cookie}
        );
    } catch (error) {
        console.error("War start failed:", error);
        return jsonResponse({error: "Could not start game."}, 400);
    }
}

async function handleWarDraw(request, env) {
    const session = await getSessionFromRequest(request, env.SESSION_SECRET);
    if (!session) {
        return jsonResponse({error: "You must be logged in to play War."}, 401);
    }

    const state = await getWarStateFromRequest(request, env.SESSION_SECRET);
    if (!state?.deckId) {
        return jsonResponse({error: "No active game. Start a new game first."}, 400);
    }

    if (state.gameOver) {
        return jsonResponse({error: "The game is already over. Reset to play again."}, 400);
    }

    try {
        const response = await fetch(`https://deckofcardsapi.com/api/deck/${state.deckId}/draw/?count=2`);
        if (!response.ok) {
            return jsonResponse({error: "Could not draw cards."}, 502);
        }

        const data = await response.json();
        const drawnCards = data.cards || [];

        if (drawnCards.length < 2) {
            state.result = "Not enough cards left to continue.";
            state.gameOver = true;

            const cookie = await createWarCookie(state, env.SESSION_SECRET);
            return jsonResponse(
                {success: true, state},
                200,
                {"Set-Cookie": cookie}
            );
        }

        const computerCard = drawnCards[0];
        const playerCard = drawnCards[1];

        const computerValue = cardValueToNumber(computerCard.value);
        const playerValue = cardValueToNumber(playerCard.value);

        state.lastComputerCardImage = computerCard.image;
        state.lastPlayerCardImage = playerCard.image;
        state.cardsRemaining = Math.floor(Number(data.remaining || 0) / 2);

        if (playerValue > computerValue) {
            state.playerCapturesCount += 2;
            state.result = "Player wins the round!";
        } else if (playerValue < computerValue) {
            state.computerCapturesCount += 2;
            state.result = "Computer wins the round!";
        } else {
            state.result = "Tie!";
        }

        if (state.playerCapturesCount >= state.victoryCondition) {
            state.result = "Player has won the game!";
            state.gameOver = true;
        } else if (state.computerCapturesCount >= state.victoryCondition) {
            state.result = "Computer has won the game!";
            state.gameOver = true;
        } else if (state.cardsRemaining <= 0) {
            state.result = "No cards remain. Game over.";
            state.gameOver = true;
        }

        const cookie = await createWarCookie(state, env.SESSION_SECRET);

        return jsonResponse(
            {success: true, state},
            200,
            {"Set-Cookie": cookie}
        );
    } catch (error) {
        console.error("War draw failed:", error);
        return jsonResponse({error: "Could not draw cards."}, 500);
    }
}

async function handleWarReset(request, env) {
    const session = await getSessionFromRequest(request, env.SESSION_SECRET);
    if (!session) {
        return jsonResponse({error: "You must be logged in to play War."}, 401);
    }

    return jsonResponse(
        {success: true, state: emptyWarState()},
        200,
        {"Set-Cookie": clearWarCookie()}
    );
}

function emptyWarState() {
    return {
        deckId: null,
        victoryCondition: null,
        cardsRemaining: 0,
        playerCapturesCount: 0,
        computerCapturesCount: 0,
        lastPlayerCardImage: null,
        lastComputerCardImage: null,
        result: "No active game.",
        gameOver: false
    };
}

function cardValueToNumber(value) {
    const map = {
        ACE: 14,
        KING: 13,
        QUEEN: 12,
        JACK: 11
    };

    if (map[value]) return map[value];
    return Number(value);
}

function validateSurvey(payload) {
    const errors = {};

    if (payload.email !== "") {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(payload.email)) {
            errors.email = "Please enter a valid email address";
        }
    }

    if (payload.feedback.length < 10 || payload.feedback.length > 600) {
        errors.feedback = "Message must be 10 to 600 characters";
    } else if (!feedbackRegex.test(payload.feedback)) {
        errors.feedback = "Only letters, numbers, spaces, and basic punctuation are allowed";
    }

    const ratingNumber = Number(payload.rating);
    if (!Number.isInteger(ratingNumber)) {
        errors.rating = "Rating must be a whole number";
    } else if (ratingNumber < 1 || ratingNumber > 10) {
        errors.rating = "Rating must be from 1 to 10";
    }

    if (!allowedGameChoices.includes(payload.gameChoice)) {
        errors.gameChoice = "Please select a choice";
    }

    if (!payload.agreed) {
        errors.agreed = "Must agree to sharing feedback";
    }

    return errors;
}

function validateAuthInput(email, password) {
    const errors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        errors.email = "Please enter a valid email address";
    }

    if (password.length < 8) {
        errors.password = "Password must be at least 8 characters";
    }

    return errors;
}

async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await derivePasswordKey(password, salt);
    return `${toBase64(salt)}:${toBase64(new Uint8Array(key))}`;
}

async function verifyPassword(password, storedValue) {
    const [saltB64, hashB64] = storedValue.split(":");
    if (!saltB64 || !hashB64) return false;

    const salt = fromBase64(saltB64);
    const expectedHash = fromBase64(hashB64);
    const actualHash = new Uint8Array(await derivePasswordKey(password, salt));

    if (expectedHash.length !== actualHash.length) return false;

    let diff = 0;
    for (let i = 0; i < expectedHash.length; i++) {
        diff |= expectedHash[i] ^ actualHash[i];
    }

    return diff === 0;
}

async function derivePasswordKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    return crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        passwordKey,
        256
    );
}

async function createSessionCookie(sessionData, secret) {
    const payload = toBase64Url(
        new TextEncoder().encode(
            JSON.stringify({
                ...sessionData,
                exp: Date.now() + 1000 * 60 * 60 * 24 * 7
            })
        )
    );

    const signature = await signValue(payload, secret);

    return [
        `${SESSION_COOKIE_NAME}=${payload}.${signature}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=604800"
    ].join("; ");
}

function clearSessionCookie() {
    return [
        `${SESSION_COOKIE_NAME}=`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0"
    ].join("; ");
}

async function createWarCookie(state, secret) {
    const payload = toBase64Url(
        new TextEncoder().encode(
            JSON.stringify({
                ...state,
                exp: Date.now() + 1000 * 60 * 60 * 24
            })
        )
    );

    const signature = await signValue(payload, secret);

    return [
        `${WAR_COOKIE_NAME}=${payload}.${signature}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=86400"
    ].join("; ");
}

function clearWarCookie() {
    return [
        `${WAR_COOKIE_NAME}=`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0"
    ].join("; ");
}

async function getSessionFromRequest(request, secret) {
    return getSignedCookieData(request, secret, SESSION_COOKIE_NAME);
}

async function getWarStateFromRequest(request, secret) {
    return getSignedCookieData(request, secret, WAR_COOKIE_NAME);
}

async function getSignedCookieData(request, secret, cookieName) {
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const raw = cookies[cookieName];

    if (!raw) return null;

    const dotIndex = raw.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const payload = raw.slice(0, dotIndex);
    const signature = raw.slice(dotIndex + 1);

    const expected = await signValue(payload, secret);
    if (signature !== expected) return null;

    try {
        const json = JSON.parse(
            new TextDecoder().decode(fromBase64Url(payload))
        );

        if (!json.exp || Date.now() > json.exp) {
            return null;
        }

        return json;
    } catch {
        return null;
    }
}

async function signValue(value, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        {name: "HMAC", hash: "SHA-256"},
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
    return toBase64Url(new Uint8Array(signature));
}

function parseCookies(cookieHeader) {
    const out = {};
    for (const part of cookieHeader.split(";")) {
        const [rawKey, ...rest] = part.trim().split("=");
        if (!rawKey) continue;
        out[rawKey] = rest.join("=");
    }
    return out;
}

function toBase64(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function fromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function toBase64Url(bytes) {
    return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(base64url) {
    let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return fromBase64(base64);
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...extraHeaders
        }
    });
}