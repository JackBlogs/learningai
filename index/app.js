const contentEl = document.getElementById('content');
const statusEl = document.getElementById('status');
const tocEl = document.getElementById('toc');

function render(md) {
  contentEl.innerHTML = marked.parse(md);

  // 修复 README 中部分缺失 # 或带多余字符的锚点链接
  contentEl.querySelectorAll('a[href]').forEach(a => {
    let href = a.getAttribute('href');
    // 补全缺失的 #
    if (/^\d/.test(href) && !href.includes('/') && !href.startsWith('#')) {
      href = '#' + href;
    }
    // 清理 Markdown 编辑遗留的异常后缀（如 ]）
    href = href.replace(/]$/, '');
    a.setAttribute('href', href);
  });

  const anchors = buildToc();
  setupScrollSpy(anchors);
  handleHash();
}

function buildToc() {
  const headings = Array.from(contentEl.querySelectorAll('h1, h2, h3'));
  const anchors = [];

  const usedIds = new Set();
  function textToSlug(text) {
    // 保留中文、数字、字母原大小写，移除标点、空格和特殊符号
    let slug = text.trim()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, '');
    // 避免空 id
    if (!slug) slug = 'heading';
    // 处理重复 slug
    let uniqueSlug = slug;
    let counter = 2;
    while (usedIds.has(uniqueSlug)) {
      uniqueSlug = slug + '-' + counter;
      counter++;
    }
    usedIds.add(uniqueSlug);
    return uniqueSlug;
  }
  function makeId(h, idx) {
    if (!h.id) h.id = textToSlug(h.textContent);
    return h.id;
  }

  function createGroup(h, level, idx) {
    const id = makeId(h, idx);
    anchors.push({ el: h, id });

    const li = document.createElement('li');
    li.className = 'toc-group level-' + level;
    const header = document.createElement('div');
    header.className = 'toc-group-header';
    header.innerHTML = '<span class="arrow">▾</span>';
    const a = document.createElement('a');
    a.href = '#' + id;
    a.textContent = h.textContent;
    a.dataset.target = id;
    a.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', '#' + id);
      if (window.innerWidth <= 980) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
    header.appendChild(a);
    li.appendChild(header);

    const childrenUl = document.createElement('ul');
    childrenUl.className = 'toc-children';
    li.appendChild(childrenUl);

    // 点击箭头展开/折叠，避免与标题跳转冲突
    const arrow = header.querySelector('.arrow');
    arrow.addEventListener('click', e => {
      e.stopPropagation();
      li.classList.toggle('collapsed');
    });

    return { li, childrenUl, headerA: a };
  }

  let h1Group = null;
  let h2Group = null;

  headings.forEach((h, idx) => {
    if (h.tagName === 'H1') {
      if (idx === 0 && h.textContent.trim() === '目录') return;
      h1Group = createGroup(h, 1, idx);
      h2Group = null;
      tocEl.appendChild(h1Group.li);
    } else if (h.tagName === 'H2' && h1Group) {
      h2Group = createGroup(h, 2, idx);
      h1Group.childrenUl.appendChild(h2Group.li);
    } else if (h.tagName === 'H3' && h2Group) {
      const id = makeId(h, idx);
      anchors.push({ el: h, id });
      const li = document.createElement('li');
      li.className = 'toc-item';
      const a = document.createElement('a');
      a.href = '#' + id;
      a.textContent = h.textContent;
      a.dataset.target = id;
      a.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', '#' + id);
        if (window.innerWidth <= 980) {
          document.getElementById('sidebar').classList.remove('open');
        }
      });
      li.appendChild(a);
      h2Group.childrenUl.appendChild(li);
    }
  });

  return anchors;
}

function setupScrollSpy(anchors) {
  if (!anchors || anchors.length === 0) return;
  const allTocLinks = Array.from(tocEl.querySelectorAll('a'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        allTocLinks.forEach(link => link.classList.remove('active'));
        const activeLink = allTocLinks.find(link => link.dataset.target === id);
        if (activeLink) {
          activeLink.classList.add('active');
          let parent = activeLink.closest('.toc-group');
          while (parent) {
            parent.classList.remove('collapsed');
            parent = parent.parentElement.closest('.toc-group');
          }
        }
      }
    });
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

  anchors.forEach(a => observer.observe(a.el));
}

function handleHash() {
  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(id);
    if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 0);
  }
}

function showError(msg) {
  statusEl.className = 'status error';
  statusEl.innerHTML = msg;
}

// 加载 README.md
fetch('README.md')
  .then(res => {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  })
  .then(md => render(md))
  .catch(err => {
    console.error(err);
    showError('无法自动加载 README.md（浏览器限制本地文件访问）。<br>请通过本地服务器打开本页面：<br><code>python3 serve.py</code> 或 <code>./serve.sh</code>，然后访问 <a href="http://localhost:8000">http://localhost:8000</a>');
  });

// 移动端菜单
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});
document.addEventListener('click', e => {
  if (window.innerWidth <= 980 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && e.target !== menuToggle) {
      sidebar.classList.remove('open');
    }
  }
});
  


// 返回顶部
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  if (window.scrollY > 500) {
    backToTop.classList.add('visible');
  } else {
    backToTop.classList.remove('visible');
  }
});
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== 星空与流星背景 =====
(function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let width, height;
  const stars = [];
  const meteors = [];
  const STAR_COUNT = 250;
  const METEOR_CHANCE = 0.008;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Star {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 1.8 + 0.2;
      this.baseAlpha = Math.random() * 0.6 + 0.2;
      this.alpha = this.baseAlpha;
      this.twinkleSpeed = Math.random() * 0.03 + 0.005;
      this.twinklePhase = Math.random() * Math.PI * 2;
    }
    update() {
      this.twinklePhase += this.twinkleSpeed;
      this.alpha = this.baseAlpha + Math.sin(this.twinklePhase) * 0.15;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 230, 255, ${Math.max(0, this.alpha)})`;
      ctx.shadowBlur = this.size * 2;
      ctx.shadowColor = 'rgba(100, 200, 255, 0.8)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  class Meteor {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * width * 0.8 + width * 0.1;
      this.y = Math.random() * height * 0.3;
      this.length = Math.random() * 120 + 60;
      this.speed = Math.random() * 12 + 8;
      this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
      this.opacity = 1;
      this.fade = Math.random() * 0.015 + 0.008;
      this.width = Math.random() * 2 + 1;
    }
    update() {
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      this.opacity -= this.fade;
    }
    draw() {
      const tailX = this.x - Math.cos(this.angle) * this.length;
      const tailY = this.y - Math.sin(this.angle) * this.length;
      const grad = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
      grad.addColorStop(0.4, `rgba(100, 220, 255, ${this.opacity * 0.8})`);
      grad.addColorStop(1, `rgba(100, 220, 255, 0)`);

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = this.width;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(100, 220, 255, 0.8)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    isDead() {
      return this.opacity <= 0 || this.x > width + this.length || this.y > height + this.length;
    }
  }

  for (let i = 0; i < STAR_COUNT; i++) stars.push(new Star());

  function animate() {
    ctx.clearRect(0, 0, width, height);
    stars.forEach(star => { star.update(); star.draw(); });
    if (Math.random() < METEOR_CHANCE) meteors.push(new Meteor());
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.update();
      m.draw();
      if (m.isDead()) meteors.splice(i, 1);
    }
    requestAnimationFrame(animate);
  }
  animate();
})();

// ===== 神经网络可视化 =====
(function initNeuralNetwork() {
  const canvas = document.getElementById('neuralCanvas');
  const ctx = canvas.getContext('2d');
  const hero = document.querySelector('.hero');
  let width, height;
  const nodes = [];
  const NODE_COUNT = 45;
  const CONNECTION_DISTANCE = 140;
  const MOUSE_DISTANCE = 180;
  let mouse = { x: -1000, y: -1000 };

  function resize() {
    width = canvas.width = hero.offsetWidth;
    height = canvas.height = hero.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  hero.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; });

  class Node {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 2.5 + 1.5;
      this.baseColor = Math.random() > 0.5 ? '56, 189, 248' : '168, 85, 247';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_DISTANCE) {
        const force = (MOUSE_DISTANCE - dist) / MOUSE_DISTANCE;
        this.vx += (dx / dist) * force * 0.02;
        this.vy += (dy / dist) * force * 0.02;
      }
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > 1.2) {
        this.vx = (this.vx / speed) * 1.2;
        this.vy = (this.vy / speed) * 1.2;
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.baseColor}, 0.9)`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${this.baseColor}, 0.6)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < NODE_COUNT; i++) nodes.push(new Node());

  function drawConnections() {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DISTANCE) {
          const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.35;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      const dx = mouse.x - nodes[i].x;
      const dy = mouse.y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_DISTANCE) {
        const opacity = (1 - dist / MOUSE_DISTANCE) * 0.5;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    nodes.forEach(node => node.update());
    drawConnections();
    nodes.forEach(node => node.draw());
    requestAnimationFrame(animate);
  }
  animate();
})();
