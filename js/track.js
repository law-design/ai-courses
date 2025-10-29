/*
  track.js
  Handles rendering of a single track page. Reads the `track` query parameter
  from the URL, filters the dataset to courses with that track, and displays
  domain cards and course cards. Domains link to the listing page filtered
  by that domain and track.
*/

const courses = (typeof coursesData !== 'undefined') ? coursesData : [];

function init() {
  const params = new URLSearchParams(window.location.search);
  let track = params.get('track');
  // If no track parameter is provided, display a list of all tracks instead of showing an error.
  if (!track) {
    // Set heading and description for the "all tracks" page
    const nameEl = document.getElementById('trackName');
    if (nameEl) nameEl.textContent = 'All Tracks';
    const descEl = document.getElementById('trackDescription');
    if (descEl) {
      descEl.textContent = 'Browse all available tracks at NanoSchool. Select a track to view its domains and courses.';
    }
    // Hide sections that are only relevant for a specific track
    const aboutSection = document.getElementById('aboutTrack');
    if (aboutSection) aboutSection.style.display = 'none';
    const courseTypes = document.getElementById('courseTypesSection');
    if (courseTypes) courseTypes.style.display = 'none';
    const coursesSection = document.getElementById('coursesSection');
    if (coursesSection) coursesSection.style.display = 'none';
    // Update the domains section heading to indicate it lists tracks
    const domainHeading = document.querySelector('#domainSection h2');
    if (domainHeading) domainHeading.textContent = 'Tracks';
    // Build a list of all tracks and their course counts
    const trackCounts = {};
    courses.forEach(course => {
      if (course.track) {
        trackCounts[course.track] = (trackCounts[course.track] || 0) + 1;
      }
    });
    const trackNames = Object.keys(trackCounts).sort();
    const listEl = document.getElementById('domainList');
    if (listEl) {
      // Determine responsive grid columns based on the number of tracks
      const count = trackNames.length;
      let cols;
      if (count <= 1) {
        cols = 'grid-cols-1';
      } else if (count === 2) {
        cols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2';
      } else if (count === 3) {
        cols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      } else {
        cols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      }
      listEl.className = `grid ${cols} gap-4 justify-center mx-auto`;
      listEl.innerHTML = '';
      trackNames.forEach(t => {
        const count = trackCounts[t];
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg shadow-sm p-4 flex flex-col';
        // Add fade-in class for smooth appearance
        card.classList.add('fade-in');
        const titleEl = document.createElement('h3');
        titleEl.className = 'text-lg font-semibold text-blue-700 mb-1';
        titleEl.textContent = t;
        const pEl = document.createElement('p');
        pEl.className = 'text-sm text-gray-600 mb-2';
        pEl.textContent = `${count} course${count !== 1 ? 's' : ''}`;
        const linkEl = document.createElement('a');
        linkEl.href = `track.html?track=${encodeURIComponent(t)}`;
        linkEl.className = 'mt-auto inline-block text-sm font-semibold text-blue-600 hover:underline';
        linkEl.textContent = 'View track';
        card.appendChild(titleEl);
        card.appendChild(pEl);
        card.appendChild(linkEl);
        listEl.appendChild(card);
      });
    }
    // Update meta tags to generic values for the tracks overview
    updateMetaTags('All Tracks');
    // Set the current year in the footer
    const yearSpan = document.getElementById('currentYear') || document.getElementById('footerYear');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
    // Hide the table of contents since section anchors are not relevant when listing all tracks
    const toc = document.getElementById('toc');
    if (toc) toc.style.display = 'none';
    return;
  }
  // Attempt an exact match first
  let filtered = courses.filter(c => c.track === track);
  // If no courses are found, perform a case‑insensitive partial match against all track names
  if (filtered.length === 0) {
    const lowerParam = track.toLowerCase();
    const allTracks = Array.from(new Set(courses.map(c => c.track)));
    const match = allTracks.find(t => t.toLowerCase().includes(lowerParam));
    if (match) {
      track = match;
      filtered = courses.filter(c => c.track === match);
    }
  }
  // If still no matches, show a message and return
  if (filtered.length === 0) {
    document.getElementById('trackName').textContent = track;
    const descEl = document.getElementById('trackDescription');
    if (descEl) {
      descEl.textContent = 'No courses found for this track.';
    }
    return;
  }
  document.getElementById('trackName').textContent = track;
  // Set description using innerHTML so we can include a call‑to‑action link to the listing page.  The
  // generateTrackDescription function returns a sanitized string containing an anchor element.  Since
  // the content comes from our script, it is safe to insert as HTML.
  document.getElementById('trackDescription').innerHTML = generateTrackDescription(track);

  // Update page metadata dynamically to improve SEO.  If the head contains
  // standard meta tags (description, og:title, twitter:title etc.) they will
  // be updated with track‑specific content.  This helps each track page
  // generate a unique snippet in search results and social shares.
  updateMetaTags(track);
  // Compute domains list with counts
  const domainCounts = {};
  filtered.forEach(course => {
    course.domains.forEach(domain => {
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    });
  });
  // Populate domain list
  const domainContainer = document.getElementById('domainList');
  domainContainer.innerHTML = '';
  const domainNames = Object.keys(domainCounts).sort();
  // Dynamically set grid columns for the domain list based on the number of domains.
  const domainCount = domainNames.length;
  let domainCols;
  if (domainCount <= 1) {
    domainCols = 'grid-cols-1';
  } else if (domainCount === 2) {
    domainCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2';
  } else if (domainCount === 3) {
    domainCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
  } else {
    domainCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  }
  domainContainer.className = `grid ${domainCols} gap-4 justify-center mx-auto`;
  domainNames.forEach(domain => {
    const count = domainCounts[domain];
    const card = document.createElement('div');
    card.className = 'bg-white border rounded-lg shadow-sm p-4 flex flex-col';
    // Fade in domain cards for a smoother transition from skeleton to content
    card.classList.add('fade-in');
    const h3 = document.createElement('h3');
    h3.className = 'text-lg font-semibold text-blue-700 mb-1';
    h3.textContent = domain;
    const p = document.createElement('p');
    p.className = 'text-sm text-gray-600 mb-2';
    p.textContent = `${count} course${count !== 1 ? 's' : ''}`;
    const link = document.createElement('a');
    link.href = `listing.html?track=${encodeURIComponent(track)}&domain=${encodeURIComponent(domain)}`;
    link.className = 'mt-auto inline-block text-sm font-semibold text-blue-600 hover:underline';
    link.textContent = 'View courses';
    card.appendChild(h3);
    card.appendChild(p);
    card.appendChild(link);
    domainContainer.appendChild(card);
  });
  // Populate courses list
  const courseContainer = document.getElementById('courseList');
  courseContainer.innerHTML = '';
  // Determine grid columns dynamically based on the number of courses available
  const courseCount = filtered.length;
  let courseCols;
  if (courseCount <= 1) {
    courseCols = 'grid-cols-1';
  } else if (courseCount === 2) {
    courseCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2';
  } else if (courseCount === 3) {
    courseCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
  } else {
    courseCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  }
  courseContainer.className = `grid ${courseCols} gap-4 justify-center mx-auto`;
  filtered.sort((a, b) => a.title.localeCompare(b.title)).forEach(course => {
    courseContainer.appendChild(createCourseCard(course));
  });
  // Set year in footer (support both legacy and new footer IDs)
  const yearSpan = document.getElementById('currentYear') || document.getElementById('footerYear');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

function generateTrackDescription(track) {
  // Generate a generic description and include a link to browse all courses in this track.
  // Sanitize the track name by removing parentheses, quotes and angle brackets to prevent
  // injection when inserting into HTML.  Use encodeURIComponent for URL values.
  const cleanName = track
    .replace(/\(.*?\)/g, '')
    .replace(/["'<>]/g, '')
    .trim();
  const url = `listing.html?track=${encodeURIComponent(track)}`;
  return `The ${cleanName} track covers a curated set of courses designed to help you master key concepts and skills. Browse domains, tools and courses below to dive deeper. <a href="${url}" class="text-blue-600 underline" rel="noopener noreferrer">See all ${cleanName} courses</a>.`;
}

function createCourseCard(course) {
  const card = document.createElement('div');
  // Add a reusable course-card class for consistent hover behaviour and micro‑interactions.
  card.className = 'course-card bg-white border rounded-lg shadow-md overflow-hidden flex flex-col';
  // Apply fade-in animation for smooth appearance
  card.classList.add('fade-in');
  const header = document.createElement('div');
  header.className = 'relative h-36 w-full flex items-center justify-center';
  // Apply our brand gradient using CSS variables defined in custom.css
  header.style.background = 'linear-gradient(to bottom right, var(--brand-secondary), var(--brand-primary), var(--brand-accent))';
  const icon = document.createElement('i');
  icon.className = 'fas fa-robot text-white text-4xl';
  header.appendChild(icon);
  const badge = document.createElement('span');
  badge.textContent = 'NSTC';
  badge.className = 'absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded';
  header.appendChild(badge);
  card.appendChild(header);
  const body = document.createElement('div');
  body.className = 'p-4 flex flex-col flex-1';
  const titleLink = document.createElement('a');
  titleLink.href = course.detailUrl || '#';
  titleLink.target = '_blank';
  titleLink.rel = 'noopener noreferrer';
  titleLink.className = 'text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors';
  titleLink.textContent = course.title;
  body.appendChild(titleLink);
  const subtitle = document.createElement('p');
  subtitle.className = 'text-sm text-gray-600 mt-1';
  const metaParts = [];
  if (course.domains && course.domains.length) metaParts.push(course.domains.join(', '));
  if (course.tools && course.tools.length) metaParts.push(course.tools.join(', '));
  subtitle.textContent = metaParts.join(' • ');
  body.appendChild(subtitle);
  const statsRow = document.createElement('div');
  statsRow.className = 'flex flex-wrap items-center text-sm text-gray-600 mt-2';
  const starsDiv = document.createElement('div');
  starsDiv.className = 'flex items-center mr-3';
  const fullStars = Math.floor(course.rating);
  for (let i = 0; i < 5; i++) {
    const starIcon = document.createElement('i');
    if (i < fullStars) {
      starIcon.className = 'fas fa-star text-yellow-500 mr-1';
    } else {
      starIcon.className = 'far fa-star text-gray-300 mr-1';
    }
    // Hide decorative star icons from assistive technologies
    starIcon.setAttribute('aria-hidden', 'true');
    starsDiv.appendChild(starIcon);
  }
  const ratingNumber = document.createElement('span');
  ratingNumber.textContent = course.rating.toFixed(1);
  ratingNumber.className = 'ml-1';
  starsDiv.appendChild(ratingNumber);
  // Provide an accessible label for the rating value
  starsDiv.setAttribute('aria-label', `${course.rating.toFixed(1)} out of 5 stars`);
  statsRow.appendChild(starsDiv);
  const learners = document.createElement('span');
  learners.className = 'ml-3';
  learners.textContent = `${(course.students / 1000).toFixed(1)}k learners`;
  statsRow.appendChild(learners);
  const duration = document.createElement('span');
  duration.className = 'ml-3';
  duration.textContent = `${course.weeks} weeks`;
  statsRow.appendChild(duration);
  body.appendChild(statsRow);

  // Progress bar representing rating (0–5 scale)
  const progressContainer = document.createElement('div');
  progressContainer.className = 'w-full h-2 bg-gray-200 rounded-full mt-2';
  const progressBar = document.createElement('div');
  progressBar.className = 'h-2 bg-blue-500 rounded-full';
  const ratingPercent = Math.max(0, Math.min(5, course.rating)) / 5 * 100;
  progressBar.style.width = ratingPercent + '%';
  progressContainer.appendChild(progressBar);
  body.appendChild(progressContainer);
  const priceRow = document.createElement('div');
  priceRow.className = 'grid grid-cols-3 gap-2 text-sm text-gray-700 mt-4';
  const lmsCol = document.createElement('div');
  lmsCol.className = 'flex flex-col';
  lmsCol.innerHTML = `<span class="font-semibold"><i class="fas fa-book-open mr-1"></i> ₹${course.lmsPriceInr.toLocaleString()}</span><span class="text-xs text-gray-500">LMS</span>`;
  priceRow.appendChild(lmsCol);
  const videoCol = document.createElement('div');
  videoCol.className = 'flex flex-col';
  videoCol.innerHTML = `<span class="font-semibold"><i class="fas fa-video mr-1"></i> ₹${course.videoPriceInr.toLocaleString()}</span><span class="text-xs text-gray-500">Video</span>`;
  priceRow.appendChild(videoCol);
  const liveCol = document.createElement('div');
  liveCol.className = 'flex flex-col';
  liveCol.innerHTML = `<span class="font-semibold"><i class="fas fa-chalkboard-teacher mr-1"></i> ₹${course.livePriceInr.toLocaleString()}</span><span class="text-xs text-gray-500">Live</span>`;
  priceRow.appendChild(liveCol);
  body.appendChild(priceRow);
  const ctaRow = document.createElement('div');
  ctaRow.className = 'flex space-x-2 mt-4';
  const enrollBtn = document.createElement('a');
  enrollBtn.href = course.enrollmentUrl || '#';
  enrollBtn.target = '_blank';
  enrollBtn.rel = 'noopener noreferrer';
  enrollBtn.className = 'flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md';
  enrollBtn.textContent = 'Enroll Now';
  const detailsBtn = document.createElement('a');
  detailsBtn.href = course.detailUrl || '#';
  detailsBtn.target = '_blank';
  detailsBtn.rel = 'noopener noreferrer';
  detailsBtn.className = 'flex-1 text-center border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-semibold px-4 py-2 rounded-md';
  detailsBtn.textContent = 'Details';
  ctaRow.appendChild(enrollBtn);
  ctaRow.appendChild(detailsBtn);
  body.appendChild(ctaRow);
  card.appendChild(body);
  return card;
}

/**
 * Update document title and meta tags for the current track.  This function
 * attempts to locate existing meta tags in the page head (standard
 * description, og:*, twitter:* tags) and rewrites their content to
 * incorporate the current track name.  It also updates the canonical
 * URL so that each track page has a unique canonical identifier.  If any
 * of the tags are missing they will be skipped.  Modifying meta tags
 * client‑side still benefits social sharing when the page is loaded, but
 * ideally these tags would be rendered server‑side too.
 * @param {string} trackName The current track name from URL parameters.
 */
function updateMetaTags(trackName) {
  // Sanitize trackName for use in descriptive text (remove parentheses, quotes and angle brackets)
  const cleanName = trackName
    .replace(/\(.*?\)/g, '')
    .replace(/["'<>]/g, '')
    .trim();
  const titleText = `${cleanName} Track | NanoSchool`;
  const descriptionText = `Explore courses in the ${cleanName} track at NanoSchool. Discover domains, tools and learning paths designed to help you master ${cleanName} concepts and prepare for careers in AI and emerging technologies.`;

  // Document title
  document.title = titleText;
  // Standard meta description
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.setAttribute('content', descriptionText);
  // Keywords: append track name
  const keywordsMeta = document.querySelector('meta[name="keywords"]');
  if (keywordsMeta) {
    const baseKeywords = keywordsMeta.getAttribute('data-base') || keywordsMeta.content;
    // Prepend track keywords if not already included
    const newKeywords = `${cleanName} track, ${baseKeywords}`;
    keywordsMeta.setAttribute('content', newKeywords);
  }
  // Canonical link: use the current URL rather than constructing from origin. This improves SSR compatibility
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.setAttribute('href', window.location.href);
  // Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', titleText);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', descriptionText);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', window.location.href);
  // Twitter cards
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', titleText);
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', descriptionText);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  // Handle tab switching for learning paths
  const tabButtons = document.querySelectorAll('#learningTabs .tab-btn');
  const contents = {
    flow: document.getElementById('tabFlow'),
    kanban: document.getElementById('tabKanban'),
    normal: document.getElementById('tabNormal'),
    collapsible: document.getElementById('tabCollapsible')
  };
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      // Remove active classes from all buttons
      tabButtons.forEach(b => {
        b.classList.remove('border-blue-700', 'text-blue-700', 'font-semibold');
        b.classList.add('text-gray-600');
      });
      // Hide all content panels
      Object.values(contents).forEach(panel => panel.classList.add('hidden'));
      // Show selected panel
      if (contents[tab]) contents[tab].classList.remove('hidden');
      // Activate clicked tab
      btn.classList.add('border-blue-700', 'text-blue-700', 'font-semibold');
      btn.classList.remove('text-gray-600');
    });
  });
});