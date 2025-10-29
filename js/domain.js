/*
  domain.js
  Handles rendering of a single domain page. Reads the `domain` query parameter
  from the URL, filters the dataset to courses within that domain, lists tools
  and courses, and sets generic descriptions.
*/

const courses = (typeof coursesData !== 'undefined') ? coursesData : [];

function init() {
  const params = new URLSearchParams(window.location.search);
  const domainParam = params.get('domain');
  // If no domain is provided, render a list of all domains with counts instead of showing an error.
  if (!domainParam) {
    // Update heading and description to reflect listing of all domains
    const nameEl = document.getElementById('domainName');
    if (nameEl) nameEl.textContent = 'All Domains';
    const descEl = document.getElementById('domainDescription');
    if (descEl) {
      descEl.textContent = 'Browse all available domains at NanoSchool. Select a domain to view tools and courses associated with that field.';
    }
    // Hide About Domain and Courses sections since they apply to individual domains
    const aboutSection = document.getElementById('aboutDomain');
    if (aboutSection) aboutSection.style.display = 'none';
    const coursesSection = document.getElementById('coursesSection');
    if (coursesSection) coursesSection.style.display = 'none';
    // Hide the table of contents to avoid links to hidden sections
    const toc = document.getElementById('toc');
    if (toc) toc.style.display = 'none';
    // Change the Tools section heading to "Domains"
    const toolHeading = document.querySelector('#toolsSection h2');
    if (toolHeading) toolHeading.textContent = 'Domains';
    // Build a list of all domain names and their course counts
    const domainCounts = {};
    courses.forEach(course => {
      (course.domains || []).forEach(d => {
        domainCounts[d] = (domainCounts[d] || 0) + 1;
      });
    });
    const domainNames = Object.keys(domainCounts).sort();
    const toolListEl = document.getElementById('toolList');
    if (toolListEl) {
      // Determine responsive grid columns based on the number of domains
      const total = domainNames.length;
      let cols;
      if (total <= 1) {
        cols = 'grid-cols-1';
      } else if (total === 2) {
        cols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2';
      } else if (total === 3) {
        cols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      } else {
        cols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      }
      toolListEl.className = `grid ${cols} gap-4 justify-center mx-auto`;
      toolListEl.innerHTML = '';
      domainNames.forEach(d => {
        const count = domainCounts[d];
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg shadow-sm p-4 flex flex-col';
        card.classList.add('fade-in');
        const titleEl = document.createElement('h3');
        titleEl.className = 'text-lg font-semibold text-blue-700 mb-1';
        titleEl.textContent = d;
        const pEl = document.createElement('p');
        pEl.className = 'text-sm text-gray-600 mb-2';
        pEl.textContent = `${count} course${count !== 1 ? 's' : ''}`;
        const linkEl = document.createElement('a');
        linkEl.href = `domain.html?domain=${encodeURIComponent(d)}`;
        linkEl.className = 'mt-auto inline-block text-sm font-semibold text-blue-600 hover:underline';
        linkEl.textContent = 'View domain';
        card.appendChild(titleEl);
        card.appendChild(pEl);
        card.appendChild(linkEl);
        toolListEl.appendChild(card);
      });
    }
    // Update meta tags with a generic title for all domains
    updateMetaTags('All Domains');
    // Update the year in the footer (support legacy IDs)
    const yearSpan = document.getElementById('currentYear') || document.getElementById('footerYear');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
    return;
  }
  // Begin with the domain query parameter
  let domainName = domainParam;
  // Find all courses matching the domain exactly
  let filtered = courses.filter(course => Array.isArray(course.domains) && course.domains.includes(domainName));
  // If no exact match, perform case‑insensitive partial search across domain names
  if (filtered.length === 0) {
    const lowerParam = domainName.toLowerCase();
    const allDomains = Array.from(new Set(courses.flatMap(course => course.domains || [])));
    const match = allDomains.find(d => d.toLowerCase().includes(lowerParam));
    if (match) {
      domainName = match;
      filtered = courses.filter(course => Array.isArray(course.domains) && course.domains.includes(match));
    }
  }
  // If still no matching courses, display a message and exit early
  if (filtered.length === 0) {
    document.getElementById('domainName').textContent = domainName;
    const descEl = document.getElementById('domainDescription');
    if (descEl) {
      descEl.textContent = 'No courses found for this domain.';
    }
    return;
  }
  // Set resolved domain name and description
  document.getElementById('domainName').textContent = domainName;
  document.getElementById('domainDescription').innerHTML = generateDomainDescription(domainName);

  // Dynamically update document metadata for SEO by incorporating the domain name.
  updateMetaTags(domainName);
  // Compute tools count
  const toolCounts = {};
  filtered.forEach(course => {
    course.tools.forEach(tool => {
      toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    });
  });
  const toolList = document.getElementById('toolList');
  toolList.innerHTML = '';
  const toolNames = Object.keys(toolCounts).sort();
  // Dynamically set grid columns based on how many tools exist.  This ensures
  // that rows with only a few cards do not appear left aligned.
  const toolCount = toolNames.length;
  let toolCols;
  if (toolCount <= 1) {
    toolCols = 'grid-cols-1';
  } else if (toolCount === 2) {
    toolCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2';
  } else if (toolCount === 3) {
    toolCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
  } else {
    toolCols = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  }
  toolList.className = `grid ${toolCols} gap-4 justify-center mx-auto`;
  toolNames.forEach(tool => {
    const count = toolCounts[tool];
    const card = document.createElement('div');
    card.className = 'bg-white border rounded-lg shadow-sm p-4 flex flex-col';
    // Fade in tool cards for smooth transition from skeleton
    card.classList.add('fade-in');
    const h3 = document.createElement('h3');
    h3.className = 'text-lg font-semibold text-blue-700 mb-1';
    h3.textContent = tool;
    const p = document.createElement('p');
    p.className = 'text-sm text-gray-600 mb-2';
    p.textContent = `${count} course${count !== 1 ? 's' : ''}`;
    const link = document.createElement('a');
    link.href = `listing.html?domain=${encodeURIComponent(domainName)}&tool=${encodeURIComponent(tool)}`;
    link.className = 'mt-auto inline-block text-sm font-semibold text-blue-600 hover:underline';
    link.textContent = 'View courses';
    card.appendChild(h3);
    card.appendChild(p);
    card.appendChild(link);
    toolList.appendChild(card);
  });
  const courseList = document.getElementById('courseList');
  courseList.innerHTML = '';
  // Dynamically determine grid columns for courses in this domain
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
  courseList.className = `grid ${courseCols} gap-4 justify-center mx-auto`;
  filtered.sort((a, b) => a.title.localeCompare(b.title)).forEach(course => {
    courseList.appendChild(createCourseCard(course));
  });
  // Update year in footer (support both legacy and new footer IDs)
  const yearSpan = document.getElementById('currentYear') || document.getElementById('footerYear');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

function generateDomainDescription(domainName) {
  // Build a description that includes an internal link to the listing page filtered by this domain.
  // Sanitize domain name by removing parentheses, quotes and angle brackets
  const cleanName = domainName
    .replace(/\(.*?\)/g, '')
    .replace(/["'<>]/g, '')
    .trim();
  const url = `listing.html?domain=${encodeURIComponent(domainName)}`;
  return `Courses in the ${cleanName} domain teach you key skills and concepts. Explore tools and courses below to find your perfect match. <a href="${url}" class="text-blue-600 underline" rel="noopener noreferrer">View all ${cleanName} courses</a>.`;
}

function createCourseCard(course) {
  const card = document.createElement('div');
  // Apply the reusable course-card class so that all course cards share consistent
  // hover effects defined in custom.css.  The base appearance is set via utility
  // classes. Hover transformations and shadows are not defined here but in CSS.
  card.className = 'course-card bg-white border rounded-lg shadow-md overflow-hidden flex flex-col';
  // Apply fade-in animation so the card appears smoothly when inserted
  card.classList.add('fade-in');
  const header = document.createElement('div');
  header.className = 'relative h-36 w-full flex items-center justify-center';
  // Use our brand gradient with CSS variables rather than Tailwind colour utilities.
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
    // Hide decorative star icons from screen readers
    starIcon.setAttribute('aria-hidden', 'true');
    starsDiv.appendChild(starIcon);
  }
  const ratingNumber = document.createElement('span');
  ratingNumber.textContent = course.rating.toFixed(1);
  ratingNumber.className = 'ml-1';
  starsDiv.appendChild(ratingNumber);
  // Provide accessible label for rating
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
 * Update document title and meta tags for the current domain page.  This
 * function rewrites the title, description, keywords, canonical URL and
 * OpenGraph/Twitter tags to include the domain name.  It helps search
 * engines index each domain page uniquely and improves click‑through rates
 * by providing descriptive snippets.  If a tag doesn’t exist it will
 * simply be skipped.  Note: server‑side rendering of meta tags is
 * preferable but this client‑side approach still provides benefits.
 * @param {string} domainName The domain name from the URL.
 */
function updateMetaTags(domainName) {
  // Sanitize domain name for descriptive text
  const cleanName = domainName
    .replace(/\(.*?\)/g, '')
    .replace(/["'<>]/g, '')
    .trim();
  const titleText = `${cleanName} Domain Courses | NanoSchool`;
  const descriptionText = `Browse courses in the ${cleanName} domain at NanoSchool. Explore the tools and technologies used in ${cleanName} and discover learning paths to advance your career.`;
  // Document title
  document.title = titleText;
  // Standard meta description
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.setAttribute('content', descriptionText);
  // Append domain to keywords
  const keywordsMeta = document.querySelector('meta[name="keywords"]');
  if (keywordsMeta) {
    const baseKeywords = keywordsMeta.getAttribute('data-base') || keywordsMeta.content;
    const newKeywords = `${cleanName} domain, ${baseKeywords}`;
    keywordsMeta.setAttribute('content', newKeywords);
  }
  // Canonical link: set to the current URL for SSR compatibility
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.setAttribute('href', window.location.href);
  // Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', titleText);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', descriptionText);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', window.location.href);
  // Twitter tags
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', titleText);
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', descriptionText);
}

document.addEventListener('DOMContentLoaded', init);