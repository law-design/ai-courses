/* theme.js
  Handles dark mode toggling across the site.
  Adds or removes the `dark` class on the root HTML element and persists the
  user’s preference using localStorage. Any page including this script must
  provide a button with the id `darkModeToggle` to trigger the toggle. On
  page load, the script reads the previously stored preference and applies
  it immediately. If no preference exists, the default light theme is
  applied.

  This script is inspired by Moodle theme features that allow users to
  switch between light and dark modes for comfortable learning【683373613905118†L320-L346】.
*/

function applySavedTheme() {
  const saved = localStorage.getItem('theme');
  const html = document.documentElement;
  if (saved === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

document.addEventListener('DOMContentLoaded', () => {
  // Apply the saved theme on load
  applySavedTheme();
  // Find the toggle button and wire up the click handler
  const toggleButton = document.getElementById('darkModeToggle');
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      toggleDarkMode();
    });
  }
});