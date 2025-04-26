// pjax.js — 完整版：导航高亮 + 子导航平滑滚动
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('pjax-container');
  const topLinks = document.querySelectorAll('.masthead__menu-item a');

  // 更新主导航高亮
  function updateTopnavHighlight() {
    const path = window.location.pathname.replace(/\/+$/, '/');
    topLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === path || (href !== '/' && path.startsWith(href))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  // 绑定子导航锚点滚动，覆盖 base target
  function bindSubnav() {
    document.querySelectorAll('.subnav a[href^="#"]').forEach(link => {
      link.target = '_self'; // 覆盖 base target="_blank"
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          // 更新 URL 中的 hash，但不重载页面
          history.replaceState(null, '', window.location.pathname + link.hash);
        }
      });
    });
  }

  // PJAX 加载页面并替换内容
  function loadPage(url, addToHistory = true) {
    fetch(url)
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const next = doc.getElementById('pjax-container');
        if (next && container) {
          container.innerHTML = next.innerHTML;
        }
        // 更新页面标题（如果有）
        const newTitle = doc.querySelector('h1.page__title');
        if (newTitle) {
          const titleEl = document.querySelector('h1.page__title');
          if (titleEl) titleEl.textContent = newTitle.textContent;
        }
        // —— 先更新历史记录 —— 
        if (addToHistory) {
          history.pushState(null, '', url);
        }
        // 再更新主导航高亮
        updateTopnavHighlight();
        // 重新绑定子导航
        bindSubnav();
      })
      .catch(console.error);
  }

  // 拦截主导航点击
  topLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      loadPage(a.href);
    });
  });

  // 处理浏览器前进/后退
  window.addEventListener('popstate', () => {
    loadPage(location.href, false);
  });

  // 初次加载时，设置高亮并绑定子导航
  updateTopnavHighlight();
  bindSubnav();
});
