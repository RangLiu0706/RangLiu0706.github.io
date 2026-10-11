// Keep page navigation, sticky anchors, and small UI controls in one lifecycle.
const initializePageNavigation = () => {
  const container = document.getElementById('pjax-container');
  const topLinks = Array.from(document.querySelectorAll('.masthead__menu-item a'));
  const masthead = document.querySelector('.masthead');
  const siteNav = document.getElementById('site-nav');
  const menuButton = document.querySelector('#site-nav button');
  const mobileMenu = document.querySelector('#site-nav .hidden-links');
  const pageStatus = document.getElementById('page-status');
  const backToTop = document.getElementById('back-to-top');
  const root = document.documentElement;
  let subnav = null;
  let subnavLinks = [];
  let subnavTargets = [];
  let activeSubnavLink = null;
  let anchorLock = null;
  let measureFrame = 0;
  let scrollFrame = 0;
  let hashScrollRequest = 0;
  let pageRequest = 0;
  let pageController = null;
  let statusTimer = 0;
  let statsCleanup = () => {};
  let initialHashPending = Boolean(window.location.hash);

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPlainClick = event => event.button === 0 && !event.metaKey && !event.ctrlKey &&
    !event.shiftKey && !event.altKey;

  function focusWithoutScrolling(element) {
    if (!element) return;
    if (!element.matches('a, button, input, select, textarea, [tabindex]')) {
      element.setAttribute('tabindex', '-1');
    }
    element.focus({ preventScroll: true });
  }

  function syncMenuExpanded() {
    if (menuButton && mobileMenu) {
      menuButton.setAttribute('aria-expanded', String(!mobileMenu.classList.contains('hidden')));
    }
  }

  function closeMobileMenu(restoreFocus = false) {
    if (mobileMenu) mobileMenu.classList.add('hidden');
    if (menuButton) menuButton.classList.remove('close');
    syncMenuExpanded();
    if (restoreFocus) focusWithoutScrolling(menuButton);
  }

  function targetFromHash(hash) {
    if (!hash || hash === '#') return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch (error) {
      return null;
    }
  }

  function updateSubnavOverflow() {
    if (!subnav) return;
    const maxScroll = subnav.scrollWidth - subnav.clientWidth;
    subnav.classList.toggle('has-overflow-left', subnav.scrollLeft > 2);
    subnav.classList.toggle('has-overflow-right', maxScroll - subnav.scrollLeft > 2);
  }

  function updateStickyOffsets() {
    const heights = {
      '--masthead-height': masthead ? masthead.getBoundingClientRect().height : 0,
      '--subnav-height': subnav ? subnav.getBoundingClientRect().height : 0
    };
    Object.keys(heights).forEach(name => {
      const value = `${heights[name]}px`;
      if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    });
    updateSubnavOverflow();
  }

  function revealSubnavLink(link) {
    if (!subnav || !link) return;
    const navRect = subnav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const leftEdge = navRect.left + subnav.clientLeft + 8;
    const rightEdge = navRect.left + subnav.clientLeft + subnav.clientWidth - 8;
    if (linkRect.left < leftEdge) subnav.scrollLeft += linkRect.left - leftEdge;
    else if (linkRect.right > rightEdge) subnav.scrollLeft += linkRect.right - rightEdge;
    updateSubnavOverflow();
  }

  function setActiveSubnavLink(current, reveal = true) {
    const changed = current !== activeSubnavLink;
    activeSubnavLink = current;
    subnavLinks.forEach(link => {
      const active = link === current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (changed && reveal) revealSubnavLink(current);
  }

  function updateSubnavHighlight(hash = window.location.hash) {
    setActiveSubnavLink(subnavLinks.find(link => link.hash === hash) || subnavLinks[0]);
  }

  function stickyOffset() {
    return (masthead ? masthead.getBoundingClientRect().height : 0) +
      (subnav ? subnav.getBoundingClientRect().height : 0);
  }

  function updateScrollState() {
    if (backToTop) backToTop.hidden = window.scrollY < 600;
    if (!subnavTargets.length) return;
    const offset = stickyOffset() + 24;
    const atBottom = Math.ceil(window.scrollY + window.innerHeight) >= root.scrollHeight - 2;
    if (anchorLock) {
      const targetTop = anchorLock.target.getBoundingClientRect().top;
      const nearTarget = Math.abs(targetTop - offset) < 16;
      const targetBelowScrollLimit = window.scrollY + targetTop - offset >=
        root.scrollHeight - window.innerHeight - 16;
      const reachedEnd = atBottom && targetBelowScrollLimit;
      if (performance.now() < anchorLock.until && !nearTarget && !reachedEnd) return;
      anchorLock = null;
    }
    let current = subnavTargets[0].link;
    subnavTargets.forEach(({ link, target }) => {
      if (target.getBoundingClientRect().top <= offset) current = link;
    });
    if (atBottom) current = subnavTargets[subnavTargets.length - 1].link;
    setActiveSubnavLink(current);
  }

  function queueScrollState() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateScrollState();
    });
  }

  function queueStickyMeasurements() {
    if (measureFrame) return;
    measureFrame = requestAnimationFrame(() => {
      measureFrame = 0;
      updateStickyOffsets();
      revealSubnavLink(activeSubnavLink);
      updateScrollState();
    });
  }

  const headerObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(queueStickyMeasurements) : null;

  function scrollToHash(hash, behavior = 'auto') {
    const target = targetFromHash(hash);
    if (!target) return false;
    const disclosureId = target.getAttribute('data-expand-details');
    const disclosure = disclosureId && document.getElementById(disclosureId);
    if (disclosure && disclosure.tagName === 'DETAILS') disclosure.open = true;
    let parentDetails = target.closest('details');
    while (parentDetails) {
      parentDetails.open = true;
      parentDetails = parentDetails.parentElement.closest('details');
    }
    const motion = reducedMotion() ? 'auto' : behavior;
    updateStickyOffsets();
    updateSubnavHighlight(hash);
    anchorLock = { target, until: performance.now() + (motion === 'smooth' ? 1600 : 150) };
    target.scrollIntoView({ behavior: motion, block: 'start' });
    return true;
  }

  function scheduleHashScroll(hash, focusTarget = false) {
    const request = ++hashScrollRequest;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (request !== hashScrollRequest) return;
      if (scrollToHash(hash) && focusTarget) focusWithoutScrolling(targetFromHash(hash));
    }));
  }

  function updateTopnavHighlight() {
    const currentPath = window.location.pathname.replace(/\/+$/, '/');
    topLinks.forEach(link => {
      const hrefPath = link.pathname.replace(/\/+$/, '/');
      const active = hrefPath === currentPath ||
        (hrefPath !== '/' && currentPath.startsWith(hrefPath));
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (typeof window.updateNav === 'function') window.updateNav();
    queueStickyMeasurements();
  }

  function rerunScripts() {
    if (!container) return;
    container.querySelectorAll('script').forEach(oldScript => {
      if (oldScript.src && oldScript.src.includes('busuanzi')) return;
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.textContent) newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  function bindSiteStats(reloadScript = false) {
    statsCleanup();
    statsCleanup = () => {};
    if (reloadScript) {
      document.querySelectorAll('script[src*="busuanzi"]').forEach(script => script.remove());
    }
    const stats = container && container.querySelector('.site-stats');
    if (!stats) return;
    stats.hidden = true;
    let finished = false;
    let timeout = 0;
    let script = null;
    const observer = new MutationObserver(checkCounts);
    const validCount = id => {
      const element = document.getElementById(id);
      const value = element ? element.textContent.trim() : '';
      return /^\d+(?:,\d{3})*$/.test(value) && Number.isFinite(Number(value.replace(/,/g, '')));
    };
    function cleanup() {
      observer.disconnect();
      clearTimeout(timeout);
      if (script) script.removeEventListener('error', fail);
    }
    function checkCounts() {
      if (finished || !stats.isConnected) return;
      if (validCount('busuanzi_value_site_pv') && validCount('busuanzi_value_site_uv')) {
        finished = true;
        stats.hidden = false;
        cleanup();
      }
    }
    function fail() {
      if (finished) return;
      finished = true;
      stats.hidden = true;
      cleanup();
    }
    statsCleanup = () => { finished = true; cleanup(); };
    observer.observe(stats, { childList: true, subtree: true, characterData: true });
    timeout = setTimeout(fail, 12000);
    if (reloadScript) {
      script = document.createElement('script');
      script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js?' + Date.now();
      script.async = true;
      script.addEventListener('error', fail, { once: true });
      document.head.appendChild(script);
    } else {
      script = document.querySelector('script[src*="busuanzi"]');
      if (script) script.addEventListener('error', fail, { once: true });
    }
    checkCounts();
  }

  function bindCodeBadges() {
    if (!container) return;
    container.querySelectorAll('.pub-code-stars img').forEach(image => {
      const stars = image.parentElement;
      const updateStars = () => { stars.hidden = image.naturalWidth === 0; };
      image.addEventListener('load', updateStars, { once: true });
      image.addEventListener('error', updateStars, { once: true });
      if (image.complete) updateStars();
    });
  }

  function bindSubnav() {
    if (headerObserver) headerObserver.disconnect();
    if (subnav) subnav.removeEventListener('scroll', updateSubnavOverflow);
    anchorLock = null;
    subnav = container ? container.querySelector('.subnav') : null;
    subnavLinks = subnav ? Array.from(subnav.querySelectorAll('a[href^="#"]')) : [];
    subnavTargets = subnavLinks.map(link => ({ link, target: targetFromHash(link.hash) }))
      .filter(item => item.target);
    activeSubnavLink = null;
    subnavLinks.forEach(link => {
      link.target = '_self';
      link.addEventListener('click', event => {
        if (!isPlainClick(event) || !targetFromHash(link.hash)) return;
        event.preventDefault();
        initialHashPending = false;
        ++hashScrollRequest;
        history.replaceState(history.state, '', window.location.pathname +
          window.location.search + link.hash);
        scrollToHash(link.hash, reducedMotion() ? 'auto' : 'smooth');
        focusWithoutScrolling(targetFromHash(link.hash));
      });
    });
    if (subnav) subnav.addEventListener('scroll', updateSubnavOverflow, { passive: true });
    if (container) {
      container.querySelectorAll('.reviewing-panel').forEach(panel => {
        panel.addEventListener('toggle', queueStickyMeasurements);
      });
    }
    updateStickyOffsets();
    updateSubnavHighlight();
    if (headerObserver) {
      if (masthead) headerObserver.observe(masthead);
      if (subnav) headerObserver.observe(subnav);
    }
  }

  function setPageStatus(message, state = '') {
    clearTimeout(statusTimer);
    if (!pageStatus) return;
    pageStatus.textContent = message;
    pageStatus.classList.toggle('is-loading', state === 'loading');
    pageStatus.classList.toggle('is-error', state === 'error');
    if (state === 'complete') {
      statusTimer = setTimeout(() => { pageStatus.textContent = ''; }, 2000);
    }
  }

  function loadPage(url, addToHistory = true) {
    const request = ++pageRequest;
    initialHashPending = false;
    ++hashScrollRequest;
    if (pageController) pageController.abort();
    pageController = typeof AbortController === 'function' ? new AbortController() : null;
    closeMobileMenu();
    if (container) container.setAttribute('aria-busy', 'true');
    setPageStatus('Loading page…', 'loading');
    fetch(url, pageController ? { signal: pageController.signal } : {})
      .then(response => {
        if (!response.ok) throw new Error(`Unable to load page: ${response.status}`);
        return response.text();
      })
      .then(html => {
        if (request !== pageRequest) return;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const next = doc.getElementById('pjax-container');
        if (!next || !container) throw new Error('Page content was not found');
        statsCleanup();
        container.innerHTML = next.innerHTML;
        const docTitle = doc.querySelector('title');
        if (docTitle) document.title = docTitle.textContent;
        if (addToHistory) history.pushState(null, '', url);
        updateTopnavHighlight();
        bindSubnav();
        bindCodeBadges();
        rerunScripts();
        bindSiteStats(true);
        container.setAttribute('aria-busy', 'false');
        setPageStatus('Page loaded.', 'complete');
        const heading = container.querySelector('h1, h2');
        if (window.location.hash && targetFromHash(window.location.hash)) {
          scheduleHashScroll(window.location.hash, true);
        } else {
          if (addToHistory) window.scrollTo({ top: 0, behavior: 'auto' });
          focusWithoutScrolling(heading);
          queueScrollState();
        }
      })
      .catch(error => {
        if (request !== pageRequest || error.name === 'AbortError') return;
        if (container) container.setAttribute('aria-busy', 'false');
        setPageStatus('Unable to load this page. Opening it directly…', 'error');
        // Give the status message a paint before the normal-navigation fallback.
        setTimeout(() => {
          if (request === pageRequest) window.location.assign(url);
        }, 150);
      });
  }

  topLinks.forEach(link => {
    link.addEventListener('click', event => {
      if (!isPlainClick(event) || link.hasAttribute('download') ||
          (link.target && link.target !== '_self') || link.origin !== window.location.origin) return;
      event.preventDefault();
      loadPage(link.href);
    });
  });

  document.addEventListener('click', event => {
    if (siteNav && !siteNav.contains(event.target)) closeMobileMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileMenu && !mobileMenu.classList.contains('hidden')) {
      event.preventDefault();
      closeMobileMenu(true);
    }
  });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      initialHashPending = false;
      ++hashScrollRequest;
      anchorLock = null;
      window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      const activeLink = topLinks.find(link => link.classList.contains('active') &&
        !link.closest('.hidden-links.hidden'));
      const firstVisibleLink = topLinks.find(link => !link.closest('.hidden-links.hidden'));
      focusWithoutScrolling(activeLink || firstVisibleLink || menuButton);
    });
  }

  window.addEventListener('popstate', () => loadPage(location.href, false));
  window.addEventListener('hashchange', () => {
    updateSubnavHighlight();
    scheduleHashScroll(window.location.hash);
  });
  window.addEventListener('resize', queueStickyMeasurements);
  window.addEventListener('scroll', queueScrollState, { passive: true });

  // A manual gesture cancels anchor locking, so the scroll spy follows the reader.
  ['wheel', 'touchstart'].forEach(eventName => {
    window.addEventListener(eventName, () => { anchorLock = null; }, { passive: true });
  });
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
      anchorLock = null;
    }
  });

  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(eventName => {
    window.addEventListener(eventName, () => { initialHashPending = false; },
      { once: true, passive: true });
  });
  window.addEventListener('load', () => {
    queueStickyMeasurements();
    if (initialHashPending) scheduleHashScroll(window.location.hash);
  }, { once: true });

  if (mobileMenu && menuButton) {
    new MutationObserver(syncMenuExpanded).observe(mobileMenu,
      { attributes: true, attributeFilter: ['class'] });
    syncMenuExpanded();
  }
  updateTopnavHighlight();
  bindSubnav();
  bindCodeBadges();
  bindSiteStats();
  updateScrollState();
  if (window.location.hash) scheduleHashScroll(window.location.hash);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePageNavigation, { once: true });
} else {
  initializePageNavigation();
}
