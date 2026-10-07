(() => {
  const WEDDING = new Date('2027-05-08T12:30:00+02:00');
  const RSVP_URL = 'https://planning.wedding/website/annaydavid'; // formulario de Wedding Assistant
  const LANGS = ['es', 'de', 'en'];
  const T = window.TRANSLATIONS;
  let lang = 'es';

  const t = (key) => T[lang][key] ?? T.es[key] ?? key;

  // ---------- Idiomas ----------
  function pickInitialLang() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    const saved = localStorage.getItem('lang');
    // Castellano por defecto; alemán automático solo si el navegador está en alemán
    const browser = (navigator.language || '').startsWith('de') ? 'de' : null;
    return [fromUrl, saved, browser].find((l) => LANGS.includes(l)) || 'es';
  }

  function setLang(next) {
    lang = next;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.title = t('meta.title');

    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => { el.alt = t(el.dataset.i18nAlt); });
    document.querySelectorAll('[data-lang]').forEach((btn) => btn.setAttribute('aria-pressed', btn.dataset.lang === lang));

    const longDate = new Intl.DateTimeFormat(lang, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid',
    }).format(WEDDING);
    document.querySelectorAll('[data-date-long]').forEach((el) => {
      el.textContent = `${longDate.charAt(0).toUpperCase()}${longDate.slice(1)} · 12:30`;
    });
  }

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // ---------- Dados (caras del 1 al 6) ----------
  const PIPS = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
  };
  document.querySelectorAll('[data-die]').forEach((el) => {
    const pips = PIPS[el.dataset.die].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('');
    el.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="4" y="4" width="92" height="92" rx="20"/>${pips}</svg>`;
  });

  // ---------- Cuenta atrás ----------
  const units = {};
  document.querySelectorAll('[data-unit]').forEach((el) => { units[el.dataset.unit] = el; });

  function tick() {
    const diff = WEDDING - Date.now();
    if (diff <= 0) {
      document.querySelector('[data-countdown]').hidden = true;
      document.querySelector('[data-countdown-done]').hidden = false;
      return;
    }
    const s = Math.floor(diff / 1000);
    units.days.textContent = Math.floor(s / 86400);
    units.hours.textContent = String(Math.floor(s / 3600) % 24).padStart(2, '0');
    units.minutes.textContent = String(Math.floor(s / 60) % 60).padStart(2, '0');
    units.seconds.textContent = String(s % 60).padStart(2, '0');
    setTimeout(tick, 1000 - (Date.now() % 1000));
  }

  // ---------- Copiar IBAN ----------
  const copyBtn = document.querySelector('[data-copy-iban]');
  copyBtn.addEventListener('click', async () => {
    const iban = document.querySelector('[data-iban]').textContent.replace(/\s/g, '');
    try {
      await navigator.clipboard.writeText(iban);
      copyBtn.textContent = t('gift.copied');
      setTimeout(() => { copyBtn.textContent = t('gift.copy'); }, 2000);
    } catch { /* el usuario puede copiarlo a mano */ }
  });

  // ---------- Confirmación de asistencia (Wedding Assistant) ----------
  // Todos los botones "Confirmar" apuntan aquí. Mientras esté vacío, llevan a la sección #confirmar.
  if (RSVP_URL) {
    document.querySelectorAll('[data-rsvp-link]').forEach((a) => { a.href = RSVP_URL; });
  }

  // ---------- Aparición suave al hacer scroll ----------
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  setLang(pickInitialLang());
  tick();
})();
