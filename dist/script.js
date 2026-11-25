const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');

menu?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(isOpen));
});

navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  navigation.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
}));

document.querySelectorAll('.country-select').forEach((container) => {
  const select = container.querySelector('select');
  const flags = container.querySelectorAll('[data-country-flag]');
  const updateCountryFlag = () => {
    flags.forEach((flag) => {
      flag.hidden = flag.dataset.countryFlag !== select.value;
    });
  };
  select.addEventListener('change', updateCountryFlag);
  updateCountryFlag();
});

const mountHorizontalSlider = (slider, previous, next) => {
  if (!slider || !previous || !next) return;
  const updateControls = () => {
    const hasOverflow = slider.scrollWidth > slider.clientWidth + 1;
    previous.disabled = !hasOverflow;
    next.disabled = !hasOverflow;
  };
  const move = (direction) => {
    const maxScroll = slider.scrollWidth - slider.clientWidth;
    const startOffset = Number.parseFloat(getComputedStyle(slider).paddingLeft) || 0;
    if (direction > 0 && slider.scrollLeft >= maxScroll - 1) {
      slider.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (direction < 0 && slider.scrollLeft <= startOffset + 1) {
      slider.scrollTo({ left: maxScroll, behavior: 'smooth' });
      return;
    }
    slider.scrollBy({ left: direction * Math.min(390, slider.clientWidth), behavior: 'smooth' });
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  slider.addEventListener('scroll', updateControls, { passive: true });
  window.addEventListener('resize', updateControls);
  updateControls();
};

mountHorizontalSlider(
  document.querySelector('.case-grid--experience'),
  document.querySelector('[data-experience-previous]'),
  document.querySelector('[data-experience-next]'),
);
mountHorizontalSlider(
  document.querySelector('.service-grid'),
  document.querySelector('[data-service-previous]'),
  document.querySelector('[data-service-next]'),
);
mountHorizontalSlider(
  document.querySelector('.approach-carousel ol'),
  document.querySelector('[data-approach-previous]'),
  document.querySelector('[data-approach-next]'),
);
export function validateContactForm(form) {
  const values = Object.fromEntries(new FormData(form));
  const fields = ['name', 'email', 'message'];
  const firstEmpty = fields.find((name) => !values[name]?.trim());
  if (firstEmpty) return { valid: false, field: firstEmpty, message: 'Completá los campos obligatorios.' };
  if (!form.elements.email.validity.valid) return { valid: false, field: 'email', message: 'Revisá el formato del email.' };
  const whatsapp = values.whatsapp?.trim() ? `${values.countryCode} ${values.whatsapp.trim()}` : '';
  delete values.countryCode;
  return { valid: true, values: { ...values, name: values.name.trim(), email: values.email.trim(), message: values.message.trim(), whatsapp } };
}

export function setContactState(container, state, message = '') {
  const form = container.querySelector('form');
  const success = container.querySelector('[data-contact-success]');
  const status = container.querySelector('[data-form-status]');
  container.dataset.contactState = state;
  if (status) status.textContent = message;
  if (form) form.hidden = state === 'success';
  if (success) success.hidden = state !== 'success';
}

export async function submitLead(values, endpoint = '/api/contact') {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
  if (!response.ok) throw new Error('Contact request failed');
  return response.json();
}

export function mountContactFlow(container, { endpoint = '/api/contact' } = {}) {
  const form = container.querySelector('form');
  const submit = form?.querySelector('[type="submit"]');
  if (!form || !submit) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = validateContactForm(form);
    if (!result.valid) {
      setContactState(container, 'error', result.message);
      form.elements[result.field].focus();
      return;
    }
    submit.disabled = true;
    setContactState(container, 'loading', 'Enviando consulta…');
    try {
      await submitLead(result.values, endpoint);
      form.reset();
      setContactState(container, 'success');
      container.querySelector('[data-contact-success]')?.focus();
    } catch {
      setContactState(container, 'error', navigator.onLine ? 'No pudimos guardar tu consulta. Intentá nuevamente en unos minutos.' : 'Revisá tu conexión e intentá nuevamente.');
    } finally { submit.disabled = false; }
  });
}

document.querySelectorAll('[data-contact-flow]').forEach((container) => mountContactFlow(container));
