const authRequiredMessage = document.getElementById("authRequiredMessage");
const currentUserMessage = document.getElementById("currentUserMessage");
const activityErrorMessage = document.getElementById("activityErrorMessage");
const noActivityMessage = document.getElementById("noActivityMessage");
const activityTable = document.getElementById("activityTable");
const activityTableBody = document.getElementById("activityTableBody");

document.addEventListener("DOMContentLoaded", async () => {
    await loadCurrentUserAndActivity();
});

async function loadCurrentUserAndActivity() {
    try {
        const meResponse = await fetch("/api/me");
        const meResult = await meResponse.json();

        if (!meResult.authenticated) {
            authRequiredMessage.classList.remove("d-none");
            currentUserMessage.classList.add("d-none");
            activityTable.classList.add("d-none");
            noActivityMessage.classList.add("d-none");
            return;
        }

        authRequiredMessage.classList.add("d-none");
        currentUserMessage.classList.remove("d-none");
        currentUserMessage.textContent = `Logged in as ${meResult.user.email}`;

        const activityResponse = await fetch("/api/recent-activity");
        const activityResult = await activityResponse.json();

        if (!activityResponse.ok) {
            showError(activityResult.error || "Could not load recent activity.");
            return;
        }

        renderActivities(activityResult.activities || []);
    } catch {
        showError("Could not load recent activity.");
    }
}

function renderActivities(activities) {
    activityTableBody.innerHTML = "";

    if (activities.length === 0) {
        activityTable.classList.add("d-none");
        noActivityMessage.classList.remove("d-none");
        return;
    }

    noActivityMessage.classList.add("d-none");
    activityTable.classList.remove("d-none");

    for (const activity of activities) {
        const tr = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = activity.date;

        const timeCell = document.createElement("td");
        timeCell.textContent = activity.time;

        const pageCell = document.createElement("td");
        pageCell.textContent = activity.page;

        const actionCell = document.createElement("td");
        actionCell.textContent = activity.action;

        tr.appendChild(dateCell);
        tr.appendChild(timeCell);
        tr.appendChild(pageCell);
        tr.appendChild(actionCell);

        activityTableBody.appendChild(tr);
    }
}

function showError(message) {
    activityErrorMessage.textContent = message;
    activityErrorMessage.classList.remove("d-none");
    activityTable.classList.add("d-none");
    noActivityMessage.classList.add("d-none");
}