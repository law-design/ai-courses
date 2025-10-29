/*
  listing.js
  Powers the course catalog page which lists courses based on query parameters.
  Parses the URL query to set initial filters and renders courses accordingly.
*/

const courses = (typeof coursesData !== 'undefined') ? coursesData : [];

let currentView = 'grid';
let filteredCourses = [];
// Pagination variables
let currentPage = 1;
const coursesPerPage = 6;

// Statistics charts have been removed, so no Chart objects are needed
// let listingTrackChart;
// let listingDomainChart;

const searchInput = document.getElementById('searchInput');
const trackFilter = document.getElementById('trackFilter');
const domainFilter = document.getElementById('domainFilter');
const toolFilter = document.getElementById('toolFilter');
const levelFilter = document.getElementById('levelFilter');
const ratingFilter = document.getElementById('ratingFilter');
const durationFilter = document.getElementById('durationFilter');
const sortBySelect = document.getElementById('sortBy');
const gridViewBtn = document.getElementById('gridView');
const listViewBtn = document.getElementById('listView');
const coursesContainer = document.getElementById('coursesContainer');
const resultsCount = document.getElementById('resultsCount');
const paginationControls = document.getElementById('paginationControls');
const suggestionsDiv = document.getElementById('suggestions');
const activeFiltersDiv = document.getElementById('activeFilters');

/**
 * Show skeleton placeholders for the course results on the catalog page.  This
 * function displays a grid of shimmering cards that mimic the layout of
 * actual course cards. Skeletons are particularly useful on the listing
 * page where filtering may involve non‑trivial computations.
 */
function showCourseSkeleton() {
  if (!coursesContainer) return;
  // Use a responsive grid similar to the one for real courses
  coursesContainer.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 justify-center mx-auto';
  coursesContainer.innerHTML = '';
  // Render placeholders equal to one page of results
  const count = coursesPerPage;
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    const header = document.createElement('div');
    header.className = 'skeleton-line h-24 w-full mb-2';
    card.appendChild(header);
    const title = document.createElement('div');
    title.className = 'skeleton-line w-2/3';
    card.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'skeleton-line w-1/2';
    card.appendChild(meta);
    const stats = document.createElement('div');
    stats.className = 'skeleton-line w-1/3';
    card.appendChild(stats);
    coursesContainer.appendChild(card);
  }
  // Hide pagination controls while loading
  if (paginationControls) paginationControls.innerHTML = '';
}

/**
 * Update dynamic counts on filter options based on current selections.
 * For multi‑select filters, this function calculates how many courses
 * would match each option if that option were applied in addition to
 * the existing selections. Counts incorporate search term, other filter
 * categories, rating threshold and duration category. Options with zero
 * matching courses are disabled to prevent selecting them.
 */
function updateFilterCounts() {
  if (!courses || courses.length === 0) return;
  const term = searchInput.value.trim().toLowerCase();
  const selectedTracks = Array.from(trackFilter.selectedOptions).map(o => o.value).filter(Boolean);
  const selectedDomains = Array.from(domainFilter.selectedOptions).map(o => o.value).filter(Boolean);
  const selectedTools = Array.from(toolFilter.selectedOptions).map(o => o.value).filter(Boolean);
  const selectedLevels = Array.from(levelFilter.selectedOptions).map(o => o.value).filter(Boolean);
  const ratingThreshold = ratingFilter ? parseFloat(ratingFilter.value || '0') : 0;
  const durationCategory = durationFilter ? durationFilter.value : 'all';
  // Helper to check rating/duration
  function passesRatingDuration(course) {
    if (!isNaN(ratingThreshold) && ratingThreshold > 0 && course.rating < ratingThreshold) return false;
    if (durationCategory && durationCategory !== 'all') {
      const w = course.weeks;
      if (durationCategory === 'short' && !(w < 4)) return false;
      if (durationCategory === 'medium' && !(w >= 4 && w <= 8)) return false;
      if (durationCategory === 'long' && !(w > 8)) return false;
    }
    return true;
  }
  // Pre-filter the dataset by search term and rating/duration
  const baseFiltered = courses.filter(course => {
    if (term && !course.title.toLowerCase().includes(term)) return false;
    return passesRatingDuration(course);
  });
  // Count helper functions
  function countByTrack(track) {
    return baseFiltered.reduce((acc, course) => {
      // Must match all currently selected domains/tools/levels
      if (selectedDomains.length > 0 && !course.domains.some(d => selectedDomains.includes(d))) return acc;
      if (selectedTools.length > 0 && !course.tools.some(t => selectedTools.includes(t))) return acc;
      if (selectedLevels.length > 0 && !selectedLevels.includes(course.level)) return acc;
      // When computing track counts, ignore currently selected tracks; treat as if selecting this track in addition to existing ones. A course matches if its track equals the examined track OR it's already included in selected tracks.
      if (course.track === track || selectedTracks.includes(course.track)) return acc + 1;
      return acc;
    }, 0);
  }
  function countByDomain(domain) {
    return baseFiltered.reduce((acc, course) => {
      // Track filter: must match at least one selected track if selectedTracks not empty
      if (selectedTracks.length > 0 && !selectedTracks.includes(course.track)) return acc;
      // Tool filter
      if (selectedTools.length > 0 && !course.tools.some(t => selectedTools.includes(t))) return acc;
      // Level filter
      if (selectedLevels.length > 0 && !selectedLevels.includes(course.level)) return acc;
      // Domain matches: if course.domains includes this domain OR includes one of selectedDomains (i.e. keep matches for existing selections)
      if (course.domains.includes(domain) || course.domains.some(d => selectedDomains.includes(d))) return acc + 1;
      return acc;
    }, 0);
  }
  function countByTool(tool) {
    return baseFiltered.reduce((acc, course) => {
      if (selectedTracks.length > 0 && !selectedTracks.includes(course.track)) return acc;
      if (selectedDomains.length > 0 && !course.domains.some(d => selectedDomains.includes(d))) return acc;
      if (selectedLevels.length > 0 && !selectedLevels.includes(course.level)) return acc;
      if (course.tools.includes(tool) || course.tools.some(t => selectedTools.includes(t))) return acc + 1;
      return acc;
    }, 0);
  }
  function countByLevel(level) {
    return baseFiltered.reduce((acc, course) => {
      if (selectedTracks.length > 0 && !selectedTracks.includes(course.track)) return acc;
      if (selectedDomains.length > 0 && !course.domains.some(d => selectedDomains.includes(d))) return acc;
      if (selectedTools.length > 0 && !course.tools.some(t => selectedTools.includes(t))) return acc;
      if (course.level === level || selectedLevels.includes(course.level)) return acc + 1;
      return acc;
    }, 0);
  }
  // Update track options
  if (trackFilter && trackFilter.options) {
    Array.from(trackFilter.options).forEach(opt => {
      const val = opt.value;
      if (!val) {
        opt.textContent = 'All Tracks';
        opt.disabled = false;
        return;
      }
      const count = countByTrack(val);
      opt.textContent = `${val} (${count})`;
      opt.disabled = count === 0;
    });
  }
  // Update domain options
  if (domainFilter && domainFilter.options) {
    Array.from(domainFilter.options).forEach(opt => {
      const val = opt.value;
      if (!val) {
        opt.textContent = 'All Domains';
        opt.disabled = false;
        return;
      }
      const count = countByDomain(val);
      opt.textContent = `${val} (${count})`;
      opt.disabled = count === 0;
    });
  }
  // Update tool options
  if (toolFilter && toolFilter.options) {
    Array.from(toolFilter.options).forEach(opt => {
      const val = opt.value;
      if (!val) {
        opt.textContent = 'All Tools';
        opt.disabled = false;
        return;
      }
      const count = countByTool(val);
      opt.textContent = `${val} (${count})`;
      opt.disabled = count === 0;
    });
  }
  // Update level options
  if (levelFilter && levelFilter.options) {
    Array.from(levelFilter.options).forEach(opt => {
      const val = opt.value;
      if (!val) {
        opt.textContent = 'All Levels';
        opt.disabled = false;
        return;
      }
      const count = countByLevel(val);
      opt.textContent = `${val} (${count})`;
      opt.disabled = count === 0;
    });
  }
}

/**
 * Update document title and meta tags for the catalog page based on current
 * filter selections. Including dynamic keywords and descriptions helps
 * crawlers and generative engines understand the page context. The base
 * title, description and keywords are derived from the static meta tags in
 * the HTML and preserved via the data-base attribute on the keywords meta.
 */
function updateMetaTags() {
  const baseTitle = 'Course Catalog | NanoSchool';
  const baseDesc = 'Browse AI, ML, Quantum and deep science courses by track, domain, tool and level at NanoSchool.';
  const keywordsMeta = document.querySelector('meta[name="keywords"]');
  const baseKeywords = keywordsMeta ? (keywordsMeta.getAttribute('data-base') || keywordsMeta.getAttribute('content') || '') : '';
  // Current selections
  // Pull current selections and sanitize them by removing parentheses, quotes and angle brackets
  const t = trackFilter ? trackFilter.value : '';
  const d = domainFilter ? domainFilter.value : '';
  const tool = toolFilter ? toolFilter.value : '';
  const level = levelFilter ? levelFilter.value : '';
  let newTitle = baseTitle;
  let newDesc = baseDesc;
  let newKeywords = baseKeywords;
  // Build dynamic pieces depending on selected filters
  if (t) {
    const cleanTrack = t
      .replace(/\(.*?\)/g, '')
      .replace(/["'<>]/g, '')
      .trim();
    newTitle = `${cleanTrack} Courses Catalog | NanoSchool`;
    newDesc = `Explore ${cleanTrack} courses at NanoSchool. Filter by domain, tool and level to find the perfect ${cleanTrack} course for your learning goals.`;
    newKeywords = `${cleanTrack} courses, ${newKeywords}`;
  }
  if (d) {
    const cleanDomain = d
      .replace(/\(.*?\)/g, '')
      .replace(/["'<>]/g, '')
      .trim();
    if (!t) {
      newTitle = `${cleanDomain} Courses Catalog | NanoSchool`;
      newDesc = `Discover ${cleanDomain} courses at NanoSchool. Filter by track, tool and level to find courses tailored to your domain interests.`;
    } else {
      // Both track and domain selected
      newDesc = `Browse ${t} courses in the ${cleanDomain} domain at NanoSchool. Use the filters to refine by tool and level.`;
    }
    newKeywords = `${cleanDomain} courses, ${newKeywords}`;
  }
  if (tool) {
    const cleanTool = tool
      .replace(/\(.*?\)/g, '')
      .replace(/["'<>]/g, '')
      .trim();
    // Only augment keywords; description already covers track/domain
    newKeywords = `${cleanTool}, ${newKeywords}`;
  }
  if (level) {
    const cleanLevel = level
      .replace(/\(.*?\)/g, '')
      .replace(/["'<>]/g, '')
      .trim();
    newKeywords = `${cleanLevel} level, ${newKeywords}`;
  }
  // Update title
  document.title = newTitle;
  // Meta description
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.setAttribute('content', newDesc);
  // Keywords
  if (keywordsMeta) keywordsMeta.setAttribute('content', newKeywords);
  // Canonical URL
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    // Build query string for canonical; include non-empty parameters
    const params = new URLSearchParams();
    if (t) params.set('track', t);
    if (d) params.set('domain', d);
    if (tool) params.set('tool', tool);
    if (level) params.set('level', level);
    const queryString = params.toString();
    canonicalLink.setAttribute('href', `${window.location.origin}/listing.html${queryString ? '?' + queryString : ''}`);
  }
  // Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', newTitle);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', newDesc);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    const params = new URLSearchParams();
    if (t) params.set('track', t);
    if (d) params.set('domain', d);
    if (tool) params.set('tool', tool);
    if (level) params.set('level', level);
    const queryString = params.toString();
    ogUrl.setAttribute('content', `${window.location.origin}/listing.html${queryString ? '?' + queryString : ''}`);
  }
  // Twitter tags
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', newTitle);
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', newDesc);
}

function init() {
  // Initialize the catalog immediately without skeletons.
  populateFilters();
  applyQueryParams();
  attachEventListeners();
  applyFilters();
  // Compute initial counts for filter options based on any query params
  updateFilterCounts();
  const yearSpan = document.getElementById('currentYear') || document.getElementById('footerYear');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

function populateFilters() {
  const tracks = new Set();
  const domains = new Set();
  const tools = new Set();
  courses.forEach(course => {
    if (course.track) tracks.add(course.track);
    course.domains.forEach(d => domains.add(d));
    course.tools.forEach(t => tools.add(t));
  });
  tracks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    trackFilter.appendChild(opt);
  });
  Array.from(domains).sort().forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    domainFilter.appendChild(opt);
  });
  Array.from(tools).sort().forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    toolFilter.appendChild(opt);
  });
  // For multi-select filters, ensure no option is selected by default.
  [trackFilter, domainFilter, toolFilter, levelFilter].forEach(sel => {
    if (sel && sel.multiple) {
      Array.from(sel.options).forEach(opt => opt.selected = false);
    }
  });
}

function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const track = params.get('track');
  const domain = params.get('domain');
  const tool = params.get('tool');
  const level = params.get('level');
  const query = params.get('q');
  if (track) trackFilter.value = track;
  if (domain) domainFilter.value = domain;
  if (tool) toolFilter.value = tool;
  if (level) levelFilter.value = level;
  if (query) searchInput.value = query;
}

function attachEventListeners() {
  // Search input: handle search suggestions and filtering
  searchInput.addEventListener('input', () => handleSearchInput());
  trackFilter.addEventListener('change', () => applyFilters());
  domainFilter.addEventListener('change', () => applyFilters());
  toolFilter.addEventListener('change', () => applyFilters());
  levelFilter.addEventListener('change', () => applyFilters());
  if (ratingFilter) ratingFilter.addEventListener('change', () => applyFilters());
  if (durationFilter) durationFilter.addEventListener('change', () => applyFilters());
  sortBySelect.addEventListener('change', () => applyFilters());
  gridViewBtn.addEventListener('click', () => {
    currentView = 'grid';
    // Preserve current page when switching view
    renderCourses();
  });
  listViewBtn.addEventListener('click', () => {
    currentView = 'list';
    renderCourses();
  });
  // Hide suggestions when search loses focus (delay to allow click on suggestions)
  if (searchInput) {
    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (suggestionsDiv) suggestionsDiv.classList.add('hidden');
      }, 100);
    });
  }
}

function applyFilters() {
  // Normalise search term
  const searchTerm = searchInput.value.trim().toLowerCase();
  // Gather selected values from multi‑select filters. Empty strings represent "All" and are removed.
  const selectedTracks = trackFilter ? Array.from(trackFilter.selectedOptions).map(o => o.value).filter(v => v) : [];
  const selectedDomains = domainFilter ? Array.from(domainFilter.selectedOptions).map(o => o.value).filter(v => v) : [];
  const selectedTools = toolFilter ? Array.from(toolFilter.selectedOptions).map(o => o.value).filter(v => v) : [];
  const selectedLevels = levelFilter ? Array.from(levelFilter.selectedOptions).map(o => o.value).filter(v => v) : [];
  const ratingThreshold = ratingFilter ? parseFloat(ratingFilter.value || '0') : 0;
  const durationCategory = durationFilter ? durationFilter.value : 'all';
  const sortBy = sortBySelect.value;
  filteredCourses = courses.filter(course => {
    // Search by title
    if (searchTerm && !course.title.toLowerCase().includes(searchTerm)) return false;
    // Track filter: must match at least one selected track
    if (selectedTracks.length > 0 && !selectedTracks.includes(course.track)) return false;
    // Domain filter: require at least one overlap
    if (selectedDomains.length > 0 && !course.domains.some(d => selectedDomains.includes(d))) return false;
    // Tool filter: require at least one overlap
    if (selectedTools.length > 0 && !course.tools.some(t => selectedTools.includes(t))) return false;
    // Level filter
    if (selectedLevels.length > 0 && !selectedLevels.includes(course.level)) return false;
    // Rating filter
    if (!isNaN(ratingThreshold) && ratingThreshold > 0 && course.rating < ratingThreshold) return false;
    // Duration filter
    if (durationCategory && durationCategory !== 'all') {
      const w = course.weeks;
      if (durationCategory === 'short' && !(w < 4)) return false;
      if (durationCategory === 'medium' && !(w >= 4 && w <= 8)) return false;
      if (durationCategory === 'long' && !(w > 8)) return false;
    }
    return true;
  });
  // Sort the filtered courses based on user preference
  filteredCourses.sort((a, b) => {
    switch (sortBy) {
      case 'rating': return b.rating - a.rating;
      case 'students': return b.students - a.students;
      case 'duration': return a.weeks - b.weeks;
      case 'title':
      default:
        return a.title.localeCompare(b.title);
    }
  });
  // Reset to first page when filters change
  currentPage = 1;
  // Update meta tags based on current filters before rendering
  updateMetaTags();
  renderCourses();
  // Update dynamic counts and then active filter chips
  updateFilterCounts();
  updateActiveFilters();
}

/**
 * Build and display chips representing the current filter selections. Each chip
 * shows the selected value and includes a small × button to remove that
 * particular filter. A "Clear all" chip is included when multiple filters
 * are active. This improves discoverability of applied filters and allows
 * users to quickly modify their selections.
 */
function updateActiveFilters() {
  if (!activeFiltersDiv) return;
  activeFiltersDiv.innerHTML = '';
  const chips = [];
  // Get current selections for each filter
  const searchTerm = searchInput.value.trim();
  const selectedTracks = Array.from(trackFilter.selectedOptions).map(o => o.value).filter(Boolean);
  const selectedDomains = Array.from(domainFilter.selectedOptions).map(o => o.value).filter(Boolean);
  const selectedTools = Array.from(toolFilter.selectedOptions).map(o => o.value).filter(Boolean);
  const selectedLevels = Array.from(levelFilter.selectedOptions).map(o => o.value).filter(Boolean);
  const ratingVal = ratingFilter ? ratingFilter.value : '0';
  const durationVal = durationFilter ? durationFilter.value : 'all';
  // Helper to create a chip element
  function createChip(label, type, value) {
    const chip = document.createElement('span');
    // Use brand colours for chips; adjust for dark mode
    chip.className = 'inline-flex items-center bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-xs font-medium cursor-pointer';
    chip.setAttribute('data-filter-type', type);
    chip.setAttribute('data-value', value);
    // Clear any default text to allow custom children
    chip.textContent = '';
    // Label span displays the filter value
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    chip.appendChild(labelSpan);
    // Remove button shows an × and triggers removal
    const closeBtn = document.createElement('span');
    closeBtn.className = 'ml-2 text-sm font-semibold text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-100';
    closeBtn.innerHTML = '&times;';
    chip.appendChild(closeBtn);
    // Click anywhere on chip (including ×) removes the filter
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFilter(type, value);
    });
    return chip;
  }
  // Add search term chip
  if (searchTerm) {
    chips.push(createChip(searchTerm, 'search', searchTerm));
  }
  // Add chips for each selected filter category
  selectedTracks.forEach(t => chips.push(createChip(t, 'track', t)));
  selectedDomains.forEach(d => chips.push(createChip(d, 'domain', d)));
  selectedTools.forEach(t => chips.push(createChip(t, 'tool', t)));
  selectedLevels.forEach(l => chips.push(createChip(l, 'level', l)));
  if (ratingVal && ratingVal !== '0') {
    chips.push(createChip(`Rating ≥ ${ratingVal}`, 'rating', ratingVal));
  }
  if (durationVal && durationVal !== 'all') {
    let durLabel;
    switch (durationVal) {
      case 'short': durLabel = '< 4 weeks'; break;
      case 'medium': durLabel = '4–8 weeks'; break;
      case 'long': durLabel = '> 8 weeks'; break;
      default: durLabel = durationVal;
    }
    chips.push(createChip(durLabel, 'duration', durationVal));
  }
  // If more than one chip exists, add a Clear All option
  if (chips.length > 1) {
    const clearChip = document.createElement('button');
    clearChip.className = 'inline-flex items-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600';
    clearChip.textContent = 'Clear all';
    clearChip.addEventListener('click', () => {
      clearAllFilters();
    });
    chips.push(clearChip);
  }
  // Append chips
  chips.forEach(ch => activeFiltersDiv.appendChild(ch));
}

/**
 * Remove a single filter value from its corresponding filter control and
 * reapply filters. This is triggered when the × on a chip is clicked.
 * @param {string} type - The filter category (track, domain, tool, level, rating, duration, search).
 * @param {string} value - The value to remove.
 */
function removeFilter(type, value) {
  switch (type) {
    case 'track':
      Array.from(trackFilter.options).forEach(opt => {
        if (opt.value === value) opt.selected = false;
      });
      break;
    case 'domain':
      Array.from(domainFilter.options).forEach(opt => {
        if (opt.value === value) opt.selected = false;
      });
      break;
    case 'tool':
      Array.from(toolFilter.options).forEach(opt => {
        if (opt.value === value) opt.selected = false;
      });
      break;
    case 'level':
      Array.from(levelFilter.options).forEach(opt => {
        if (opt.value === value) opt.selected = false;
      });
      break;
    case 'rating':
      if (ratingFilter) ratingFilter.value = '0';
      break;
    case 'duration':
      if (durationFilter) durationFilter.value = 'all';
      break;
    case 'search':
      searchInput.value = '';
      break;
    default:
      break;
  }
  applyFilters();
}

/**
 * Reset all filters to their default state and update the UI. Clears
 * multi-select selections, resets rating/duration, search term and view
 * controls, then reapplies filters.
 */
function clearAllFilters() {
  // Clear search term
  if (searchInput) searchInput.value = '';
  // Clear multi-selects
  [trackFilter, domainFilter, toolFilter, levelFilter].forEach(sel => {
    if (sel && sel.multiple) {
      Array.from(sel.options).forEach(opt => opt.selected = false);
    } else if (sel) {
      sel.value = '';
    }
  });
  // Reset rating and duration
  if (ratingFilter) ratingFilter.value = '0';
  if (durationFilter) durationFilter.value = 'all';
  // Apply filters
  applyFilters();
}

function renderCourses() {
  resultsCount.textContent = `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''} found`;
  coursesContainer.innerHTML = '';
  // Determine pagination slice early so we know how many items will be rendered.
  const startIndex = (currentPage - 1) * coursesPerPage;
  const endIndex = startIndex + coursesPerPage;
  const coursesToShow = filteredCourses.slice(startIndex, endIndex);
  // Set container layout based on current view
  if (currentView === 'grid') {
    // Responsive grid: 1 column on small screens, 2 on small, 3 on medium, 4 on large
    // Determine grid columns dynamically based on the number of courses being shown.  This
    // ensures that when there are only a few results, the cards span the available
    // columns evenly rather than leaving large empty space.  We cap the number of
    // columns at 4 on large screens.
    const count = coursesToShow.length;
    let colsClass;
    if (count <= 1) {
      colsClass = 'grid-cols-1';
    } else if (count === 2) {
      colsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2';
    } else if (count === 3) {
      colsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    } else {
      colsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    }
    coursesContainer.className = `grid ${colsClass} gap-4 justify-center mx-auto`;
  } else {
    coursesContainer.className = 'space-y-4';
  }
  coursesContainer.innerHTML = '';
  // If no courses match the current search/filter criteria, display a friendly message
  if (filteredCourses.length === 0) {
    const noResults = document.createElement('p');
    noResults.className = 'text-center text-gray-600 dark:text-gray-300 py-8 col-span-full';
    noResults.textContent = 'No courses match your search and filters.';
    coursesContainer.appendChild(noResults);
    // Hide pagination controls when there are no results
    if (paginationControls) paginationControls.innerHTML = '';
    // Charts have been removed; no need to clear or hide chart elements
    return;
  }
  // Render the cards
  coursesToShow.forEach(course => {
    coursesContainer.appendChild(createCourseCard(course));
  });
  // Render pagination controls
  renderPagination();
  // Statistics charts have been removed; no chart updates needed
  // updateStatsCharts();
}

/**
 * Compute and render statistics charts for the listing page. Summarise the
 * number of courses by track and by domain based on the currently
 * filtered result set. Group less common categories into an "Others"
 * segment for readability. Charts are re-rendered whenever filters or
 * pagination change.
 */
function updateStatsCharts() {
  // Ensure chart containers are visible when rendering charts.  Use distinct
  // variable names here to avoid redeclaring trackCanvas/domainCanvas, which
  // are declared later in this function.  We reference the parent elements
  // directly so that hidden containers are shown again when there are results.
  const trackEl = document.getElementById('listingTrackChart');
  const domainEl = document.getElementById('listingDomainChart');
  if (trackEl && trackEl.parentElement) {
    trackEl.parentElement.style.display = '';
  }
  if (domainEl && domainEl.parentElement) {
    domainEl.parentElement.style.display = '';
  }
  // Define colour palette for charts using our brand colours and complementary hues
  const palette = [
    '#0ea5e9', // sky blue
    '#7c3aed', // violet
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#f97316', // orange
    '#14b8a6', // teal
    '#a855f7'  // purple
  ];
  // Compute track counts for filtered courses
  const trackCounts = {};
  filteredCourses.forEach(course => {
    if (course.track) {
      trackCounts[course.track] = (trackCounts[course.track] || 0) + 1;
    }
  });
  let trackLabels = Object.keys(trackCounts);
  let trackData = trackLabels.map(l => trackCounts[l]);
  trackLabels = trackLabels.sort((a, b) => trackCounts[b] - trackCounts[a]);
  trackData = trackLabels.map(l => trackCounts[l]);
  if (trackLabels.length > 6) {
    const topLabels = trackLabels.slice(0, 6);
    const topData = trackData.slice(0, 6);
    const other = trackData.slice(6).reduce((sum, val) => sum + val, 0);
    topLabels.push('Others');
    topData.push(other);
    trackLabels = topLabels;
    trackData = topData;
  }
  // Compute domain counts
  const domainCounts = {};
  filteredCourses.forEach(course => {
    course.domains.forEach(d => {
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    });
  });
  let domainLabels = Object.keys(domainCounts);
  let domainData = domainLabels.map(l => domainCounts[l]);
  domainLabels = domainLabels.sort((a, b) => domainCounts[b] - domainCounts[a]);
  domainData = domainLabels.map(l => domainCounts[l]);
  if (domainLabels.length > 8) {
    const topLabels = domainLabels.slice(0, 8);
    const topData = domainData.slice(0, 8);
    const other = domainData.slice(8).reduce((sum, val) => sum + val, 0);
    topLabels.push('Others');
    topData.push(other);
    domainLabels = topLabels;
    domainData = topData;
  }
  const trackCanvas = document.getElementById('listingTrackChart');
  const domainCanvas = document.getElementById('listingDomainChart');
  if (trackCanvas && typeof Chart !== 'undefined') {
    const ctx1 = trackCanvas.getContext('2d');
    if (listingTrackChart) listingTrackChart.destroy();
    listingTrackChart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: trackLabels,
        datasets: [{ label: 'Courses', data: trackData, backgroundColor: palette.slice(0, trackLabels.length), borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#1e293b' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#1e293b' }
          }
        }
      }
    });
  }
  if (domainCanvas && typeof Chart !== 'undefined') {
    const ctx2 = domainCanvas.getContext('2d');
    if (listingDomainChart) listingDomainChart.destroy();
    listingDomainChart = new Chart(ctx2, {
      type: 'pie',
      data: {
        labels: domainLabels,
        datasets: [{ label: 'Courses', data: domainData, backgroundColor: palette.slice(0, domainLabels.length), borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#1e293b'
            }
          }
        }
      }
    });
  }
}

/**
 * Renders pagination controls based on the current filter results.
 * Creates Prev/Next buttons and individual page number buttons.
 */
function renderPagination() {
  if (!paginationControls) return;
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  // Clear previous controls
  paginationControls.innerHTML = '';
  if (totalPages <= 1) {
    return; // No need for pagination
  }
  // Prev button
  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = currentPage === 1;
  prevBtn.className = 'px-3 py-1 border rounded-md text-sm ' + (prevBtn.disabled ? 'text-gray-400 border-gray-300 cursor-not-allowed' : 'text-blue-700 border-blue-700 hover:bg-blue-50');
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderCourses();
      // Scroll to top of results
      coursesContainer.scrollIntoView({ behavior: 'smooth' });
    }
  });
  paginationControls.appendChild(prevBtn);
  // Page number buttons (condensed)
  /**
   * Determine which page numbers to show. Always show the first and last page.
   * Show current page, previous and next page. Insert ellipsis when skipping.
   */
  const pagesToShow = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
  } else {
    pagesToShow.push(1);
    // Add ellipsis if current page is far from start
    if (currentPage > 3) pagesToShow.push('ellipsis-start');
    // Determine start and end around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pagesToShow.push(i);
    // Add ellipsis if current page is far from end
    if (currentPage < totalPages - 2) pagesToShow.push('ellipsis-end');
    pagesToShow.push(totalPages);
  }
  pagesToShow.forEach(val => {
    if (val === 'ellipsis-start' || val === 'ellipsis-end') {
      const span = document.createElement('span');
      span.textContent = '…';
      span.className = 'px-2 text-gray-500';
      paginationControls.appendChild(span);
    } else {
      const i = val;
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.className = 'px-3 py-1 border rounded-md text-sm mx-1 ' + (i === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 border-gray-300 hover:bg-blue-50');
      pageBtn.disabled = i === currentPage;
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        renderCourses();
        coursesContainer.scrollIntoView({ behavior: 'smooth' });
      });
      paginationControls.appendChild(pageBtn);
    }
  });
  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.className = 'px-3 py-1 border rounded-md text-sm ' + (nextBtn.disabled ? 'text-gray-400 border-gray-300 cursor-not-allowed' : 'text-blue-700 border-blue-700 hover:bg-blue-50');
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderCourses();
      coursesContainer.scrollIntoView({ behavior: 'smooth' });
    }
  });
  paginationControls.appendChild(nextBtn);
}

/**
 * Display search suggestions below the search input. When the user types a
 * keyword, show up to five course titles that contain the query as
 * suggestions. Clicking on a suggestion populates the search box and
 * triggers filtering. Suggestions are hidden when the search box is empty
 * or loses focus. This micro‑interaction helps users quickly find
 * relevant courses in the large catalogue.
 */
function handleSearchInput() {
  // Always update the filtered results first
  applyFilters();
  if (!suggestionsDiv) return;
  const term = searchInput.value.trim().toLowerCase();
  suggestionsDiv.innerHTML = '';
  if (!term) {
    suggestionsDiv.classList.add('hidden');
    return;
  }
  // Find up to five matching course titles
  const matches = courses.filter(c => c.title.toLowerCase().includes(term)).slice(0, 5);
  if (!matches.length) {
    suggestionsDiv.classList.add('hidden');
    return;
  }
  matches.forEach(match => {
    const item = document.createElement('div');
    item.className = 'px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200';
    item.textContent = match.title;
    // Use mousedown so that the click registers before the input loses focus
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      searchInput.value = match.title;
      suggestionsDiv.classList.add('hidden');
      applyFilters();
    });
    suggestionsDiv.appendChild(item);
  });
  suggestionsDiv.classList.remove('hidden');
}

function createCourseCard(course) {
  const card = document.createElement('div');
  // Apply a reusable course-card class that defines hover effects via CSS. Additional
  // utility classes set the base appearance (border, shadow, flex). Hover effects
  // such as scaling and shadow are moved to the .course-card class defined in
  // custom.css for consistency across pages.
  card.className = 'course-card bg-white border rounded-lg shadow-md overflow-hidden flex flex-col';
  const header = document.createElement('div');
  header.className = 'relative h-36 w-full flex items-center justify-center';
  // Apply a brand‑themed gradient using CSS variables defined in custom.css. This
  // removes the dependency on the original Tailwind colour classes and aligns
  // the design with the NanoSchool palette.
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
  // Provide accessible label for the rating
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

document.addEventListener('DOMContentLoaded', init);