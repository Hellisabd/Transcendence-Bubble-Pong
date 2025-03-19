document.addEventListener("DOMContentLoaded", function() {
	set_up_friend_list();
});

function toggleSidebar(): void {
    let sidebar = document.getElementById("sidebar") as HTMLElement;
    let sidebarButton = document.getElementById("sidebarButton") as HTMLElement;

    if (sidebar && sidebarButton) {
        const isOpen = sidebar.classList.contains("animate-rightFadeInBar");

        if (isOpen) {
            sidebar.classList.remove("animate-rightFadeInBar");
            sidebar.classList.add("animate-leftFadeInSideBar");

            sidebarButton.classList.remove("animate-rightFadeInBar");
            sidebarButton.classList.add("animate-leftFadeInBar");

            sidebar.addEventListener("animationend", function handler(event) {
                if (event.animationName === "leftFadeInSideBar") {
                    sidebar.classList.add("hidden");
                    sidebar.removeEventListener("animationend", handler);
                }
            });
        } else {
            sidebar.classList.remove("hidden");
            sidebar.classList.remove("animate-leftFadeInSideBar");
            sidebar.classList.add("animate-rightFadeInBar");

            sidebarButton.classList.remove("animate-leftFadeInBar");
            sidebarButton.classList.add("animate-rightFadeInBar");
        }
        sidebarButton.classList.toggle("right-0", isOpen);
        sidebarButton.classList.toggle("right-[17.5rem]", !isOpen);
        sidebarButton.classList.toggle("xs:right-[18.75rem]", !isOpen);
    }
}
