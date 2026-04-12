const homeUserStatus = document.getElementById("homeUserStatus");
const selectedAvatarSection = document.getElementById("selectedAvatarSection");
const homeSelectedAvatarImage = document.getElementById("homeSelectedAvatarImage");
const homeSelectedAvatarName = document.getElementById("homeSelectedAvatarName");

document.addEventListener("DOMContentLoaded", async () => {
    await loadHomeData();
});

async function loadHomeData() {
    try {
        const meResponse = await fetch("/api/me");
        const meResult = await meResponse.json();

        if (!meResult.authenticated) {
            homeUserStatus.classList.add("d-none");
            selectedAvatarSection.classList.add("d-none");
            return;
        }

        homeUserStatus.classList.remove("d-none");
        homeUserStatus.textContent = `Logged in as ${meResult.user.email}`;

        const avatarResponse = await fetch("/api/avatar");
        const avatarResult = await avatarResponse.json();

        if (!avatarResponse.ok) {
            selectedAvatarSection.classList.add("d-none");
            return;
        }

        const avatars = avatarResult.avatars || [];
        const selectedAvatarId = avatarResult.selectedAvatarId;
        const selectedAvatar = avatars.find((avatar) => avatar.id === selectedAvatarId) || avatars[0];

        if (!selectedAvatar) {
            selectedAvatarSection.classList.add("d-none");
            return;
        }

        homeSelectedAvatarImage.src = selectedAvatar.image_url;
        homeSelectedAvatarName.textContent = selectedAvatar.name;
        selectedAvatarSection.classList.remove("d-none");
    } catch {
        homeUserStatus.classList.add("d-none");
        selectedAvatarSection.classList.add("d-none");
    }
}