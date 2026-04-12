const form = document.getElementById("surveyForm");
const successMessage = document.getElementById("successMessage");
const serverErrorMessage = document.getElementById("serverErrorMessage");
const submitButton = document.getElementById("submitButton");
const ratingInput = document.getElementById("ratingID");
const ratingValue = document.getElementById("ratingValue");
const authRequiredMessage = document.getElementById("authRequiredMessage");
const currentUserMessage = document.getElementById("currentUserMessage");

const allowedGameChoices = ["War 2", "Solitaire", "Blackjack", "None"];
const feedbackRegex = /^[a-zA-Z0-9 !.,\r\n\t'-]+$/;

let isAuthenticated = false;

document.addEventListener("DOMContentLoaded", async () => {
    ratingValue.textContent = ratingInput.value;
    await loadCurrentUser();
});

ratingInput.addEventListener("input", () => {
    ratingValue.textContent = ratingInput.value;
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();

    if (!isAuthenticated) {
        showServerError("You must be logged in to submit the survey.");
        return;
    }

    const formData = new FormData(form);
    const payload = {
        email: String(formData.get("email") || "").trim(),
        feedback: String(formData.get("feedback") || "").trim(),
        rating: String(formData.get("rating") || "").trim(),
        gameChoice: String(formData.get("gameChoice") || "").trim(),
        agreed: formData.get("agreed") === "yes"
    };

    const clientErrors = validateSurvey(payload);

    if (Object.keys(clientErrors).length > 0) {
        showErrors(clientErrors);
        return;
    }

    try {
        submitButton.disabled = true;
        serverErrorMessage.classList.add("d-none");
        successMessage.classList.add("d-none");

        const response = await fetch("/api/survey", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.errors) {
                showErrors(result.errors);
            } else {
                showServerError(result.error || "Something went wrong.");
            }
            return;
        }

        form.reset();
        ratingInput.value = "5";
        ratingValue.textContent = "5";
        successMessage.classList.remove("d-none");
        submitButton.disabled = false;
    } catch {
        showServerError("Could not submit the survey. Please try again.");
        submitButton.disabled = false;
    }
});

async function loadCurrentUser() {
    try {
        const response = await fetch("/api/me");
        const result = await response.json();

        if (result.authenticated) {
            isAuthenticated = true;
            submitButton.disabled = false;
            authRequiredMessage.classList.add("d-none");
            currentUserMessage.classList.remove("d-none");
            currentUserMessage.textContent = `Logged in as ${result.user.email}`;
            return;
        }

        isAuthenticated = false;
        submitButton.disabled = true;
        currentUserMessage.classList.add("d-none");
        authRequiredMessage.classList.remove("d-none");
    } catch {
        isAuthenticated = false;
        submitButton.disabled = true;
        currentUserMessage.classList.add("d-none");
        authRequiredMessage.classList.remove("d-none");
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
        errors.feedback = 'Only letters, numbers, spaces, and basic punctuation are allowed';
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

function clearErrors() {
    document.getElementById("emailError").textContent = "";
    document.getElementById("feedbackError").textContent = "";
    document.getElementById("ratingError").textContent = "";
    document.getElementById("gameChoiceError").textContent = "";
    document.getElementById("agreedError").textContent = "";

    document.getElementById("emailID").classList.remove("is-invalid");
    document.getElementById("feedbackID").classList.remove("is-invalid");
    document.getElementById("ratingID").classList.remove("is-invalid");
    document.getElementById("agreedID").classList.remove("is-invalid");

    serverErrorMessage.textContent = "";
    serverErrorMessage.classList.add("d-none");
}

function showErrors(errors) {
    if (errors.email) {
        document.getElementById("emailError").textContent = errors.email;
        document.getElementById("emailID").classList.add("is-invalid");
    }

    if (errors.feedback) {
        document.getElementById("feedbackError").textContent = errors.feedback;
        document.getElementById("feedbackID").classList.add("is-invalid");
    }

    if (errors.rating) {
        document.getElementById("ratingError").textContent = errors.rating;
        document.getElementById("ratingID").classList.add("is-invalid");
    }

    if (errors.gameChoice) {
        document.getElementById("gameChoiceError").textContent = errors.gameChoice;
    }

    if (errors.agreed) {
        document.getElementById("agreedError").textContent = errors.agreed;
        document.getElementById("agreedID").classList.add("is-invalid");
    }
}

function showServerError(message) {
    serverErrorMessage.textContent = message;
    serverErrorMessage.classList.remove("d-none");
}