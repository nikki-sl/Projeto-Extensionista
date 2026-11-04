(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl = (value = '') => {
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:', 'tel:', 'mailto:'].includes(url.protocol) ? url.href : '#';
    } catch { return '#'; }
  };
  const setText = (selector, value) => { const el = $(selector); if (el && value !== undefined) el.textContent = value; };

  function embedUrl(url, platform) {
    try {
      const parsed = new URL(url);
      if (platform === 'YouTube' || parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
        let id = parsed.searchParams.get('v');
        if (parsed.hostname.includes('youtu.be')) id = parsed.pathname.split('/').filter(Boolean)[0];
        if (parsed.pathname.includes('/shorts/')) id = parsed.pathname.split('/shorts/')[1]?.split('/')[0];
        if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`;
      }
      if (platform === 'Spotify' || parsed.hostname.includes('spotify.com')) {
        const match = parsed.pathname.match(/\/(episode|show|track|album|playlist)\/([a-zA-Z0-9]+)/);
        if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator`;
      }
    } catch { /* link inválido: mantém o card com link externo */ }
    return '';
  }

  function emptyState(kind, description) {
    const icons = { podcast: '♫', video: '▶', course: '✳' };
    const titles = { podcast: 'Novos episódios em breve', video: 'Novos vídeos em breve', course: 'Novas oportunidades em breve' };
    return `<div class="empty-state"><div class="empty-icon" aria-hidden="true">${icons[kind]}</div><div><h3>${titles[kind]}</h3><p>${description}</p></div></div>`;
  }

  function renderMedia(items, target, kind) {
    const container = $(target);
    if (!container) return;
    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = emptyState(kind, 'Estamos organizando este espaço. Em breve, novos conteúdos serão publicados por aqui.');
      return;
    }
    container.innerHTML = items.map(item => {
      const title = escapeHtml(item.title || 'Conteúdo');
      const description = escapeHtml(item.description || '');
      const url = safeUrl(item.url || '');
      const platform = escapeHtml(item.platform || (kind === 'video' ? 'Vídeo' : kind === 'podcast' ? 'Áudio' : 'Curso'));
      const embed = kind !== 'course' ? embedUrl(item.url || '', item.platform || '') : '';
      const preview = embed
        ? `<iframe src="${escapeHtml(embed)}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
        : `<span class="preview-icon" aria-hidden="true">${kind === 'video' ? '▶' : kind === 'podcast' ? '♫' : '✳'}</span>`;
      const previewClass = kind === 'video' ? 'video' : kind === 'podcast' ? 'podcast' : 'course';
      return `<article class="media-card ${kind === 'course' ? 'course-card' : ''}">
        <div class="media-preview ${previewClass}"><span class="media-platform">${platform}</span>${preview}</div>
        <div class="media-copy">${kind === 'course' && item.category ? `<span class="course-label">${escapeHtml(item.category)}</span>` : ''}<h3>${title}</h3><p>${description}</p><a class="card-link" href="${url}" target="_blank" rel="noopener noreferrer">${kind === 'course' ? 'Acessar curso' : 'Abrir conteúdo'} <span aria-hidden="true">↗</span></a></div>
      </article>`;
    }).join('');
  }

  function renderSupport(items) {
    const container = $('#supportGrid');
    if (!container) return;
    container.innerHTML = (items || []).map(item => {
      const number = String(item.number || '').trim();
      const phoneHref = safeUrl(`tel:${number.replace(/[^\d+]/g, '')}`);
      return `<a class="support-card" href="${phoneHref}" aria-label="Ligar para ${escapeHtml(item.name)} pelo número ${escapeHtml(number)}">
        <div class="support-card-top"><span class="support-type">${escapeHtml(item.type || 'Canal de apoio')}</span><span class="support-arrow" aria-hidden="true">↗</span></div>
        <h3>${escapeHtml(item.name || '')}</h3><span class="support-number">${escapeHtml(number)}</span><p>${escapeHtml(item.description || '')}</p>
      </a>`;
    }).join('');
  }

  function renderProtection(items) {
    const container = $('#protectionGrid');
    if (!container) return;
    container.innerHTML = (items || []).map((item, index) => `<article class="protection-card"><span class="protection-icon" aria-hidden="true">${index % 2 === 0 ? '♡' : '✳'}</span><div><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.description || '')}</p></div></article>`).join('');
  }

  function renderUseful(items) {
    const container = $('#usefulGrid');
    if (!container) return;
    container.innerHTML = (items || []).map(item => `<article class="useful-card"><span class="useful-category">${escapeHtml(item.category || 'Link útil')}</span><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.description || '')}</p><a href="${safeUrl(item.url || '')}" target="_blank" rel="noopener noreferrer">Acessar site <span aria-hidden="true">↗</span></a></article>`).join('');
  }

  function applySiteText(data) {
    const site = data.site || {};
    document.title = site.name || 'Rede de Apoio à Mulher';
    document.querySelectorAll('[data-site]').forEach(el => {
      const key = el.dataset.site;
      if (site[key] !== undefined) el.textContent = site[key];
    });
    document.querySelectorAll('[data-section]').forEach(el => {
      const [section, key] = el.dataset.section.split('.');
      if (site.sections?.[section]?.[key] !== undefined) el.textContent = site.sections[section][key];
    });
    document.querySelectorAll('[data-material]').forEach(el => {
      const key = el.dataset.material;
      if (data.materials?.[key] !== undefined) el.textContent = data.materials[key];
    });
    const materialsLink = $('#materialsLink');
    if (materialsLink && data.materials?.url) materialsLink.href = safeUrl(data.materials.url);
  }

  function setupMenu() {
    const toggle = $('#menuToggle');
    const nav = $('#mainNav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
    }));
  }

  async function init() {
    setupMenu();
    try {
      const response = await fetch('data/conteudos.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Não foi possível carregar os conteúdos (${response.status}).`);
      const data = await response.json();
      applySiteText(data);
      renderSupport(data.supportChannels);
      renderProtection(data.protectionNetwork);
      renderMedia(data.podcasts, '#podcastsGrid', 'podcast');
      renderMedia(data.videos, '#videosGrid', 'video');
      renderMedia(data.courses, '#coursesGrid', 'course');
      renderUseful(data.usefulLinks);
    } catch (error) {
      console.error(error);
      ['#supportGrid', '#protectionGrid', '#podcastsGrid', '#videosGrid', '#coursesGrid', '#usefulGrid'].forEach(selector => {
        const el = $(selector);
        if (el) el.innerHTML = '<div class="empty-state"><div class="empty-icon" aria-hidden="true">!</div><div><h3>Não foi possível carregar este conteúdo</h3><p>Abra o site por um servidor local ou confira se o arquivo data/conteudos.json está no projeto.</p></div></div>';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
