const authStatus = document.getElementById("authStatus");
const authError = document.getElementById("authError");
const authSuccess = document.getElementById("authSuccess");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

document.addEventListener("DOMContentLoaded", () => {
    loadCurrentUser();
});

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();
    clearFormErrors(["signupEmail", "signupPassword"]);

    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    const errors = validateAuthInput(email, password, "signup");
    if (Object.keys(errors).length > 0) {
        showFormErrors(errors);
        return;
    }

    try {
        const response = await fetch("/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({email, password})
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.errors) {
                showApiErrors(result.errors, "signup");
            } else {
                showError(result.error || "Could not sign up.");
            }
            return;
        }

        signupForm.reset();
        showSuccess(`Signed up as ${result.user.email}`);
        await loadCurrentUser();
    } catch {
        showError("Could not sign up.");
    }
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();
    clearFormErrors(["loginEmail", "loginPassword"]);

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const errors = validateAuthInput(email, password, "login");
    if (Object.keys(errors).length > 0) {
        showFormErrors(errors);
        return;
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({email, password})
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.errors) {
                showApiErrors(result.errors, "login");
            } else {
                showError(result.error || "Could not log in.");
            }
            return;
        }

        loginForm.reset();
        showSuccess(`Logged in as ${result.user.email}`);
        await loadCurrentUser();
    } catch {
        showError("Could not log in.");
    }
});

async function loadCurrentUser() {
    try {
        const response = await fetch("/api/me");
        const result = await response.json();

        if (!result.authenticated) {
            authStatus.className = "alert alert-warning";
            authStatus.textContent = "You are not logged in.";
            return;
        }

        authStatus.className = "alert alert-success";
        authStatus.textContent = `Logged in as ${result.user.email}`;
    } catch {
        authStatus.className = "alert alert-danger";
        authStatus.textContent = "Could not load login status.";
    }
}

function validateAuthInput(email, password, prefix) {
    const errors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        errors[`${prefix}Email`] = "Please enter a valid email address";
    }

    if (password.length < 8) {
        errors[`${prefix}Password`] = "Password must be at least 8 characters";
    }

    return errors;
}

function showApiErrors(apiErrors, prefix) {
    if (apiErrors.email) {
        setFieldError(`${prefix}Email`, apiErrors.email);
    }
    if (apiErrors.password) {
        setFieldError(`${prefix}Password`, apiErrors.password);
    }
}

function showFormErrors(errors) {
    for (const [fieldId, message] of Object.entries(errors)) {
        setFieldError(fieldId, message);
    }
}

function setFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const feedback = document.getElementById(`${fieldId}Error`);

    if (input) {
        input.classList.add("is-invalid");
    }
    if (feedback) {
        feedback.textContent = message;
    }
}

function clearFormErrors(fieldIds) {
    for (const fieldId of fieldIds) {
        const input = document.getElementById(fieldId);
        const feedback = document.getElementById(`${fieldId}Error`);

        if (input) {
            input.classList.remove("is-invalid");
        }
        if (feedback) {
            feedback.textContent = "";
        }
    }
}

function clearMessages() {
    authError.textContent = "";
    authError.classList.add("d-none");

    authSuccess.textContent = "";
    authSuccess.classList.add("d-none");
}

function showError(message) {
    authError.textContent = message;
    authError.classList.remove("d-none");
}

function showSuccess(message) {
    authSuccess.textContent = message;
    authSuccess.classList.remove("d-none");
}