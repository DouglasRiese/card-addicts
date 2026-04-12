const allowedGameChoices = ["War 2", "Solitaire", "Blackjack", "None"];
const feedbackRegex = /^[a-zA-Z0-9 !.,\r\n\t'-]+$/;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/") {
            return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
        }

        if (url.pathname === "/api/survey" && request.method === "POST") {
            return handleSurveySubmission(request, env);
        }

        return env.ASSETS.fetch(request);
    }
};

async function handleSurveySubmission(request, env) {
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

        const result = await env.card_addicts_db
            .prepare(
                `INSERT INTO survey_submissions
                     (email, feedback, rating, game_choice, agreed)
                 VALUES (?, ?, ?, ?, ?)`
            )
            .bind(
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

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    });
}