/**
 * Aether — 以太主题
 */
;(function () {
  'use strict'

  const ACCENT_PRESETS = {
    violet:  { primary: '#7c5cfc', light: '#a78bfa', accent: '#3b82f6' },
    sky:     { primary: '#3b82f6', light: '#60a5fa', accent: '#7c5cfc' },
    emerald: { primary: '#10b981', light: '#34d399', accent: '#3b82f6' },
    amber:   { primary: '#f59e0b', light: '#fbbf24', accent: '#7c5cfc' },
  }

  const PAGES = ['home', 'gallery', 'news', 'community']
  const RING_CIRCUMFERENCE = 2 * Math.PI * 85 // r=85

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
  let currentPage = 'home'

  // ==================== 初始化 ====================

  async function init() {
    McApi.setBaseURL(CONFIG.API_BASE)
    injectRingGradient()
    initRouter()
    initNavigation()
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
    refreshFadeUp()
    if (typeof lucide !== 'undefined') lucide.createIcons()
  }

  // ==================== SVG 渐变注入 ====================

  function injectRingGradient() {
    const svg = document.querySelector('.ring-svg')
    if (!svg) return
    const cs = getComputedStyle(document.documentElement)
    const c1 = cs.getPropertyValue('--primary').trim() || '#7c5cfc'
    const c2 = cs.getPropertyValue('--accent').trim() || '#3b82f6'

    const ns = 'http://www.w3.org/2000/svg'
    const defs = document.createElementNS(ns, 'defs')
    const grad = document.createElementNS(ns, 'linearGradient')
    grad.setAttribute('id', 'ring-gradient')
    grad.setAttribute('x1', '0%')
    grad.setAttribute('y1', '0%')
    grad.setAttribute('x2', '100%')
    grad.setAttribute('y2', '0%')

    const s1 = document.createElementNS(ns, 'stop')
    s1.setAttribute('offset', '0%')
    s1.setAttribute('stop-color', c1)
    const s2 = document.createElementNS(ns, 'stop')
    s2.setAttribute('offset', '100%')
    s2.setAttribute('stop-color', c2)

    grad.appendChild(s1)
    grad.appendChild(s2)
    defs.appendChild(grad)
    svg.prepend(defs)
  }

  // ==================== Hash 路由 ====================

  function getPageFromHash() {
    let h = location.hash || '#/'
    h = h.replace(/^#/, '')
    if (h === '' || h === '/') return 'home'
    const seg = h.replace(/^\//, '').split('/')[0]
    if (PAGES.includes(seg) && seg !== 'home') return seg
    return 'home'
  }

  function setHashForPage(page) {
    const path = page === 'home' ? '#/' : '#/' + page
    if (location.hash !== path) {
      history.replaceState(null, '', path)
    }
  }

  function showPage(page, skipHash) {
    if (!PAGES.includes(page)) page = 'home'
    const oldPage = currentPage
    currentPage = page
    if (!skipHash) setHashForPage(page)

    const pages = document.querySelectorAll('.page[data-page]')
    pages.forEach((el) => {
      if (el.dataset.page === oldPage && oldPage !== page) {
        el.classList.add('page--exit')
        el.classList.remove('page--active', 'page--enter')
        const onEnd = () => {
          el.style.display = 'none'
          el.classList.remove('page--exit')
          el.removeEventListener('animationend', onEnd)
        }
        el.addEventListener('animationend', onEnd)
        setTimeout(onEnd, 350)
      }
    })

    const target = document.querySelector(`.page[data-page="${page}"]`)
    if (target) {
      target.style.display = ''
      target.classList.add('page--active', 'page--enter')
      target.classList.remove('page--exit')
      const onEnd = () => {
        target.classList.remove('page--enter')
        target.removeEventListener('animationend', onEnd)
      }
      target.addEventListener('animationend', onEnd)
      setTimeout(onEnd, 400)
    }

    updateNavActive(page)

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' })
      if (page === 'home' && chartInstance) chartInstance.resize()
      refreshFadeUp()
    })
  }

  function initRouter() {
    if (!location.hash || location.hash === '#') {
      history.replaceState(null, '', '#/')
    }
    const initial = getPageFromHash()
    document.querySelectorAll('.page[data-page]').forEach((el) => {
      const isActive = el.dataset.page === initial
      el.style.display = isActive ? '' : 'none'
      el.classList.toggle('page--active', isActive)
    })
    currentPage = initial
    updateNavActive(initial)

    window.addEventListener('hashchange', () => {
      showPage(getPageFromHash(), true)
    })
  }

  // ==================== 导航 ====================

  function initNavigation() {
    initRailIndicator()

    document.querySelectorAll('.icon-rail__item[href^="#"]').forEach((a) => {
      a.addEventListener('click', () => {
        setTimeout(updateRailIndicator, 50)
      })
    })

    document.querySelectorAll('.tab-bar__item[href^="#"]').forEach((a) => {
      a.addEventListener('click', () => {
        setTimeout(() => updateNavActive(currentPage), 50)
      })
    })
  }

  function updateNavActive(page) {
    document.querySelectorAll('.icon-rail__item[data-page]').forEach((el) => {
      el.classList.toggle('active', el.dataset.page === page)
    })
    document.querySelectorAll('.tab-bar__item[data-page]').forEach((el) => {
      el.classList.toggle('active', el.dataset.page === page)
    })
    updateRailIndicator()
  }

  function initRailIndicator() {
    requestAnimationFrame(updateRailIndicator)
  }

  function updateRailIndicator() {
    const indicator = document.getElementById('rail-indicator')
    const activeItem = document.querySelector('.icon-rail__item.active')
    if (!indicator || !activeItem) return

    const nav = document.querySelector('.icon-rail__nav')
    if (!nav) return

    const navRect = nav.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    const top = itemRect.top - navRect.top + (itemRect.height - 28) / 2

    indicator.style.top = top + 'px'
  }

  // ==================== Fade up ====================

  function refreshFadeUp() {
    const active = document.querySelector('.page.page--active')
    if (!active) return
    active.querySelectorAll('.fade-up').forEach((el) => {
      el.classList.add('visible')
    })
  }

  // ==================== 站点信息 ====================

  async function loadSiteInfo() {
    try {
      const res = await McApi.get('/site/info')
      siteInfo = res.data.settings || {}
      features = res.data.features || {}
      const ts = res.data.theme_settings || {}
      const cs = res.data.content_settings || {} // 独立内容配置
      const serverList = res.data.servers || []   // 多服务器列表

      // g() 优先读主题设置 → 全局设置 → 内容配置
      const g = (key) => ts[key] || siteInfo[key] || cs[key] || ''

      const siteName = siteInfo.site_name || CONFIG.SITE_NAME
      document.title = siteName
      try { localStorage.setItem('mc_site_name', siteName) } catch (e) {}

      const logo = document.getElementById('nav-logo')
      if (logo) logo.setAttribute('title', siteName)

      const heroTitle = document.getElementById('hero-title')
      if (heroTitle) heroTitle.textContent = g('hero_title') || siteInfo.site_description || '欢迎来到服务器'

      const addr = document.getElementById('server-address')
      if (addr) addr.textContent = g('server_address_display') || '—'

      const footerBrand = document.getElementById('footer-text')
      if (footerBrand) footerBrand.textContent = siteName
      const footerCopy = document.getElementById('footer-copyright')
      const customCopyright = g('footer_copyright')
      if (footerCopy) {
        footerCopy.textContent = customCopyright || `© ${new Date().getFullYear()} All rights reserved.`
      }

      const icpNum = g('icp_number')
      const icpLink = g('icp_link')
      const icp = document.getElementById('footer-icp')
      const metaDot = document.getElementById('footer-meta-dot')
      if (icp && icpNum) {
        if (icpLink) {
          icp.innerHTML = `<a href="${escapeHtml(icpLink)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;border-bottom:1px dotted currentColor;">${escapeHtml(icpNum)}</a>`
        } else {
          icp.textContent = icpNum
        }
        if (metaDot) metaDot.hidden = false
      } else {
        if (icp) icp.textContent = ''
        if (metaDot) metaDot.hidden = true
      }

      const logoUrl = g('logo_url')
      const logoIcon = document.getElementById('nav-logo-icon')
      const logoImg = document.getElementById('nav-logo-img')
      if (logoUrl && logoImg && logoIcon) {
        logoImg.src = logoUrl
        logoImg.style.display = 'block'
        logoIcon.style.display = 'none'
      }

      const faviconUrl = g('favicon_url')
      if (faviconUrl) {
        let link = document.querySelector('link[rel="icon"]')
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = faviconUrl
      }

      const socialEl = document.getElementById('footer-social')
      if (socialEl) {
        const qqName = g('qq_group_name') || 'QQ 群'
        const qqLink = g('qq_group_link')
        const kookName = g('discord_name') || 'Kook'
        const kookLink = g('discord_link')
        if (qqLink || kookLink) {
          let html = '<div class="footer-col-title">社交</div><div class="footer-col-links">'
          if (qqLink)
            html += `<a class="footer-col-link" href="${escapeHtml(qqLink)}" target="_blank" rel="noopener">${escapeHtml(qqName)}</a>`
          if (kookLink)
            html += `<a class="footer-col-link" href="${escapeHtml(kookLink)}" target="_blank" rel="noopener">${escapeHtml(kookName)}</a>`
          html += '</div>'
          socialEl.innerHTML = html
        }
      }

      // 自定义联系方式
      const contactsEl = document.getElementById('footer-contacts')
      if (contactsEl) {
        const raw = g('custom_contacts')
        if (raw) {
          const lines = raw.split('\n').filter(Boolean)
          const items = []
          lines.forEach((line) => {
            const sep = line.indexOf('|')
            if (sep > 0) {
              const name = line.slice(0, sep).trim()
              const link = line.slice(sep + 1).trim()
              if (name && link) items.push({ name, link })
            }
          })
          if (items.length > 0) {
            let html = '<div class="footer-col-title">更多</div><div class="footer-col-links">'
            items.forEach((item) => {
              html += `<a class="footer-col-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a>`
            })
            html += '</div>'
            contactsEl.innerHTML = html
          }
        }
      }

      // 页脚自定义 HTML
      const footerCustom = document.getElementById('footer-custom-html')
      if (footerCustom) {
        const customHtml = g('footer_custom_html')
        if (customHtml) footerCustom.innerHTML = customHtml
      }

      togglePageNav('gallery', features.gallery)
      togglePageNav('community', !!(features.comment || features.whitelist))

      if (!features.whitelist) {
        const wtab = document.getElementById('ctab-whitelist')
        if (wtab) wtab.style.display = 'none'
      }
      if (!features.comment) {
        const ctab = document.getElementById('ctab-comments')
        if (ctab) ctab.style.display = 'none'
      }
      if (!features.comment && features.whitelist) {
        switchCommunityTab('whitelist')
      }
      if (features.comment && !features.whitelist) {
        switchCommunityTab('comments')
      }

      if (features.player_chart) {
        const cs = document.getElementById('chart-section')
        if (cs) cs.style.display = ''
      }

      applyThemeSettings(ts)
      routeAfterFeatures()
    } catch (e) {
      console.error('加载站点信息失败', e)
    }
  }

  function togglePageNav(page, enabled) {
    document.querySelectorAll(`[data-page="${page}"]`).forEach((el) => {
      if (el.classList.contains('icon-rail__item') || el.classList.contains('tab-bar__item')) {
        el.style.display = enabled ? '' : 'none'
      }
    })
    if (!enabled && currentPage === page) showPage('home')
  }

  function routeAfterFeatures() {
    const p = getPageFromHash()
    if (p === 'gallery' && !features.gallery) showPage('home')
    else if (p === 'community' && !features.comment && !features.whitelist) showPage('home')
    else showPage(p, true)
  }

  function applyThemeSettings(ts) {
    const root = document.documentElement

    const accentKey = ts.accent_color || 'violet'
    const preset = ACCENT_PRESETS[accentKey] || ACCENT_PRESETS.violet
    root.style.setProperty('--primary', preset.primary)
    root.style.setProperty('--primary-light', preset.light)
    root.style.setProperty('--accent', preset.accent)

    const glassIntensity = ts.glass_intensity || 'medium'
    const blurMap = { light: '12px', medium: '20px', heavy: '28px' }
    root.style.setProperty('--glass-blur', blurMap[glassIntensity] || '20px')

    if (ts.card_radius) {
      root.style.setProperty('--radius', ts.card_radius + 'px')
    }

    if (ts.mesh_animation === '0' || ts.mesh_animation === false) {
      const meshBg = document.getElementById('mesh-bg')
      if (meshBg) meshBg.classList.add('mesh-bg--paused')
    }

    const heroStyle = ts.hero_style || 'mesh'
    const heroImg = typeof ts.hero_image === 'string' ? ts.hero_image.trim() : ''
    const heroBg = document.querySelector('.hero-bg')

    if (heroBg) heroBg.style.background = ''

    if (heroStyle === 'image' && heroImg) {
      const imgUrl = heroImg.startsWith('http') ? heroImg : '/' + heroImg.replace(/^\//, '')
      if (heroBg) heroBg.style.background = `url("${imgUrl}") center/cover no-repeat`
      const overlay = ts.hero_overlay || 'light'
      if (overlay !== 'none') {
        const hero = document.getElementById('hero')
        if (hero) {
          hero.querySelectorAll('.hero-overlay-layer').forEach((el) => el.remove())
          const overlayEl = document.createElement('div')
          overlayEl.className = 'hero-overlay-layer'
          overlayEl.style.cssText =
            'position:absolute;inset:0;z-index:0;pointer-events:none;' +
            (overlay === 'dark'
              ? 'background:rgba(0,0,0,0.5);'
              : 'background:rgba(255,255,255,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);')
          hero.insertBefore(overlayEl, heroBg?.nextSibling)
        }
      }
    } else if (heroStyle === 'clean') {
      if (heroBg) heroBg.style.background = 'transparent'
    }

    updateRingGradientColors(preset.primary, preset.accent)

    if (ts.custom_css) {
      const style = document.createElement('style')
      style.textContent = ts.custom_css
      document.head.appendChild(style)
    }

    const customHead = cs.custom_head_html || siteInfo.custom_head_html || ts.custom_head_html || ''
    if (customHead) {
      const div = document.createElement('div')
      div.innerHTML = customHead
      while (div.firstChild) {
        document.head.appendChild(div.firstChild)
      }
    }

    // 注入自定义 CSS
    const customCss = cs.custom_css || ts.custom_css || ''
    if (customCss && customCss !== ts.custom_css) {
      const style = document.createElement('style')
      style.textContent = customCss
      document.head.appendChild(style)
    }

    try { localStorage.setItem('mc_theme_cache', JSON.stringify(ts)) } catch (e) {}

    const preload = document.getElementById('theme-preload')
    if (preload) setTimeout(() => preload.remove(), 800)
  }

  function updateRingGradientColors(c1, c2) {
    const s1 = document.querySelector('#ring-gradient stop:first-child')
    const s2 = document.querySelector('#ring-gradient stop:last-child')
    if (s1) s1.setAttribute('stop-color', c1)
    if (s2) s2.setAttribute('stop-color', c2)
  }

  // ==================== 服务器状态 ====================

  function updateRing(online, max) {
    const fill = document.getElementById('ring-fill')
    if (!fill) return
    const o = Number(online) || 0
    const m = Number(max) || 1
    const pct = Math.min(1, o / m)
    const offset = RING_CIRCUMFERENCE * (1 - pct)
    fill.setAttribute('stroke-dasharray', RING_CIRCUMFERENCE)
    fill.setAttribute('stroke-dashoffset', offset)

    const svg = fill.closest('.ring-svg')
    if (svg) svg.classList.add('animated')
  }

  function animateCountUp(el, target, duration) {
    if (!el) return
    const start = parseInt(el.textContent) || 0
    if (start === target) return
    const startTime = performance.now()
    el.classList.add('counting')

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = Math.round(start + (target - start) * eased)
      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        el.textContent = target
        el.classList.remove('counting')
      }
    }
    requestAnimationFrame(tick)
  }

  async function loadServerStatus() {
    try {
      const res = await McApi.get('/server/status')
      const d = res.data

      const onlineNum = Number(d.online_players) || 0
      const maxNum = Number(d.max_players) || 0

      animateCountUp(document.getElementById('hero-online'), onlineNum, 800)
      animateCountUp(document.getElementById('hero-max'), maxNum, 800)
      updateRing(onlineNum, maxNum)

      const motdEl = document.getElementById('hero-motd')
      if (motdEl) {
        if (d.motd && d.motd.includes('§')) {
          motdEl.innerHTML = McUtils.parseMotd(d.motd)
        } else {
          motdEl.textContent = d.motd || '欢迎加入服务器'
        }
      }

      const dot = document.querySelector('.status-dot')
      const text = document.getElementById('hero-status-text')
      if (d.is_online) {
        if (dot) dot.classList.add('online')
        if (text) text.textContent = '在线'
      } else {
        if (dot) dot.classList.remove('online')
        if (text) text.textContent = '离线'
      }

      const so = document.getElementById('stat-online')
      if (so) so.textContent = `${d.online_players} / ${d.max_players}`
      const sv = document.getElementById('stat-version')
      if (sv) sv.textContent = d.version || '-'
      const sl = document.getElementById('stat-latency')
      if (sl) sl.textContent = d.latency_ms != null ? `${d.latency_ms}ms` : '-'
      const sq = document.getElementById('stat-querytime')
      if (sq) sq.textContent = d.query_time ? McUtils.formatDate(d.query_time, 'HH:mm:ss') : '-'

      const plSection = document.getElementById('player-list-section')
      const plContainer = document.getElementById('player-list')
      if (d.player_list && d.player_list.length > 0 && features.player_list) {
        if (plSection) plSection.style.display = ''
        if (plContainer)
          plContainer.innerHTML = d.player_list
            .map((name) => `<span class="player-tag">${escapeHtml(name)}</span>`)
            .join('')
      } else {
        if (plSection) plSection.style.display = 'none'
      }
    } catch (e) {
      console.error('加载状态失败', e)
    }
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
      if (!chartDom) return

      chartInstance = echarts.init(chartDom)
      const cs = getComputedStyle(document.documentElement)
      const primary = cs.getPropertyValue('--primary').trim() || '#7c5cfc'
      const accent = cs.getPropertyValue('--accent').trim() || '#3b82f6'
      const muted = cs.getPropertyValue('--text-muted').trim() || '#94a3b8'

      chartInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderColor: 'rgba(0,0,0,0.06)',
          borderWidth: 1,
          textStyle: { color: '#1e1e2e', fontSize: 13 },
          extraCssText: 'backdrop-filter:blur(12px);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.08);',
        },
        grid: { left: 48, right: 16, top: 16, bottom: 36 },
        xAxis: {
          type: 'category',
          data: points.map((p) => {
            const d = new Date(p.time)
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          }),
          axisLabel: { color: muted, fontSize: 11 },
          axisLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } },
          axisLabel: { color: muted, fontSize: 11 },
        },
        series: [
          {
            name: '平均在线',
            type: 'line',
            data: points.map((p) => p.avg_players),
            smooth: 0.4,
            symbol: 'circle',
            symbolSize: 6,
            showSymbol: false,
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: primary + '25' },
                  { offset: 1, color: 'transparent' },
                ],
              },
            },
            lineStyle: { width: 2.5, color: primary },
            itemStyle: { color: accent, borderColor: '#fff', borderWidth: 2 },
          },
        ],
      })
      window.addEventListener('resize', () => chartInstance && chartInstance.resize())
    } catch (e) {
      console.error('加载图表失败', e)
    }
  }

  // ==================== 图集 ====================

  async function loadGallery(append) {
    if (!features.gallery) return
    try {
      const res = await McApi.get('/gallery', {
        page: galleryPage,
        per_page: 12,
        category_id: galleryCategory || undefined,
      })
      const items = res.data || []
      galleryTotal = res.meta?.total || 0
      const grid = document.getElementById('gallery-grid')
      if (!grid) return
      if (!append) grid.innerHTML = ''

      items.forEach((img) => {
        const div = document.createElement('div')
        div.className = 'gallery-item fade-up'
        const src = McUtils.getStorageUrl(img.thumb_path || img.file_path)
        const fullSrc = McUtils.getStorageUrl(img.file_path)
        div.innerHTML = `
          <img src="${src}" alt="${escapeHtml(img.title || '')}" loading="lazy" data-full="${fullSrc}" />
          ${img.title ? `<div class="gallery-item-title">${escapeHtml(img.title)}</div>` : ''}
        `
        div.addEventListener('click', () => {
          const allImgs = Array.from(grid.querySelectorAll('img')).map((i) => i.dataset.full)
          const idx = allImgs.indexOf(fullSrc)
          McLightbox.open(allImgs, idx >= 0 ? idx : 0)
        })
        grid.appendChild(div)
      })

      const moreBtn = document.getElementById('gallery-more')
      if (moreBtn) moreBtn.style.display = galleryPage * 12 < galleryTotal ? 'block' : 'none'

      if (!append) loadGalleryCategories()
      refreshFadeUp()
    } catch (e) {
      console.error('加载图集失败', e)
    }
  }

  async function loadGalleryCategories() {
    try {
      const res = await McApi.get('/gallery/categories')
      const cats = res.data || []
      const container = document.getElementById('gallery-categories')
      if (!container) return
      let html = `<button type="button" class="cat-btn ${!galleryCategory ? 'active' : ''}" data-cat="">全部</button>`
      cats.forEach((c) => {
        html += `<button type="button" class="cat-btn ${String(galleryCategory) === String(c.id) ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`
      })
      container.innerHTML = html
      container.querySelectorAll('.cat-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          galleryCategory = btn.dataset.cat
          galleryPage = 1
          loadGallery()
        })
      })
    } catch (e) {}
  }

  // ==================== 动态 ====================

  async function loadNews(append) {
    try {
      const params = { page: newsPage, per_page: 8 }
      if (newsCategory) params.category_id = newsCategory
      const res = await McApi.get('/posts', params)
      const items = res.data || []
      newsTotal = res.meta?.total || 0
      const list = document.getElementById('news-list')
      if (!list) return

      if (!append) list.innerHTML = ''

      if (items.length === 0 && !append) {
        list.innerHTML = '<p class="empty-text">暂无动态</p>'
        return
      }

      items.forEach((post) => {
        const div = document.createElement('div')
        div.className = 'fade-up'
        const summary = McUtils.truncate(McUtils.stripHtml(post.content), 120)
        div.innerHTML = `
          <article class="news-card" data-id="${post.id}">
            ${post.cover_image ? `<div class="news-cover"><img src="${McUtils.getStorageUrl(post.cover_image)}" alt="" loading="lazy" /></div>` : ''}
            <h3 class="news-title">${post.is_pinned ? '<span class="pin-tag">置顶</span>' : ''}${escapeHtml(post.title)}</h3>
            <p class="news-summary">${escapeHtml(summary)}</p>
            <div class="news-meta">
              ${post.category?.name ? `<span class="post-cat-tag">${escapeHtml(post.category.name)}</span>` : ''}
              <span>${escapeHtml(post.author?.nickname || '')}</span>
              <span>${McUtils.formatDate(post.published_at)}</span>
            </div>
          </article>
        `
        div.querySelector('.news-card').addEventListener('click', () => showPostDetail(post.id))
        list.appendChild(div)
      })

      const moreBtn = document.getElementById('news-more')
      if (moreBtn) moreBtn.style.display = newsPage * 8 < newsTotal ? 'block' : 'none'

      if (!append) loadNewsCategories()
      refreshFadeUp()
    } catch (e) {
      console.error('加载动态失败', e)
    }
  }

  async function loadNewsCategories() {
    try {
      const res = await McApi.get('/posts/categories')
      const cats = res.data || []
      const container = document.getElementById('news-categories')
      if (!container || cats.length === 0) {
        if (container) container.style.display = 'none'
        return
      }
      container.style.display = ''
      let html = `<button type="button" class="cat-btn ${!newsCategory ? 'active' : ''}" data-cat="">全部</button>`
      cats.forEach((c) => {
        html += `<button type="button" class="cat-btn ${String(newsCategory) === String(c.id) ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`
      })
      container.innerHTML = html
      container.querySelectorAll('.cat-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          newsCategory = btn.dataset.cat
          newsPage = 1
          loadNews()
        })
      })
    } catch (e) {}
  }

  async function showPostDetail(id) {
    try {
      const res = await McApi.get('/posts/' + id)
      const post = res.data
      document.getElementById('post-detail-title').textContent = post.title
      const catName = post.category?.name || ''
      document.getElementById('post-detail-meta').innerHTML = `
        ${catName ? `<span class="post-cat-tag">${escapeHtml(catName)}</span>` : ''}
        <span>${escapeHtml(post.author?.nickname || '')}</span> · <span>${McUtils.formatDate(post.published_at)}</span>
      `
      document.getElementById('post-detail-body').innerHTML = post.content
      const scroll = document.querySelector('#post-modal .modal-scroll')
      if (scroll) scroll.scrollTop = 0
      openModal('post-modal')
    } catch (e) {
      McToast.error('加载失败')
    }
  }

  function openModal(id) {
    const modal = document.getElementById(id)
    if (!modal) return
    modal.style.display = 'flex'
    modal.classList.remove('modal--closing')
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add('modal--visible'))
    })
  }

  function closeModal(id) {
    const modal = document.getElementById(id)
    if (!modal || !modal.classList.contains('modal--visible')) return
    modal.classList.add('modal--closing')
    modal.classList.remove('modal--visible')
    let done = false
    const onEnd = () => {
      if (done) return
      done = true
      modal.removeEventListener('transitionend', onEnd)
      modal.style.display = 'none'
      modal.classList.remove('modal--closing')
      document.body.style.overflow = ''
    }
    modal.addEventListener('transitionend', onEnd)
    setTimeout(onEnd, 450)
  }

  // ==================== 留言 ====================

  async function loadComments() {
    if (!features.comment) return
    try {
      const res = await McApi.get('/comments', { per_page: 50 })
      const items = res.data || []
      const track = document.getElementById('comment-list')
      if (!track) return

      if (items.length === 0) {
        track.innerHTML = '<p class="empty-text" style="margin:0">暂无留言，快来留下第一条吧</p>'
        return
      }

      track.innerHTML = items.map(buildCommentCard).join('')
    } catch (e) {
      console.error('加载留言失败', e)
    }
  }

  function buildCommentCard(c) {
    const nick = escapeHtml(c.nickname)
    const reply = c.admin_reply
      ? `<div class="comment-card__reply"><strong>管理员：</strong>${escapeHtml(c.admin_reply)}</div>`
      : ''
    return `<div class="comment-card">
      <div class="comment-card__head">
        <span class="comment-card__name">${nick}</span>
        <span class="comment-card__time">${McUtils.formatDate(c.created_at, 'MM-DD HH:mm')}</span>
      </div>
      <div class="comment-card__text">${escapeHtml(c.content)}</div>
      ${reply}
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
      if (!nickname || !content) {
        McToast.warning('请填写昵称和留言内容')
        return
      }
      try {
        await McApi.post('/comments', { nickname, email, content, _hp: hp, _ts: ts })
        McToast.success('留言提交成功，等待审核')
        form.reset()
        if (tsEl) tsEl.value = String(Date.now())
      } catch (err) {
        McToast.error(err.message || '提交失败')
      }
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
      if (!player_name) {
        McToast.warning('请填写游戏ID')
        return
      }
      try {
        await McApi.post('/whitelist/apply', { player_name, platform, contact, reason, _hp: hp, _ts: ts })
        McToast.success('申请已提交，等待审核')
        form.reset()
        if (wlTsEl) wlTsEl.value = String(Date.now())
      } catch (err) {
        McToast.error(err.message || '提交失败')
      }
    })

    document.getElementById('wl-check-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('wl-check-name').value.trim()
      if (!name) return McToast.warning('请输入游戏ID')
      try {
        const res = await McApi.get('/whitelist/check/' + encodeURIComponent(name))
        const d = res.data
        const resultDiv = document.getElementById('wl-check-result')
        const statusMap = {
          pending:   { text: '待审核', cls: 'status-pending' },
          approved:  { text: '已通过', cls: 'status-approved' },
          rejected:  { text: '已拒绝', cls: 'status-rejected' },
          not_found: { text: '未找到申请记录', cls: 'status-notfound' },
        }
        const s = statusMap[d.status] || statusMap.not_found
        resultDiv.innerHTML = `
          <div class="check-result ${s.cls}">
            <span>状态：${s.text}</span>
            ${d.admin_note ? `<p>备注：${escapeHtml(d.admin_note)}</p>` : ''}
            ${d.created_at ? `<p>提交时间：${McUtils.formatDate(d.created_at)}</p>` : ''}
          </div>
        `
      } catch (err) {
        McToast.error('查询失败')
      }
    })
  }

  function initCommunityTabs() {
    document.querySelectorAll('.community-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        switchCommunityTab(tab.dataset.pane)
      })
    })
  }

  function switchCommunityTab(pane) {
    document.querySelectorAll('.community-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.pane === pane)
    })
    document.querySelectorAll('.community-pane').forEach((p) => {
      const show = p.dataset.pane === pane
      p.classList.toggle('active', show)
      p.style.display = show ? '' : 'none'
    })
  }

  // ==================== 复制 / 弹窗 / 加载更多 ====================

  function initCopyBtn() {
    document.getElementById('copy-btn')?.addEventListener('click', () => {
      const addr = document.getElementById('server-address').textContent
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(addr).then(() => McToast.success('地址已复制'))
      } else {
        const ta = document.createElement('textarea')
        ta.value = addr
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        McToast.success('地址已复制')
      }
    })
  }

  function initModalHandlers() {
    document.getElementById('post-modal-close')?.addEventListener('click', () => closeModal('post-modal'))
    document.querySelector('#post-modal .modal-overlay')?.addEventListener('click', () => closeModal('post-modal'))
  }

  function initLoadMore() {
    document.getElementById('gallery-load-more')?.addEventListener('click', () => {
      galleryPage++
      loadGallery(true)
    })
    document.getElementById('news-load-more')?.addEventListener('click', () => {
      newsPage++
      loadNews(true)
    })
  }

  // ==================== 友链 ====================

  async function loadFriendLinks() {
    try {
      const res = await McApi.get('/friend-links')
      const links = res.data || []
      const container = document.getElementById('footer-links')
      if (!container || links.length === 0) return
      let html = '<div class="footer-col-title">友情链接</div><div class="footer-col-links">'
      links.forEach((link) => {
        html += `<a class="footer-col-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener" title="${escapeHtml(link.description || '')}">${escapeHtml(link.name)}</a>`
      })
      html += '</div>'
      container.innerHTML = html
    } catch (e) {}
  }

  function escapeHtml(str) {
    if (!str) return ''
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
    return String(str).replace(/[&<>"']/g, (c) => map[c])
  }

  document.addEventListener('DOMContentLoaded', init)
})()
