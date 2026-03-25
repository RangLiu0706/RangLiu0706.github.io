// pjax.js — 完整版：导航高亮 + 子导航平滑滚动 + 兼容 GitHub Pages 子路径
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('pjax-container');
  const topLinks = Array.from(document.querySelectorAll('.masthead__menu-item a'));

  // 更新主导航高亮，兼容仓库子路径
  function updateTopnavHighlight() {
    const currentPath = window.location.pathname.replace(/\/+$/, '/');
    topLinks.forEach(link => {
      // 用 link.pathname 确保拿到带仓库前缀的绝对路径
      const hrefPath = link.pathname.replace(/\/+$/, '/');
      if (hrefPath === currentPath || (hrefPath !== '/' && currentPath.startsWith(hrefPath))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  // 重新执行 pjax-container 内的脚本（innerHTML 插入的 script 不会自动执行）
  function rerunScripts() {
    if (!container) return;
    container.querySelectorAll('script').forEach(oldScript => {
      // 不蒜子脚本由 reloadBusuanzi() 单独处理
      if (oldScript.src && oldScript.src.indexOf('busuanzi') !== -1) return;

      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  // 专门处理不蒜子统计脚本的重新加载
  // 不蒜子使用 JSONP 回调，必须从 document.head 加载才能正常工作
  function reloadBusuanzi() {
    // 如果页面没有不蒜子的显示元素，跳过
    if (!document.getElementById('busuanzi_container_site_pv')) return;

    // 1. 移除页面上所有旧的不蒜子脚本（head、body 和容器内的）
    document.querySelectorAll('script[src*="busuanzi"]').forEach(function(s) {
      s.parentNode.removeChild(s);
    });

    // 2. 创建全新的 script 标签，追加到 head（不是容器内部）
    var script = document.createElement('script');
    script.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js?' + Date.now();
    script.async = true;
    document.head.appendChild(script);
  }

  // 绑定子导航锚点滚动（覆盖 base target）
  function bindSubnav() {
    document.querySelectorAll('.subnav a[href^="#"]').forEach(link => {
      link.target = '_self';
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetEl = document.querySelector(link.hash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
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
        // 更新浏览器标签页标题
        const docTitle = doc.querySelector('title');
        if (docTitle) {
          document.title = docTitle.textContent;
        }

        // 先更新历史记录
        if (addToHistory) {
          history.pushState(null, '', url);
          window.scrollTo(0, 0);
        }
        // 再更新主导航高亮
        updateTopnavHighlight();
        // 重新绑定子导航
        bindSubnav();
        // 重新执行页面内的脚本
        rerunScripts();
        // 重新加载不蒜子统计（需要从 head 加载，不能在容器内）
        reloadBusuanzi();
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

  // 首次加载时，设置高亮并绑定子导航
  updateTopnavHighlight();
  bindSubnav();
});
