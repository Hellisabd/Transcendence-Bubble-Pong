document.addEventListener("click", function(event: MouseEvent) {
	const MenuMobile = document.getElementById("mobile-menu");
	const mobilemenubutton = document.getElementById("mobile-menu-button");
	const menuIconOpen = document.getElementById("menu-icon-open");
	const menuIconClose = document.getElementById("menu-icon-close");
	const userMenu = document.getElementById("user-menu");
	const userMenuButton = document.getElementById("user-menu-button");

	if (!userMenu?.contains(event.target as Node) && !userMenuButton?.contains(event.target as Node)) {
		userMenu?.classList.add("hidden");
	}

	if (!MenuMobile?.contains(event.target as Node) && !mobilemenubutton?.contains(event.target as Node)) {
		MenuMobile?.classList.add("hidden");
		menuIconOpen?.classList.remove("hidden");
		menuIconClose?.classList.add("hidden");
	}
});
function displayMenu() {
	const mobileMenu = document.getElementById("mobile-menu");
	const menuIconOpen = document.getElementById("menu-icon-open");
	const menuIconClose = document.getElementById("menu-icon-close");

	mobileMenu?.classList.toggle("hidden");
	menuIconOpen?.classList.toggle("hidden");
	menuIconClose?.classList.toggle("hidden");
}

function displayUserMenu() {
	const userMenu = document.getElementById("user-menu");
	userMenu?.classList.toggle("hidden");
};