/* ============================================================================
   M-VibeTrip — frontend API layer
   Overrides the demo handlers from the inline script so that:
     • Festival bookings, package quotes and contact messages POST to the server
     • Admin login authenticates against the API (JWT) instead of a hardcoded check
     • Articles / festivals load from the database (with offline fallback to embedded data)
     • The admin panel gains a live "Leads" view of incoming enquiries
   Loaded with `defer`, so it runs after the inline script and the DOM are ready.
   ============================================================================ */
(function () {
  'use strict';

  const API = '';                       // same-origin
  const TOKEN_KEY = 'mvt_admin_token';
  const token = () => sessionStorage.getItem(TOKEN_KEY);

  async function api(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && token()) headers.Authorization = 'Bearer ' + token();
    const res = await fetch(API + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // Collect form controls within a container, in document order.
  function controls(sel) {
    const root = document.querySelector(sel);
    if (!root) return [];
    return Array.from(root.querySelectorAll('input, select, textarea'));
  }
  const val = (el) => (el ? el.value.trim() : '');

  function disable(btn, label) {
    if (!btn) return () => {};
    const prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
    return () => { btn.disabled = false; btn.textContent = prev; };
  }

  /* ── Runtime config (WhatsApp / email) ─────────────────────────── */
  let CONFIG = { whatsapp: '66980791316', email: 'info@m-vibetrip.com' };
  api('/api/config').then((c) => { CONFIG = c; }).catch(() => {});

  /* ── DB-driven content with offline fallback ───────────────────── */
  async function refreshContent() {
    try {
      const arts = await api('/api/content/articles');
      if (Array.isArray(arts) && arts.length && typeof ARTS !== 'undefined') {
        ARTS.length = 0;
        arts.forEach((a) => ARTS.push(a));
        if (typeof renderNews === 'function') renderNews(typeof newsFilter !== 'undefined' ? newsFilter : 'all');
      }
    } catch { /* keep embedded fallback data */ }

    try {
      const fests = await api('/api/content/festivals');
      if (Array.isArray(fests) && fests.length && typeof FESTS !== 'undefined') {
        // Normalise to the shape the inline admin table expects.
        FESTS.length = 0;
        fests.forEach((f) => FESTS.push({
          name: f.name, dates: f.dates,
          price: f.price_from ? '฿' + Number(f.price_from).toLocaleString() : '—',
          venue: f.venue, price_from: f.price_from, id: f.id,
        }));
      }
    } catch { /* ignore */ }
  }
  refreshContent();

  /* ── Festival booking ──────────────────────────────────────────── */
  window.submitFest = async function () {
    const [name, whatsapp, email, tickets, payment, addons, notes] = controls('#festForm');
    const ticketTypeEl = document.querySelector('#festForm .tto.sel .tto-n');
    const ticketPriceEl = document.querySelector('#festForm .tto.sel .tto-p');
    const btn = document.querySelector('#festForm .sbtn-t');

    if (!val(name)) { alert('Please enter your name.'); return; }
    if (!val(email) && !val(whatsapp)) { alert('Please add an email or WhatsApp number.'); return; }

    const restore = disable(btn, 'Sending…');
    try {
      await api('/api/bookings/festival', {
        method: 'POST',
        body: {
          name: val(name), email: val(email), whatsapp: val(whatsapp),
          subject: document.getElementById('festT')?.textContent || 'Festival booking',
          festival: document.getElementById('festT')?.textContent || '',
          event_details: document.getElementById('festS')?.textContent || '',
          ticket_type: val(ticketTypeEl) || (ticketTypeEl?.textContent ?? ''),
          ticket_price: ticketPriceEl?.textContent || '',
          tickets: val(tickets), payment: val(payment), addons: val(addons),
          notes: val(notes),
        },
      });
      document.getElementById('festForm').style.display = 'none';
      document.getElementById('festSucc').style.display = 'block';
    } catch (e) {
      alert('Could not send right now: ' + e.message + '\nYou can also message us on WhatsApp.');
    } finally {
      restore();
    }
  };

  /* ── Package quote ─────────────────────────────────────────────── */
  window.submitPkg = async function () {
    const [name, whatsapp, email, travelDate, groupSize, pkgType, destination, budget, payment, notes] =
      controls('#pkgForm');
    const btn = document.querySelector('#pkgForm .sbtn-g');

    if (!val(name)) { alert('Please enter your name.'); return; }
    if (!val(email) && !val(whatsapp)) { alert('Please add an email or WhatsApp number.'); return; }

    const restore = disable(btn, 'Sending…');
    try {
      await api('/api/bookings/package', {
        method: 'POST',
        body: {
          name: val(name), email: val(email), whatsapp: val(whatsapp),
          subject: document.getElementById('pkgT')?.textContent || 'Package quote',
          travel_date: val(travelDate), group_size: val(groupSize),
          package_type: val(pkgType), destination: val(destination),
          budget: val(budget), payment: val(payment),
          notes: val(notes),
        },
      });
      document.getElementById('pkgForm').style.display = 'none';
      document.getElementById('pkgSucc').style.display = 'block';
    } catch (e) {
      alert('Could not send right now: ' + e.message + '\nYou can also message us on WhatsApp.');
    } finally {
      restore();
    }
  };

  /* ── Real admin login ──────────────────────────────────────────── */
  window.doLogin = async function () {
    const u = document.getElementById('admUser').value.trim();
    const p = document.getElementById('admPass').value.trim();
    const err = document.getElementById('admErr');
    try {
      const { token: t } = await api('/api/admin/login', { method: 'POST', body: { username: u, password: p } });
      sessionStorage.setItem(TOKEN_KEY, t);
      if (typeof closeAdmLogin === 'function') closeAdmLogin();
      document.getElementById('admPanelBg').classList.add('open');
      document.body.style.overflow = 'auto';
      if (typeof renderArtTable === 'function') renderArtTable();
      if (typeof renderFestTable === 'function') renderFestTable();
      ensureLeadsTab();
      loadStats();
      loadLeads();
    } catch (e) {
      if (err) {
        err.textContent = '❌ ' + e.message;
        err.style.display = 'block';
        setTimeout(() => (err.style.display = 'none'), 3000);
      }
    }
  };

  window.doLogout = function () {
    sessionStorage.removeItem(TOKEN_KEY);
    document.getElementById('admPanelBg').classList.remove('open');
  };

  async function loadStats() {
    try {
      const s = await api('/api/admin/stats', { auth: true });
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('dstat-art', s.articles);
      set('dstat-fest', s.festivals);
    } catch { /* ignore */ }
  }

  /* ── Inject a live "Leads" tab into the admin panel ────────────── */
  function ensureLeadsTab() {
    if (document.getElementById('adm-leads')) return;

    const sidebar = document.querySelector('.adm-sidebar');
    if (sidebar) {
      const nav = document.createElement('div');
      nav.className = 'adm-nav';
      nav.textContent = '📥 Leads';
      nav.onclick = function () { swAdm('leads', nav); loadLeads(); };
      sidebar.insertBefore(nav, sidebar.children[1] || null);
    }

    const content = document.querySelector('.adm-content');
    if (content) {
      const pane = document.createElement('div');
      pane.className = 'adm-pane';
      pane.id = 'adm-leads';
      pane.innerHTML =
        '<div class="adm-pane-title">Leads &amp; Enquiries</div>' +
        '<div class="adm-card"><div class="adm-card-title">Incoming Bookings, Quotes &amp; Messages ' +
        '(<span id="lead-cnt">0</span>)</div>' +
        '<table class="adm-table"><thead><tr><th>Date</th><th>Type</th><th>Name</th>' +
        '<th>Contact</th><th>Subject</th><th>Status</th><th></th></tr></thead>' +
        '<tbody id="leadTbody"></tbody></table></div>';
      content.appendChild(pane);
    }
  }

  async function loadLeads() {
    const tbody = document.getElementById('leadTbody');
    if (!tbody) return;
    try {
      const leads = await api('/api/admin/leads', { auth: true });
      const cnt = document.getElementById('lead-cnt');
      if (cnt) cnt.textContent = leads.length;
      tbody.innerHTML = leads.map((l) => {
        const contact = [l.email, l.whatsapp].filter(Boolean).join(' / ') || '—';
        const date = (l.created_at || '').replace('T', ' ').slice(0, 16);
        return '<tr><td>' + date + '</td><td>' + l.type + '</td><td>' + (l.name || '') +
          '</td><td style="font-size:.62rem">' + contact + '</td><td>' + (l.subject || '') +
          '</td><td><span class="abadge ab-live">' + (l.status || 'new') + '</span></td>' +
          '<td><button class="adm-btn-del" data-id="' + l.id + '">Delete</button></td></tr>';
      }).join('') || '<tr><td colspan="7" style="opacity:.5">No leads yet.</td></tr>';

      tbody.querySelectorAll('.adm-btn-del').forEach((b) => {
        b.onclick = async function () {
          if (!confirm('Delete this lead?')) return;
          try { await api('/api/admin/leads/' + b.dataset.id, { method: 'DELETE', auth: true }); loadLeads(); }
          catch (e) { alert(e.message); }
        };
      });
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:#f88">' + e.message + '</td></tr>';
    }
  }

  /* ── Persist admin content additions to the database ───────────── */
  const origAddArticle = window.admAddArticle;
  window.admAddArticle = async function () {
    const body = {
      title: document.getElementById('ain-title')?.value.trim(),
      cat: document.getElementById('ain-cat')?.value,
      rt: document.getElementById('ain-time')?.value.trim(),
      img: document.getElementById('ain-img')?.value.trim(),
      exc: document.getElementById('ain-excerpt')?.value.trim(),
      body: document.getElementById('ain-body')?.value.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      status: 'published',
    };
    if (!body.title) { if (typeof toast === 'function') toast('Title is required.'); return; }
    try {
      await api('/api/admin/articles', { method: 'POST', body, auth: true });
      if (typeof toast === 'function') toast('✓ Article published.');
      await refreshContent();
      if (typeof origAddArticle === 'function') { /* keep client table in sync via reload */ }
      location.reload();
    } catch (e) { if (typeof toast === 'function') toast(e.message); }
  };

  window.admAddFestival = async function () {
    const body = {
      name: document.getElementById('fin-name')?.value.trim(),
      dates: document.getElementById('fin-dates')?.value.trim(),
      venue: document.getElementById('fin-venue')?.value.trim(),
      price_from: Number(document.getElementById('fin-price')?.value) || null,
      status: 'live',
    };
    if (!body.name) { if (typeof toast === 'function') toast('Festival name is required.'); return; }
    try {
      await api('/api/admin/festivals', { method: 'POST', body, auth: true });
      if (typeof toast === 'function') toast('✓ Festival added.');
      location.reload();
    } catch (e) { if (typeof toast === 'function') toast(e.message); }
  };

  window.admAddService = async function () {
    const body = {
      name: document.getElementById('svin-name')?.value.trim(),
      img: document.getElementById('svin-img')?.value.trim(),
      desc: document.getElementById('svin-desc')?.value.trim(),
      features: document.getElementById('svin-feats')?.value.trim(),
      status: 'live',
    };
    if (!body.name) { if (typeof toast === 'function') toast('Service name is required.'); return; }
    try {
      await api('/api/admin/services', { method: 'POST', body, auth: true });
      if (typeof toast === 'function') toast('✓ Service added.');
    } catch (e) { if (typeof toast === 'function') toast(e.message); }
  };

  window.admAddPackage = async function () {
    const body = {
      name: document.getElementById('pin-name')?.value.trim(),
      category: document.getElementById('pin-cat')?.value,
      price_from: Number(document.getElementById('pin-price')?.value) || null,
      group_size: document.getElementById('pin-pax')?.value.trim(),
      desc: document.getElementById('pin-desc')?.value.trim(),
      inclusions: document.getElementById('pin-incl')?.value.trim(),
      status: 'live',
    };
    if (!body.name) { if (typeof toast === 'function') toast('Package name is required.'); return; }
    try {
      await api('/api/admin/packages', { method: 'POST', body, auth: true });
      if (typeof toast === 'function') toast('✓ Package added.');
    } catch (e) { if (typeof toast === 'function') toast(e.message); }
  };
})();
