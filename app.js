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
             data-es-ph           the grey hint text inside a form field
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
    if (topic && interest && interest.querySelector('[value="' + topic + '"]')) {
      interest.value = topic;                     /* preselect what they clicked */
    }
    window.currentTopic = topic;
    var title = $('#modalTitle');
    if (title) title.textContent = modalTitleFor(topic);
    if (form) form.style.display = 'block';
    if (success) success.classList.remove('show');
    modal.classList.add('open');
    document.body.classList.add('no-scroll');
    setTimeout(function () { var nm = $('#name'); if (nm) nm.focus(); }, 180);
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

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.name.value || !form.email.value) {
        if (form.reportValidity) form.reportValidity();
        return;
      }

      /* Actually send it. This used to just hide the form and say thank you, which
         meant every inquiry anyone ever sent was quietly thrown away. It now posts to
         Netlify, waits for confirmation, and only then says thank you. If the send
         fails, it says so, rather than lying to the person. */
      var btn = form.querySelector('[type="submit"], button:not([type="button"])');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.style.display = 'none';
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
        warn.textContent = 'That did not send. Please call us, or try again in a moment.';
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
      heroVideo.removeAttribute('loop');
      heroVideo.pause();                   /* the visitor asked for less motion */
    } else {
      var vStarted = false;
      var startVideo = function () {
        if (vStarted) return;
        vStarted = true;
        var p = heroVideo.play();
        if (p && p.catch) p.catch(function () {});   /* browser refused. The poster stays. Fine. */
      };
      if (heroVideo.readyState >= 4) {
        startVideo();                      /* already buffered enough */
      } else {
        heroVideo.addEventListener('canplaythrough', startVideo, { once: true });
        setTimeout(startVideo, 4000);      /* slow line: start anyway rather than sit dead */
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
        b.textContent = es ? (small ? 'EN' : 'English') : (small ? 'ES' : 'Español');
      }
      b.setAttribute('aria-label', es ? 'Switch to English' : 'Cambiar a español');
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
  $$(LANG_BTNS).forEach(function (b) {
    b.addEventListener('click', function () {
      applyLang(window.currentLang === 'es' ? 'en' : 'es');
    });
  });
})();
