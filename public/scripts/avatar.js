const authRequiredMessage = document.getElementById("authRequiredMessage");
const currentUserMessage = document.getElementById("currentUserMessage");
const avatarErrorMessage = document.getElementById("avatarErrorMessage");
const avatarSuccessMessage = document.getElementById("avatarSuccessMessage");
const avatarApp = document.getElementById("avatarApp");

const selectedAvatarImage = document.getElementById("selectedAvatarImage");
const selectedAvatarName = document.getElementById("selectedAvatarName");
const avatarGrid = document.getElementById("avatarGrid");
const avatarUploadForm = document.getElementById("avatarUploadForm");
const customAvatarImage = document.getElementById("customAvatarImage");

let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
    await loadCurrentUser();
    if (currentUser) {
        await loadAvatars();
    }
});

avatarUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const file = customAvatarImage.files[0];
    if (!file) {
        showError("Please choose a file.");
        return;
    }

    const formData = new FormData();
    formData.append("customAvatarImage", file);

    try {
        const response = await fetch("/api/avatar/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            showError(result.error || "Could not upload avatar.");
            return;
        }

        customAvatarImage.value = "";
        showSuccess("Avatar uploaded.");
        await loadAvatars();
    } catch {
        showError("Could not upload avatar.");
    }
});

async function loadCurrentUser() {
    try {
        const response = await fetch("/api/me");
        const result = await response.json();

        if (!result.authenticated) {
            authRequiredMessage.classList.remove("d-none");
            currentUserMessage.classList.add("d-none");
            avatarApp.classList.add("d-none");
            return;
        }

        currentUser = result.user;
        authRequiredMessage.classList.add("d-none");
        currentUserMessage.classList.remove("d-none");
        currentUserMessage.textContent = `Logged in as ${result.user.email}`;
        avatarApp.classList.remove("d-none");
    } catch {
        authRequiredMessage.classList.remove("d-none");
        currentUserMessage.classList.add("d-none");
        avatarApp.classList.add("d-none");
    }
}

async function loadAvatars() {
    clearMessages();

    try {
        const response = await fetch("/api/avatar");
        const result = await response.json();

        if (!response.ok) {
            showError(result.error || "Could not load avatars.");
            return;
        }

        renderAvatars(result.avatars, result.selectedAvatarId);
    } catch {
        showError("Could not load avatars.");
    }
}

function renderAvatars(avatars, selectedId) {
    avatarGrid.innerHTML = "";

    const selectedAvatar = avatars.find((avatar) => avatar.id === selectedId) || avatars[0];

    if (selectedAvatar) {
        selectedAvatarImage.src = selectedAvatar.image_url;
        selectedAvatarName.textContent = selectedAvatar.name;
    }

    for (const avatar of avatars) {
        const col = document.createElement("div");
        col.className = "col-md-4";

        const card = document.createElement("div");
        card.className = `card shadow-sm p-2 avatar-card ${avatar.id === selectedId ? "selected" : ""}`;

        const img = document.createElement("img");
        img.src = avatar.image_url;
        img.alt = avatar.name;
        img.className = "avatar-thumb mb-2";

        const title = document.createElement("div");
        title.className = "fw-semibold mb-2";
        title.textContent = avatar.name;

        const button = document.createElement("button");
        button.className = "btn btn-outline-primary";
        button.textContent = avatar.id === selectedId ? "Selected" : "Use This Avatar";
        button.disabled = avatar.id === selectedId;

        button.addEventListener("click", async () => {
            clearMessages();
            try {
                const response = await fetch("/api/avatar/select", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ avatarId: avatar.id })
                });

                const result = await response.json();

                if (!response.ok) {
                    showError(result.error || "Could not select avatar.");
                    return;
                }

                showSuccess("Avatar updated.");
                await loadAvatars();
            } catch {
                showError("Could not select avatar.");
            }
        });

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(button);
        col.appendChild(card);
        avatarGrid.appendChild(col);
    }
}

function showError(message) {
    avatarErrorMessage.textContent = message;
    avatarErrorMessage.classList.remove("d-none");
}

function showSuccess(message) {
    avatarSuccessMessage.textContent = message;
    avatarSuccessMessage.classList.remove("d-none");
}

function clearMessages() {
    avatarErrorMessage.textContent = "";
    avatarErrorMessage.classList.add("d-none");
    avatarSuccessMessage.textContent = "";
    avatarSuccessMessage.classList.add("d-none");
}