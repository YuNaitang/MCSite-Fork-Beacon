/**
 * Pixel OS Desktop — 窗口管理器 + 数据绑定
 */
;(function () {
  'use strict'

  const ACCENT_PRESETS = {
    green:  { accent: '#4ade80', dim: '#22c55e', glow: 'rgba(74,222,128,0.35)' },
    amber:  { accent: '#fbbf24', dim: '#d97706', glow: 'rgba(251,191,36,0.35)' },
    cyan:   { accent: '#22d3ee', dim: '#0891b2', glow: 'rgba(34,211,238,0.35)' },
    red:    { accent: '#f87171', dim: '#dc2626', glow: 'rgba(248,113,113,0.35)' },
    purple: { accent: '#a78bfa', dim: '#7c3aed', glow: 'rgba(167,139,250,0.35)' },
  }

  let siteInfo = {}
  let features = {}
  let statusTimer = null
  let galleryPage = 1
  let galleryTotal = 0
  let galleryCategory = ''
  let newsPage = 1
  let newsTotal = 0
  let newsCategory = ''
  let chart = null
  let topZ = 20

  // ==================== Init ====================

  async function init() {
    McApi.setBaseURL(CONFIG.API_BASE)
    initWindowManager()
    initTaskbar()
    initTabs()
    await loadSiteInfo()
    loadServerStatus()
    startStatusRefresh()
    loadChart()
    loadGallery()
    loadGalleryCategories()
    loadNews()
    loadNewsCategories()
    loadComments()
    initCommentForm()
    initWhitelistForm()
    loadFriendLinks()
  }

  // ==================== Window Manager ====================

  function initWindowManager() {
    document.querySelectorAll('.os-window').forEach(win => {
      win.addEventListener('mousedown', () => focusWindow(win))
      const titlebar = win.querySelector('.window-titlebar')
      if (titlebar) initDrag(win, titlebar)
      win.querySelectorAll('.win-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation()
          const action = btn.dataset.action
          if (action === 'close') closeWindow(win.dataset.app)
          else if (action === 'minimize') minimizeWindow(win.dataset.app)
          else if (action === 'maximize') toggleMaximize(win)
        })
      })
    })

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    document.querySelectorAll('.desktop-icon').forEach(icon => {
      if (isMobile) {
        icon.addEventListener('click', () => openWindow(icon.dataset.app))
      } else {
        icon.addEventListener('dblclick', () => openWindow(icon.dataset.app))
        icon.addEventListener('click', () => {
          document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'))
          icon.classList.add('selected')
        })
      }
    })

    document.getElementById('desktop')?.addEventListener('click', e => {
      if (e.target.id === 'desktop' || e.target.id === 'desktop-bg') {
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'))
      }
    })

    openWindow('welcome')
  }

  function openWindow(appId) {
    const win = document.querySelector(`.os-window[data-app="${appId}"]`)
    if (!win) return
    win.hidden = false
    win.classList.remove('win-minimized')
    focusWindow(win)
    syncTaskbar()
    if (appId === 'status' && chart) setTimeout(() => chart.resize(), 100)
  }

  function closeWindow(appId) {
    const win = document.querySelector(`.os-window[data-app="${appId}"]`)
    if (!win) return
    win.hidden = true
    win.classList.remove('maximized', 'focused', 'win-minimized')
    syncTaskbar()
    closeStartMenu()
  }

  function minimizeWindow(appId) {
    const win = document.querySelector(`.os-window[data-app="${appId}"]`)
    if (!win) return
    win.classList.add('win-minimized')
    win.classList.remove('focused')
    syncTaskbar()
  }

  function toggleMaximize(win) {
    win.classList.toggle('maximized')
    if (win.classList.contains('maximized')) {
      win._preMax = {
        top: win.style.top, left: win.style.left,
        width: win.style.width, height: win.style.height,
        transform: win.style.transform
      }
    } else if (win._preMax) {
      Object.assign(win.style, win._preMax)
    }
    if (chart) setTimeout(() => chart.resize(), 100)
  }

  function focusWindow(win) {
    document.querySelectorAll('.os-window').forEach(w => w.classList.remove('focused'))
    win.classList.remove('win-minimized')
    win.classList.add('focused')
    topZ++
    win.style.zIndex = topZ
    syncTaskbar()
  }

  function initDrag(win, handle) {
    let startX, startY, origX, origY, dragging = false

    function onDown(e) {
      if (e.target.closest('.win-btn') || win.classList.contains('maximized')) return
      if (window.innerWidth <= 768) return
      dragging = true
      const touch = e.touches ? e.touches[0] : e
      startX = touch.clientX
      startY = touch.clientY
      const rect = win.getBoundingClientRect()
      origX = rect.left
      origY = rect.top
      win.style.transform = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.addEventListener('touchmove', onMove, { passive: false })
      document.addEventListener('touchend', onUp)
      e.preventDefault()
    }

    function onMove(e) {
      if (!dragging) return
      const touch = e.touches ? e.touches[0] : e
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      win.style.left = (origX + dx) + 'px'
      win.style.top = (origY + dy) + 'px'
      if (e.cancelable) e.preventDefault()
    }

    function onUp() {
      dragging = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }

    handle.addEventListener('mousedown', onDown)
    handle.addEventListener('touchstart', onDown, { passive: false })
  }

  // ==================== Taskbar ====================

  function initTaskbar() {
    document.getElementById('start-btn')?.addEventListener('click', toggleStartMenu)

    document.querySelectorAll('.start-item').forEach(item => {
      item.addEventListener('click', () => {
        openWindow(item.dataset.app)
        closeStartMenu()
      })
    })

    document.addEventListener('click', e => {
      const sm = document.getElementById('start-menu')
      const sb = document.getElementById('start-btn')
      if (sm && !sm.hidden && !sm.contains(e.target) && !sb.contains(e.target)) {
        closeStartMenu()
      }
    })

    document.getElementById('copy-btn')?.addEventListener('click', () => {
      const addr = document.getElementById('server-address')?.textContent
      if (!addr) return
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(addr).then(() => McToast.success('已复制'))
      } else {
        const ta = document.createElement('textarea')
        ta.value = addr
        ta.style.cssText = 'position:fixed;opacity:0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        McToast.success('已复制')
      }
    })
  }

  function toggleStartMenu() {
    const menu = document.getElementById('start-menu')
    const btn = document.getElementById('start-btn')
    if (!menu) return
    menu.hidden = !menu.hidden
    btn?.classList.toggle('active', !menu.hidden)
  }

  function closeStartMenu() {
    const menu = document.getElementById('start-menu')
    const btn = document.getElementById('start-btn')
    if (menu) menu.hidden = true
    if (btn) btn.classList.remove('active')
  }

  function syncTaskbar() {
    const container = document.getElementById('taskbar-tabs')
    if (!container) return
    const openWindows = document.querySelectorAll('.os-window:not([hidden])')
    container.innerHTML = ''
    openWindows.forEach(win => {
      const tab = document.createElement('button')
      tab.className = 'taskbar-tab'
      if (win.classList.contains('focused') && !win.classList.contains('win-minimized')) {
        tab.classList.add('active')
      }
      const title = win.querySelector('.window-title')?.textContent || win.dataset.app
      tab.textContent = title.trim()
      tab.addEventListener('click', () => {
        if (win.classList.contains('win-minimized')) {
          openWindow(win.dataset.app)
        } else if (win.classList.contains('focused')) {
          minimizeWindow(win.dataset.app)
        } else {
          focusWindow(win)
        }
      })
      container.appendChild(tab)
    })
  }

  // ==================== Tabs (in-window) ====================

  function initTabs() {
    document.querySelectorAll('.window-tabs').forEach(container => {
      container.querySelectorAll('.wtab').forEach(btn => {
        btn.addEventListener('click', () => {
          const pane = btn.dataset.tab
          const win = btn.closest('.os-window')
          win.querySelectorAll('.wtab').forEach(b => b.classList.remove('active'))
          btn.classList.add('active')
          win.querySelectorAll('.tab-pane').forEach(p => {
            p.classList.toggle('active', p.dataset.pane === pane)
          })
          if (chart && pane === 'chart') setTimeout(() => chart.resize(), 50)
        })
      })
    })
  }

  // ==================== Site Info ====================

  async function loadSiteInfo() {
    try {
      const res = await McApi.get('/site/info')
      siteInfo = res.data.settings || {}
      features = res.data.features || {}
      const ts = res.data.theme_settings || {}
      const g = (key) => ts[key] || siteInfo[key] || ''

      const siteName = siteInfo.site_name || CONFIG.SITE_NAME
      document.title = siteName
      const logo = document.getElementById('nav-logo')
      if (logo) logo.textContent = siteName
      const welcomeTitle = document.getElementById('win-welcome-title')
      if (welcomeTitle) welcomeTitle.textContent = siteName

      try { localStorage.setItem('mc_site_name', siteName) } catch(e) {}

      const heroTitle = document.getElementById('hero-title')
      if (heroTitle) heroTitle.textContent = siteInfo.site_description || '欢迎来到服务器'

      const addr = document.getElementById('server-address')
      if (addr) addr.textContent = g('server_address_display') || 'play.example.com'

      const footerName = document.getElementById('footer-text')
      if (footerName) footerName.textContent = siteName
      const footerCopy = document.getElementById('footer-copyright')
      if (footerCopy) footerCopy.textContent = `© ${new Date().getFullYear()}`
      const icpNum = g('icp_number')
      const icp = document.getElementById('footer-icp')
      if (icp && icpNum) icp.textContent = icpNum

      const faviconUrl = g('favicon_url')
      if (faviconUrl) {
        let link = document.querySelector('link[rel="icon"]')
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
        link.href = faviconUrl
      }

      const socialEl = document.getElementById('footer-social')
      if (socialEl) {
        const qqGroup = g('qq_group')
        const discord = g('discord_link')
        let parts = []
        if (qqGroup) parts.push(`<a href="https://qm.qq.com/q/${escapeHtml(qqGroup)}" target="_blank">QQ群</a>`)
        if (discord) parts.push(`<a href="${escapeHtml(discord)}" target="_blank">Discord</a>`)
        if (parts.length) socialEl.innerHTML = parts.join(' ')
      }

      toggleFeature('gallery', features.gallery)
      toggleFeature('comments', features.comment)
      toggleFeature('whitelist', features.whitelist)

      applyThemeSettings(ts)
    } catch (e) {
      console.error('加载站点信息失败', e)
    }
  }

  function toggleFeature(appId, enabled) {
    const icon = document.getElementById('icon-' + appId)
    const menuItem = document.getElementById('menu-' + appId)
    if (!enabled) {
      if (icon) icon.hidden = true
      if (menuItem) menuItem.hidden = true
      closeWindow(appId)
    }
  }

  function applyThemeSettings(ts) {
    const root = document.documentElement
    const colorKey = ts.accent_color || 'green'
    const preset = ACCENT_PRESETS[colorKey] || ACCENT_PRESETS.green
    root.style.setProperty('--accent', preset.accent)
    root.style.setProperty('--accent-dim', preset.dim)
    root.style.setProperty('--accent-glow', preset.glow)

    const scan = document.getElementById('scanlines')
    if (scan) scan.style.display = (ts.scanlines === '0' || ts.scanlines === false) ? 'none' : ''

    const desktopBg = document.getElementById('desktop-bg')
    if (desktopBg) {
      const heroStyle = ts.hero_style || 'grid'
      const heroImg = typeof ts.hero_image === 'string' ? ts.hero_image.trim() : ''
      if (heroStyle === 'image' && heroImg) {
        const url = heroImg.startsWith('http') ? heroImg : '/' + heroImg.replace(/^\//, '')
        desktopBg.style.background = `url("${url}") center/cover no-repeat`
      } else if (heroStyle === 'solid') {
        desktopBg.style.background = 'var(--desktop-bg)'
      } else {
        desktopBg.style.background = ''
      }
    }

    if (ts.custom_css) {
      const style = document.createElement('style')
      style.textContent = ts.custom_css
      document.head.appendChild(style)
    }

    try { localStorage.setItem('mc_theme_cache', JSON.stringify(ts)) } catch(e) {}

    const preload = document.getElementById('theme-preload')
    if (preload) preload.remove()
  }

  // ==================== Server Status ====================

  async function loadServerStatus() {
    try {
      const res = await McApi.get('/server/status')
      const d = res.data
      document.getElementById('hero-online').textContent = d.online_players
      document.getElementById('hero-max').textContent = d.max_players
      document.getElementById('tray-online').textContent = d.online_players
      document.getElementById('stat-online').textContent = d.online_players

      const motdEl = document.getElementById('hero-motd')
      if (motdEl && d.motd) motdEl.textContent = d.motd

      const ver = document.getElementById('stat-version')
      if (ver && d.version) ver.textContent = d.version
      const lat = document.getElementById('stat-latency')
      if (lat) lat.textContent = d.latency_ms ? d.latency_ms + 'ms' : '-'
      const qt = document.getElementById('stat-querytime')
      if (qt && d.query_time) qt.textContent = McUtils.formatDate(d.query_time, 'HH:mm:ss')

      const fill = document.getElementById('hud-fill')
      if (fill && d.max_players > 0) {
        fill.style.width = Math.min(100, (d.online_players / d.max_players) * 100) + '%'
      }

      const dot = document.getElementById('hero-status-dot')
      const text = document.getElementById('hero-status-text')
      const trayDots = document.querySelectorAll('.tray-dot')
      if (d.is_online) {
        document.querySelectorAll('.status-dot').forEach(el => el.classList.remove('offline'))
        if (text) text.textContent = '运行中'
      } else {
        document.querySelectorAll('.status-dot').forEach(el => el.classList.add('offline'))
        if (text) text.textContent = '离线'
      }

      if (d.player_list && d.player_list.length > 0) {
        const pl = document.getElementById('player-list')
        if (pl) pl.innerHTML = d.player_list.map(p => `<span class="player-tag">${escapeHtml(p)}</span>`).join('')
      }
    } catch (e) {
      console.error('状态查询失败', e)
    }
  }

  function startStatusRefresh() {
    statusTimer = setInterval(loadServerStatus, CONFIG.REFRESH_INTERVAL)
  }

  // ==================== Chart ====================

  async function loadChart() {
    if (!features.player_chart) return
    const el = document.getElementById('player-chart')
    if (!el) return
    try {
      const res = await McApi.get('/server/stats/24h')
      const data = res.data || []
      chart = echarts.init(el)
      chart.setOption({
        grid: { top: 20, right: 16, bottom: 28, left: 44 },
        tooltip: { trigger: 'axis', backgroundColor: '#c0c0c0', borderColor: '#808080', textStyle: { fontFamily: 'VT323', color: '#000' } },
        xAxis: { type: 'category', data: data.map(p => { const t = new Date(p.time); return String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0') }), axisLabel: { fontSize: 11, fontFamily: 'VT323', interval: 'auto' }, axisLine: { lineStyle: { color: '#808080' } } },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11, fontFamily: 'VT323' }, axisLine: { lineStyle: { color: '#808080' } }, splitLine: { lineStyle: { color: '#e0e0e0' } } },
        series: [{ type: 'line', data: data.map(d => d.avg_players ?? d.players ?? 0), lineStyle: { color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4ade80', width: 2 }, itemStyle: { color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4ade80' }, areaStyle: { color: 'rgba(74,222,128,0.1)' }, smooth: false, step: 'middle' }]
      })
      window.addEventListener('resize', () => chart?.resize())
    } catch (e) { console.error('图表加载失败', e) }
  }

  // ==================== Gallery ====================

  async function loadGallery(append) {
    if (!features.gallery) return
    try {
      const params = { page: galleryPage, per_page: 12 }
      if (galleryCategory) params.category_id = galleryCategory
      const res = await McApi.get('/gallery', params)
      const items = res.data || []
      galleryTotal = res.meta?.last_page || 1
      const grid = document.getElementById('gallery-grid')
      if (!grid) return
      if (!append) grid.innerHTML = ''
      items.forEach(item => {
        const thumb = McUtils.getStorageUrl(item.thumb_path || item.file_path)
        const full = McUtils.getStorageUrl(item.file_path)
        const div = document.createElement('div')
        div.className = 'gallery-item'
        div.innerHTML = `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.title || '')}" loading="lazy" data-full="${escapeHtml(full)}" />${item.title ? `<span class="gallery-title">${escapeHtml(item.title)}</span>` : ''}`
        div.addEventListener('click', () => {
          const allImgs = Array.from(grid.querySelectorAll('img')).map(i => i.dataset.full)
          const idx = allImgs.indexOf(full)
          McLightbox.open(allImgs, idx >= 0 ? idx : 0)
        })
        grid.appendChild(div)
      })
      const more = document.getElementById('gallery-more')
      if (more) more.style.display = galleryPage < galleryTotal ? '' : 'none'
    } catch (e) { console.error('图集加载失败', e) }
  }

  async function loadGalleryCategories() {
    if (!features.gallery) return
    try {
      const res = await McApi.get('/gallery/categories')
      const cats = res.data || []
      const container = document.getElementById('gallery-categories')
      if (!container || cats.length === 0) return
      let html = `<button class="cat-btn ${galleryCategory === '' ? 'active' : ''}" data-cat="">全部</button>`
      cats.forEach(c => { html += `<button class="cat-btn ${galleryCategory == c.id ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>` })
      container.innerHTML = html
      container.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => { galleryCategory = btn.dataset.cat; galleryPage = 1; loadGallery() })
      })
    } catch (e) {}
  }

  // ==================== News ====================

  async function loadNews(append) {
    try {
      const params = { page: newsPage, per_page: 20 }
      if (newsCategory) params.category_id = newsCategory
      const res = await McApi.get('/posts', params)
      const items = res.data || []
      newsTotal = res.meta?.last_page || 1
      const list = document.getElementById('news-list')
      if (!list) return
      if (!append) list.innerHTML = ''
      if (items.length === 0 && !append) {
        list.innerHTML = '<div class="empty-text">暂无动态</div>'
        return
      }
      items.forEach(item => {
        const div = document.createElement('div')
        div.className = 'file-entry'
        div.innerHTML = `
          <span class="file-icon">▦</span>
          ${item.is_pinned ? '<span class="file-pin">[置顶]</span>' : ''}
          <span class="file-name">${escapeHtml(item.title)}</span>
          <span class="file-date">${McUtils.formatDate(item.published_at)}</span>
        `
        div.addEventListener('click', () => showPostDetail(item.id, div))
        list.appendChild(div)
      })
      const more = document.getElementById('news-more')
      if (more) more.style.display = newsPage < newsTotal ? '' : 'none'
    } catch (e) { console.error('动态加载失败', e) }
  }

  async function loadNewsCategories() {
    try {
      const res = await McApi.get('/posts/categories')
      const cats = res.data || []
      const container = document.getElementById('news-categories')
      if (!container || cats.length === 0) return
      let html = `<button class="cat-btn ${newsCategory === '' ? 'active' : ''}" data-cat="">全部</button>`
      cats.forEach(c => { html += `<button class="cat-btn ${newsCategory == c.id ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>` })
      container.innerHTML = html
      container.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => { newsCategory = btn.dataset.cat; newsPage = 1; loadNews() })
      })
    } catch (e) {}
  }

  async function showPostDetail(id, entryEl) {
    try {
      const res = await McApi.get(`/posts/${id}`)
      const post = res.data
      document.getElementById('post-detail-title').textContent = post.title
      document.getElementById('post-detail-meta').innerHTML = `
        ${post.category?.name ? `<span class="cat-btn" style="pointer-events:none">${escapeHtml(post.category.name)}</span>` : ''}
        <span>${post.author?.nickname || ''}</span> · <span>${McUtils.formatDate(post.published_at)}</span>
      `
      document.getElementById('post-detail-body').innerHTML = post.content

      const preview = document.getElementById('news-preview')
      if (preview) {
        preview.querySelector('.preview-placeholder')?.style.setProperty('display', 'none')
        const content = preview.querySelector('.preview-content')
        if (content) content.style.display = ''
        preview.scrollTop = 0
      }

      document.querySelectorAll('.file-entry').forEach(e => e.classList.remove('active'))
      if (entryEl) entryEl.classList.add('active')
    } catch (e) { McToast.error('加载失败') }
  }

  // ==================== Comments ====================

  async function loadComments() {
    if (!features.comment) return
    try {
      const res = await McApi.get('/comments', { per_page: 50 })
      const items = res.data || []
      const list = document.getElementById('comment-list')
      if (!list) return
      if (items.length === 0) {
        const parent = document.getElementById('comment-marquee')
        if (parent) parent.innerHTML = '<div class="chat-empty">还没有人留言，来说点什么吧</div>'
        return
      }
      list.innerHTML = items.map(buildBubble).join('')
      const msgs = document.querySelector('.chat-messages')
      if (msgs) msgs.scrollTop = msgs.scrollHeight
    } catch (e) { console.error('留言加载失败', e) }
  }

  function buildBubble(c) {
    return `<div class="chat-bubble">
      <div class="chat-bubble-header">
        <span class="chat-nick">${escapeHtml(c.nickname)}</span>
        <span class="chat-time">${McUtils.formatDate(c.created_at)}</span>
      </div>
      <div class="chat-text">${escapeHtml(c.content)}</div>
      ${c.admin_reply ? `<div class="chat-reply">管理员回复：${escapeHtml(c.admin_reply)}</div>` : ''}
    </div>`
  }

  function initCommentForm() {
    const form = document.getElementById('comment-form')
    if (!form) return
    const tsEl = document.getElementById('comment-ts')
    if (tsEl) tsEl.value = String(Date.now())
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const nickname = document.getElementById('comment-nickname').value.trim()
      const email = document.getElementById('comment-email').value.trim()
      const content = document.getElementById('comment-content').value.trim()
      const hp = document.getElementById('comment-hp')?.value || ''
      const ts = document.getElementById('comment-ts')?.value || ''
      if (!nickname || !content) { McToast.warning('请填写昵称和留言'); return }
      try {
        await McApi.post('/comments', { nickname, email, content, _hp: hp, _ts: ts })
        McToast.success('发送成功，待审核')
        form.reset()
        if (tsEl) tsEl.value = String(Date.now())
      } catch (e) { McToast.error(e.message || '发送失败') }
    })
  }

  // ==================== Whitelist ====================

  function initWhitelistForm() {
    const form = document.getElementById('whitelist-form')
    if (!form) return
    const wlTsEl = document.getElementById('wl-ts')
    if (wlTsEl) wlTsEl.value = String(Date.now())
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const player_name = document.getElementById('wl-player-name').value.trim()
      const platform = document.getElementById('wl-platform').value
      const contact = document.getElementById('wl-contact').value.trim()
      const reason = document.getElementById('wl-reason').value.trim()
      const hp = document.getElementById('wl-hp')?.value || ''
      const ts = document.getElementById('wl-ts')?.value || ''
      if (!player_name) { McToast.warning('请填写游戏ID'); return }
      try {
        await McApi.post('/whitelist/apply', { player_name, platform, contact, reason, _hp: hp, _ts: ts })
        McToast.success('申请已提交，请耐心等待')
        form.reset()
        if (wlTsEl) wlTsEl.value = String(Date.now())
      } catch (e) { McToast.error(e.message || '提交失败') }
    })

    document.getElementById('wl-check-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('wl-check-name').value.trim()
      if (!name) return McToast.warning('请输入游戏ID')
      try {
        const res = await McApi.get(`/whitelist/check/${encodeURIComponent(name)}`)
        const d = res.data
        const statusMap = {
          pending:  { text: '等待审核', cls: 'status-pending' },
          approved: { text: '已通过', cls: 'status-approved' },
          rejected: { text: '未通过', cls: 'status-rejected' },
          not_found:{ text: '未找到', cls: 'status-notfound' },
        }
        const s = statusMap[d.status] || statusMap.not_found
        document.getElementById('wl-check-result').innerHTML = `
          <div class="check-result ${s.cls}">
            <span>结果：${s.text}</span>
            ${d.admin_note ? `<br><span>备注：${escapeHtml(d.admin_note)}</span>` : ''}
            ${d.created_at ? `<br><span>时间：${McUtils.formatDate(d.created_at)}</span>` : ''}
          </div>
        `
      } catch (e) { McToast.error('查询失败') }
    })
  }

  // ==================== Friend Links ====================

  async function loadFriendLinks() {
    try {
      const res = await McApi.get('/friend-links')
      const links = res.data || []
      const container = document.getElementById('footer-links')
      if (!container || links.length === 0) return
      container.innerHTML = links.map(link => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.name)}</a>`).join(' ')
    } catch (e) {}
  }

  // ==================== Gallery/News Load More ====================

  function initLoadMore() {
    document.getElementById('gallery-load-more')?.addEventListener('click', () => { galleryPage++; loadGallery(true) })
    document.getElementById('news-load-more')?.addEventListener('click', () => { newsPage++; loadNews(true) })
  }

  // ==================== Utility ====================

  function escapeHtml(str) {
    if (!str) return ''
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
    return str.replace(/[&<>"']/g, c => map[c])
  }

  // ==================== Boot ====================

  document.addEventListener('DOMContentLoaded', () => {
    init()
    initLoadMore()
  })
})()
