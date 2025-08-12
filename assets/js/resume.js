/**
 * Resume Builder - Local only, JSON import/export, print to PDF, 3 templates, drag-sort sections and items
 * Author: Kilo Code
 */

(() => {
  const STORAGE_KEY = 'resume-builder-data-v1';
  const STORAGE_TEMPLATE = 'resume-builder-template-v1';
  const STORAGE_ZOOM = 'resume-builder-zoom-v1';

  const paperEl = document.getElementById('resume-paper');
  const canvasEl = document.getElementById('resume-canvas');
  const addBtn = document.getElementById('add-section-btn');
  const addMenu = document.getElementById('add-menu');
  const templateSelect = document.getElementById('template-select');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomPercentEl = document.getElementById('zoom-percent');
  const importBtn = document.getElementById('import-json');
  const exportBtn = document.getElementById('export-json');
  const printBtn = document.getElementById('print-resume');
  const newBtn = document.getElementById('new-resume');
  const importFile = document.getElementById('import-file');

  const notify = (msg, ok = true) => {
    if (typeof showNotification === 'function') {
      showNotification(msg, ok);
    } else {
      console.log('[Resume]', ok ? 'OK' : 'ERR', msg);
    }
  };

  const uid = () => Math.random().toString(36).slice(2, 9);

  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  const setByPath = (obj, path, value) => {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur)) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  };

  const getByPath = (obj, path) => {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!(p in cur)) return undefined;
      cur = cur[p];
    }
    return cur;
  };

  const saveData = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const loadData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const saveTemplate = (tpl) => localStorage.setItem(STORAGE_TEMPLATE, tpl);
  const loadTemplate = () => localStorage.getItem(STORAGE_TEMPLATE) || 'classic';

  const saveZoom = (z) => localStorage.setItem(STORAGE_ZOOM, String(z));
  const loadZoom = () => {
    const v = parseFloat(localStorage.getItem(STORAGE_ZOOM));
    return isNaN(v) ? 1 : v;
  };

  const SectionTypes = [
    {
      type: 'profile',
      title: '基本信息',
      icon: 'fa-id-badge',
      create: () => ({
        id: uid(),
        type: 'profile',
        title: '基本信息',
        fields: [
          { k: '姓名', v: '张三' },
          { k: '性别', v: '男' },
          { k: '出生', v: '1997-08-25' },
          { k: '学历', v: '本科' },
          { k: '电话', v: '13800000000' },
          { k: '邮箱', v: 'name@example.com' },
          { k: '地址', v: '广东省广州市' },
        ],
      }),
    },
    {
      type: 'objective',
      title: '求职意向',
      icon: 'fa-bullseye',
      create: () => ({
        id: uid(),
        type: 'objective',
        title: '求职意向',
        content: '目标岗位：软件工程师 | 到岗时间：两周内 | 期望薪酬：面议',
      }),
    },
    {
      type: 'work',
      title: '工作经历',
      icon: 'fa-briefcase',
      create: () => ({
        id: uid(),
        type: 'work',
        title: '工作经历',
        items: [
          {
            id: uid(),
            title: '某科技有限公司',
            subTitle: '全栈开发工程师',
            meta: '2021-07 ~ 至今',
            bullets: [
              '负责公司官网与后台系统的设计与开发，提升稳定性与性能',
              '主导核心模块重构，优化接口与数据库，响应时间降低 40%',
              '与产品/测试协作，保障迭代质量与交付效率',
            ],
          },
        ],
      }),
    },
    {
      type: 'project',
      title: '项目经验',
      icon: 'fa-diagram-project',
      create: () => ({
        id: uid(),
        type: 'project',
        title: '项目经验',
        items: [
          {
            id: uid(),
            title: '优质人才平台',
            subTitle: '前后端开发',
            meta: '2021-07 ~ 2023-10',
            bullets: [
              '技术栈：SpringBoot、SpringCloud、MyBatis、Redis、Vue、Element-UI',
              '负责后台管理端功能、接口设计与实现；前端组件与页面构建',
              '输出接口文档与部署方案，保障系统稳定运行',
            ],
          },
        ],
      }),
    },
    {
      type: 'education',
      title: '教育经历',
      icon: 'fa-graduation-cap',
      create: () => ({
        id: uid(),
        type: 'education',
        title: '教育经历',
        items: [
          {
            id: uid(),
            title: '湖南某理工学院',
            subTitle: '计算机科学与技术 本科',
            meta: '2016-09 ~ 2020-06',
            bullets: ['主修课程：数据结构、计算机网络、操作系统、数据库系统等'],
          },
        ],
      }),
    },
    {
      type: 'skills',
      title: '技能能力',
      icon: 'fa-gears',
      create: () => ({
        id: uid(),
        type: 'skills',
        title: '技能能力',
        skills: [
          'Java / Spring Boot / MyBatis',
          'MySQL / Redis',
          'Vue / Element-UI',
          '微服务 / Docker / Nginx',
        ],
      }),
    },
    {
      type: 'certs',
      title: '证书与荣誉',
      icon: 'fa-award',
      create: () => ({
        id: uid(),
        type: 'certs',
        title: '证书与荣誉',
        items: [
          { id: uid(), title: '计算机二级', subTitle: '', meta: '2020', bullets: [] },
        ],
      }),
    },
    {
      type: 'other',
      title: '其他信息',
      icon: 'fa-circle-info',
      create: () => ({
        id: uid(),
        type: 'other',
        title: '其他信息',
        content:
          '兴趣爱好：阅读、运动；个人评价：自驱力强，责任心强，具备良好的团队协作与沟通能力。',
      }),
    },
  ];

  const typeMap = Object.fromEntries(SectionTypes.map(s => [s.type, s]));

  const defaultData = () => ({
    header: {
      name: '个人简历',
      subtitle: '可拖拽模块 · 自由排版 · 模板可切换',
    },
    sections: [
      typeMap.profile.create(),
      typeMap.objective.create(),
      typeMap.work.create(),
      typeMap.project.create(),
      typeMap.education.create(),
      typeMap.skills.create(),
    ],
  });

  // State
  let data = loadData() || defaultData();
  let template = loadTemplate();
  let zoom = loadZoom();

  // Apply template and zoom
  const applyTemplate = (tpl) => {
    paperEl.classList.remove('template-classic', 'template-compact', 'template-elegant');
    paperEl.classList.add(`template-${tpl}`);
    paperEl.dataset.template = tpl;
    saveTemplate(tpl);
  };
  const applyZoom = (z) => {
    zoom = Math.min(1.4, Math.max(0.6, z));
    paperEl.style.setProperty('--paper-scale', String(zoom));
    zoomPercentEl.textContent = `${Math.round(zoom * 100)}%`;
    saveZoom(zoom);
  };

  // Render
  const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

  const renderHeader = () => {
    const nameEl = document.querySelector('[data-path="header.name"]');
    const subEl = document.querySelector('[data-path="header.subtitle"]');
    if (nameEl) nameEl.textContent = data.header.name || '个人简历';
    if (subEl) subEl.textContent = data.header.subtitle || '';
  };

  const iconBtn = (title, icon, className = '') => {
    const btn = document.createElement('button');
    btn.className = `icon-btn ${className}`;
    btn.type = 'button';
    btn.title = title;
    btn.innerHTML = `<i class="fas ${icon}"></i>`;
    return btn;
  };

  const editable = (tag, path, text, className = '') => {
    const el = document.createElement(tag);
    el.contentEditable = 'true';
    el.dataset.path = path;
    el.className = className;
    el.textContent = text || '';
    el.addEventListener('input', (e) => {
      setByPath(data, path, el.textContent.trim());
      saveData(data);
    });
    return el;
  };

  const textareaEditable = (path, text) => {
    // render as contenteditable paragraph; split by \n to bullets elsewhere
    return editable('div', path, text, '');
  };

  const dragHandle = () => {
    const handle = iconBtn('拖拽排序', 'fa-grip-vertical', 'drag-handle');
    handle.draggable = true;
    return handle;
  };

  const sectionShell = (section, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'resume-section';
    wrapper.dataset.type = section.type;
    wrapper.dataset.id = section.id;
    wrapper.dataset.index = String(index);

    // header
    const head = document.createElement('div');
    head.className = 'section-head';

    const title = editable(
      'div',
      `sections[${index}].title`,
      section.title || typeMap[section.type]?.title || '模块',
      'section-title'
    );

    const actions = document.createElement('div');
    actions.className = 'section-actions';

    const handle = dragHandle();
    actions.appendChild(handle);

    if (section.type === 'work' || section.type === 'project' || section.type === 'education' || section.type === 'certs' || section.type === 'skills' || section.type === 'profile') {
      const addItemBtn = iconBtn('新增条目/字段', 'fa-plus');
      addItemBtn.addEventListener('click', () => addItem(section.id));
      actions.appendChild(addItemBtn);
    }

    const delBtn = iconBtn('删除模块', 'fa-trash');
    delBtn.addEventListener('click', () => deleteSection(section.id));
    actions.appendChild(delBtn);

    head.appendChild(title);
    head.appendChild(actions);

    const content = document.createElement('div');
    content.className = 'section-content';

    wrapper.appendChild(head);
    wrapper.appendChild(content);

    // Drag events
    wrapper.addEventListener('dragstart', (e) => {
      if (!(e.target && e.target.closest('.drag-handle'))) {
        e.preventDefault();
        return;
      }
      wrapper.classList.add('dragging');
      e.dataTransfer.setData('text/section-id', section.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    wrapper.addEventListener('dragend', () => wrapper.classList.remove('dragging'));
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      wrapper.classList.add('drag-over');
    });
    wrapper.addEventListener('dragleave', () => {
      wrapper.classList.remove('drag-over');
    });
    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      wrapper.classList.remove('drag-over');
      const fromId = e.dataTransfer.getData('text/section-id');
      if (!fromId || fromId === section.id) return;
      reorderSection(fromId, section.id);
    });

    return { wrapper, content };
  };

  const renderProfile = (section, index, container) => {
    const grid = document.createElement('div');
    grid.className = 'kv-grid';
    section.fields = section.fields || [];
    section.fields.forEach((row, i) => {
      const k = editable('div', `sections[${index}].fields[${i}].k`, row.k, 'kv-key');
      const v = editable('div', `sections[${index}].fields[${i}].v`, row.v, 'kv-val');
      grid.appendChild(k);
      grid.appendChild(v);
    });
    const acts = document.createElement('div');
    acts.className = 'inline-actions';
    const add = document.createElement('button');
    add.className = 'btn-ghost';
    add.textContent = '新增字段';
    add.addEventListener('click', () => {
      section.fields.push({ k: '字段', v: '值' });
      saveData(data);
      render();
    });
    const remove = document.createElement('button');
    remove.className = 'btn-ghost';
    remove.textContent = '删除最后字段';
    remove.addEventListener('click', () => {
      section.fields.pop();
      saveData(data);
      render();
    });
    acts.appendChild(add);
    acts.appendChild(remove);

    container.appendChild(grid);
    container.appendChild(acts);
  };

  const listItemEl = (sectionIndex, item, itemIndex, sectionType) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'list-item';
    itemEl.dataset.itemId = item.id;
    // drag for item
    const head = document.createElement('div');
    head.className = 'item-head';
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'baseline';
    left.style.gap = '10px';

    const title = editable('div', `sections[${sectionIndex}].items[${itemIndex}].title`, item.title, 'item-title');
    const sub = editable('div', `sections[${sectionIndex}].items[${itemIndex}].subTitle`, item.subTitle || '', 'item-subtitle');
    sub.style.color = '#374151';
    sub.style.fontWeight = '600';
    sub.style.fontSize = '13px';

    left.appendChild(title);
    if (sub.textContent) left.appendChild(sub);

    const right = document.createElement('div');
    right.className = 'item-meta';
    const meta = editable('div', `sections[${sectionIndex}].items[${itemIndex}].meta`, item.meta || '', 'item-meta');
    right.appendChild(meta);

    // actions
    const acts = document.createElement('div');
    acts.className = 'section-actions';
    const handle = dragHandle();
    handle.addEventListener('dragstart', (e) => {
      itemEl.classList.add('dragging');
      e.dataTransfer.setData('text/item-id', item.id);
      e.dataTransfer.setData('text/section-index', String(sectionIndex));
      e.dataTransfer.effectAllowed = 'move';
    });
    handle.addEventListener('dragend', () => itemEl.classList.remove('dragging'));

    const del = iconBtn('删除条目', 'fa-trash');
    del.addEventListener('click', () => {
      const arr = data.sections[sectionIndex].items || [];
      data.sections[sectionIndex].items = arr.filter(x => x.id !== item.id);
      saveData(data);
      render();
    });
    acts.appendChild(handle);
    acts.appendChild(del);

    head.appendChild(left);
    head.appendChild(right);
    head.appendChild(acts);

    // body
    const body = document.createElement('div');
    body.className = 'item-body';

    // bullets as simple editable text with newline -> bullets
    const bulletsContainer = document.createElement('ul');
    bulletsContainer.className = 'item-bullets';
    const bullets = item.bullets || [];

    // render as one contenteditable block with newline join for simplicity
    const bulletsBlock = document.createElement('div');
    bulletsBlock.contentEditable = 'true';
    bulletsBlock.dataset.path = `sections[${sectionIndex}].items[${itemIndex}].bullets`;
    bulletsBlock.style.whiteSpace = 'pre-wrap';
    bulletsBlock.style.outline = '2px dashed transparent';
    bulletsBlock.style.borderRadius = '4px';
    bulletsBlock.addEventListener('input', () => {
      const lines = bulletsBlock.innerText.split(/\n/).map(s => s.trim()).filter(Boolean);
      setByPath(data, bulletsBlock.dataset.path, lines);
      saveData(data);
      // reflect as <li> list
      updateBulletsPreview(bulletsContainer, lines);
    });
    bulletsBlock.addEventListener('focus', () => bulletsBlock.style.outlineColor = 'rgba(102,126,234,.4)');
    bulletsBlock.addEventListener('blur', () => bulletsBlock.style.outlineColor = 'transparent');
    bulletsBlock.innerText = bullets.join('\n');

    const updateBulletsPreview = (ul, arr) => {
      while (ul.firstChild) ul.removeChild(ul.firstChild);
      arr.forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        ul.appendChild(li);
      });
    };
    updateBulletsPreview(bulletsContainer, bullets);

    body.appendChild(bulletsContainer);
    body.appendChild(bulletsBlock);

    // item-level drag-over drop
    itemEl.addEventListener('dragover', (e) => {
      const hasItem = !!e.dataTransfer.getData('text/item-id');
      if (!hasItem) return;
      e.preventDefault();
      itemEl.classList.add('drag-over');
    });
    itemEl.addEventListener('dragleave', () => itemEl.classList.remove('drag-over'));
    itemEl.addEventListener('drop', (e) => {
      const dragItemId = e.dataTransfer.getData('text/item-id');
      const fromSectionIndex = parseInt(e.dataTransfer.getData('text/section-index'), 10);
      itemEl.classList.remove('drag-over');
      if (!dragItemId) return;
      reorderItem(dragItemId, fromSectionIndex, sectionIndex, item.id);
    });

    itemEl.appendChild(head);
    itemEl.appendChild(body);
    return itemEl;
  };

  const renderListSection = (section, index, container) => {
    const list = document.createElement('div');
    list.className = 'list';
    (section.items || []).forEach((it, i) => {
      const el = listItemEl(index, it, i, section.type);
      list.appendChild(el);
    });

    container.appendChild(list);

    const acts = document.createElement('div');
    acts.className = 'inline-actions';
    const add = document.createElement('button');
    add.className = 'btn-ghost';
    add.textContent = '新增条目';
    add.addEventListener('click', () => {
      data.sections[index].items = data.sections[index].items || [];
      data.sections[index].items.push({
        id: uid(),
        title: '标题',
        subTitle: '子标题/职位',
        meta: '时间范围',
        bullets: ['职责/成果要点 1', '职责/成果要点 2'],
      });
      saveData(data);
      render();
    });
    acts.appendChild(add);
    container.appendChild(acts);
  };

  const renderSkills = (section, index, container) => {
    section.skills = section.skills || [];
    const box = document.createElement('div');
    box.className = 'badges';

    section.skills.forEach((s, i) => {
      const b = document.createElement('span');
      b.className = 'badge';
      b.contentEditable = 'true';
      b.dataset.path = `sections[${index}].skills[${i}]`;
      b.textContent = s;
      b.addEventListener('input', () => {
        data.sections[index].skills[i] = b.textContent.trim();
        saveData(data);
      });
      box.appendChild(b);
    });

    const acts = document.createElement('div');
    acts.className = 'inline-actions';
    const add = document.createElement('button');
    add.className = 'btn-ghost';
    add.textContent = '新增技能';
    add.addEventListener('click', () => {
      section.skills.push('新技能');
      saveData(data);
      render();
    });
    const remove = document.createElement('button');
    remove.className = 'btn-ghost';
    remove.textContent = '删除最后技能';
    remove.addEventListener('click', () => {
      section.skills.pop();
      saveData(data);
      render();
    });
    acts.appendChild(add);
    acts.appendChild(remove);

    container.appendChild(box);
    container.appendChild(acts);
  };

  const renderTextBlock = (section, index, container) => {
    const p = textareaEditable(`sections[${index}].content`, section.content || '');
    container.appendChild(p);
  };

  const render = () => {
    renderHeader();
    clear(canvasEl);

    data.sections.forEach((sec, i) => {
      const { wrapper, content } = sectionShell(sec, i);
      switch (sec.type) {
        case 'profile':
          renderProfile(sec, i, content);
          break;
        case 'objective':
        case 'other':
          renderTextBlock(sec, i, content);
          break;
        case 'work':
        case 'project':
        case 'education':
        case 'certs':
          renderListSection(sec, i, content);
          break;
        case 'skills':
          renderSkills(sec, i, content);
          break;
        default:
          renderTextBlock(sec, i, content);
      }
      canvasEl.appendChild(wrapper);
    });
  };

  // Actions
  const addItem = (sectionId) => {
    const idx = data.sections.findIndex(s => s.id === sectionId);
    if (idx < 0) return;
    const sec = data.sections[idx];
    if (sec.type === 'profile') {
      sec.fields = sec.fields || [];
      sec.fields.push({ k: '字段', v: '值' });
    } else if (sec.type === 'skills') {
      sec.skills = sec.skills || [];
      sec.skills.push('新技能');
    } else {
      sec.items = sec.items || [];
      sec.items.push({
        id: uid(),
        title: '标题',
        subTitle: '子标题/职位',
        meta: '时间范围',
        bullets: ['职责/成果要点 1', '职责/成果要点 2'],
      });
    }
    saveData(data);
    render();
  };

  const deleteSection = (sectionId) => {
    const next = data.sections.filter(s => s.id !== sectionId);
    data.sections = next;
    saveData(data);
    render();
  };

  const reorderSection = (fromId, toId) => {
    const arr = data.sections;
    const fromIdx = arr.findIndex(s => s.id === fromId);
    const toIdx = arr.findIndex(s => s.id === toId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    saveData(data);
    render();
  };

  const reorderItem = (itemId, fromSectionIdx, toSectionIdx, beforeItemId) => {
    const fromSec = data.sections[fromSectionIdx];
    const toSec = data.sections[toSectionIdx];
    if (!fromSec || !toSec) return;
    fromSec.items = fromSec.items || [];
    toSec.items = toSec.items || [];
    const fromIdx = fromSec.items.findIndex(i => i.id === itemId);
    if (fromIdx < 0) return;
    const [moved] = fromSec.items.splice(fromIdx, 1);

    let insertIdx = toSec.items.findIndex(i => i.id === beforeItemId);
    if (insertIdx < 0) insertIdx = toSec.items.length;
    toSec.items.splice(insertIdx, 0, moved);
    saveData(data);
    render();
  };

  // Add menu
  const buildAddMenu = () => {
    addMenu.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = '选择要新增的模块';
    addMenu.appendChild(title);

    SectionTypes.forEach(s => {
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.innerHTML = `<i class="fas ${s.icon}"></i> <span>${s.title}</span>`;
      item.addEventListener('click', () => {
        const section = s.create();
        data.sections.push(section);
        saveData(data);
        addMenu.style.display = 'none';
        render();
      });
      addMenu.appendChild(item);
    });
  };

  // Header inline edit bindings
  const bindHeaderInline = () => {
    document.querySelector('[data-path="header.name"]').addEventListener('input', (e) => {
      data.header.name = e.target.textContent.trim();
      saveData(data);
    });
    document.querySelector('[data-path="header.subtitle"]').addEventListener('input', (e) => {
      data.header.subtitle = e.target.textContent.trim();
      saveData(data);
    });
  };

  // Toolbar events
  addBtn.addEventListener('click', () => {
    if (addMenu.style.display === 'none' || !addMenu.style.display) {
      buildAddMenu();
      addMenu.style.display = 'block';
    } else {
      addMenu.style.display = 'none';
    }
  });
  document.addEventListener('click', (e) => {
    if (!addMenu.contains(e.target) && e.target !== addBtn) {
      addMenu.style.display = 'none';
    }
  });

  templateSelect.value = template;
  templateSelect.addEventListener('change', () => {
    template = templateSelect.value;
    applyTemplate(template);
  });

  zoomInBtn.addEventListener('click', () => applyZoom(zoom + 0.1));
  zoomOutBtn.addEventListener('click', () => applyZoom(zoom - 0.1));

  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const n = `resume-${new Date().toISOString().slice(0,10)}.json`;
    a.download = n;
    a.click();
    URL.revokeObjectURL(a.href);
    notify('JSON 导出成功');
  });

  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json || !Array.isArray(json.sections)) throw new Error('格式不正确');
      data = json;
      saveData(data);
      render();
      notify('JSON 导入成功');
    } catch (err) {
      notify('导入失败：' + err.message, false);
    } finally {
      importFile.value = '';
    }
  });

  printBtn.addEventListener('click', () => {
    window.print();
  });

  newBtn.addEventListener('click', () => {
    if (!confirm('确认新建空白简历？当前内容将被替换（仍可通过导出文件还原）。')) return;
    data = defaultData();
    saveData(data);
    render();
  });

  // Initialize
  applyTemplate(template);
  applyZoom(zoom);
  render();
  bindHeaderInline();

  // Loading overlay hide
  window.addEventListener('load', () => {
    const loading = document.getElementById('page-loading');
    if (loading) loading.style.display = 'none';
  });
})();