document.addEventListener("DOMContentLoaded", function () {
  const closeButton = document.querySelectorAll(".close");

  closeButton.forEach((button) => {
    button.addEventListener("click", function () {
      const alertElement = this.closest(".alert");

      if (alertElement) {
        fadeOut(alertElement);
      }
    });
  });
});

// --- Helper function for the fadeOut effect ---
function fadeOut(element) {
  let opacity = 1;
  //   element.style.transition = "opacity 0.5s ease-out";

  // Start the fade out
  const fade = setInterval(function () {
    if (opacity <= 0.05) {
      clearInterval(fade);
    }
    opacity -= 0.05;
    element.style.opacity = opacity;
  }, 20);
}
