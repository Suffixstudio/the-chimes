/* ============================================================
   THE CHIMES  ·  shared behavior
   Built by Suffix Studio

   Every page loads this one file. It runs the top menu, the Explore
   dropdown, the inquiry form, the FAQ, the photo viewer, the floating
   button, and the English/Spanish switch.

   Each page supplies its own words by setting these before loading
   this file:
       I18N           the Spanish translations for that page
       I18N_ATTR      Spanish for things like photo captions
       I18N_META      Spanish page title and description (optional)
       MODAL_LABELS   the inquiry form title for each topic
       MODAL_DEFAULT  the fallback form title

   There are two ways a page can carry its Spanish, and this file reads
   both, so a page can use either one:

     1. The I18N list above. Each entry names a spot on the page and the
        Spanish that belongs there.
     2. A data-es label written directly on the tag, which is a Spanish
        sticky note attached to the text it replaces:
             <h2 data-es="Bodas">Weddings</h2>
        Companion labels do the same for things that are not visible text:
             data-es-alt          photo description
             data-es-ph           the gray hint text inside a form field
             data-es-placeholder  same thing, longer spelling
             data-es-aria         the label a screen reader announces
             data-es-aria-label   same thing, longer spelling
             data-es-cap          photo caption in the photo viewer

   Nothing is written to the visitor's browser storage. The page opens in
   English every time.

   If a page does not have a feature (the home page has no photo
   viewer, for example), that section simply does nothing.
   Fix a bug here once and it is fixed on every page.
   ============================================================ */

(function () {
  'use strict';

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Sections fade in as you scroll ---------- */
  (function revealOnScroll() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });

    /* safety net: if nothing has appeared after a moment, just show everything */
    setTimeout(function () {
      if (!$$('.reveal.in').length) items.forEach(function (el) { el.classList.add('in'); });
    }, 600);
  })();

  /* ---------- 1b. Amenity chips deal in one after another ----------
     Only workspace and photo & film have these. Same safety net as above:
     if the animation never fires, the chips still end up visible. */
  (function staggerChips() {
    var wrap = $('#chips');
    if (!wrap) return;
    var chips = $$('.chip', wrap);
    if (!chips.length) return;

    var showAll = function () { chips.forEach(function (c) { c.classList.add('in'); }); };

    if (prefersReducedMotion || !('IntersectionObserver' in window)) { showAll(); return; }

    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        chips.forEach(function (c, i) { setTimeout(function () { c.classList.add('in'); }, i * 55); });
        cio.disconnect();
      });
    }, { threshold: 0.2 });
    cio.observe(wrap);

    setTimeout(showAll, 900);
  })();

  /* ---------- 2. The phone menu and the Explore dropdown ---------- */
  var menuBtn  = $('#menuBtn');
  var navLinks = $('#navLinks');

  function closeMenu() {
    if (!navLinks) return;
    navLinks.classList.remove('open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  }

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
      /* lock the page behind the menu, otherwise it scrolls underneath */
      document.body.classList.toggle('no-scroll', open);
    });
    /* tapping any link closes the menu */
    $$('a', navLinks).forEach(function (a) { a.addEventListener('click', closeMenu); });
  }

  var exploreToggle = $('#exploreToggle');
  var exploreParent = exploreToggle && exploreToggle.closest('.has-dropdown');

  if (exploreToggle && exploreParent) {
    exploreToggle.addEventListener('click', function (e) {
      e.preventDefault();
      var open = exploreParent.classList.toggle('open');
      exploreToggle.setAttribute('aria-expanded', open);
    });
    /* clicking anywhere else closes it */
    document.addEventListener('click', function (e) {
      if (!exploreParent.contains(e.target) && exploreParent.classList.contains('open')) {
        exploreParent.classList.remove('open');
        exploreToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Events and Offices are a link and a dropdown at once ----------
     On a laptop, clicking the word navigated straight to a page before you
     could reach the items underneath, which is why picking Social Events felt
     like it reloaded the venue page. A click now just opens the menu, the way
     More already behaves. Nothing becomes unreachable: the first item under
     each parent goes exactly where the parent used to. On a phone the menu
     panel already lists every item, so the link is left alone there. */
  var navGroups = $$('header.nav .grp');
  function closeNavGroups(except) {
    navGroups.forEach(function (g) {
      if (g === except) return;
      g.classList.remove('open');
      var d = g.querySelector('a.door');
      if (d) d.setAttribute('aria-expanded', 'false');
    });
  }
  navGroups.forEach(function (grp) {
    var door = grp.querySelector('a.door');
    var sub  = grp.querySelector('.sub');
    if (!door || !sub) return;
    door.setAttribute('aria-haspopup', 'true');
    door.setAttribute('aria-expanded', 'false');
    door.addEventListener('click', function (e) {
      /* only on the desktop dropdown, where the submenu floats above the page */
      if (getComputedStyle(sub).position !== 'absolute') return;
      e.preventDefault();
      var opening = !grp.classList.contains('open');
      closeNavGroups(grp);
      grp.classList.toggle('open', opening);
      door.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('header.nav .grp')) closeNavGroups(null);
  });

  /* ---------- 3. FAQ: opening one answer closes the others ---------- */
  $$('.faq-item').forEach(function (item) {
    var q = $('.faq-q', item);
    var a = $('.faq-a', item);
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var wasOpen = item.classList.contains('open');
      $$('.faq-item').forEach(function (other) {
        other.classList.remove('open');
        var oa = $('.faq-a', other), oq = $('.faq-q', other);
        if (oa) oa.style.maxHeight = null;
        if (oq) oq.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- 4. The inquiry form ----------
     Two kinds of page exist, and this handles both:
       - most pages open the form in a pop-up  (#bookModal + #bookForm)
       - workspace and photo & film keep the form on the page (#inqForm)
     A page has one or the other, never both. */
  var modal    = $('#bookModal');
  var form     = $('#bookForm') || $('#inqForm');
  var success  = $('#formSuccess');
  var interest = $('#interest');
  var lastFocus = null;

  /* On Workspace and Photo & Film the form sits inside the pop-up but the
     thank you panel was left further up the page, outside it. Sending
     therefore hid the form and revealed a message behind the overlay, so
     the pop-up just went blank. Move the panel in beside the form. */
  if (form && success) {
    var shell = form.closest('.modal-overlay');
    if (shell && !success.closest('.modal-overlay')) {
      form.parentNode.insertBefore(success, form.nextSibling);
    }
  }

  var LABELS  = window.MODAL_LABELS  || { en: {}, es: {} };
  var DEFAULT = window.MODAL_DEFAULT || { en: '', es: '' };

  function modalTitleFor(topic) {
    var lang = (window.currentLang === 'es') ? 'es' : 'en';
    return (LABELS[lang] && LABELS[lang][topic]) || DEFAULT[lang];
  }

  function openModal(topic) {
    if (!modal) return;
    lastFocus = document.activeElement;
    closeMenu();                                  /* never leave the menu open behind it */
    /* Match the option without caring about capitals. Some pages give their
       options plain-English values like "Shared workspace" while the buttons
       pass "shared workspace", and an exact match quietly preselected nothing,
       so every room button on Coworking and Photo & Film opened a blank form. */
    if (topic && interest) {
      var wanted = String(topic).toLowerCase();
      var hit = null;
      Array.prototype.forEach.call(interest.options, function (o) {
        if (!hit && String(o.value).toLowerCase() === wanted) hit = o.value;
      });
      if (hit !== null) interest.value = hit;     /* preselect what they clicked */
    }
    /* A send leaves the button disabled and reading "Sending...". Nothing
       used to put it back, so opening the form a second time on the same
       page gave you a button you could not press. The label is read off the
       button at send time and stored on it, so it comes back in whichever
       language was showing. */
    if (form) {
      var sb = form.querySelector('[type="submit"], button:not([type="button"])');
      if (sb) {
        sb.disabled = false;
        if (sb.dataset.label) sb.textContent = sb.dataset.label;
      }
      var oldWarn = form.querySelector('#formError');
      if (oldWarn) oldWarn.textContent = '';
    }
    window.currentTopic = topic;
    var title = $('#modalTitle');
    if (title) title.textContent = modalTitleFor(topic);
    if (form) form.style.display = 'block';
    if (success) success.classList.remove('show');
    modal.classList.add('open');
    document.body.classList.add('no-scroll');
    setTimeout(function () { var nm = $('#name'); if (nm) nm.focus(); }, 180);
    if (window.applyFieldRules) window.applyFieldRules();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }

  if (modal) {
    $$('[data-modal-open]').forEach(function (b) {
      b.addEventListener('click', function () { openModal(b.getAttribute('data-interest')); });
    });
    var mClose = $('#modalClose');
    if (mClose) mClose.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

    /* keep keyboard focus inside the form while it is open */
    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('a[href],button:not([disabled]),input,select,textarea', modal)
                .filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* The inquiry form is shared across the whole site, so the guest field has to
     follow what the person actually picked. Asking a tour visitor for a number
     up to 300, or an office tenant for a guest count, reads as careless and
     invites the wrong expectation. */
  var FIELD_RULES = {
    tour:      { guests: { label: 'People in your group', max: 10,  ph: 'Up to 10' }, date: 'Preferred date' },
    group:     { guests: { label: 'People in your group', max: 10,  ph: 'Up to 10' }, date: 'Preferred date' },
    office:    { guests: { label: 'People on your team',  max: 30,  ph: 'How many' }, date: 'Preferred start date' },
    virtual:   { guests: null,                                                        date: 'Preferred start date' },
    travel:    { guests: { label: 'Travelers',            max: 20,  ph: 'Up to 20' }, date: 'Departure date' },
    business:  { guests: { label: 'Travelers',            max: 20,  ph: 'Up to 20' }, date: 'Departure date' },
    donate:    { guests: null,                                                        date: null },
    cultural:  { guests: null,                                                        date: null },
    inkind:    { guests: null,                                                        date: null },
    event:     { guests: { label: 'Estimated guests',     max: 300, ph: 'Up to 300' }, date: 'Preferred date' },
    general:   { guests: null,                                                        date: null }
  };
  var FIELD_WORDS = {
    'People in your group': 'Personas en su grupo',
    'People on your team':  'Personas en su equipo',
    'Travelers':            'Viajeros',
    'Estimated guests':     'Invitados estimados',
    'Preferred date':       'Fecha preferida',
    'Preferred start date': 'Fecha de inicio preferida',
    'Departure date':       'Fecha de salida'
  };

  function ruleFor(value) {
    var v = String(value || '').toLowerCase();
    if (FIELD_RULES[v]) return FIELD_RULES[v];
    if (/tour|scout/.test(v))                 return FIELD_RULES.tour;
    if (/workspace|desk|office|boardroom|meeting|offsite/.test(v)) return FIELD_RULES.office;
    if (/virtual/.test(v))                    return FIELD_RULES.virtual;
    if (/travel|business/.test(v))            return FIELD_RULES.travel;
    if (/donate|inkind|cultural/.test(v))     return FIELD_RULES.donate;
    if (/general|something else|help me choose/.test(v)) return FIELD_RULES.general;
    return FIELD_RULES.event;
  }

  function applyFieldRules() {
    var sel = $('#interest'); if (!sel) return;
    var r = ruleFor(sel.value);
    var es = document.documentElement.lang === 'es';

    var gi = $('#guests');
    if (gi) {
      var gw = gi.closest('.field') || gi.parentNode;
      var gl = document.querySelector('label[for="guests"]');
      if (!r.guests) {
        gw.style.display = 'none';
        gi.value = '';
      } else {
        gw.style.display = '';
        gi.max = r.guests.max;
        gi.placeholder = r.guests.ph;
        if (gl) gl.textContent = es ? (FIELD_WORDS[r.guests.label] || r.guests.label) : r.guests.label;
        if (gi.value && Number(gi.value) > r.guests.max) gi.value = '';
      }
    }

    var di = $('#date');
    if (di) {
      var dw = di.closest('.field') || di.parentNode;
      var dl = document.querySelector('label[for="date"]');
      if (!r.date) {
        dw.style.display = 'none';
        di.value = '';
      } else {
        dw.style.display = '';
        if (dl) dl.textContent = es ? (FIELD_WORDS[r.date] || r.date) : r.date;
      }
    }
  }

  /* the date field must never accept a date in the past. a hardcoded min goes
     stale the day after it is written, so set it fresh on every page load. */
  (function dateMin() {
    var d = $('#date');
    if (!d) return;
    var n = new Date();
    var iso = n.getFullYear() + '-' +
              String(n.getMonth() + 1).padStart(2, '0') + '-' +
              String(n.getDate()).padStart(2, '0');
    d.min = iso;
  })();

  var interestSel = $('#interest');
  if (interestSel) {
    interestSel.addEventListener('change', applyFieldRules);
    applyFieldRules();
  }
  window.applyFieldRules = applyFieldRules;

  /* The More button opens its dropdown on click, and closes on outside click
     or Escape. Hover handles the other doors, so this is only for More. */
  $$('.door-more').forEach(function (btn) {
    var grp = btn.closest('.grp');
    if (!grp) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var open = grp.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function (e) {
    $$('.grp--more.open').forEach(function (g) {
      if (!g.contains(e.target)) {
        g.classList.remove('open');
        var b = $('.door-more', g);
        if (b) b.setAttribute('aria-expanded', 'false');
      }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    $$('.grp--more.open').forEach(function (g) {
      g.classList.remove('open');
      var b = $('.door-more', g);
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  });

  /* On the pages that keep the form on the page, every Inquire button
     carries data-preset. Clicking it picks that topic in the dropdown and
     closes the mobile menu. The link itself scrolls down to the form. */
  $$('[data-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var want = btn.getAttribute('data-preset');
      if (interest) {
        for (var i = 0; i < interest.options.length; i++) {
          var o = interest.options[i];
          if (o.value === want || o.text === want) { interest.selectedIndex = i; break; }
        }
      }
      closeMenu();
    });
  });

  /* ---------- required fields, in whichever language is showing ---------- */
  var VMSG = {
    en: { name:  'Please enter your name.',
          email: 'Please enter a valid email address.',
          phone: 'Please enter a phone number, digits only, 10 to 15 of them.',
          guests: 'Please enter a guest count between {min} and {max}.',
          many:  'Please fill in the highlighted fields.',
          fail:  'That did not send. Please call us, or try again in a moment.' },
    es: { name:  'Por favor escriba su nombre.',
          email: 'Por favor escriba un correo electrónico válido.',
          phone: 'Por favor escriba un teléfono, solo números, de 10 a 15 dígitos.',
          guests: 'Por favor escriba un número de invitados entre {min} y {max}.',
          many:  'Por favor complete los campos marcados.',
          fail:  'No se pudo enviar. Por favor llámenos o inténtelo de nuevo en un momento.' }
  };

  function inquiryProblem(el) {
    var v = (el.value || '').trim();
    if (!v) return el.name;
    if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'email';
    if (el.type === 'tel') {
      var digits = v.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) return 'phone';
    }
    if (el.type === 'number') {
      var n = Number(v);
      var lo = el.min === '' ? -Infinity : Number(el.min);
      var hi = el.max === '' ?  Infinity : Number(el.max);
      if (!isFinite(n) || n !== Math.floor(n) || n < lo || n > hi) return el.name;
    }
    return null;
  }

  /* Stop letters being typed into the phone box at all, rather than only
     complaining after they press send. Digits, spaces, brackets, dashes and a
     leading plus survive, so international numbers still format normally. */
  function guardPhoneField(form) {
    Array.prototype.forEach.call(form.querySelectorAll('input[type="tel"]'), function (el) {
      if (el.dataset.phoneGuarded) return;
      el.dataset.phoneGuarded = '1';
      el.setAttribute('inputmode', 'tel');
      el.setAttribute('maxlength', '20');
      el.addEventListener('input', function () {
        var cleaned = el.value.replace(/[^\d\s()+.\-]/g, '');
        if (cleaned !== el.value) el.value = cleaned;
      });
    });
  }

  /* The guest box only obeyed its own limit when you used the little arrows.
     Typing a number straight in went past it, so anyone could ask for 5000
     guests in an 1887 building. Strip anything that is not a digit, then pull
     the number back inside the limit when they leave the field. */
  function guardGuestField(form) {
    Array.prototype.forEach.call(form.querySelectorAll('input[type="number"]'), function (el) {
      if (el.dataset.numGuarded) return;
      el.dataset.numGuarded = '1';
      el.setAttribute('inputmode', 'numeric');
      el.addEventListener('input', function () {
        var cleaned = el.value.replace(/[^\d]/g, '');
        if (cleaned !== el.value) el.value = cleaned;
      });
      el.addEventListener('blur', function () {
        if (el.value === '') return;
        var n = parseInt(el.value, 10);
        if (isNaN(n)) { el.value = ''; return; }
        if (el.max !== '' && n > Number(el.max)) n = Number(el.max);
        if (el.min !== '' && n < Number(el.min)) n = Number(el.min);
        el.value = String(n);
      });
    });
  }

  function inquiryErrorBox(form) {
    var warn = form.querySelector('#formError');
    if (!warn) {
      warn = document.createElement('p');
      warn.id = 'formError';
      warn.setAttribute('role', 'alert');
      warn.style.cssText = 'margin-top:1rem;color:#8C2D2D;font-weight:600;font-size:.92rem;';
      form.appendChild(warn);
    }
    return warn;
  }

  function validateInquiry(form, focusFirst) {
    var msgs = VMSG[window.currentLang === 'es' ? 'es' : 'en'];
    var bad = [];
    var checkable = form.querySelectorAll('[required], input[type="number"]');
    Array.prototype.forEach.call(checkable, function (el) {
      if (!el.hasAttribute('required') && !(el.value || '').trim()) {
        el.classList.remove('invalid');
        return;
      }
      var problem = inquiryProblem(el);
      if (problem) { bad.push({ el: el, key: problem }); }
      el.classList.toggle('invalid', !!problem);
      el.setAttribute('aria-invalid', problem ? 'true' : 'false');
      if (!el.dataset.watched) {
        el.dataset.watched = '1';
        el.addEventListener('input', function () {
          if (!inquiryProblem(el)) {
            el.classList.remove('invalid');
            el.setAttribute('aria-invalid', 'false');
          }
        });
      }
    });
    var warn = inquiryErrorBox(form);
    if (bad.length) {
      warn.dataset.kind = 'required';
      var text = bad.length > 1 ? msgs.many : (msgs[bad[0].key] || msgs.many);
      text = text.replace('{min}', bad[0].el.min || '1').replace('{max}', bad[0].el.max || '');
      warn.textContent = text;
      if (focusFirst !== false) {
        try { bad[0].el.focus({ preventScroll: false }); } catch (e) { bad[0].el.focus(); }
      }
      return false;
    }
    warn.textContent = '';
    return true;
  }

  /* If an error is already showing when somebody presses ESPAÑOL, redraw it in
     the new language. Without this the page switches but the telling-off does not. */
  window.__refreshInquiryError = function () {
    if (!form) return;
    var warn = form.querySelector('#formError');
    if (!warn || !warn.textContent.trim()) return;
    if (warn.dataset.kind === 'send') {
      warn.textContent = VMSG[window.currentLang === 'es' ? 'es' : 'en'].fail;
    } else {
      validateInquiry(form, false);
    }
  };

  if (form) {
    guardPhoneField(form);
    guardGuestField(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      /* Our own checks, not the browser's. The browser writes its validation
         messages in the phone's language, so a visitor reading the page in
         Spanish on an English handset would get told off in English. These
         follow the toggle instead. */
      if (!validateInquiry(form, true)) return;

      /* Actually send it. This used to just hide the form and say thank you, which
         meant every inquiry anyone ever sent was quietly thrown away. It now posts to
         Netlify, waits for confirmation, and only then says thank you. If the send
         fails, it says so, rather than lying to the person. */
      var btn = form.querySelector('[type="submit"], button:not([type="button"])');
      var label = btn ? btn.textContent : '';
      if (btn) {
        btn.dataset.label = label;              /* so it can be put back */
        btn.disabled = true;
        btn.textContent = (window.currentLang === 'es') ? 'Enviando...'
                                                        : 'Sending...';
      }

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.style.display = 'none';
        form.reset();                    /* so the next inquiry starts blank */
        if (success) success.classList.add('show');
      })
      .catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        var warn = $('#formError');
        if (!warn) {
          warn = document.createElement('p');
          warn.id = 'formError';
          warn.style.cssText = 'margin-top:1rem;color:#8C2D2D;font-weight:600;font-size:.92rem;';
          form.appendChild(warn);
        }
        warn.dataset.kind = 'send';
        warn.textContent = VMSG[window.currentLang === 'es' ? 'es' : 'en'].fail;
      });
    });
  }

  /* ---------- 5. Photo viewer (only on pages that have one) ---------- */
  var lb = $('#lightbox');
  if (lb) {
    var lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbLast = null;

    function openLightbox(src, caption) {
      lbLast = document.activeElement;
      if (lbImg) { lbImg.src = src; lbImg.alt = caption || ''; }
      if (lbCap) lbCap.textContent = caption || '';
      lb.classList.add('open');
      document.body.classList.add('no-scroll');
    }
    function closeLightbox() {
      lb.classList.remove('open');
      document.body.classList.remove('no-scroll');
      if (lbImg) lbImg.src = '';
      if (lbLast) lbLast.focus();
    }

    /* most pages: the photo itself is the button */
    $$('.charm img, .g-tile img').forEach(function (im) {
      im.addEventListener('click', function () {
        openLightbox(im.currentSrc || im.src, im.alt || '');
      });
    });

    /* workspace and photo & film: the photo sits in a card that carries the
       caption, so the whole card is the button. Cards with no photo are skipped. */
    $$('.space-media').forEach(function (card) {
      var im = $('img', card);
      if (!im) return;
      card.addEventListener('click', function () {
        var cap = card.getAttribute('data-cap') || im.alt || '';
        openLightbox(im.currentSrc || im.src, cap);
      });
    });

    var lbClose = $('#lbClose');
    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox();
    });
  }

  /* Escape also closes the inquiry form */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeModal();
  });

  /* ---------- 6. Floating button: shows past the hero, hides at the footer ---------- */
  var sticky = $('#stickyCta');
  if (sticky && 'IntersectionObserver' in window) {
    var hero = $('.hero'), foot = $('footer');
    var pastHero = false, atFooter = false;
    var update = function () { sticky.classList.toggle('show', pastHero && !atFooter); };

    if (hero) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { pastHero = !e.isIntersecting; });
        update();
      }, { threshold: 0 }).observe(hero);
    }
    if (foot) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { atFooter = e.isIntersecting; });
        update();
      }, { rootMargin: '0px 0px 160px 0px', threshold: 0 }).observe(foot);
    }
  }

  /* ---------- 7. Background video ----------
     The tag used to say autoplay, which starts the clip the moment the browser has a
     single frame decoded. It then runs out of buffered data and stalls: you see one
     frame, a freeze, then it lurches into motion. That is the pause.

     So the tag no longer says autoplay. The still poster holds the frame until the
     browser reports it can play the whole thing through without stopping, and only
     then does it start. On a slow line that report never comes, so a timer gives up
     and starts it anyway rather than leaving a dead frame on the page forever. */
  var heroVideo = $('#heroVideo');
  if (heroVideo) {
    if (prefersReducedMotion) {
      /* The visitor asked for less motion, and the stylesheet already
         hides the video and shows the still instead. Leaving the address
         in data-src means the file is never requested at all, so they are
         no longer downloading three megabytes of video to look at a
         photograph. */
      heroVideo.removeAttribute('loop');
      heroVideo.pause();
    } else {
      /* The <source> carries the address in data-src, not src, so the
         browser has nothing to fetch while the page is still loading. Fill
         it in once everything else has arrived. Until then the poster is on
         screen, and the poster is the video's own first frame, so there is
         nothing to see happen. */
      var vStarted = false;
      var startVideo = function () {
        if (vStarted) return;
        vStarted = true;
        var p = heroVideo.play();
        if (p && p.catch) p.catch(function () {});   /* browser refused. The poster stays. Fine. */
      };
      var beginLoading = function () {
        var s = heroVideo.querySelector('source[data-src]');
        if (s) {
          s.src = s.getAttribute('data-src');
          s.removeAttribute('data-src');
          heroVideo.load();
        }
        if (heroVideo.readyState >= 3) {
          startVideo();                    /* already buffered enough */
        } else {
          heroVideo.addEventListener('canplay', startVideo, { once: true });
          setTimeout(startVideo, 4000);    /* slow line: start anyway rather
                                              than sit dead */
        }
      };
      /* wait for the page to finish, then one frame more */
      if (document.readyState === 'complete') {
        setTimeout(beginLoading, 200);
      } else {
        window.addEventListener('load', function () {
          setTimeout(beginLoading, 200);
        }, { once: true });
      }
    }
  }

  /* ---------- 8. English / Spanish switch ----------
     Reads both ways of writing Spanish: the I18N list, and data-es labels
     written straight onto the tag. A page may use either. Nothing is saved
     to the visitor's browser. */

  var TEXT = window.I18N || [];
  var ATTR = window.I18N_ATTR || [];
  var META = window.I18N_META || {};

  /* Spanish label on the tag  ->  the real attribute it replaces */
  var TAG_ATTRS = [
    ['data-es-alt',        'alt'],
    ['data-es-ph',         'placeholder'],
    ['data-es-placeholder', 'placeholder'],
    ['data-es-aria',       'aria-label'],
    ['data-es-aria-label', 'aria-label'],
    ['data-es-cap',        'data-cap']
  ];

  var LANG_BTNS = '.lang-toggle, .js-lang';

  /* remember the English once, the first time we need it */
  function englishHTML(el) {
    if (el.__en === undefined) el.__en = el.innerHTML;
    return el.__en;
  }
  function englishAttr(el, attr) {
    var key = '__en_' + attr;
    if (el[key] === undefined) el[key] = el.getAttribute(attr) || '';
    return el[key];
  }

  function applyLang(lang) {
    var es = (lang === 'es');

    /* --- way 1: the I18N list --- */
    TEXT.forEach(function (pair) {
      var el = $(pair[0]);
      if (!el) return;
      var en = englishHTML(el);              /* grab the English BEFORE overwriting it */
      el.innerHTML = es ? pair[1] : en;
    });
    ATTR.forEach(function (trio) {
      var el = $(trio[0]);
      if (!el) return;
      var en = englishAttr(el, trio[1]);
      el.setAttribute(trio[1], es ? trio[2] : en);
    });

    /* --- way 2: data-es labels on the tag --- */
    $$('[data-es]').forEach(function (el) {
      var en = englishHTML(el);              /* same here, or the English is lost for good */
      el.innerHTML = es ? el.getAttribute('data-es') : en;
    });
    TAG_ATTRS.forEach(function (pair) {
      $$('[' + pair[0] + ']').forEach(function (el) {
        var en = englishAttr(el, pair[1]);
        el.setAttribute(pair[1], es ? el.getAttribute(pair[0]) : en);
      });
    });

    /* --- the page's own title and description --- */
    if (META.title) {
      if (window.__enTitle === undefined) window.__enTitle = document.title;
      document.title = es ? META.title : window.__enTitle;
    }
    if (META.desc) {
      var d = $('meta[name="description"]');
      if (d) {
        if (window.__enDesc === undefined) window.__enDesc = d.getAttribute('content') || '';
        d.setAttribute('content', es ? META.desc : window.__enDesc);
      }
    }

    document.documentElement.lang = lang;
    window.currentLang = lang;

    /* --- relabel the button itself --- */
    $$(LANG_BTNS).forEach(function (b) {
      /* a page may spell its own button labels out on the tag */
      var own = es ? b.getAttribute('data-label-en') : b.getAttribute('data-label-es');
      if (own) {
        b.textContent = own;
      } else {
        var small = b.classList.contains('lang-toggle-m') || b.classList.contains('nav-lang-mobile');
        b.textContent = es ? 'English' : 'Español';
      }
      /* WCAG 2.5.3, Label in Name. The name has to start with the word
         printed on the button, or somebody saying "click English" out loud
         gets nothing. The rest of the name is in the language the reader is
         reading right now. */
      b.setAttribute('aria-label', es ? 'English, cambiar esta página a inglés'
                                      : 'Español, switch this page to Spanish');
    });

    /* if the inquiry form is open, retitle it in the new language */
    if (window.currentTopic !== undefined) {
      var t = $('#modalTitle');
      if (t) t.textContent = modalTitleFor(window.currentTopic);
    }

    /* An open FAQ answer is held open at a fixed height. The Spanish runs to a
       different length, so measure it again or the answer gets cut off. */
    $$('.faq-item.open').forEach(function (item) {
      var a = $('.faq-a', item);
      if (a) a.style.maxHeight = a.scrollHeight + 'px';
    });
  }

  window.currentLang = 'en';
  var _applyLang = applyLang;
  applyLang = function (l) {
    _applyLang(l);
    if (window.__refreshInquiryError) window.__refreshInquiryError();
  };
  $$(LANG_BTNS).forEach(function (b) {
    b.addEventListener('click', function () {
      applyLang(window.currentLang === 'es' ? 'en' : 'es');
    });
  });
})();

/* keep the menu panel pinned directly under the bar at any size */
(function(){
  function setNavH(){
    var n=document.querySelector('header.nav');
    if(n) document.documentElement.style.setProperty('--navh', n.offsetHeight+'px');
  }
  setNavH();
  window.addEventListener('resize', setNavH);
  window.addEventListener('orientationchange', setNavH);
})();
