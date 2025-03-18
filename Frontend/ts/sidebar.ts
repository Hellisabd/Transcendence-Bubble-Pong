document.addEventListener("DOMContentLoaded", function() {
	set_up_friend_list();
});

function toggleSidebar(): void {
	let sidebar = document.getElementById("sidebar") as HTMLElement;
	let sidebarButton = document.getElementById("sidebarButton") as HTMLElement;
	console.log("je suis la");
	if (sidebar && sidebarButton) {
		sidebar.classList.toggle("hidden");
		sidebarButton.classList.toggle("right-0");
		sidebarButton.classList.toggle("right-[17.5rem]");
		sidebarButton.classList.toggle("xs:right-[18.75rem]");

	}
}
