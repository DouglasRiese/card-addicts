document.addEventListener("DOMContentLoaded", async () => {
    await enhanceNavbar();
});

async function enhanceNavbar() {
    const navAuthSlot = document.getElementById("navAuthSlot");
    if (!navAuthSlot) return;

    const loginLinks = Array.from(document.querySelectorAll('a[href="/login.html"]'));

    try {
        const meResponse = await fetch("/api/me");
        const meResult = await meResponse.json();

        if (!meResult.authenticated) {
            navAuthSlot.innerHTML = "";
            for (const link of loginLinks) {
                link.textContent = "Login";
                link.classList.remove("disabled");
                link.removeAttribute("aria-disabled");
            }
            return;
        }

        for (const link of loginLinks) {
            link.textContent = "Account";
            link.classList.remove("disabled");
            link.removeAttribute("aria-disabled");
        }

        let selectedAvatar = null;

        try {
            const avatarResponse = await fetch("/api/avatar");
            const avatarResult = await avatarResponse.json();

            if (avatarResponse.ok) {
                const avatars = avatarResult.avatars || [];
                const selectedAvatarId = avatarResult.selectedAvatarId;
                selectedAvatar = avatars.find((avatar) => avatar.id === selectedAvatarId) || avatars[0] || null;
            }
        } catch {
            selectedAvatar = null;
        }

        navAuthSlot.innerHTML = `
      <div class="nav-user-wrap">
        ${
            selectedAvatar
                ? `<a href="/avatar.html" title="Manage avatar">
                 <img src="${escapeHtml(selectedAvatar.image_url)}" alt="${escapeHtml(selectedAvatar.name)}" class="nav-avatar">
               </a>`
                : ""
        }
        <a href="/login.html" class="text-decoration-none nav-user-email">
          ${escapeHtml(meResult.user.email)}
        </a>
        <button type="button" class="btn btn-outline-danger btn-sm nav-logout-btn" id="navLogoutButton">
          Logout
        </button>
      </div>
    `;

        const navLogoutButton = document.getElementById("navLogoutButton");
        if (navLogoutButton) {
            navLogoutButton.addEventListener("click", async () => {
                navLogoutButton.disabled = true;

                try {
                    const response = await fetch("/api/logout", {
                        method: "POST"
                    });

                    if (!response.ok) {
                        navLogoutButton.disabled = false;
                        return;
                    }

                    window.location.reload();
                } catch {
                    navLogoutButton.disabled = false;
                }
            });
        }
    } catch {
        navAuthSlot.innerHTML = "";
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}