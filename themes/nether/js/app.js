/**
 * Nether Forge — 地狱熔炉主题
 */
;(function () {
  'use strict'

  const ACCENT_PRESETS = {
    lava: { primary: '#ff6b35', accent: '#3ecfcf' },
    soul: { primary: '#3ecfcf', accent: '#ff6b35' },
    redstone: { primary: '#ff4444', accent: '#3ecfcf' },
  }

  const PAGES = ['home', 'gallery', 'news', 'community']

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
    initRouter()
    initNavbar()
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
    initScrollAnimations()
    refreshFadeUpInActivePage()
    if (typeof lucide !== 'undefined') lucide.createIcons()
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

    document.querySelectorAll('.page[data-page]').forEach((el) => {
      const isActive = el.dataset.page === page
      el.style.display = isActive ? '' : 'none'
      el.classList.toggle('page--active', isActive)
    })

    document.querySelectorAll('.nether-nav__link[data-page]').forEach((slot) => {
      slot.classList.toggle('active', slot.dataset.page === page)
    })

    currentPage = page
    if (!skipHash) setHashForPage(page)

    window.requestAnimationFrame(() => {
      if (page === 'home' && chartInstance) chartInstance.resize()
      refreshFadeUpInActivePage()
    })
  }

  function initRouter() {
    if (!location.hash || location.hash === '#') {
      history.replaceState(null, '', '#/')
    }
    showPage(getPageFromHash(), true)

    window.addEventListener('hashchange', () => {
      showPage(getPageFromHash(), true)
    })
  }

  function initNavbar() {
    const toggle = document.getElementById('nav-toggle')
    const links = document.querySelector('.nether-nav__links')

    toggle?.addEventListener('click', () => {
      const open = !links?.classList.contains('active')
      links?.classList.toggle('active', open)
      toggle.classList.toggle('active', open)
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    })

    document.querySelectorAll('.nether-nav__link[href^="#"]').forEach((a) => {
      a.addEventListener('click', () => {
        links?.classList.remove('active')
        toggle?.classList.remove('active')
        toggle?.setAttribute('aria-expanded', 'false')
      })
    })

    window.addEventListener('scroll', () => {
      const navbar = document.getElementById('navbar')
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 24)
    })
  }

  function refreshFadeUpInActivePage() {
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
      const g = (key) => ts[key] || siteInfo[key] || ''

      const siteName = siteInfo.site_name || CONFIG.SITE_NAME
      document.title = siteName
      const logo = document.getElementById('nav-logo')
      if (logo) logo.textContent = siteName
      try {
        localStorage.setItem('mc_site_name', siteName)
      } catch (e) {}

      const heroTitle = document.getElementById('hero-title')
      if (heroTitle) heroTitle.textContent = siteInfo.site_description || '欢迎来到服务器'

      const addr = document.getElementById('server-address')
      if (addr) addr.textContent = g('server_address_display') || '—'

      const footerBrand = document.getElementById('footer-text')
      if (footerBrand) footerBrand.textContent = siteName
      const footerCopy = document.getElementById('footer-copyright')
      if (footerCopy) footerCopy.textContent = `© ${new Date().getFullYear()} All rights reserved.`

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
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = faviconUrl
      }

      const socialEl = document.getElementById('footer-social')
      if (socialEl) {
        const qqGroup = g('qq_group')
        const discord = g('discord_link')
        if (qqGroup || discord) {
          let html = '<div class="footer-col-title">社交</div><div class="footer-col-links">'
          if (qqGroup)
            html += `<a class="footer-col-link" href="https://qm.qq.com/q/${escapeHtml(qqGroup)}" target="_blank" rel="noopener">QQ 群: ${escapeHtml(qqGroup)}</a>`
          if (discord)
            html += `<a class="footer-col-link" href="${escapeHtml(discord)}" target="_blank" rel="noopener">Discord</a>`
          html += '</div>'
          socialEl.innerHTML = html
        }
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
    const slot = document.querySelector('.nether-nav__link[data-page="' + page + '"]')
    if (slot) slot.style.display = enabled ? '' : 'none'
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
    const hero = document.querySelector('.hero')
    const heroBg = document.querySelector('.hero-bg')

    const accentKey = ts.accent_color || 'lava'
    const preset = ACCENT_PRESETS[accentKey] || ACCENT_PRESETS.lava
    root.style.setProperty('--primary', preset.primary)
    root.style.setProperty('--accent', preset.accent)

    const intensity = ts.lava_intensity || 'medium'
    if (heroBg) {
      heroBg.classList.remove('lava--low', 'lava--medium', 'lava--high')
      heroBg.classList.add('lava--' + intensity)
    }

    function setHeroDarkText() {
      if (!hero) return
      hero.style.setProperty('--hero-text', '#f0f0f0')
      hero.style.setProperty('--hero-text-sub', '#b8b4bc')
      hero.style.setProperty('--hero-text-muted', '#7a7680')
      hero.style.setProperty('--hero-addr-bg', 'rgba(0,0,0,0.45)')
      hero.style.setProperty('--hero-addr-border', 'rgba(255,107,53,0.2)')
      hero.style.setProperty('--hero-btn-bg', preset.primary)
      hero.style.setProperty('--hero-btn-color', '#0d0d0f')
      hero.classList.add('hero--dark')
      hero.classList.remove('hero--light')
      const navbar = document.getElementById('navbar')
      if (navbar) navbar.classList.add('navbar--dark')
    }

    const heroImg = typeof ts.hero_image === 'string' ? ts.hero_image.trim() : ''
    const rawStyle = ts.hero_style != null && ts.hero_style !== '' ? String(ts.hero_style) : 'lava'
    const heroStyle = heroImg ? 'image' : rawStyle

    document.querySelectorAll('.hero-overlay-layer').forEach((el) => el.remove())

    if (heroBg) {
      heroBg.classList.remove('hero-bg--lava')
      heroBg.style.background = ''
    }

    if (heroStyle === 'image' && heroImg) {
      const imgUrl = heroImg.startsWith('http') ? heroImg : '/' + heroImg.replace(/^\//, '')
      if (heroBg) heroBg.style.background = `url("${imgUrl}") center/cover no-repeat`
      const overlay = ts.hero_overlay || 'dark'
      if (overlay !== 'none' && hero && heroBg) {
        const overlayEl = document.createElement('div')
        overlayEl.className = 'hero-overlay-layer'
        overlayEl.style.cssText =
          'position:absolute;inset:0;z-index:0;pointer-events:none;' +
          (overlay === 'dark' ? 'background:rgba(0,0,0,0.55);' : 'background:rgba(255,255,255,0.12);')
        hero.insertBefore(overlayEl, heroBg.nextSibling)
      }
      setHeroDarkText()
    } else if (heroStyle === 'abyss') {
      if (heroBg) heroBg.style.background = 'linear-gradient(180deg,#050508 0%,#0d0d0f 50%,#12121a 100%)'
      setHeroDarkText()
    } else {
      if (heroBg) heroBg.classList.add('hero-bg--lava')
      setHeroDarkText()
    }

    if (ts.title_animation === '0' || ts.title_animation === false) {
      const title = document.getElementById('hero-title')
      if (title) title.classList.add('no-shimmer')
    }

    if (ts.card_radius) {
      root.style.setProperty('--radius', ts.card_radius + 'px')
    }

    if (ts.custom_css) {
      const style = document.createElement('style')
      style.textContent = ts.custom_css
      document.head.appendChild(style)
    }

    try {
      localStorage.setItem('mc_theme_cache', JSON.stringify(ts))
    } catch (e) {}

    const heroBgEl = document.querySelector('.hero-bg')
    const navbarEl = document.getElementById('navbar')
    if (heroBgEl) {
      requestAnimationFrame(() => {
        heroBgEl.classList.add('reveal')
        if (navbarEl) navbarEl.classList.add('reveal')
      })
    }
    const preload = document.getElementById('theme-preload')
    if (preload) setTimeout(() => preload.remove(), 1000)
  }

  // ==================== 服务器状态 ====================

  function updateLavaGauge(online, max) {
    const fill = document.getElementById('lava-fill')
    if (!fill) return
    const o = Number(online) || 0
    const m = Number(max) || 1
    const pct = Math.min(100, Math.max(6, (o / m) * 100))
    fill.style.height = pct + '%'
  }

  async function loadServerStatus() {
    try {
      const res = await McApi.get('/server/status')
      const d = res.data

      const ho = document.getElementById('hero-online')
      const hm = document.getElementById('hero-max')
      if (ho) ho.textContent = d.online_players
      if (hm) hm.textContent = d.max_players

      updateLavaGauge(d.online_players, d.max_players)

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
        if (dot) {
          dot.style.background = 'var(--primary)'
          dot.style.boxShadow = '0 0 10px var(--primary)'
        }
        if (text) text.textContent = '在线'
      } else {
        if (dot) {
          dot.style.background = '#888'
          dot.style.boxShadow = 'none'
        }
        if (text) text.textContent = '离线'
      }

      const heroContent = document.querySelector('.hero-content')
      if (heroContent && !heroContent.classList.contains('ready')) {
        heroContent.classList.add('ready')
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
          plContainer.innerHTML = d.player_list.map((name) => `<span class="player-tag">${escapeHtml(name)}</span>`).join('')
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
      const primary = cs.getPropertyValue('--primary').trim() || '#ff6b35'
      const accent = cs.getPropertyValue('--accent').trim() || '#3ecfcf'
      const muted = cs.getPropertyValue('--text-muted').trim() || '#5e5a66'

      chartInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(13,13,15,0.92)',
          borderColor: 'rgba(255,107,53,0.3)',
          textStyle: { color: '#e8e4e0' },
        },
        grid: { left: 48, right: 16, top: 16, bottom: 36 },
        xAxis: {
          type: 'category',
          data: points.map((p) => {
            const d = new Date(p.time)
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          }),
          axisLabel: { color: muted },
          axisLine: { lineStyle: { color: 'rgba(255,107,53,0.15)' } },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: 'rgba(255,107,53,0.08)' } },
          axisLabel: { color: muted },
        },
        series: [
          {
            name: '平均在线',
            type: 'line',
            data: points.map((p) => p.avg_players),
            smooth: true,
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: primary + '55' },
                  { offset: 1, color: 'transparent' },
                ],
              },
            },
            lineStyle: { width: 2, color: primary },
            itemStyle: { color: primary },
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
      refreshFadeUpInActivePage()
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

  // ==================== 动态（时间轴） ====================

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

      let wrap = list.querySelector('.timeline-wrap')
      if (!wrap) {
        wrap = document.createElement('div')
        wrap.className = 'timeline-wrap'
        list.appendChild(wrap)
      }

      items.forEach((post) => {
        const div = document.createElement('div')
        div.className = 'timeline-item fade-up'
        const summary = McUtils.truncate(McUtils.stripHtml(post.content), 120)
        div.innerHTML = `
          <div class="timeline-node" aria-hidden="true"></div>
          <article class="timeline-card news-card" data-id="${post.id}">
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
        div.querySelector('.timeline-card').addEventListener('click', () => showPostDetail(post.id))
        wrap.appendChild(div)
      })

      const moreBtn = document.getElementById('news-more')
      if (moreBtn) moreBtn.style.display = newsPage * 8 < newsTotal ? 'block' : 'none'

      if (!append) loadNewsCategories()
      refreshFadeUpInActivePage()
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

  // ==================== 留言（聊天气泡） ====================

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

      track.innerHTML = items.map(buildChatLine).join('')
    } catch (e) {
      console.error('加载留言失败', e)
    }
  }

  function buildChatLine(c) {
    const nick = escapeHtml(c.nickname)
    const reply = c.admin_reply
      ? `<div class="chat-reply"><strong>管理员：</strong>${escapeHtml(c.admin_reply)}</div>`
      : ''
    return `<div class="chat-line">
      <span class="chat-name">&lt;${nick}&gt;</span>
      <span class="chat-time">${McUtils.formatDate(c.created_at, 'MM-DD HH:mm')}</span>
      <span class="chat-text">${escapeHtml(c.content)}</span>
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
          pending: { text: '待审核', cls: 'status-pending' },
          approved: { text: '已通过', cls: 'status-approved' },
          rejected: { text: '已拒绝', cls: 'status-rejected' },
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
        const pane = tab.dataset.pane
        switchCommunityTab(pane)
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

  // ==================== 滚动入场 ====================

  function initScrollAnimations() {
    /* .fade-up 的 .visible 由 refreshFadeUpInActivePage 在路由切换与异步内容加载后统一添加 */
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
