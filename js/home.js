/*
  home.js
  Populates the home page with upcoming workshops, mentor profiles and learner testimonials.
  Uses hard-coded sample data. In a real application, this data could be fetched from an API.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Reference the global coursesData array loaded by courses.js
  const courses = (typeof coursesData !== 'undefined') ? coursesData : [];

  /*
    Define domain icons and a deterministic mapping helper.  These mirror the logic used
    on the index page to consistently assign icons to each domain.  The icons are
    specified as FontAwesome class names without the `fas` prefix.  The helper
    computes a simple hash of the domain name to pick an icon index.
  */
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
  function getIconForDomain(domain) {
    let sum = 0;
    for (let i = 0; i < domain.length; i++) {
      sum += domain.charCodeAt(i);
    }
    return domainIcons[sum % domainIcons.length];
  }

  /*
    Skeleton loading helpers for the home page.  These functions create shimmering
    placeholders for the categories and featured courses sections while the real
    content is being assembled.  They provide immediate feedback to users and
    improve perceived performance.
  */
  function showCategorySkeletonHome() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    container.innerHTML = '';
    // Show as many skeleton cards as the default page size
    const count = categoriesPerPageHome;
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'skeleton-card min-h-40';
      const iconLine = document.createElement('div');
      iconLine.className = 'skeleton-line w-8 h-8 mb-3';
      card.appendChild(iconLine);
      const titleLine = document.createElement('div');
      titleLine.className = 'skeleton-line w-2/3';
      card.appendChild(titleLine);
      const descLine = document.createElement('div');
      descLine.className = 'skeleton-line w-1/2';
      card.appendChild(descLine);
      container.appendChild(card);
    }
    // Clear any load more container while loading
    const loadMoreDiv = document.getElementById('categoriesLoadMoreContainerHome');
    if (loadMoreDiv) loadMoreDiv.innerHTML = '';
  }
  function showFeaturedSkeletonHome() {
    const container = document.getElementById('featuredCoursesContainer');
    if (!container) return;
    container.innerHTML = '';
    const count = 6;
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'skeleton-card';
      const img = document.createElement('div');
      img.className = 'skeleton-line h-24 w-full mb-3';
      card.appendChild(img);
      const titleLine = document.createElement('div');
      titleLine.className = 'skeleton-line w-3/4';
      card.appendChild(titleLine);
      const subtitleLine = document.createElement('div');
      subtitleLine.className = 'skeleton-line w-1/2';
      card.appendChild(subtitleLine);
      container.appendChild(card);
    }
  }

  /*
    Categories and Featured Courses
    On the home page we limit the initial number of categories displayed and allow
    users to reveal more categories on demand. We also highlight a handful of
    featured courses with high ratings and student counts. These functions mirror
    the logic used on the index page but are scoped locally to avoid conflicts.
  */
  const categoriesPerPageHome = 8;
  // Track the current page of categories displayed on the home page.
  // This allows us to reveal additional sets of categories incrementally
  // without showing the entire list at once. When all pages are shown
  // the user can click "Show Less" to reset to the first page.
  let categoriesPageHome = 1;

  function renderCategoriesHome() {
    const container = document.getElementById('categoriesContainer');
    if (!container || !courses) return;
    // Tally courses per domain
    const domainCounts = {};
    courses.forEach(course => {
      if (Array.isArray(course.domains)) {
        course.domains.forEach(d => {
          domainCounts[d] = (domainCounts[d] || 0) + 1;
        });
      }
    });
    const domains = Object.keys(domainCounts).sort((a, b) => a.localeCompare(b));
    // Determine which domains to show based on the current page and page size
    const visibleCount = Math.min(categoriesPerPageHome * categoriesPageHome, domains.length);
    const visibleDomains = domains.slice(0, visibleCount);
    // Clear container
    container.innerHTML = '';
    visibleDomains.forEach(domain => {
    const card = document.createElement('a');
      card.href = `listing.html?domain=${encodeURIComponent(domain)}`;
      card.className = 'group block p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-transform transform hover:-translate-y-1';
    // Apply fade-in animation for smooth appearance
    card.classList.add('fade-in');
      const iconDiv = document.createElement('div');
      iconDiv.className = 'text-3xl text-blue-600 mb-3';
      const icon = document.createElement('i');
      // Assign a deterministic icon based on domain name using getIconForDomain helper
      const iconClass = getIconForDomain(domain);
      icon.className = `fas ${iconClass}`;
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
      container.appendChild(card);
    });
    // Configure the show more/less button
    const loadMoreDiv = document.getElementById('categoriesLoadMoreContainerHome');
    if (loadMoreDiv) {
      loadMoreDiv.innerHTML = '';
      if (domains.length > categoriesPerPageHome) {
        const btn = document.createElement('button');
        btn.className = 'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md';
        if (categoriesPerPageHome * categoriesPageHome >= domains.length) {
          // All categories displayed: show "Show Less" button
          btn.textContent = 'Show Less';
          btn.addEventListener('click', () => {
            categoriesPageHome = 1;
            renderCategoriesHome();
          });
        } else {
          // More categories available: show "Show More" button
          btn.textContent = 'Show More';
          btn.addEventListener('click', () => {
            categoriesPageHome++;
            renderCategoriesHome();
          });
        }
        loadMoreDiv.appendChild(btn);
      }
    }
  }

  function renderFeaturedCoursesHome() {
    const container = document.getElementById('featuredCoursesContainer');
    if (!container || !courses) return;
    // Sort courses by rating * students to highlight popular and highly rated courses
    const sorted = [...courses].sort((a, b) => (b.rating * b.students) - (a.rating * a.students));
    const topCourses = sorted.slice(0, 6);
    container.innerHTML = '';
    topCourses.forEach(course => {
    const card = document.createElement('div');
      card.className = 'bg-white border rounded-lg shadow-md overflow-hidden flex flex-col transform transition-transform duration-200 hover:scale-105 hover:shadow-lg';
    // Apply fade-in animation to featured course
    card.classList.add('fade-in');
      const header = document.createElement('div');
      header.className = 'relative h-36 w-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600';
      const icon = document.createElement('i');
      icon.className = 'fas fa-robot text-white text-4xl';
      icon.setAttribute('aria-hidden', 'true');
      header.appendChild(icon);
      const badge = document.createElement('span');
      badge.textContent = 'NSTC';
      badge.className = 'absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded';
      header.appendChild(badge);
      card.appendChild(header);
      const body = document.createElement('div');
      body.className = 'p-4 flex flex-col flex-1';
      const title = document.createElement('h3');
      title.className = 'text-lg font-semibold text-blue-800 mb-1 line-clamp-2';
      title.textContent = course.title;
      body.appendChild(title);
      const meta = document.createElement('div');
      meta.className = 'text-xs text-gray-500 mb-3';
      meta.textContent = `${course.track} • ${course.level} • ${course.weeks} weeks`;
      body.appendChild(meta);
      const ratingDiv = document.createElement('div');
      ratingDiv.className = 'flex items-center mb-2';
      const ratingContainer = document.createElement('div');
      ratingContainer.className = 'flex items-center mr-2';
      ratingContainer.setAttribute('aria-label', `${course.rating.toFixed(1)} out of 5 stars`);
      for (let i = 0; i < 5; i++) {
        const star = document.createElement('i');
        star.className = `fas fa-star ${i < Math.round(course.rating) ? 'text-yellow-500' : 'text-gray-300'}`;
        star.setAttribute('aria-hidden', 'true');
        ratingContainer.appendChild(star);
      }
      ratingDiv.appendChild(ratingContainer);
      const ratingValue = document.createElement('span');
      ratingValue.className = 'text-xs text-gray-500';
      ratingValue.textContent = course.rating.toFixed(1);
      ratingDiv.appendChild(ratingValue);
      body.appendChild(ratingDiv);
      const students = document.createElement('div');
      students.className = 'text-xs text-gray-500 mb-4';
      students.textContent = `${course.students.toLocaleString()} students`;
      body.appendChild(students);
      const btnRow = document.createElement('div');
      btnRow.className = 'mt-auto flex space-x-2';
      const enrollBtn = document.createElement('a');
      enrollBtn.href = `course.html?id=${course.id}`;
      enrollBtn.className = 'flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md text-center';
      enrollBtn.textContent = 'Enroll Now';
      const detailsBtn = document.createElement('a');
      detailsBtn.href = `course.html?id=${course.id}`;
      detailsBtn.className = 'flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-semibold px-4 py-2 rounded-md text-center';
      detailsBtn.textContent = 'Details';
      btnRow.appendChild(enrollBtn);
      btnRow.appendChild(detailsBtn);
      body.appendChild(btnRow);
      card.appendChild(body);
      container.appendChild(card);
    });
  }
  // The workshops data has been removed. Workshops will be provided dynamically at runtime via API or other scripts.
  // Sample data for mentors
  const mentors = [
    {
      id: 'm1',
      name: 'Dr. Aisha Kapoor',
      title: 'Lead Data Scientist',
      bio: 'Former Google researcher with 10+ years in AI and deep learning. Passionate about teaching and mentoring.',
      img: 'https://via.placeholder.com/150'
    },
    {
      id: 'm2',
      name: 'Prof. Rahul Mehta',
      title: 'Quantum Computing Expert',
      bio: 'Professor at IIT Delhi with a focus on quantum algorithms and their applications in AI.',
      img: 'https://via.placeholder.com/150'
    },
    {
      id: 'm3',
      name: 'Sarah Johnson',
      title: 'AI Ethics Specialist',
      bio: 'Industry consultant with experience in ethical AI deployment, privacy and fairness.',
      img: 'https://via.placeholder.com/150'
    }
  ];
  // Sample data for testimonials
  const testimonials = [
    {
      id: 't1',
      name: 'Vikram S.',
      role: 'Software Engineer',
      quote: 'NanoSchool’s AI program transformed my career. The hands‑on projects and mentor support were outstanding.',
      rating: 5
    },
    {
      id: 't2',
      name: 'Meera K.',
      role: 'Data Analyst',
      quote: 'The workshops are practical and the mentors genuinely care about your progress. Highly recommend!',
      rating: 4
    },
    {
      id: 't3',
      name: 'Rohit P.',
      role: 'Research Scholar',
      quote: 'I gained deep insights into quantum AI that I couldn’t find elsewhere. A truly unique learning experience.',
      rating: 5
    }
  ];
  // Populate workshops section: intentionally left blank because workshops will be loaded dynamically.
  // Populate mentors
  const mentorsContainer = document.getElementById('mentorsContainer');
  mentors.forEach(m => {
    const card = document.createElement('div');
    card.className = 'bg-white border rounded-lg shadow-sm p-4 flex flex-col items-center text-center';
    const img = document.createElement('div');
    img.className = 'w-20 h-20 rounded-full bg-gray-200 mb-3 flex items-center justify-center';
    img.style.backgroundImage = `url(${m.img})`;
    img.style.backgroundSize = 'cover';
    img.style.backgroundPosition = 'center';
    const nameEl = document.createElement('h3');
    nameEl.className = 'text-lg font-semibold text-blue-700 mb-1';
    nameEl.textContent = m.name;
    const titleEl = document.createElement('span');
    titleEl.className = 'text-sm text-gray-500 mb-1';
    titleEl.textContent = m.title;
    const bioEl = document.createElement('p');
    bioEl.className = 'text-sm text-gray-600';
    bioEl.textContent = m.bio;
    card.appendChild(img);
    card.appendChild(nameEl);
    card.appendChild(titleEl);
    card.appendChild(bioEl);
    mentorsContainer.appendChild(card);
  });
  // Populate testimonials into a horizontal slider (only if the section exists).
  const testimonialsSlider = document.getElementById('testimonialsSlider');
  if (testimonialsSlider) {
    testimonials.forEach(t => {
      const card = document.createElement('div');
      // Each card occupies a fixed width and does not shrink to allow snapping
      card.className = 'flex-none w-80 bg-white border rounded-lg shadow-sm p-4 flex flex-col snap-start dark:bg-gray-800 dark:border-gray-700';
      const quoteEl = document.createElement('p');
      quoteEl.className = 'text-gray-700 dark:text-gray-300 italic mb-3';
      quoteEl.textContent = `"${t.quote}"`;
      const nameEl = document.createElement('span');
      nameEl.className = 'font-semibold text-blue-700 dark:text-blue-300';
      nameEl.textContent = t.name;
      const roleEl = document.createElement('span');
      roleEl.className = 'text-sm text-gray-500 dark:text-gray-400 mb-2';
      roleEl.textContent = `, ${t.role}`;
      const ratingEl = document.createElement('div');
      ratingEl.className = 'flex';
      for (let i = 0; i < 5; i++) {
        const star = document.createElement('i');
        star.className = `fas fa-star ${i < t.rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`;
        ratingEl.appendChild(star);
      }
      const nameRoleWrapper = document.createElement('div');
      nameRoleWrapper.className = 'mb-1';
      nameRoleWrapper.appendChild(nameEl);
      nameRoleWrapper.appendChild(roleEl);
      card.appendChild(quoteEl);
      card.appendChild(nameRoleWrapper);
      card.appendChild(ratingEl);
      testimonialsSlider.appendChild(card);
    });
    // Show/hide navigation buttons based on number of testimonials
    const prevBtn = document.getElementById('testimonialPrev');
    const nextBtn = document.getElementById('testimonialNext');
    if (prevBtn && nextBtn && testimonials.length > 1) {
      prevBtn.classList.remove('hidden');
      nextBtn.classList.remove('hidden');
    }
    // Scroll by one card width on button click
    const scrollByCard = (direction = 1) => {
      const firstCard = testimonialsSlider.querySelector('div');
      if (!firstCard) return;
      const cardWidth = firstCard.offsetWidth + 16; // 16px gap (gap-4)
      testimonialsSlider.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    };
    if (prevBtn) prevBtn.addEventListener('click', () => scrollByCard(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => scrollByCard(1));
  }
  // Set current year
  const yearSpan = document.getElementById('currentYear');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Render categories and featured courses immediately without skeletons.
  renderCategoriesHome();
  renderFeaturedCoursesHome();
});