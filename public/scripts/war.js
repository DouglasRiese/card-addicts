const authRequiredMessage = document.getElementById("authRequiredMessage");
const currentUserMessage = document.getElementById("currentUserMessage");
const warErrorMessage = document.getElementById("warErrorMessage");

const settingsSection = document.getElementById("settingsSection");
const gameSection = document.getElementById("gameSection");

const startGameButton = document.getElementById("startGameButton");
const drawButton = document.getElementById("drawButton");
const resetButton = document.getElementById("resetButton");

const resultMessage = document.getElementById("resultMessage");
const computerCapturesCount = document.getElementById("computerCapturesCount");
const playerCapturesCount = document.getElementById("playerCapturesCount");
const cardsRemaining = document.getElementById("cardsRemaining");
const victoryTarget = document.getElementById("victoryTarget");
const computerCardImage = document.getElementById("computerCardImage");
const playerCardImage = document.getElementById("playerCardImage");

let isAuthenticated = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadCurrentUser();
    if (isAuthenticated) {
        await loadWarState();
    }
});

startGameButton.addEventListener("click", async () => {
    clearError();

    if (!isAuthenticated) {
        showError("You must be logged in to play.");
        return;
    }

    const selectedVictory = document.querySelector('input[name="victoryConditions"]:checked');
    const victoryCondition = Number(selectedVictory?.value || "5");

    try {
        const response = await fetch("/api/war/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({victoryCondition})
        });

        const result = await response.json();

        if (!response.ok) {
            showError(result.error || "Could not start game.");
            return;
        }

        renderWarState(result.state);
    } catch {
        showError("Could not start game.");
    }
});

drawButton.addEventListener("click", async () => {
    clearError();

    try {
        const response = await fetch("/api/war/draw", {
            method: "POST"
        });

        const result = await response.json();

        if (!response.ok) {
            showError(result.error || "Could not draw card.");
            return;
        }

        renderWarState(result.state);
    } catch {
        showError("Could not draw card.");
    }
});

resetButton.addEventListener("click", async () => {
    clearError();

    try {
        const response = await fetch("/api/war/reset", {
            method: "POST"
        });

        const result = await response.json();

        if (!response.ok) {
            showError(result.error || "Could not reset game.");
            return;
        }

        renderWarState(result.state);
    } catch {
        showError("Could not reset game.");
    }
});

async function loadCurrentUser() {
    try {
        const response = await fetch("/api/me");
        const result = await response.json();

        if (result.authenticated) {
            isAuthenticated = true;
            authRequiredMessage.classList.add("d-none");
            currentUserMessage.classList.remove("d-none");
            currentUserMessage.textContent = `Logged in as ${result.user.email}`;
            return;
        }

        isAuthenticated = false;
        authRequiredMessage.classList.remove("d-none");
        currentUserMessage.classList.add("d-none");
        settingsSection.classList.add("d-none");
        gameSection.classList.add("d-none");
    } catch {
        isAuthenticated = false;
        authRequiredMessage.classList.remove("d-none");
        currentUserMessage.classList.add("d-none");
        settingsSection.classList.add("d-none");
        gameSection.classList.add("d-none");
    }
}

async function loadWarState() {
    try {
        const response = await fetch("/api/war/state");
        const result = await response.json();

        if (!response.ok) {
            showError(result.error || "Could not load war state.");
            return;
        }

        renderWarState(result.state);
    } catch {
        showError("Could not load war state.");
    }
}

function renderWarState(state) {
    const hasGame = Boolean(state.deckId);

    if (!hasGame) {
        settingsSection.classList.remove("d-none");
        gameSection.classList.add("d-none");
        return;
    }

    settingsSection.classList.add("d-none");
    gameSection.classList.remove("d-none");

    resultMessage.textContent = state.result || "Game started.";
    computerCapturesCount.textContent = String(state.computerCapturesCount || 0);
    playerCapturesCount.textContent = String(state.playerCapturesCount || 0);
    cardsRemaining.textContent = String(state.cardsRemaining || 0);
    victoryTarget.textContent = String(state.victoryCondition || 0);

    if (state.lastComputerCardImage) {
        computerCardImage.src = state.lastComputerCardImage;
        computerCardImage.classList.remove("d-none");
    } else {
        computerCardImage.classList.add("d-none");
    }

    if (state.lastPlayerCardImage) {
        playerCardImage.src = state.lastPlayerCardImage;
        playerCardImage.classList.remove("d-none");
    } else {
        playerCardImage.classList.add("d-none");
    }

    drawButton.disabled = Boolean(state.gameOver);
}

function showError(message) {
    warErrorMessage.textContent = message;
    warErrorMessage.classList.remove("d-none");
}

function clearError() {
    warErrorMessage.textContent = "";
    warErrorMessage.classList.add("d-none");
}