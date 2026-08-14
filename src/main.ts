import './style.css'

const HEADER_OFFSET = 84
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function initCurrentYear(): void {
  const year = document.querySelector('#year')
  if (year) year.textContent = String(new Date().getFullYear())
}

function scrollToId(id: string): void {
  const target = document.querySelector<HTMLElement>(id)
  if (!target) return

  const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
  window.scrollTo({
    top,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

function initSmoothScroll(): void {
  document.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]')
    if (!link) return

    const href = link.getAttribute('href')
    if (!href || href === '#') return

    event.preventDefault()
    scrollToId(href)
    closeMobileNav()
  })
}

function closeMobileNav(): void {
  const nav = document.querySelector<HTMLElement>('#navegacao')
  const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle')
  nav?.classList.remove('is-open')
  toggle?.setAttribute('aria-expanded', 'false')
  toggle?.setAttribute('aria-label', 'Abrir menu')
}

function initMobileNav(): void {
  const nav = document.querySelector<HTMLElement>('#navegacao')
  const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle')
  if (!nav || !toggle) return

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true'
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu')
    nav.classList.toggle('is-open', open)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileNav()
  })
}

function initHeaderState(): void {
  const header = document.querySelector<HTMLElement>('.site-header')
  if (!header) return

  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12)
  }

  update()
  window.addEventListener('scroll', update, { passive: true })
}

function initRevealOnScroll(): void {
  const items = document.querySelectorAll<HTMLElement>('.reveal')
  if (prefersReducedMotion()) {
    items.forEach((item) => item.classList.add('is-visible'))
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    },
    { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
  )

  items.forEach((item) => observer.observe(item))
}

function initActiveSection(): void {
  const isProjectsPage = /projetos\.html?$/.test(location.pathname)
  if (isProjectsPage) {
    document.querySelectorAll<HTMLAnchorElement>('.nav a').forEach((link) => {
      link.classList.toggle('is-active', /projetos\.html/.test(link.getAttribute('href') ?? ''))
    })
    return
  }

  const links = [...document.querySelectorAll<HTMLAnchorElement>('.nav a[href^="#"]')]
  const sections = links
    .map((link) => document.querySelector<HTMLElement>(link.getAttribute('href') ?? ''))
    .filter((section): section is HTMLElement => Boolean(section))

  if (!sections.length) return

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

      if (!visible) return

      const id = `#${visible.target.id}`
      links.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === id)
      })
    },
    { rootMargin: '-30% 0px -55% 0px', threshold: [0.15, 0.4, 0.7] },
  )

  sections.forEach((section) => observer.observe(section))
}

type ContactFields = {
  name: string
  email: string
  message: string
}

function fieldValue(form: HTMLFormElement, name: keyof ContactFields): string {
  const field = form.elements.namedItem(name)
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
    return ''
  }
  return field.value.trim()
}

function setFieldError(form: HTMLFormElement, name: keyof ContactFields, message: string | null): void {
  const control = form.elements.namedItem(name)
  const wrapper = control instanceof HTMLElement ? control.closest('.field') : null
  const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`)

  wrapper?.classList.toggle('is-invalid', Boolean(message))
  if (!error) return

  if (message) {
    error.hidden = false
    error.textContent = message
  } else {
    error.hidden = true
    error.textContent = ''
  }
}

function validateContact(values: ContactFields): Partial<Record<keyof ContactFields, string>> {
  const errors: Partial<Record<keyof ContactFields, string>> = {}

  if (values.name.length < 2) {
    errors.name = 'Informe seu nome (mínimo 2 caracteres).'
  }

  if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Digite um email válido.'
  }

  if (values.message.length < 12) {
    errors.message = 'A mensagem precisa ter pelo menos 12 caracteres.'
  }

  return errors
}

function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('#contact-form')
  const status = document.querySelector<HTMLElement>('#form-status')
  if (!form || !status) return

  const names: Array<keyof ContactFields> = ['name', 'email', 'message']

  const clearStatus = () => {
    status.textContent = ''
    status.classList.remove('is-ok', 'is-error')
  }

  names.forEach((name) => {
    const control = form.elements.namedItem(name)
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
      return
    }

    control.addEventListener('input', () => {
      setFieldError(form, name, null)
      clearStatus()
      form.classList.remove('is-success')
    })
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    clearStatus()

    const values: ContactFields = {
      name: fieldValue(form, 'name'),
      email: fieldValue(form, 'email'),
      message: fieldValue(form, 'message'),
    }

    const errors = validateContact(values)
    names.forEach((name) => setFieldError(form, name, errors[name] ?? null))

    if (Object.keys(errors).length > 0) {
      status.textContent = 'Revise os campos destacados para enviar.'
      status.classList.add('is-error')
      const firstInvalid = form.querySelector<HTMLElement>('.field.is-invalid input, .field.is-invalid textarea')
      firstInvalid?.focus()
      return
    }

    form.reset()
    form.classList.add('is-success')
    status.classList.add('is-ok')
    status.textContent = `Obrigado, ${values.name}. Sua mensagem foi registrada neste protótipo — em breve conecto o envio a um servidor. Enquanto isso, escreva para watsonnrayglann.dev@gmail.com ou use o WhatsApp, o Instagram e o GitHub.`
  })
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
}

function initHeroCanvas(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#hero-canvas')
  if (!canvas || prefersReducedMotion()) return

  const context = canvas.getContext('2d')
  if (!context) return

  const particles: Particle[] = []
  let width = 0
  let height = 0
  let animationId = 0
  let running = true

  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const ratio = window.devicePixelRatio || 1
    width = parent.clientWidth
    height = parent.clientHeight
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
  }

  const seed = () => {
    particles.length = 0
    const count = Math.max(28, Math.floor((width * height) / 28000))
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
      })
    }
  }

  const draw = () => {
    if (!running) return
    context.clearRect(0, 0, width, height)

    for (const particle of particles) {
      particle.x += particle.vx
      particle.y += particle.vy

      if (particle.x < 0 || particle.x > width) particle.vx *= -1
      if (particle.y < 0 || particle.y > height) particle.vy *= -1
    }

    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i]
      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.hypot(dx, dy)
        if (dist > 140) continue

        const alpha = (1 - dist / 140) * 0.18
        context.strokeStyle = `rgba(94, 200, 255, ${alpha})`
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(a.x, a.y)
        context.lineTo(b.x, b.y)
        context.stroke()
      }
    }

    for (const particle of particles) {
      context.fillStyle = 'rgba(212, 180, 131, 0.7)'
      context.beginPath()
      context.arc(particle.x, particle.y, 1.4, 0, Math.PI * 2)
      context.fill()
    }

    animationId = window.requestAnimationFrame(draw)
  }

  resize()
  seed()
  draw()

  window.addEventListener('resize', () => {
    resize()
    seed()
  })

  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible'
    if (running) {
      animationId = window.requestAnimationFrame(draw)
    } else {
      window.cancelAnimationFrame(animationId)
    }
  })
}

initCurrentYear()
initSmoothScroll()
initMobileNav()
initHeaderState()
initRevealOnScroll()
initActiveSection()
initContactForm()
initHeroCanvas()

if (location.hash) {
  window.requestAnimationFrame(() => scrollToId(location.hash))
}
