/**
 * 水墨国风主题 - 章回制主入口
 */
;(function () {
  'use strict'

  const ACCENT_PRESETS = {
    vermillion: { accent: '#c23a2b', light: '#e8d5d2' },
    gold:       { accent: '#b8860b', light: '#ede3cc' },
    jade:       { accent: '#2e8b6d', light: '#d2e8df' },
  }

  const CHAPTERS = ['prologue', 'gallery', 'news', 'community']

  let siteInfo = {}
  let features = {}
  let statusTimer = null
  let galleryPage = 1
  let galleryTotal = 0
  let galleryCategory = ''
  let newsPage = 1
  let newsTotal = 0
  let newsCategory = ''
  let chartInstance = null

  async function init() {
    McApi.setBaseURL(CONFIG.API_BASE)
    initSidebar()
    initCommunityTabs()
    initCopyBtn()
    initModalHandlers()
    initLoadMore()
    await loadSiteInfo()
    loadServerStatus()
    startStatusRefresh()
    loadChart()
    loadGallery()
    loadNews()
    loadComments()
    initCommentForm()
    initWhitelistForm()
    loadFriendLinks()
  }

  // ==================== 章回切换 ====================

  function initSidebar() {
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => switchChapter(tab.dataset.chapter))
    })
    document.querySelectorAll('.mobile-tab').forEach(tab => {
      tab.addEventListener('click', () => switchChapter(tab.dataset.chapter))
    })

    const hash = location.hash.replace('#', '')
    if (CHAPTERS.includes(hash)) {
      switchChapter(hash, true)
    }

    window.addEventListener('hashchange', () => {
      const h = location.hash.replace('#', '')
      if (CHAPTERS.includes(h)) switchChapter(h, true)
    })
  }

  function switchChapter(name, fromHash) {
    if (!CHAPTERS.includes(name)) return

    document.querySelectorAll('.chapter').forEach(ch => ch.classList.remove('active'))
    const target = document.getElementById('chapter-' + name)
    if (target) {
      target.style.display = ''
      requestAnimationFrame(() => target.classList.add('active'))
    }

    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.toggle('active', t.dataset.chapter === name))
    document.querySelectorAll('.mobile-tab').forEach(t => t.classList.toggle('active', t.dataset.chapter === name))

    if (!fromHash) {
      history.replaceState(null, '', '#' + name)
    }

    if (name === 'prologue' && chartInstance) {
      setTimeout(() => chartInstance.resize(), 100)
    }
  }

  // ==================== 江湖内部标签 ====================

  function initCommunityTabs() {
    document.querySelectorAll('.community-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const pane = tab.dataset.pane
        document.querySelectorAll('.community-tab').forEach(t => t.classList.toggle('active', t.dataset.pane === pane))
        document.querySelectorAll('.community-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === pane))
      })
    })
  }

  // ==================== 站点信息 ====================

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
      try { localStorage.setItem('mc_site_name', siteName) } catch(e) {}

      const heroTitle = document.getElementById('hero-title')
      if (heroTitle) heroTitle.textContent = siteInfo.site_description || '欢迎来到服务器'

      const addr = document.getElementById('server-address')
      if (addr) addr.textContent = g('server_address_display')

      const footerName = document.getElementById('footer-text')
      if (footerName) footerName.textContent = siteName
      const footerCopy = document.getElementById('footer-copyright')
      if (footerCopy) footerCopy.textContent = `© ${new Date().getFullYear()}`

      const icpNum = g('icp_number')
      const icp = document.getElementById('footer-icp')
      const metaDot = document.getElementById('footer-meta-dot')
      if (icp && icpNum) {
        icp.textContent = icpNum
        if (metaDot) metaDot.hidden = false
      } else {
        if (icp) icp.textContent = ''
        if (metaDot) metaDot.hidden = true
      }

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
        if (qqGroup) parts.push(`<a class="colophon-seal" href="https://qm.qq.com/q/${escapeHtml(qqGroup)}" target="_blank">QQ群</a>`)
        if (discord) parts.push(`<a class="colophon-seal" href="${escapeHtml(discord)}" target="_blank">Discord</a>`)
        if (parts.length) socialEl.innerHTML = parts.join('')
      }

      toggleFeature('gallery', features.gallery)
      toggleFeature('community', features.comment || features.whitelist)
      if (!features.whitelist) {
        const ctab = document.getElementById('ctab-whitelist')
        if (ctab) ctab.style.display = 'none'
        const pane = document.getElementById('pane-whitelist')
        if (pane) pane.style.display = 'none'
      }
      if (!features.comment) {
        const pane = document.getElementById('pane-comments')
        if (pane) pane.style.display = 'none'
        if (features.whitelist) {
          const ctab = document.getElementById('ctab-whitelist')
          if (ctab) ctab.click()
        }
      }
      if (features.player_chart) document.getElementById('chart-section').style.display = ''

      applyThemeSettings(ts)
    } catch (e) {
      console.error('加载站点信息失败', e)
      const hb = document.querySelector('.hero-bg')
      if (hb) {
        hb.classList.remove('hero-bg--plain')
        hb.classList.add('hero-bg--ink')
        hb.style.background = ''
      }
    }
  }

  function applyThemeSettings(ts) {
    const root = document.documentElement
    const heroBg = document.querySelector('.hero-bg')

    const colorKey = ts.accent_color || 'vermillion'
    const preset = ACCENT_PRESETS[colorKey] || ACCENT_PRESETS.vermillion
    root.style.setProperty('--accent', preset.accent)
    root.style.setProperty('--accent-light', preset.light)

    const isDark = ts.color_scheme === 'dark'
    document.body.classList.toggle('theme-dark', isDark)

    const heroImg = typeof ts.hero_image === 'string' ? ts.hero_image.trim() : ''
    const rawStyle = ts.hero_style != null && ts.hero_style !== '' ? String(ts.hero_style) : 'ink'
    const heroStyle = heroImg ? 'image' : rawStyle

    const prologueLeft = document.querySelector('.prologue-left')

    if (heroBg) {
      heroBg.classList.remove('hero-bg--ink', 'hero-bg--plain')
    }
    document.querySelectorAll('.hero-overlay-layer').forEach(el => el.remove())
    if (prologueLeft) prologueLeft.classList.remove('prologue--dark')

    if (heroStyle === 'image') {
      const imgUrl = heroImg.startsWith('http') ? heroImg : '/' + heroImg.replace(/^\//, '')
      if (heroBg) heroBg.style.background = `url("${imgUrl}") center/cover no-repeat`
      let overlay = ts.hero_overlay || 'light'
      if (isDark && overlay === 'light') overlay = 'dark'
      if (overlay !== 'none' && prologueLeft) {
        const overlayEl = document.createElement('div')
        overlayEl.className = 'hero-overlay-layer'
        overlayEl.style.background = overlay === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(245,238,214,0.75)'
        heroBg.parentElement.insertBefore(overlayEl, heroBg.nextSibling)
      }
      if (prologueLeft) {
        prologueLeft.classList.toggle('prologue--dark', overlay === 'dark')
      }
    } else if (heroStyle === 'plain') {
      if (heroBg) {
        heroBg.classList.add('hero-bg--plain')
        heroBg.style.background = ''
      }
    } else {
      if (heroBg) {
        heroBg.classList.add('hero-bg--ink')
        heroBg.style.background = ''
      }
    }

    if (ts.title_animation === '0' || ts.title_animation === false) {
      const title = document.getElementById('hero-title')
      if (title) title.classList.add('no-anim')
    }

    if (ts.custom_css) {
      const style = document.createElement('style')
      style.textContent = ts.custom_css
      document.head.appendChild(style)
    }

    try { localStorage.setItem('mc_theme_cache', JSON.stringify(ts)) } catch(e) {}

    const preload = document.getElementById('theme-preload')
    if (preload) setTimeout(() => preload.remove(), 1000)
  }

  function toggleFeature(chapterId, enabled) {
    const chapter = document.getElementById('chapter-' + chapterId)
    if (chapter && !enabled) chapter.style.display = 'none'

    const sideTab = document.querySelector(`.sidebar-tab[data-chapter="${chapterId}"]`)
    if (sideTab) sideTab.style.display = enabled ? '' : 'none'

    const mobileTab = document.querySelector(`.mobile-tab[data-chapter="${chapterId}"]`)
    if (mobileTab) mobileTab.style.display = enabled ? '' : 'none'
  }

  // ==================== 服务器状态 ====================

  async function loadServerStatus() {
    try {
      const res = await McApi.get('/server/status')
      const d = res.data

      document.getElementById('hero-online').textContent = d.online_players
      document.getElementById('hero-max').textContent = d.max_players

      const motdEl = document.getElementById('hero-motd')
      if (d.motd && d.motd.includes('§')) {
        motdEl.innerHTML = McUtils.parseMotd(d.motd)
      } else {
        motdEl.textContent = d.motd || '欢迎加入服务器'
      }

      const dot = document.querySelector('.status-dot')
      const text = document.getElementById('hero-status-text')
      if (d.is_online) {
        if (dot) dot.style.background = 'var(--accent)'
        text.textContent = '在线'
      } else {
        if (dot) dot.style.background = '#999'
        text.textContent = '离线'
      }

      const pContent = document.querySelector('.prologue-content')
      if (pContent && !pContent.classList.contains('ready')) pContent.classList.add('ready')

      document.getElementById('stat-online').textContent = `${d.online_players} / ${d.max_players}`
      document.getElementById('stat-version').textContent = d.version || '-'
      document.getElementById('stat-latency').textContent = d.latency_ms ? `${d.latency_ms}ms` : '-'
      document.getElementById('stat-querytime').textContent = d.query_time ? McUtils.formatDate(d.query_time, 'HH:mm:ss') : '-'

      const plSection = document.getElementById('player-list-section')
      const plContainer = document.getElementById('player-list')
      if (d.player_list && d.player_list.length > 0 && features.player_list) {
        plSection.style.display = ''
        plContainer.innerHTML = d.player_list.map((name) => `<span class="player-tag">${escapeHtml(name)}</span>`).join('')
      } else {
        plSection.style.display = 'none'
      }
    } catch (e) { console.error('加载状态失败', e) }
  }

  function startStatusRefresh() {
    if (statusTimer) clearInterval(statusTimer)
    statusTimer = setInterval(loadServerStatus, CONFIG.REFRESH_INTERVAL)
  }

  // ==================== 图表 ====================

  async function loadChart() {
    if (!features.player_chart) return
    try {
      const res = await McApi.get('/server/stats/24h')
      const points = res.data || []
      if (points.length === 0) return
      const chartDom = document.getElementById('player-chart')
      chartInstance = echarts.init(chartDom)
      const cs = getComputedStyle(document.documentElement)
      const accent = cs.getPropertyValue('--accent').trim() || '#c23a2b'
      const textMuted = cs.getPropertyValue('--text-muted').trim() || '#8a8378'
      const borderInk = cs.getPropertyValue('--border-ink').trim() || 'rgba(44,44,44,0.12)'

      chartInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(44,44,44,0.9)', borderColor: 'transparent', textStyle: { color: '#f5eed6', fontFamily: 'LXGW WenKai, serif' } },
        grid: { left: 50, right: 16, top: 16, bottom: 36 },
        xAxis: {
          type: 'category',
          data: points.map(p => { const d = new Date(p.time); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }),
          axisLabel: { color: textMuted, fontFamily: 'LXGW WenKai, serif' },
          axisLine: { lineStyle: { color: borderInk } },
        },
        yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: borderInk } }, axisLabel: { color: textMuted } },
        series: [{
          name: '在线',
          type: 'line',
          data: points.map(p => p.avg_players),
          smooth: true,
          areaStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops: [{ offset: 0, color: accent + '30' }, { offset: 1, color: 'transparent' }] } },
          lineStyle: { width: 2, color: accent },
          itemStyle: { color: accent },
        }],
      })
      window.addEventListener('resize', () => chartInstance && chartInstance.resize())
    } catch (e) { console.error('加载图表失败', e) }
  }

  // ==================== 挂轴画廊 ====================

  async function loadGallery(append) {
    if (!features.gallery) return
    try {
      const res = await McApi.get('/gallery', { page: galleryPage, per_page: 12, category_id: galleryCategory || undefined })
      const items = res.data || []
      galleryTotal = res.meta?.total || 0
      const grid = document.getElementById('gallery-grid')
      if (!append) grid.innerHTML = ''

      items.forEach((img) => {
        const div = document.createElement('div')
        div.className = 'scroll-frame'
        const src = McUtils.getStorageUrl(img.thumb_path || img.file_path)
        const fullSrc = McUtils.getStorageUrl(img.file_path)
        div.innerHTML = `
          <div class="scroll-rod scroll-rod--top"></div>
          <div class="scroll-img-wrap">
            <img src="${src}" alt="${escapeHtml(img.title || '')}" loading="lazy" data-full="${fullSrc}" />
          </div>
          <div class="scroll-rod scroll-rod--bottom"></div>
          ${img.title ? `<p class="scroll-caption">${escapeHtml(img.title)}</p>` : ''}
        `
        div.querySelector('.scroll-img-wrap').addEventListener('click', () => {
          const allImgs = Array.from(grid.querySelectorAll('img')).map(i => i.dataset.full)
          const idx = allImgs.indexOf(fullSrc)
          McLightbox.open(allImgs, idx >= 0 ? idx : 0)
        })
        grid.appendChild(div)
      })

      document.getElementById('gallery-more').style.display = galleryPage * 12 < galleryTotal ? 'block' : 'none'
      if (!append) loadGalleryCategories()
    } catch (e) { console.error('加载图集失败', e) }
  }

  async function loadGalleryCategories() {
    try {
      const res = await McApi.get('/gallery/categories')
      const cats = res.data || []
      const container = document.getElementById('gallery-categories')
      let html = `<button class="cat-btn ${!galleryCategory ? 'active' : ''}" data-cat="">全部</button>`
      cats.forEach(c => { html += `<button class="cat-btn ${galleryCategory == c.id ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>` })
      container.innerHTML = html
      container.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => { galleryCategory = btn.dataset.cat; galleryPage = 1; loadGallery() })
      })
    } catch (e) {}
  }

  // ==================== 告示牌动态 ====================

  async function loadNews(append) {
    try {
      const params = { page: newsPage, per_page: 8 }
      if (newsCategory) params.category_id = newsCategory
      const res = await McApi.get('/posts', params)
      const items = res.data || []
      newsTotal = res.meta?.total || 0
      const list = document.getElementById('news-list')
      if (!append) list.innerHTML = ''

      if (items.length === 0 && !append) {
        list.innerHTML = '<p class="empty-text">暂无告示</p>'
        return
      }

      items.forEach((post) => {
        const div = document.createElement('div')
        div.className = 'notice-card'
        const rotation = (Math.random() * 3 - 1.5).toFixed(2)
        div.style.transform = `rotate(${rotation}deg)`
        const summary = McUtils.truncate(McUtils.stripHtml(post.content), 80)
        div.innerHTML = `
          <div class="notice-pin"></div>
          ${post.is_pinned ? '<span class="notice-stamp">急报</span>' : ''}
          <h3 class="notice-title">${escapeHtml(post.title)}</h3>
          <p class="notice-summary">${escapeHtml(summary)}</p>
          <div class="notice-foot">
            ${post.category?.name ? `<span class="notice-cat">${escapeHtml(post.category.name)}</span>` : ''}
            <span class="notice-date">${McUtils.formatDate(post.published_at, 'YYYY-MM-DD')}</span>
          </div>
        `
        div.addEventListener('click', () => showPostDetail(post.id))
        list.appendChild(div)
      })

      document.getElementById('news-more').style.display = newsPage * 8 < newsTotal ? 'block' : 'none'
      if (!append) loadNewsCategories()
    } catch (e) { console.error('加载动态失败', e) }
  }

  async function loadNewsCategories() {
    try {
      const res = await McApi.get('/posts/categories')
      const cats = res.data || []
      const container = document.getElementById('news-categories')
      if (!container || cats.length === 0) { if (container) container.style.display = 'none'; return }
      container.style.display = ''
      let html = `<button class="cat-btn ${!newsCategory ? 'active' : ''}" data-cat="">全部</button>`
      cats.forEach(c => { html += `<button class="cat-btn ${newsCategory == c.id ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>` })
      container.innerHTML = html
      container.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => { newsCategory = btn.dataset.cat; newsPage = 1; loadNews() })
      })
    } catch (e) {}
  }

  async function showPostDetail(id) {
    try {
      const res = await McApi.get(`/posts/${id}`)
      const post = res.data
      document.getElementById('post-detail-title').textContent = post.title
      document.getElementById('post-detail-meta').innerHTML = `
        ${post.category?.name ? `<span class="notice-cat">${escapeHtml(post.category.name)}</span>` : ''}
        <span>${post.author?.nickname || ''}</span> · <span>${McUtils.formatDate(post.published_at)}</span>
      `
      document.getElementById('post-detail-body').innerHTML = post.content
      const scroll = document.querySelector('#post-modal .modal-scroll')
      if (scroll) scroll.scrollTop = 0
      openModal('post-modal')
    } catch (e) { McToast.error('加载失败') }
  }

  function openModal(id) {
    const modal = document.getElementById(id)
    if (!modal) return
    modal.style.display = 'flex'; modal.classList.remove('modal--closing')
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => { requestAnimationFrame(() => modal.classList.add('modal--visible')) })
  }

  function closeModal(id) {
    const modal = document.getElementById(id)
    if (!modal || !modal.classList.contains('modal--visible')) return
    modal.classList.add('modal--closing'); modal.classList.remove('modal--visible')
    let done = false
    const onEnd = () => { if (done) return; done = true; modal.removeEventListener('transitionend', onEnd); modal.style.display = 'none'; modal.classList.remove('modal--closing'); document.body.style.overflow = '' }
    modal.addEventListener('transitionend', onEnd); setTimeout(onEnd, 350)
  }

  // ==================== 题壁诗墙留言 ====================

  async function loadComments() {
    if (!features.comment) return
    try {
      const res = await McApi.get('/comments', { per_page: 50 })
      const items = res.data || []
      const track = document.getElementById('comment-list')
      const wall = document.getElementById('comment-marquee')
      if (items.length === 0) { if (wall) wall.innerHTML = '<p class="empty-text">壁上空空，待君题诗</p>'; return }
      track.innerHTML = items.map(buildPoem).join('')
    } catch (e) { console.error('加载留言失败', e) }
  }

  function buildPoem(c) {
    return `<div class="poem-card">
      <div class="poem-header">
        <span class="poem-seal">${c.nickname.charAt(0)}</span>
        <span class="poem-name">${escapeHtml(c.nickname)}</span>
        <span class="poem-time">${McUtils.formatDate(c.created_at, 'MM-DD')}</span>
      </div>
      <p class="poem-text">${escapeHtml(c.content)}</p>
      ${c.admin_reply ? `<div class="poem-reply">批曰：${escapeHtml(c.admin_reply)}</div>` : ''}
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
      if (!nickname || !content) { McToast.warning('请填写名号和留言'); return }
      try {
        await McApi.post('/comments', { nickname, email, content, _hp: hp, _ts: ts })
        McToast.success('题壁成功，待审阅')
        form.reset(); if (tsEl) tsEl.value = String(Date.now())
      } catch (e) { McToast.error(e.message || '提交失败') }
    })
  }

  // ==================== 白名单 ====================

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
        McToast.success('拜帖已呈，静候佳音')
        form.reset(); if (wlTsEl) wlTsEl.value = String(Date.now())
      } catch (e) { McToast.error(e.message || '提交失败') }
    })

    document.getElementById('wl-check-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('wl-check-name').value.trim()
      if (!name) return McToast.warning('请输入游戏ID')
      try {
        const res = await McApi.get(`/whitelist/check/${encodeURIComponent(name)}`)
        const d = res.data
        const statusMap = {
          pending:  { text: '待审阅', cls: 'status-pending' },
          approved: { text: '已准入', cls: 'status-approved' },
          rejected: { text: '已婉拒', cls: 'status-rejected' },
          not_found:{ text: '未寻得', cls: 'status-notfound' },
        }
        const s = statusMap[d.status] || statusMap.not_found
        document.getElementById('wl-check-result').innerHTML = `
          <div class="check-result ${s.cls}">
            <span>结果：${s.text}</span>
            ${d.admin_note ? `<br><span>批注：${escapeHtml(d.admin_note)}</span>` : ''}
            ${d.created_at ? `<br><span>时间：${McUtils.formatDate(d.created_at)}</span>` : ''}
          </div>
        `
      } catch (e) { McToast.error('查询失败') }
    })
  }

  // ==================== 辅助初始化 ====================

  function initCopyBtn() {
    document.getElementById('copy-btn')?.addEventListener('click', () => {
      const addr = document.getElementById('server-address').textContent
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(addr).then(() => McToast.success('已复制'))
      } else {
        const ta = document.createElement('textarea')
        ta.value = addr; ta.style.cssText = 'position:fixed;opacity:0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy')
        document.body.removeChild(ta); McToast.success('已复制')
      }
    })
  }

  function initModalHandlers() {
    document.getElementById('post-modal-close')?.addEventListener('click', () => closeModal('post-modal'))
    document.querySelector('#post-modal .modal-overlay')?.addEventListener('click', () => closeModal('post-modal'))
  }

  function initLoadMore() {
    document.getElementById('gallery-load-more')?.addEventListener('click', () => { galleryPage++; loadGallery(true) })
    document.getElementById('news-load-more')?.addEventListener('click', () => { newsPage++; loadNews(true) })
  }

  async function loadFriendLinks() {
    try {
      const res = await McApi.get('/friend-links')
      const links = res.data || []
      const container = document.getElementById('footer-links')
      if (!container || links.length === 0) return
      container.innerHTML = links.map(link => `<a class="colophon-seal" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.name)}</a>`).join('')
    } catch (e) {}
  }

  function escapeHtml(str) {
    if (!str) return ''
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
    return str.replace(/[&<>"']/g, c => map[c])
  }

  document.addEventListener('DOMContentLoaded', init)
})()
