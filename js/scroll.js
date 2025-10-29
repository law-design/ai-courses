/*
  scroll.js
  This script adds a small “scroll to top” button that appears when the user
  scrolls down the page.  Clicking the button smoothly scrolls the viewport
  back to the top.  The button is hidden by default and only becomes visible
  after the user scrolls beyond 200 pixels.  Include this script on any
  page that defines a #scrollTopBtn element to enable the functionality.
*/

document.addEventListener('DOMContentLoaded', () => {
  const scrollBtn = document.getElementById('scrollTopBtn');
  if (!scrollBtn) return;
  // Toggle the visibility of the button based on scroll position
  function toggleBtn() {
    if (window.scrollY > 200) {
      scrollBtn.classList.remove('hidden');
    } else {
      scrollBtn.classList.add('hidden');
    }
  }
  // Listen for scroll events
  window.addEventListener('scroll', toggleBtn);
  // Scroll smoothly to the top when clicked
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  // Initial check in case the page loads mid‑scroll (e.g. anchor links)
  toggleBtn();
});