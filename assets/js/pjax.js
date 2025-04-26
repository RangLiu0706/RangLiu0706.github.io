document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('pjax-container');
    const links = document.querySelectorAll('.masthead__menu-item a');
  
    function loadPage(url, addToHistory = true) {
      fetch(url)
        .then(res => res.text())
        .then(html => {
          // 解析新页面
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const next = doc.getElementById('pjax-container');
          if (next && container) {
            container.innerHTML = next.innerHTML;
            // 更新标题
            const newTitle = doc.querySelector('h1.page__title');
            if (newTitle) document.querySelector('h1.page__title').textContent = newTitle.textContent;
            // 更新 URL
            if (addToHistory) history.pushState(null, '', url);
          }
        })
        .catch(console.error);
    }
  
    // 拦截所有主导航链接
    links.forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        loadPage(a.href);
      });
    });
  
    // 处理浏览器 前进/后退
    window.addEventListener('popstate', () => {
      loadPage(location.href, false);
    });
  });
  
  function updateTopnavHighlight() {
    document.querySelectorAll('.masthead__menu-item a').forEach(link => {
      link.classList.toggle('active',
        link.getAttribute('href') === window.location.pathname + '/');
    });
  }
  
  // 在 loadPage 回调最后调用
  loadPage = (url, addToHistory = true) => {
    fetch(url)
      .then(r => r.text())
      .then(html => {
        /* …替换 #pjax-container 代码… */
        updateSubnavHighlight();
        updateTopnavHighlight();   // <— 加在这里
      });
  };
  
  // 同时在 popstate 处理里也调用一次
  window.addEventListener('popstate', () => {
    updateSubnavHighlight();
    updateTopnavHighlight();
  });
  // 在 document.addEventListener('DOMContentLoaded', ...) 里，替换原有 subnav 绑定：
// 拦截所有 subnav 的 hash 链接，始终平滑滚动，不触发页面重载
document.querySelectorAll('.subnav a').forEach(link => {
  const href = link.getAttribute('href');  // 直接读原始字符串
  if (href && href.startsWith('#')) {
    link.addEventListener('click', e => {
      e.preventDefault();                    // 一律阻止浏览器默认行为
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        // 更新地址栏，只改 hash，不重载页面
        history.replaceState(null, '', location.pathname + href);
        // 并更新子导航高亮
        updateSubnavHighlight();
      }
    });
  }
});
