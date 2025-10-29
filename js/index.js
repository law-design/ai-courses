/*
  index.js
  This script powers the home page listing all courses. It loads course data,
  populates filter options, responds to user input for search, filtering and
  sorting, and renders course cards in grid or list view.
*/

// Ensure coursesData is available from courses.js
const courses = (typeof coursesData !== 'undefined') ? coursesData : [];

// State
let currentView = 'grid'; // 'grid' or 'list'
let filteredCourses = [];
// Chart instances for statistics section
let trackStatsChart = null;
let domainStatsChart = null;

// Limit the number of categories displayed on the home page.  Rather than
// revealing every remaining category at once, we paginate the category list.
// The `categoriesPerPage` constant defines how many categories are shown
// per page, and `categoriesPage` tracks the current page number.  When
// categoriesPage * categoriesPerPage reaches the total number of categories
// available, a "Show Less" button is shown to collapse the list back to
// page 1.  Otherwise a "Show More" button appears to load the next page.
const categoriesPerPage = 8;
let categoriesPage = 1;

// Pagination state for load-more functionality
// Show a limited number of courses initially and reveal more on demand.
const itemsPerPage = 12;
let currentPage = 1;

// DOM elements
const searchInput = document.getElementById('searchInput');
const trackFilter = document.getElementById('trackFilter');
const domainFilter = document.getElementById('domainFilter');
const toolFilter = document.getElementById('toolFilter');
const levelFilter = document.getElementById('levelFilter');
const sortBySelect = document.getElementById('sortBy');
const gridViewBtn = document.getElementById('gridView');
const listViewBtn = document.getElementById('listView');
const coursesContainer = document.getElementById('coursesContainer');
const resultsCount = document.getElementById('resultsCount');
// Additional containers for categories and featured courses
const categoriesContainer = document.getElementById('categoriesContainer');
const featuredCoursesContainer = document.getElementById('featuredCoursesContainer');
const activeFiltersDiv = document.getElementById('activeFilters');
// Suggestions dropdown for search input (defined in the HTML with id="suggestions")
const suggestionsDiv = document.getElementById('suggestions');

// Filter showcase container.  The showcase presents preset examples that
// users can click to see how filters work.  It will be populated by
// renderFilterShowcase().
const filterShowcaseDiv = document.getElementById('filterShowcase');

/*
  Define a handful of example filter combinations to showcase the power of
  filtering.  Each example has a label for display and a filters object
  specifying values for track, domain, tool and level.  These examples are
  meant to be intuitive: beginner + Python, intermediate + research, etc.
  Only fields present will be set; missing fields leave the corresponding
  filter unchanged.
*/
const filterShowcaseExamples = [
  {
    label: 'Beginner & Python',
    filters: { level: 'Beginner', tool: 'Python' }
  },
  {
    label: 'Intermediate Research',
    filters: { level: 'Intermediate', domain: 'AI Research & Scientific Discovery' }
  },
  {
    label: 'Advanced Space AI',
    filters: { level: 'Advanced', track: 'AI for Space, Geospatial & Planetary Science' }
  },
  {
    label: 'Expert Quantum',
    filters: { level: 'Expert', track: 'SCIENTIFIC AI, QUANTUM COMPUTING & NEUROMORPHIC RESEARCH' }
  }
];

/**
 * Render the filter showcase examples into the #filterShowcase container.
 * Clicking a chip will set the relevant filters, clear other selections
 * and apply the filters.  This function should be called after filters
 * have been populated with options.
 */
function renderFilterShowcase() {
  if (!filterShowcaseDiv) return;
  filterShowcaseDiv.innerHTML = '';
  filterShowcaseExamples.forEach(example => {
    const btn = document.createElement('button');
    // Use similar styling to active filter chips but slightly lighter
    btn.className = 'inline-flex items-center bg-blue-50 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-700 transition';
    btn.textContent = example.label;
    btn.addEventListener('click', () => {
      // Clear current search term and reset filters
      searchInput.value = '';
      // Reset selects to default empty value
      trackFilter.value = '';
      domainFilter.value = '';
      toolFilter.value = '';
      levelFilter.value = '';
      // Apply example filters.  Only set fields that exist in the example.
      if (example.filters.track) {
        trackFilter.value = example.filters.track;
      }
      if (example.filters.domain) {
        domainFilter.value = example.filters.domain;
      }
      if (example.filters.tool) {
        toolFilter.value = example.filters.tool;
      }
      if (example.filters.level) {
        levelFilter.value = example.filters.level;
      }
      // Apply filters and update counts
      applyFilters();
    });
    filterShowcaseDiv.appendChild(btn);
  });
}

// A pool of Font Awesome icons used to represent domains/categories. We map
// domain names to icons deterministically using a simple hash function so
// that each domain always gets the same icon between sessions. If you add
// new icons to this array, ensure they are available in the FontAwesome
// library loaded on the page (see index.html head section).
const domainIcons = [
  'fa-brain',
  'fa-robot',
  'fa-atom',
  'fa-chart-line',
  'fa-cubes',
  'fa-microscope',
  'fa-dna',
  'fa-laptop-code',
  'fa-layer-group',
  'fa-flask',
  'fa-rocket',
  'fa-satellite-dish',
  'fa-shield-alt',
  'fa-vr-cardboard',
  'fa-magnet'
];

/**
 * Deterministically assign an icon from domainIcons to a given domain name.
 * By summing the character codes of the domain string and taking a modulus
 * against the icons array length, we produce a pseudo‑random but stable
 * mapping for each domain. This ensures that the same domain always shows
 * the same icon across page loads without hard‑coding each domain.
 * @param {string} domain - The name of the domain
 * @returns {string} - A FontAwesome class (without the prefix)
 */
function getIconForDomain(domain) {
  let sum = 0;
  for (let i = 0; i < domain.length; i++) {
    sum += domain.charCodeAt(i);
  }
  return domainIcons[sum % domainIcons.length];
}

// Skeleton loading helpers. These functions create shimmer placeholders
// that fill the category, featured courses and courses containers while
// the real data is being processed. Skeletons improve perceived loading
// times and provide a visual cue that content is on its way.

/** Show skeleton placeholders for the categories grid. */
function showCategorySkeleton() {
  if (!categoriesContainer) return;
  categoriesContainer.innerHTML = '';
  // Remove any existing load more button while loading
  const loadMoreContainer = document.getElementById('categoriesLoadMoreContainer');
  if (loadMoreContainer) loadMoreContainer.innerHTML = '';
  // Render skeleton cards equal to the page size
  const count = categoriesPerPage;
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card min-h-40';
    // Icon placeholder
    const iconLine = document.createElement('div');
    iconLine.className = 'skeleton-line w-8 h-8 mb-3';
    card.appendChild(iconLine);
    // Title line
    const titleLine = document.createElement('div');
    titleLine.className = 'skeleton-line w-2/3';
    card.appendChild(titleLine);
    // Description line
    const descLine = document.createElement('div');
    descLine.className = 'skeleton-line w-1/2';
    card.appendChild(descLine);
    categoriesContainer.appendChild(card);
  }
}

/** Show skeleton placeholders for featured courses. */
function showFeaturedSkeleton() {
  if (!featuredCoursesContainer) return;
  featuredCoursesContainer.innerHTML = '';
  const count = 6;
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    // Image placeholder
    const img = document.createElement('div');
    img.className = 'skeleton-line h-24 w-full mb-3';
    card.appendChild(img);
    // Title placeholder
    const title = document.createElement('div');
    title.className = 'skeleton-line w-3/4';
    card.appendChild(title);
    // Subtitle placeholder
    const subtitle = document.createElement('div');
    subtitle.className = 'skeleton-line w-1/2';
    card.appendChild(subtitle);
    featuredCoursesContainer.appendChild(card);
  }
}

/** Show skeleton placeholders for course results. */
function showCourseSkeleton() {
  if (!coursesContainer) return;
  // Force a responsive grid while loading
  coursesContainer.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 justify-center mx-auto';
  coursesContainer.innerHTML = '';
  const count = Math.min(itemsPerPage, 8);
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    // Header placeholder
    const header = document.createElement('div');
    header.className = 'skeleton-line h-24 w-full mb-2';
    card.appendChild(header);
    // Title line
    const title = document.createElement('div');
    title.className = 'skeleton-line w-2/3';
    card.appendChild(title);
    // Meta line
    const meta = document.createElement('div');
    meta.className = 'skeleton-line w-1/2';
    card.appendChild(meta);
    // Stats line
    const stats = document.createElement('div');
    stats.className = 'skeleton-line w-1/3';
    card.appendChild(stats);
    coursesContainer.appendChild(card);
  }
}

// Initialize page
function init() {
  // Initialize filters, categories, featured courses and course list immediately without showing skeletons.
  populateFilters();
  // Compute option counts once the filters are populated
  updateFilterCounts();
  // Render filter showcase examples now that options exist
  renderFilterShowcase();
  // Render categories and featured courses on page load
  renderCategories();
  renderFeaturedCourses();
  attachEventListeners();
  applyFilters();
  // Set current year in footer (support both legacy and new footer IDs)
  const yearSpan = document.getElementById('currentYear') || document.getElementById('footerYear');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
  // Attach event listener for load‑more button (populated later in renderCourses)
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  if (loadMoreContainer) {
    loadMoreContainer.addEventListener('click', (e) => {
      const target = e.target;
      if (target && target.id === 'loadMoreBtn') {
        // Increase page and re-render courses
        currentPage++;
        renderCourses();
      }
    });
  }
  // Sidebar toggle logic
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebarToggle && sidebar && sidebarOverlay) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }
  // Statistics charts have been removed from the home page, so we no longer render them here.
}

// Toggle the off‑canvas sidebar and overlay
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !overlay) return;
  const isOpen = !sidebar.classList.contains('-translate-x-full');
  if (isOpen) {
    // Close sidebar
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  } else {
    // Open sidebar
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
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
  // Populate track filter
  tracks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    trackFilter.appendChild(opt);
  });
  // Populate domain filter
  Array.from(domains).sort().forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    domainFilter.appendChild(opt);
  });
  // Populate tool filter
  Array.from(tools).sort().forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    toolFilter.appendChild(opt);
  });
}

function attachEventListeners() {
  // When typing, apply filters and show suggestions
  searchInput.addEventListener('input', () => handleSearchInput());
  trackFilter.addEventListener('change', () => applyFilters());
  domainFilter.addEventListener('change', () => applyFilters());
  toolFilter.addEventListener('change', () => applyFilters());
  levelFilter.addEventListener('change', () => applyFilters());
  sortBySelect.addEventListener('change', () => applyFilters());
  gridViewBtn.addEventListener('click', () => {
    currentView = 'grid';
    applyFilters();
  });
  listViewBtn.addEventListener('click', () => {
    currentView = 'list';
    applyFilters();
  });
  // In this simple version we don't need separate search suggestions.  Active filter
  // chips will update whenever filters change.
  // Hide suggestions when the input loses focus (after a small delay to allow clicks on suggestions)
  searchInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (suggestionsDiv) suggestionsDiv.classList.add('hidden');
    }, 100);
  });
}

function applyFilters() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedTrack = trackFilter.value;
  const selectedDomain = domainFilter.value;
  const selectedTool = toolFilter.value;
  const selectedLevel = levelFilter.value;
  const sortBy = sortBySelect.value;
  filteredCourses = courses.filter(course => {
    // Search by title
    if (searchTerm && !course.title.toLowerCase().includes(searchTerm)) {
      return false;
    }
    // Track filter
    if (selectedTrack && course.track !== selectedTrack) {
      return false;
    }
    // Domain filter
    if (selectedDomain && !course.domains.includes(selectedDomain)) {
      return false;
    }
    // Tool filter
    if (selectedTool && !course.tools.includes(selectedTool)) {
      return false;
    }
    // Level filter
    if (selectedLevel && course.level !== selectedLevel) {
      return false;
    }
    return true;
  });
  // Sort
  filteredCourses.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'students':
        return b.students - a.students;
      case 'duration':
        return a.weeks - b.weeks;
      case 'title':
      default:
        return a.title.localeCompare(b.title);
    }
  });
  // Reset pagination when filters change
  currentPage = 1;
  renderCourses();
  // Update counts on filter options before updating active filter chips
  updateFilterCounts();
  updateActiveFilters();
}

/**
 * Build and display chips representing the current filter selections on the
 * home page. Each chip includes an × button to remove that selection.
 */
function updateActiveFilters() {
  if (!activeFiltersDiv) return;
  activeFiltersDiv.innerHTML = '';
  const chips = [];
  const searchTerm = searchInput.value.trim();
  const trackVal = trackFilter.value;
  const domainVal = domainFilter.value;
  const toolVal = toolFilter.value;
  const levelVal = levelFilter.value;
  // Helper for chip creation
  function createChip(label, type, value) {
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-xs font-medium cursor-pointer';
    chip.setAttribute('data-filter-type', type);
    chip.setAttribute('data-value', value);
    chip.textContent = '';
    // Label
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    chip.appendChild(labelSpan);
    // × symbol
    const closeSpan = document.createElement('span');
    closeSpan.className = 'ml-2 text-sm font-semibold text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-100';
    closeSpan.innerHTML = '&times;';
    chip.appendChild(closeSpan);
    // Clicking chip removes filter
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFilter(type, value);
    });
    return chip;
  }
  if (searchTerm) chips.push(createChip(searchTerm, 'search', searchTerm));
  if (trackVal) chips.push(createChip(trackVal, 'track', trackVal));
  if (domainVal) chips.push(createChip(domainVal, 'domain', domainVal));
  if (toolVal) chips.push(createChip(toolVal, 'tool', toolVal));
  if (levelVal) chips.push(createChip(levelVal, 'level', levelVal));
  // Add Clear All if more than one chip
  if (chips.length > 1) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'inline-flex items-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600';
    clearBtn.textContent = 'Clear all';
    clearBtn.addEventListener('click', () => {
      clearAllFilters();
    });
    chips.push(clearBtn);
  }
  chips.forEach(ch => activeFiltersDiv.appendChild(ch));
}

/**
 * Remove a single filter from its control and reapply filters. For single-select
 * filters we reset the value; for search we clear the input.
 * @param {string} type - Filter category to remove
 * @param {string} value - Value to remove
 */
function removeFilter(type, value) {
  switch (type) {
    case 'search':
      searchInput.value = '';
      break;
    case 'track':
      trackFilter.value = '';
      break;
    case 'domain':
      domainFilter.value = '';
      break;
    case 'tool':
      toolFilter.value = '';
      break;
    case 'level':
      levelFilter.value = '';
      break;
    default:
      break;
  }
  applyFilters();
}

/**
 * Clear all filter selections on the home page.
 */
function clearAllFilters() {
  searchInput.value = '';
  trackFilter.value = '';
  domainFilter.value = '';
  toolFilter.value = '';
  levelFilter.value = '';
  applyFilters();
}

function renderCourses() {
  // Update results count
  resultsCount.textContent = `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''} found`;
  // Clear container
  coursesContainer.innerHTML = '';
  // Determine how many courses to show based on currentPage and itemsPerPage
  const totalToShow = currentPage * itemsPerPage;
  // Slice the filtered array first so we know how many items will be rendered. This variable
  // must be declared before computing grid columns to avoid referencing an undefined
  // variable. Without this declaration, coursesToShow would be used in the column
  // calculation before being defined, causing a runtime error.
  const coursesToShow = filteredCourses.slice(0, totalToShow);
  // Set grid or list classes
  if (currentView === 'grid') {
    // Responsive grid: 1 column on small screens, 2 on small, 3 on medium, 4 on large
    // Dynamically set grid column classes based on the number of courses to show.
    // This prevents single or partial rows from hugging the left edge by allocating
    // exactly as many columns as there are items (up to a maximum of 4).  On small
    // screens the layout reflows to a single column, while larger breakpoints
    // increase the number of columns accordingly.
    const count = coursesToShow.length;
    let colsClass;
    if (count <= 1) {
      // One course: one column across all breakpoints
      colsClass = 'grid-cols-1';
    } else if (count === 2) {
      // Two courses: two columns starting from small screens
      colsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2';
    } else if (count === 3) {
      // Three courses: two columns on small screens, three on medium and above
      colsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    } else {
      // Four or more courses: standard responsive layout
      colsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    }
    coursesContainer.className = `grid ${colsClass} gap-4 justify-center mx-auto`;
  } else {
    coursesContainer.className = 'space-y-4';
  }
  // If no courses match the current search/filter criteria, display a friendly message
  if (filteredCourses.length === 0) {
    const noResults = document.createElement('p');
    noResults.className = 'text-center text-gray-600 dark:text-gray-300 py-8 col-span-full';
    noResults.textContent = 'No courses match your search and filters.';
    coursesContainer.appendChild(noResults);
    // Hide load more button if present
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    if (loadMoreContainer) loadMoreContainer.innerHTML = '';
  } else {
    // Render the cards
    coursesToShow.forEach(course => {
      const card = createCourseCard(course);
      coursesContainer.appendChild(card);
    });
    // Setup load-more button or hide it if all courses are shown
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    if (loadMoreContainer) {
      loadMoreContainer.innerHTML = '';
      if (filteredCourses.length > coursesToShow.length) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'loadMoreBtn';
        loadMoreBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md transition mt-4';
        loadMoreBtn.textContent = 'Load More';
        loadMoreContainer.appendChild(loadMoreBtn);
      }
    }
  }

  // Statistics charts have been removed; skip chart rendering
}

/**
 * Update available filter options with dynamic counts based on current selections.
 * This function recalculates how many courses would be returned for each option
 * given the current values of the other filters (search term and other selects).
 * It appends the count in parentheses to the option label and disables the
 * option if the count is zero. This helps users understand which options
 * remain relevant as they refine their search.
 */
function updateFilterCounts() {
  if (!courses || courses.length === 0) return;
  const searchTerm = searchInput.value.trim().toLowerCase();
  const currentTrack = trackFilter.value;
  const currentDomain = domainFilter.value;
  const currentTool = toolFilter.value;
  const currentLevel = levelFilter.value;
  // Helper to compute count for a given filter type and value
  function countFor({ track, domain, tool, level }) {
    return courses.reduce((acc, course) => {
      // Search term filter
      if (searchTerm && !course.title.toLowerCase().includes(searchTerm)) return acc;
      // Track filter (if not computing track counts)
      if (track && course.track !== track) return acc;
      // Domain filter
      if (domain && !course.domains.includes(domain)) return acc;
      // Tool filter
      if (tool && !course.tools.includes(tool)) return acc;
      // Level filter
      if (level && course.level !== level) return acc;
      return acc + 1;
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
      // Count courses with this track given other selected filters (domain/tool/level)
      const count = countFor({ track: val, domain: currentDomain || null, tool: currentTool || null, level: currentLevel || null });
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
      const count = courses.reduce((acc, course) => {
        if (searchTerm && !course.title.toLowerCase().includes(searchTerm)) return acc;
        if (currentTrack && course.track !== currentTrack) return acc;
        // Domain counts: count course if course.domains includes this domain and passes other filters
        if (!course.domains.includes(val)) return acc;
        if (currentTool && !course.tools.includes(currentTool)) return acc;
        if (currentLevel && course.level !== currentLevel) return acc;
        return acc + 1;
      }, 0);
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
      const count = courses.reduce((acc, course) => {
        if (searchTerm && !course.title.toLowerCase().includes(searchTerm)) return acc;
        if (currentTrack && course.track !== currentTrack) return acc;
        if (currentDomain && !course.domains.includes(currentDomain)) return acc;
        // Tool counts
        if (!course.tools.includes(val)) return acc;
        if (currentLevel && course.level !== currentLevel) return acc;
        return acc + 1;
      }, 0);
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
      const count = courses.reduce((acc, course) => {
        if (searchTerm && !course.title.toLowerCase().includes(searchTerm)) return acc;
        if (currentTrack && course.track !== currentTrack) return acc;
        if (currentDomain && !course.domains.includes(currentDomain)) return acc;
        if (currentTool && !course.tools.includes(currentTool)) return acc;
        // Level counts
        if (course.level !== val) return acc;
        return acc + 1;
      }, 0);
      opt.textContent = `${val} (${count})`;
      opt.disabled = count === 0;
    });
  }
}

/**
 * Handle search input on the home page. This function updates the filtered
 * results and displays a suggestions dropdown under the search box showing
 * up to five course titles that match the current query. Clicking a
 * suggestion fills the search box with that title and triggers filtering.
 */
function handleSearchInput() {
  // Recompute filters whenever the search input changes
  applyFilters();
  if (!suggestionsDiv) return;
  const term = searchInput.value.trim().toLowerCase();
  suggestionsDiv.innerHTML = '';
  if (!term) {
    suggestionsDiv.classList.add('hidden');
    return;
  }
  const matches = courses.filter(c => c.title.toLowerCase().includes(term)).slice(0, 5);
  if (matches.length === 0) {
    suggestionsDiv.classList.add('hidden');
    return;
  }
  matches.forEach(match => {
    const item = document.createElement('div');
    item.className = 'px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200';
    item.textContent = match.title;
    // Use mousedown to ensure value is set before blur
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

// Render statistics charts for courses by track and domain
function renderStatsCharts() {
  // Ensure Chart.js is loaded and the canvas elements exist
  if (typeof Chart === 'undefined') return;
  const trackCtx = document.getElementById('trackStatsChart');
  const domainCtx = document.getElementById('domainStatsChart');
  if (!trackCtx || !domainCtx) return;
  // Compute counts for tracks and domains across all courses
  const trackCounts = {};
  const domainCounts = {};
  courses.forEach(course => {
    // Count tracks
    if (course.track) {
      trackCounts[course.track] = (trackCounts[course.track] || 0) + 1;
    }
    // Count domains
    if (course.domains) {
      course.domains.forEach(domain => {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      });
    }
  });
  // Prepare track data (limit to top 6 categories + Other)
  const sortedTrackEntries = Object.entries(trackCounts).sort((a, b) => b[1] - a[1]);
  const topTracks = sortedTrackEntries.slice(0, 6);
  const otherTrackCount = sortedTrackEntries.slice(6).reduce((sum, [, count]) => sum + count, 0);
  const trackLabels = topTracks.map(([label]) => label);
  const trackData = topTracks.map(([, count]) => count);
  if (otherTrackCount > 0) {
    trackLabels.push('Other');
    trackData.push(otherTrackCount);
  }
  // Prepare domain data (limit to top 8 categories + Other)
  const sortedDomainEntries = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
  const topDomains = sortedDomainEntries.slice(0, 8);
  const otherDomainCount = sortedDomainEntries.slice(8).reduce((sum, [, count]) => sum + count, 0);
  const domainLabels = topDomains.map(([label]) => label);
  const domainData = topDomains.map(([, count]) => count);
  if (otherDomainCount > 0) {
    domainLabels.push('Other');
    domainData.push(otherDomainCount);
  }
  // Define a colour palette for charts. Each bar or pie slice will pick
  // the next colour from this list. If there are more categories than
  // colours, Chart.js will reuse colours. Colours are derived from our
  // brand palette: sky, violet, emerald, amber and complementary hues.
  const palette = [
    '#0ea5e9', // brand primary (sky)
    '#7c3aed', // brand secondary (violet)
    '#10b981', // brand accent (emerald)
    '#f59e0b', // brand yellow (amber)
    '#ec4899', // pink
    '#f97316', // orange
    '#14b8a6', // teal
    '#a855f7'  // purple
  ];

  // Destroy existing charts to prevent duplication
  if (trackStatsChart) {
    trackStatsChart.destroy();
  }
  if (domainStatsChart) {
    domainStatsChart.destroy();
  }
  // Create bar chart for tracks
  trackStatsChart = new Chart(trackCtx, {
    type: 'bar',
    data: {
      labels: trackLabels,
      datasets: [
        {
          label: '# of Courses',
          data: trackData,
          backgroundColor: palette.slice(0, trackLabels.length),
          borderWidth: 0
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.raw} courses` } },
      },
      scales: {
        x: { title: { display: false }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#1f2937' } },
        y: { beginAtZero: true, title: { display: false }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#1f2937' } },
      },
    },
  });
  // Create pie chart for domains
  domainStatsChart = new Chart(domainCtx, {
    type: 'pie',
    data: {
      labels: domainLabels,
      datasets: [
        {
          data: domainData,
          backgroundColor: palette.slice(0, domainLabels.length),
          borderWidth: 0
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#1f2937' } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} courses` } },
      },
    },
  });
}

// Render unique domain categories as cards
function renderCategories() {
  if (!categoriesContainer) return;
  const domainCounts = {};
  // Tally the number of courses per domain
  courses.forEach(course => {
    course.domains.forEach(d => {
      if (!domainCounts[d]) domainCounts[d] = 0;
      domainCounts[d] += 1;
    });
  });
  categoriesContainer.innerHTML = '';
  const sorted = Object.keys(domainCounts).sort((a, b) => a.localeCompare(b));
  // Determine number of categories to display based on the current page
  const visibleCount = Math.min(categoriesPerPage * categoriesPage, sorted.length);
  const categoriesToShow = sorted.slice(0, visibleCount);
  categoriesToShow.forEach(domain => {
    const card = document.createElement('a');
    card.href = `listing.html?domain=${encodeURIComponent(domain)}`;
    // Apply a minimum height to category cards so that cards in the grid align vertically.
    card.className =
      'group block p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-transform transform hover:-translate-y-1 min-h-40';
    // Apply fade-in animation to smoothly reveal the card when loaded
    card.classList.add('fade-in');
    // Create an icon container and assign a deterministic FontAwesome icon based on the domain name.  We
    // compute the icon class via getIconForDomain() defined at the top of this script.  This ensures
    // that each domain receives a consistent icon between page loads without hard‑coding each domain.
    const iconDiv = document.createElement('div');
    iconDiv.className = 'text-3xl text-blue-600 mb-3';
    const icon = document.createElement('i');
    const iconClass = getIconForDomain(domain);
    icon.className = `fas ${iconClass}`;
    // Hide decorative icons from assistive technologies
    icon.setAttribute('aria-hidden', 'true');
    iconDiv.appendChild(icon);
    card.appendChild(iconDiv);
    const h3 = document.createElement('h3');
    h3.className = 'font-bold text-lg mb-1 group-hover:text-blue-700';
    h3.textContent = domain;
    card.appendChild(h3);
    const desc = document.createElement('p');
    desc.className = 'text-sm text-gray-600';
    desc.textContent = `Explore ${domain} courses`;
    card.appendChild(desc);
    categoriesContainer.appendChild(card);
  });
  // Render the Show More / Show Less button for categories if necessary. We show
  // the button only when there are more categories than the initial page size.
  const loadMoreContainer = document.getElementById('categoriesLoadMoreContainer');
  if (loadMoreContainer) {
    loadMoreContainer.innerHTML = '';
    if (sorted.length > categoriesPerPage) {
      const btn = document.createElement('button');
      btn.className = 'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md';
      // If we've shown all categories, offer a "Show Less" button
      if (categoriesPerPage * categoriesPage >= sorted.length) {
        btn.textContent = 'Show Less';
        btn.addEventListener('click', () => {
          categoriesPage = 1;
          renderCategories();
        });
      } else {
        // Otherwise show a "Show More" button that loads the next page
        btn.textContent = 'Show More';
        btn.addEventListener('click', () => {
          categoriesPage++;
          renderCategories();
        });
      }
      loadMoreContainer.appendChild(btn);
    }
  }
}

// Render top-rated courses as featured courses
function renderFeaturedCourses() {
  if (!featuredCoursesContainer) return;
  // Sort by rating * students to highlight popular and highly rated courses
  const sortedCourses = [...courses].sort((a, b) => (b.rating * b.students) - (a.rating * a.students));
  const topCourses = sortedCourses.slice(0, 6);
  featuredCoursesContainer.innerHTML = '';
  topCourses.forEach(course => {
    const card = createCourseCard(course);
    // Apply fade-in to each featured course card
    card.classList.add('fade-in');
    featuredCoursesContainer.appendChild(card);
  });
}

function createCourseCard(course) {
  // New unified course card design
  const card = document.createElement('div');
  // Add a reusable course-card class for micro‑interactions. Additional utility classes
  // provide a consistent card appearance (border, shadow, flex behaviour). Hover
  // transformations and shadows are now defined via the .course-card class in CSS.
  card.className = 'course-card bg-white border rounded-lg shadow-md overflow-hidden flex flex-col';
  // Apply fade-in animation to smoothly reveal the card when inserted
  card.classList.add('fade-in');
  // Header section with gradient and icon
  const header = document.createElement('div');
  header.className = 'relative h-36 w-full flex items-center justify-center';
  // Set the header background to a gradient using our brand colours. Using inline style
  // avoids reliance on Tailwind utility classes that reference the original purple/blue
  // palette. The colours reference CSS variables defined in custom.css.
  header.style.background = 'linear-gradient(to bottom right, var(--brand-secondary), var(--brand-primary), var(--brand-accent))';
  const icon = document.createElement('i');
  icon.className = 'fas fa-robot text-white text-4xl';
  // Hide decorative icon from assistive technologies
  icon.setAttribute('aria-hidden', 'true');
  header.appendChild(icon);
  const badge = document.createElement('span');
  badge.textContent = 'NSTC';
  badge.className =
    'absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded';
  header.appendChild(badge);
  card.appendChild(header);
  const body = document.createElement('div');
  body.className = 'p-4 flex flex-col flex-1';
  // Title
  const titleLink = document.createElement('a');
  titleLink.href = course.detailUrl || '#';
  titleLink.target = '_blank';
  titleLink.rel = 'noopener noreferrer';
  titleLink.className = 'text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors';
  titleLink.textContent = course.title;
  body.appendChild(titleLink);
  // Subtitle
  const subtitle = document.createElement('p');
  subtitle.className = 'text-sm text-gray-600 mt-1';
  const metaParts = [];
  if (course.domains && course.domains.length) metaParts.push(course.domains.join(', '));
  if (course.tools && course.tools.length) metaParts.push(course.tools.join(', '));
  subtitle.textContent = metaParts.join(' • ');
  body.appendChild(subtitle);
  // Stats
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
  // Provide an accessible label conveying the rating value
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
  // Calculate width based on rating (out of 5)
  const ratingPercent = Math.max(0, Math.min(5, course.rating)) / 5 * 100;
  progressBar.style.width = ratingPercent + '%';
  progressContainer.appendChild(progressBar);
  body.appendChild(progressContainer);
  // Price row
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
  // CTA
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

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', init);