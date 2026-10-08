(() => {
  const WEDDING = new Date('2027-05-08T12:30:00+02:00');
  const WEDDING_END = new Date('2027-05-09T00:00:00+02:00'); // fin de fiesta
  const VENUE = 'Finca Meu Lar, C/ de les Basses Noves, 37, 03112 Alacant, Alicante';
  // Formularios de Wedding Assistant, uno por idioma
  const RSVP_URLS = {
    es: 'https://submit.rsvp/annaydavid',
    de: 'https://submit.rsvp/annaydavid-de',
    en: 'https://submit.rsvp/annaydavid-en',
  };
  const SPOTIFY_URL = ''; // ← enlace de invitación de la playlist colaborativa (vacío = no se muestra)
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

    updateGoogleCalendarLink();

    // Todos los botones "Confirmar" llevan al formulario del idioma elegido
    document.querySelectorAll('[data-rsvp-link]').forEach((a) => { a.href = RSVP_URLS[lang]; });
  }

  // ---------- Añadir al calendario ----------
  // Google se genera aquí (con el título en el idioma elegido); Apple/Outlook usan el .ics de public/
  function updateGoogleCalendarLink() {
    const utc = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, ''); // 20270508T103000Z
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: t('calendar.event'),
      details: `${t('calendar.details')}\n${location.origin}`,
      location: VENUE,
    });
    const link = document.querySelector('[data-calendar-google]');
    link.href = `https://calendar.google.com/calendar/render?${params}&dates=${utc(WEDDING)}/${utc(WEDDING_END)}`;
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

  // ---------- Playlist colaborativa ----------
  if (SPOTIFY_URL) {
    document.querySelector('[data-spotify-link]').href = SPOTIFY_URL;
    document.querySelector('[data-spotify]').hidden = false;
  }

  // ---------- Sobre de bienvenida ----------
  // Se muestra si el <head> ha añadido la clase show-intro (primera visita o ?intro).
  // Secuencia: sobre cerrado → se abre la solapa con el lacre (4,5 s, en styles.css) → mientras termina de abrirse,
  // la invitación sale y, sin pararse, crece hasta pantalla completa → la invitación es ya la propia web
  const root = document.documentElement;
  const INTRO_MS = {   // ← tiempos en milisegundos
    closed: 1000,      // sobre cerrado antes de abrirse
    toCard: 2400,      // desde que empieza a abrirse la solapa hasta que se mueve la tarjeta (justo pasada la mitad)
    card: 2800,        // la tarjeta sale (0,8 s) y crece (2 s), todo en un solo movimiento
  };
  const RISE_SHARE = .29; // parte de ese movimiento que la tarjeta dedica a salir del sobre antes de crecer

  async function playIntro() {
    const intro = document.querySelector('[data-intro]');
    const card = intro.querySelector('[data-intro-card]');
    const nav = document.querySelector('body > .nav');
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    localStorage.setItem('introSeen', '1');

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.remove('show-intro');
      return;
    }

    // La web real debe estar arriba del todo para coincidir con la tarjeta al final
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    // Copia de lo que se ve al abrir la web (portada, cuadros y cuenta atrás), ya traducida y sin el menú.
    // Deja arriba el hueco del menú para que, al final, todo quede en el mismo sitio que en la web real.
    // Sin ids ni data-*, para que el resto del código no la confunda con la web real
    [...document.querySelector('main').children].slice(0, 3).forEach((el) => card.append(el.cloneNode(true)));
    card.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('id');
      [...el.attributes].forEach((a) => { if (a.name.startsWith('data-')) el.removeAttribute(a.name); });
    });
    card.style.paddingTop = `${nav.offsetHeight}px`;

    // Tamaño y posición de la tarjeta dentro del sobre (la tarjeta mide lo mismo que la pantalla y se escala)
    const vw = intro.clientWidth;
    const vh = intro.clientHeight;
    const env = intro.querySelector('.envelope').getBoundingClientRect();
    const scale = Math.min(env.width * .9, vw * .92) / vw;
    const x = env.left + (env.width - vw * scale) / 2;
    const y = env.top + env.height * .04;
    const rise = Math.min(vh * scale * .5, y - vh * .04); // cuánto sube al salir, sin pasarse del borde de arriba
    const at = (lift) => `translate(${x}px, ${y - lift}px) scale(${scale})`;
    const radius = `${8 / scale}px`; // esquinas de ~8 px a la vista, aunque esté escalada
    const shadow = getComputedStyle(card).boxShadow;

    card.style.transform = at(0);
    card.style.borderRadius = radius;
    card.classList.add('is-ready');

    await wait(INTRO_MS.closed);
    intro.classList.add('is-open');
    await wait(INTRO_MS.toCard);

    // Un solo movimiento: sube acelerando y, sin frenar, sigue subiendo mientras crece y se posa a pantalla completa
    setTimeout(() => intro.classList.add('is-dissolving'), INTRO_MS.card * RISE_SHARE);
    await card.animate(
      [
        { offset: 0, transform: at(0), borderRadius: radius, boxShadow: shadow, easing: 'cubic-bezier(.45, 0, .75, .75)' },
        { offset: RISE_SHARE, transform: at(rise), borderRadius: radius, boxShadow: shadow, easing: 'cubic-bezier(.35, .2, .2, 1)' },
        { offset: 1, transform: 'translate(0px, 0px) scale(1)', borderRadius: '0px', boxShadow: '0 0 0 0 transparent' },
      ],
      { duration: INTRO_MS.card, fill: 'forwards' },
    ).finished;

    // La tarjeta ya cubre la pantalla y es idéntica a la web: se cambia una por otra y aparece el menú
    nav.style.opacity = '0';
    root.classList.remove('show-intro');
    await nav.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' }).finished;
    nav.style.opacity = '';
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
  if (root.classList.contains('show-intro')) playIntro(); // después de traducir, para copiar los textos ya traducidos
})();
