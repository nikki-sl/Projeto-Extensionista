(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const DRAFT_KEY = 'redeApoioMulherDraftV1';
  let data = null;
  let activeTab = 'texts';
  let dirty = false;
  let toastTimer;

  const clone = value => JSON.parse(JSON.stringify(value));
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeExternal = value => {
    try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol); } catch { return false; }
  };
  const setStatus = (label, state = '') => {
    $('#statusText').textContent = label;
    $('#statusDot').className = `status-dot ${state}`;
  };
  const toast = message => {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  };
  const markDirty = () => {
    dirty = true;
    setStatus('Alterações não exportadas', 'dirty');
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* armazenamento local pode estar indisponível */ }
  };
  const setField = (path, value) => {
    const keys = path.split('.');
    let target = data;
    while (keys.length > 1) target = target[keys.shift()];
    target[keys[0]] = value;
    markDirty();
  };
  const getField = path => path.split('.').reduce((obj, key) => obj?.[key], data);
  const field = (label, path, value, options = {}) => {
    const type = options.type || 'text';
    const full = options.full ? ' full' : '';
    const hint = options.hint ? `<span class="hint">${escapeHtml(options.hint)}</span>` : '';
    const html = type === 'textarea'
      ? `<textarea data-path="${escapeHtml(path)}" rows="${options.rows || 3}" placeholder="${escapeHtml(options.placeholder || '')}">${escapeHtml(value ?? '')}</textarea>`
      : `<input data-path="${escapeHtml(path)}" type="${type}" value="${escapeHtml(value ?? '')}" placeholder="${escapeHtml(options.placeholder || '')}" ${options.step ? `step="${options.step}"` : ''}>`;
    return `<div class="field${full}"><label>${escapeHtml(label)}</label>${html}${hint}</div>`;
  };
  const sectionIntro = (title, description) => `<div class="panel-heading"><div><h2>${title}</h2><p>${description}</p></div></div>`;
  const sectionEditor = (key, heading) => {
    const item = data.site.sections[key];
    return `<div class="subheading"><div><h3>${heading}</h3><p>Textos exibidos na seção correspondente da landing page.</p></div></div><div class="fields-grid">${field('Texto pequeno (eyebrow)', `site.sections.${key}.eyebrow`, item.eyebrow)}${field('Título da seção', `site.sections.${key}.title`, item.title)}${field('Descrição', `site.sections.${key}.description`, item.description, {type:'textarea', full:true})}</div>`;
  };

  function renderTexts() {
    const s = data.site;
    $('#editorPanel').innerHTML = sectionIntro('Textos do site', 'Atualize as mensagens principais e os títulos de cada seção.') +
      `<div class="fields-grid">${field('Nome do projeto', 'site.name', s.name)}${field('Frase de apresentação', 'site.eyebrow', s.eyebrow)}${field('Título principal', 'site.heroTitle', s.heroTitle, {full:true})}${field('Texto de apresentação', 'site.heroDescription', s.heroDescription, {type:'textarea', full:true})}${field('Texto do botão principal', 'site.heroPrimaryCta', s.heroPrimaryCta)}${field('Texto do botão secundário', 'site.heroSecondaryCta', s.heroSecondaryCta)}${field('Etiqueta da introdução', 'site.introLabel', s.introLabel)}${field('Título da introdução', 'site.introTitle', s.introTitle, {full:true})}${field('Texto da introdução', 'site.introDescription', s.introDescription, {type:'textarea', full:true})}${field('Texto do rodapé', 'site.footerDescription', s.footerDescription, {type:'textarea', full:true})}</div>` +
      sectionEditor('support', 'Canais de apoio') + sectionEditor('podcasts', 'Podcasts') + sectionEditor('videos', 'Vídeos') + sectionEditor('courses', 'Cursos e capacitações') + sectionEditor('materials', 'Nossos materiais') + sectionEditor('usefulLinks', 'Links úteis');
    bindFields();
  }

  function renderListTab(kind, title, description, noun) {
    const items = data[kind] || [];
    const rows = items.length ? items.map((item, index) => `<div class="entry-row"><div class="entry-copy"><strong>${escapeHtml(item.title || 'Sem título')}</strong><span>${escapeHtml(item.platform || item.category || item.url || 'Conteúdo')}</span></div><div class="entry-actions"><button class="icon-button" type="button" data-edit="${kind}" data-index="${index}" aria-label="Editar">✎</button><button class="icon-button danger" type="button" data-delete="${kind}" data-index="${index}" aria-label="Excluir">×</button></div></div>`).join('') : `<div class="empty-list">Ainda não há ${noun} cadastrados. Use “Adicionar” para incluir o primeiro.</div>`;
    $('#editorPanel').innerHTML = sectionIntro(title, description) + `<div class="subheading"><div><h3>Itens cadastrados (${items.length})</h3><p>Os links serão exibidos em cards na landing page.</p></div><button class="mini-button" type="button" id="addItem">+ Adicionar</button></div><div class="entry-list">${rows}</div>`;
    $('#addItem').addEventListener('click', () => openItemForm(kind));
    $$(`[data-edit="${kind}"]`).forEach(button => button.addEventListener('click', () => openItemForm(kind, Number(button.dataset.index))));
    $$(`[data-delete="${kind}"]`).forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      const itemTitle = items[index]?.title || 'este conteúdo';
      if (!window.confirm(`Remover “${itemTitle}”?`)) return;
      data[kind].splice(index, 1); markDirty(); renderListTab(kind, title, description, noun); toast('Conteúdo removido do rascunho.');
    }));
  }

  function openItemForm(kind, index = -1) {
    const existing = index >= 0 ? clone(data[kind][index]) : {title:'', description:'', url:'', platform: kind === 'videos' ? 'YouTube' : kind === 'podcasts' ? 'Spotify' : '', category:''};
    const isCourse = kind === 'courses';
    const isNew = index < 0;
    const title = isNew ? 'Adicionar conteúdo' : 'Editar conteúdo';
    $('#editorPanel').innerHTML = sectionIntro(title, isCourse ? 'Informe os dados do curso ou capacitação.' : 'Informe os dados do conteúdo e cole o link público.') +
      `<div class="fields-grid">${field('Título', 'form.title', existing.title, {full:true})}${field('Descrição', 'form.description', existing.description, {type:'textarea', full:true})}${!isCourse ? field('Plataforma', 'form.platform', existing.platform || (kind === 'videos' ? 'YouTube' : 'Spotify')) : field('Categoria / assunto', 'form.category', existing.category || '')}${field('Link do conteúdo', 'form.url', existing.url, {type:'url', full:true, hint:'Use um endereço completo que comece com https://.'})}</div><div class="inline-help" style="margin-top:16px"><strong>Dica:</strong> ${isCourse ? 'O curso será apresentado como um card com botão para acessar a página externa.' : 'Links do YouTube e Spotify serão incorporados quando o formato do endereço permitir.'}</div><div class="form-actions"><button class="mini-button" type="button" id="cancelForm">Cancelar</button><button class="button button-primary" type="button" id="saveForm">${isNew ? 'Adicionar conteúdo' : 'Salvar alterações'}</button></div>`;
    $('#cancelForm').addEventListener('click', () => renderListTab(kind, ...listMeta(kind)));
    $('#saveForm').addEventListener('click', () => {
      const titleValue = $('[data-path="form.title"]')?.value.trim() || '';
      const descriptionValue = $('[data-path="form.description"]')?.value.trim() || '';
      const urlValue = $('[data-path="form.url"]')?.value.trim() || '';
      const platformValue = $('[data-path="form.platform"]')?.value.trim() || '';
      const categoryValue = $('[data-path="form.category"]')?.value.trim() || '';
      if (!titleValue) return toast('Informe um título para o conteúdo.');
      if (!safeExternal(urlValue)) return toast('Informe um link válido começando com https://.');
      const item = { id: existing.id || `${kind}-${Date.now()}`, title:titleValue, description:descriptionValue, url:urlValue };
      if (isCourse) { if (categoryValue) item.category = categoryValue; }
      else item.platform = platformValue || (kind === 'videos' ? 'YouTube' : 'Spotify');
      if (isNew) data[kind].push(item); else data[kind][index] = item;
      markDirty(); renderListTab(kind, ...listMeta(kind)); toast(isNew ? 'Conteúdo adicionado ao rascunho.' : 'Conteúdo atualizado.');
    });
  }

  function listMeta(kind) {
    return {
      podcasts: ['Podcasts', 'Cadastre episódios, programas e outros conteúdos em áudio.', 'podcasts'],
      videos: ['Vídeos', 'Cadastre vídeos e materiais audiovisuais do YouTube.', 'vídeos'],
      courses: ['Cursos e capacitações', 'Cadastre cursos, oficinas e oportunidades de formação.', 'cursos']
    }[kind];
  }

  function renderSupport() {
    const contactRows = (data.supportChannels || []).map((item, index) => `<div class="entry-row"><div class="entry-copy"><strong>${escapeHtml(item.name)} · ${escapeHtml(item.number)}</strong><span>${escapeHtml(item.type || '')}</span></div><div class="entry-actions"><button class="icon-button" type="button" data-edit-contact="${index}" aria-label="Editar contato">✎</button><button class="icon-button danger" type="button" data-delete-contact="${index}" aria-label="Excluir contato">×</button></div></div>`).join('') || '<div class="empty-list">Nenhum contato cadastrado.</div>';
    const networkRows = (data.protectionNetwork || []).map((item, index) => `<div class="entry-row"><div class="entry-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></div><div class="entry-actions"><button class="icon-button" type="button" data-edit-network="${index}" aria-label="Editar">✎</button><button class="icon-button danger" type="button" data-delete-network="${index}" aria-label="Excluir">×</button></div></div>`).join('') || '<div class="empty-list">Nenhum serviço complementar cadastrado.</div>';
    $('#editorPanel').innerHTML = sectionIntro('Canais de apoio', 'Gerencie os telefones de referência e as informações da rede de proteção.') +
      `<div class="subheading"><div><h3>Telefones e emergência (${data.supportChannels.length})</h3><p>Os números aparecem em destaque na landing page e podem ser acionados pelo celular.</p></div><button class="mini-button" type="button" id="addContact">+ Adicionar</button></div><div class="entry-list">${contactRows}</div>` +
      `<div class="subheading"><div><h3>Rede de proteção (${data.protectionNetwork.length})</h3><p>Informações de apoio psicológico, jurídico e outros serviços.</p></div><button class="mini-button" type="button" id="addNetwork">+ Adicionar</button></div><div class="entry-list">${networkRows}</div>`;
    $('#addContact').addEventListener('click', () => openSupportForm('contact'));
    $('#addNetwork').addEventListener('click', () => openSupportForm('network'));
    $$('[data-edit-contact]').forEach(b => b.addEventListener('click', () => openSupportForm('contact', Number(b.dataset.editContact))));
    $$('[data-delete-contact]').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.deleteContact); if (!confirm(`Remover ${data.supportChannels[i].name}?`)) return; data.supportChannels.splice(i,1); markDirty(); renderSupport(); toast('Contato removido.'); }));
    $$('[data-edit-network]').forEach(b => b.addEventListener('click', () => openSupportForm('network', Number(b.dataset.editNetwork))));
    $$('[data-delete-network]').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.deleteNetwork); if (!confirm(`Remover ${data.protectionNetwork[i].title}?`)) return; data.protectionNetwork.splice(i,1); markDirty(); renderSupport(); toast('Informação removida.'); }));
  }

  function openSupportForm(type, index = -1) {
    const listKey = type === 'contact' ? 'supportChannels' : 'protectionNetwork';
    const existing = index >= 0 ? clone(data[listKey][index]) : type === 'contact' ? {name:'',number:'',type:'',description:''} : {title:'',description:''};
    $('#editorPanel').innerHTML = sectionIntro(index < 0 ? 'Adicionar informação' : 'Editar informação', type === 'contact' ? 'Cadastre um telefone de atendimento ou emergência.' : 'Cadastre uma informação sobre a rede de proteção.') +
      `<div class="fields-grid">${type === 'contact' ? `${field('Nome do serviço', 'form.name', existing.name)}${field('Número de telefone', 'form.number', existing.number)}${field('Tipo de atendimento', 'form.type', existing.type)}${field('Descrição', 'form.description', existing.description, {type:'textarea',full:true})}` : `${field('Título', 'form.title', existing.title)}${field('Descrição', 'form.description', existing.description, {type:'textarea',full:true})}`}</div><div class="form-actions"><button class="mini-button" type="button" id="cancelForm">Cancelar</button><button class="button button-primary" type="button" id="saveForm">Salvar</button></div>`;
    $('#cancelForm').addEventListener('click', renderSupport);
    $('#saveForm').addEventListener('click', () => {
      let item;
      if (type === 'contact') {
        item = {id:existing.id || `canal-${Date.now()}`, name:$('[data-path="form.name"]').value.trim(), number:$('[data-path="form.number"]').value.trim(), type:$('[data-path="form.type"]').value.trim(), description:$('[data-path="form.description"]').value.trim()};
        if (!item.name || !item.number) return toast('Informe o nome do serviço e o telefone.');
      } else {
        item = {title:$('[data-path="form.title"]').value.trim(), description:$('[data-path="form.description"]').value.trim()};
        if (!item.title) return toast('Informe um título.');
      }
      if (index < 0) data[listKey].push(item); else data[listKey][index] = item;
      markDirty(); renderSupport(); toast('Informação salva no rascunho.');
    });
  }

  function renderMaterials() {
    const material = data.materials;
    const rows = (data.usefulLinks || []).map((item,index) => `<div class="entry-row"><div class="entry-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.url)}</span></div><div class="entry-actions"><button class="icon-button" data-edit-link="${index}" aria-label="Editar link">✎</button><button class="icon-button danger" data-delete-link="${index}" aria-label="Excluir link">×</button></div></div>`).join('') || '<div class="empty-list">Nenhum link cadastrado.</div>';
    $('#editorPanel').innerHTML = sectionIntro('Materiais e links úteis', 'Atualize a pasta de materiais e os portais externos recomendados.') +
      `<div class="subheading"><div><h3>Pasta de materiais</h3><p>O título e a descrição são editados na aba “Textos do site”. Aqui você atualiza o link e o texto do botão.</p></div></div><div class="fields-grid">${field('Texto do botão', 'materials.buttonLabel', material.buttonLabel)}${field('Endereço da pasta', 'materials.url', material.url, {type:'url',full:true})}</div>` +
      `<div class="subheading"><div><h3>Links úteis (${data.usefulLinks.length})</h3><p>Portais de apoio, capacitação e oportunidades.</p></div><button class="mini-button" type="button" id="addLink">+ Adicionar link</button></div><div class="entry-list">${rows}</div>`;
    bindFields();
    $('#addLink').addEventListener('click', () => openLinkForm());
    $$('[data-edit-link]').forEach(b => b.addEventListener('click', () => openLinkForm(Number(b.dataset.editLink))));
    $$('[data-delete-link]').forEach(b => b.addEventListener('click', () => { const i=Number(b.dataset.deleteLink); if(!confirm(`Remover ${data.usefulLinks[i].title}?`))return; data.usefulLinks.splice(i,1); markDirty(); renderMaterials(); toast('Link removido.'); }));
  }

  function openLinkForm(index = -1) {
    const existing = index >= 0 ? clone(data.usefulLinks[index]) : {title:'',description:'',url:'',category:''};
    $('#editorPanel').innerHTML = sectionIntro(index < 0 ? 'Adicionar link útil' : 'Editar link útil', 'Cadastre um portal externo que possa ser útil para os visitantes.') +
      `<div class="fields-grid">${field('Nome do portal', 'form.title', existing.title)}${field('Categoria', 'form.category', existing.category)}${field('Descrição', 'form.description', existing.description, {type:'textarea',full:true})}${field('Endereço do site', 'form.url', existing.url, {type:'url',full:true})}</div><div class="form-actions"><button class="mini-button" type="button" id="cancelForm">Cancelar</button><button class="button button-primary" type="button" id="saveForm">Salvar link</button></div>`;
    $('#cancelForm').addEventListener('click', renderMaterials);
    $('#saveForm').addEventListener('click', () => {
      const item = {id:existing.id || `link-${Date.now()}`, title:$('[data-path="form.title"]').value.trim(), category:$('[data-path="form.category"]').value.trim(), description:$('[data-path="form.description"]').value.trim(), url:$('[data-path="form.url"]').value.trim()};
      if (!item.title) return toast('Informe o nome do portal.');
      if (!safeExternal(item.url)) return toast('Informe um endereço válido começando com https://.');
      if (index < 0) data.usefulLinks.push(item); else data.usefulLinks[index] = item;
      markDirty(); renderMaterials(); toast('Link salvo no rascunho.');
    });
  }

  function bindFields() {
    $$('[data-path]').forEach(el => el.addEventListener('input', () => {
      const path = el.dataset.path;
      if (path.startsWith('form.')) return;
      setField(path, el.value);
    }));
  }

  function renderTab() {
    $$('.side-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === activeTab));
    if (activeTab === 'texts') renderTexts();
    else if (['podcasts','videos','courses'].includes(activeTab)) renderListTab(activeTab, ...listMeta(activeTab));
    else if (activeTab === 'support') renderSupport();
    else renderMaterials();
  }

  async function init() {
    try {
      const response = await fetch('data/conteudos.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Não foi possível encontrar data/conteudos.json.');
      const base = await response.json();
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try { data = JSON.parse(draft); setStatus('Rascunho local carregado', 'dirty'); dirty = true; }
        catch { data = base; localStorage.removeItem(DRAFT_KEY); setStatus('Conteúdos carregados', 'saved'); }
      } else { data = base; setStatus('Conteúdos carregados', 'saved'); }
      renderTab();
    } catch (error) {
      console.error(error);
      setStatus('Erro ao carregar dados');
      $('#editorPanel').innerHTML = `<div class="panel-heading"><div><h2>Não foi possível carregar o JSON</h2><p>${escapeHtml(error.message)} Abra o projeto usando um servidor local (como Live Server no VS Code) ou confira a estrutura das pastas.</p></div></div>`;
    }

    $$('.side-tab').forEach(tab => tab.addEventListener('click', () => { activeTab = tab.dataset.tab; renderTab(); }));
    $('#exportButton').addEventListener('click', exportJson);
    $('#importButton').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', importJson);
    $('#resetDraft').addEventListener('click', () => {
      if (!confirm('Descartar as alterações salvas neste navegador e carregar novamente o JSON do projeto?')) return;
      localStorage.removeItem(DRAFT_KEY);
      window.location.reload();
    });
  }

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'conteudos.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    dirty = false;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    setStatus('JSON exportado — falta atualizar no GitHub', 'saved');
    toast('Arquivo conteudos.json exportado. Substitua o arquivo da pasta data no GitHub.');
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const required = ['site','podcasts','videos','courses','supportChannels','protectionNetwork','materials','usefulLinks'];
      const missing = required.filter(key => !(key in parsed));
      if (missing.length) throw new Error(`O arquivo não possui estas estruturas: ${missing.join(', ')}.`);
      data = parsed;
      markDirty();
      renderTab();
      toast('JSON importado. Revise o conteúdo e exporte quando terminar.');
    } catch (error) {
      toast(`Não foi possível importar: ${error.message}`);
    } finally { event.target.value = ''; }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
