/**
 * Portfolio Website — Main JavaScript
 * Refactorizado con Module Pattern:
 *   - Estado encapsulado por dominio
 *   - API pública explícita por módulo
 *   - Funciones puras aisladas y testeables
 *   - SRP aplicado en renderizado y paginación
 */

'use strict';

// ============================================================================
// UTILS — módulo de utilidades puras (sin side-effects, testeables)
// ============================================================================

const Utils = (() => {
    /**
     * Retrasa la ejecución hasta que cesa el disparo del evento.
     * @param {Function} func
     * @param {number} wait — ms
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                clearTimeout(timeout);
                func(...args);
            }, wait);
        };
    }

    /**
     * Limita la ejecución a una vez por intervalo.
     * @param {Function} func
     * @param {number} limit — ms
     */
    function throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    /**
     * Convierte una fecha ISO a texto relativo ("2 days ago", etc.).
     * @param {string} dateString — ISO 8601
     * @returns {string}
     */
    function getTimeAgo(dateString) {
        const diffInSeconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
        if (diffInSeconds < 60) return 'just now';
        const m = Math.floor(diffInSeconds / 60);
        if (m < 60) return m === 1 ? '1 minute ago' : `${m} minutes ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`;
        const d = Math.floor(h / 24);
        if (d < 7) return d === 1 ? '1 day ago' : `${d} days ago`;
        const w = Math.floor(d / 7);
        if (w < 4) return w === 1 ? '1 week ago' : `${w} weeks ago`;
        const mo = Math.floor(d / 30);
        if (mo < 12) return mo === 1 ? '1 month ago' : `${mo} months ago`;
        const y = Math.floor(d / 365);
        return y === 1 ? '1 year ago' : `${y} years ago`;
    }

    return { debounce, throttle, getTimeAgo };
})();

// ============================================================================
// CONFIG — constantes de configuración del portfolio
// ============================================================================

const Config = Object.freeze({
    GITHUB_USERNAME: 'ROKO108',
    // GITHUB_API_URL: 'https://api.github.com/users/ROKO108/repos',
    GITHUB_API_URL: './root/repos.json',
    EXCLUDED_REPOS: ['ROKO108.github.io', '.github', 'ROKO108',],
    MAX_REPOS: 15,
    PROJECTS_PER_PAGE: 3,

    LANGUAGE_COLORS: {
        python: '#3572A5',
        javascript: '#f1e05a',
        typescript: '#2b7489',
        html: '#e34c26',
        css: '#563d7c',
        php: '#4F5D95',
        shell: '#89e051',
        vue: '#41b883',
        default: '#8b949e',
    },

    SECTION_LABELS: {
        hero: 'Inicio',
        about: 'Sobre mí',
        experience: 'Experiencia',
        formacion: 'Formación',
        projects: 'Proyectos',
        // skills: 'Skills',
        contact: 'Contacto',
    },
});

// ============================================================================
// NAVIGATION MODULE
// Responsabilidades: menú móvil, smooth scroll, header scroll, sección activa
// Estado encapsulado: headerEl, mobileToggle, navLinks, navLinksItems
// ============================================================================

const NavigationModule = (() => {
    // — Estado privado —
    let _headerEl = null;
    let _mobileToggle = null;
    let _navLinks = null;
    let _navLinksItems = [];

    // — Menú móvil —

    function _closeMobileMenu() {
        if (!_navLinks || !_mobileToggle) return;
        _navLinks.classList.remove('active');
        _mobileToggle.querySelector('.menu-icon').style.display = 'block';
        _mobileToggle.querySelector('.close-icon').style.display = 'none';
        _mobileToggle.setAttribute('aria-expanded', 'false');
    }

    function _initMobileMenu() {
        if (!_mobileToggle || !_navLinks) return;

        _mobileToggle.addEventListener('click', () => {
            const isOpen = _navLinks.classList.toggle('active');
            _mobileToggle.querySelector('.menu-icon').style.display = isOpen ? 'none' : 'block';
            _mobileToggle.querySelector('.close-icon').style.display = isOpen ? 'block' : 'none';
            _mobileToggle.setAttribute('aria-expanded', String(isOpen));
        });

        _navLinksItems.forEach(link => link.addEventListener('click', _closeMobileMenu));

        document.addEventListener('click', (e) => {
            if (!_mobileToggle.contains(e.target) && !_navLinks.contains(e.target)) {
                _closeMobileMenu();
            }
        });
    }

    // — Smooth scroll —

    function _initSmoothScroll() {
        _navLinksItems.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                if (targetId === '#') return;
                document.querySelector(targetId)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    // — Header scroll effect —

    function _initHeaderScrollEffect() {
        if (!_headerEl) return;

        const handleScroll = Utils.debounce(() => {
            _headerEl.classList.toggle('scrolled', window.scrollY > 50);
        }, 10);

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    }

    // — Sección activa (lateral dots + top nav) —

    function _activateSection(id, navLinksItems, dots) {
        navLinksItems.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
        dots.forEach((btn, dotId) => {
            btn.classList.toggle('active', dotId === id);
        });
    }

    function _buildLateralNav(sections) {
        const nav = document.createElement('nav');
        nav.className = 'section-indicator';
        nav.setAttribute('aria-label', 'Navegación de secciones');

        const dots = new Map();

        sections.forEach(section => {
            const id = section.getAttribute('id');
            const label = Config.SECTION_LABELS[id] || id;

            const btn = document.createElement('button');
            btn.className = 'section-dot';
            btn.setAttribute('aria-label', `Ir a ${label}`);
            btn.setAttribute('data-section', id);

            const tip = document.createElement('span');
            tip.className = 'section-dot-label';
            tip.textContent = label;
            btn.appendChild(tip);

            btn.addEventListener('click', () => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });

            nav.appendChild(btn);
            dots.set(id, btn);
        });

        document.body.appendChild(nav);
        return dots;
    }

    function _initActiveSectionHighlight() {
        const sections = document.querySelectorAll('section[id]');
        if (!sections.length) return;

        const dots = _buildLateralNav(sections);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    _activateSection(entry.target.getAttribute('id'), _navLinksItems, dots);
                }
            });
        }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

        sections.forEach(s => observer.observe(s));
        _activateSection(sections[0].getAttribute('id'), _navLinksItems, dots);
    }

    // — API pública —

    function init() {
        _headerEl = document.getElementById('header');
        _mobileToggle = document.getElementById('mobile-toggle');
        _navLinks = document.getElementById('nav-links');
        _navLinksItems = [...document.querySelectorAll('.nav-link')];

        _initMobileMenu();
        _initSmoothScroll();
        _initActiveSectionHighlight();
        _initHeaderScrollEffect();
    }

    /** Expuesto para tests: devuelve el elemento header interno. */
    function getHeader() { return _headerEl; }

    return { init, getHeader };
})();

// ============================================================================
// TIMELINE MODULE
// Responsabilidades: inyectar etiquetas de fecha junto al marker,
// fuera de .timeline-content, para el roadmap horizontal de experiencia.
//
// Cada .timeline-item contiene un .timeline-date con el texto de la fecha.
// Este módulo crea un .timeline-date-label (span hermano del marker) con ese
// mismo texto, de modo que la fecha queda visible en la línea de tiempo sin
// ocupar espacio dentro de la tarjeta.
//
// Posicionamiento (gestionado íntegramente por el CSS):
//   - Items impares (1º, 3º…): tarjeta ARRIBA → fecha debajo del marker.
//   - Items pares  (2º, 4º…): tarjeta ABAJO  → fecha encima del marker.
//
// En móvil el CSS oculta .timeline-date-label y vuelve a mostrar
// .timeline-date dentro de la tarjeta; no se necesita lógica JS adicional.
// ============================================================================

const TimelineModule = (() => {
    /**
     * Lee el texto de cada .timeline-date y crea un .timeline-date-label
     * posicionado junto al marker, fuera de .timeline-content.
     * Guard contra doble ejecución: si el label ya existe, no hace nada.
     */
    function _injectDateLabels() {
        document.querySelectorAll('.timeline-item').forEach(item => {
            // Evitar duplicados si init() se llamara más de una vez
            if (item.querySelector('.timeline-date-label')) return;

            const dateEl = item.querySelector('.timeline-date');
            if (!dateEl) return;

            const label = document.createElement('span');
            label.className = 'timeline-date-label';
            label.textContent = dateEl.textContent.trim();
            // aria-hidden: la fecha ya está en .timeline-date para lectores de pantalla
            label.setAttribute('aria-hidden', 'true');
            item.appendChild(label);
        });
    }

    // — API pública —

    function init() {
        _injectDateLabels();
    }

    return { init };
})();

// ============================================================================
// PROJECTS MODULE
// Responsabilidades: fetch, caché, render de tarjetas, paginación
// Estado encapsulado: projectsData, currentPage
// ============================================================================

const ProjectsModule = (() => {
    // — Estado privado —
    let _projectsData = null;  // null = no cargado; [] = cargado vacío
    let _currentPage = 1;

    // — Datos de respaldo —
    const FALLBACK_DATA = [
        {
            name: 'Sistema de Automatización Python',
            description: 'Framework de automatización de tareas administrativas con scripts .bat, manipulación de archivos y programación de tareas.',
            language: 'Python', stars: 45, forks: 12,
            updated: '2 weeks ago', url: 'https://github.com/ROKO108', visibility: 'public',
        },
        {
            name: 'Gestor de Bases de Datos MySQL',
            description: 'Herramienta de gestión y administración de bases de datos MySQL con interfaz gráfica basada en DBeaver y scripts de backup.',
            language: 'Python', stars: 38, forks: 8,
            updated: '1 month ago', url: 'https://github.com/ROKO108', visibility: 'public',
        },
        {
            name: 'CMS WordPress - Plantilla Personalizada',
            description: 'Desarrollo de temas y plugins WordPress personalizados, optimización de rendimiento y configuración de servidores Apache/Nginx.',
            language: 'JavaScript', stars: 25, forks: 5,
            updated: '3 months ago', url: 'https://github.com/ROKO108', visibility: 'public',
        },
        {
            name: 'Sistema de Monitorización CCTV',
            description: 'Sistema de monitorización y administración remota de cámaras CCTV con alertas en tiempo real y logs de actividad.',
            language: 'Python', stars: 52, forks: 15,
            updated: '1 week ago', url: 'https://github.com/ROKO108', visibility: 'public',
        },
        {
            name: 'Script de Despliegue Automático',
            description: 'Scripts de automatización para despliegue de aplicaciones, gestión de certificados SSL y configuración de dominios.',
            language: 'Shell', stars: 67, forks: 22,
            updated: '5 days ago', url: 'https://github.com/ROKO108', visibility: 'public',
        },
        {
            name: 'Agente IA para Generación de Código',
            description: 'Agente basado en LLM para generación automática de código Python, validación de sintaxis y refactorización asistida.',
            language: 'Python', stars: 89, forks: 28,
            updated: '3 days ago', url: 'https://github.com/ROKO108', visibility: 'public',
        },
    ];

    // — Helpers de presentación (puros) —

    function _getLanguageColor(language) {
        if (!language) return Config.LANGUAGE_COLORS.default;
        return Config.LANGUAGE_COLORS[language.toLowerCase()] ?? Config.LANGUAGE_COLORS.default;
    }

    /**
     * Construye el HTML de una tarjeta de proyecto.
     * Función pura: misma entrada → misma salida, sin side-effects.
     * @param {Object} project
     * @returns {string} HTML string
     */
    function buildProjectCard(project) {
        const color = _getLanguageColor(project.language);
        return `
            <article class="project-card" data-language="${project.language}">
                <div class="project-header">
                    <div class="project-icon">
                        <i data-lucide="folder-git"></i>
                    </div>
                    <div class="project-meta">
                        <span class="project-language" style="--lang-color:${color}">
                            <span class="language-dot" style="background-color:${color}"></span>
                            ${project.language}
                        </span>
                        <span class="project-visibility">${project.visibility}</span>
                    </div>
                </div>
                <h3 class="project-title">${project.name}</h3>
                <p class="project-description">${project.description}</p>
                <div class="project-stats">
                    <div class="stat">
                        <i data-lucide="star" class="stat-icon"></i>
                        <span>${project.stars}</span>
                    </div>
                    <div class="stat">
                        <i data-lucide="git-fork" class="stat-icon"></i>
                        <span>${project.forks}</span>
                    </div>
                    <div class="stat">
                        <i data-lucide="clock" class="stat-icon"></i>
                        <span>${project.updated}</span>
                    </div>
                </div>
                <a href="${project.url}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="project-btn">
                    <span>Ver proyecto</span>
                    <i data-lucide="external-link" class="link-icon"></i>
                </a>
            </article>
        `;
    }

    /**
     * Construye el HTML del control de paginación.
     * Función pura: no toca el DOM.
     * @param {number} totalPages
     * @param {number} page
     * @returns {string} HTML string
     */
    function buildPaginationHTML(totalPages, page) {
        const prevDis = page === 1 ? 'disabled' : '';
        const nextDis = page === totalPages ? 'disabled' : '';

        let html = `
            <button class="page-btn page-btn-nav prev-btn"
                    data-page="${page - 1}" ${prevDis}
                    aria-label="Página anterior">
                <i data-lucide="chevron-left"></i>
                <span>Anterior</span>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            html += `
                <button class="page-btn page-number ${i === page ? 'active' : ''}"
                        data-page="${i}"
                        aria-label="Página ${i}"
                        aria-current="${i === page ? 'page' : ''}">
                    ${i}
                </button>
            `;
        }

        html += `
            <button class="page-btn page-btn-nav next-btn"
                    data-page="${page + 1}" ${nextDis}
                    aria-label="Página siguiente">
                <span>Siguiente</span>
                <i data-lucide="chevron-right"></i>
            </button>
        `;

        return html;
    }

    // — Fetch con caché —

    async function _fetchRepos() {
        if (_projectsData !== null) return _projectsData;

        const grid = document.getElementById('projects-grid');
        if (grid) grid.innerHTML = '<div class="loading-message">Cargando proyectos...</div>';

        try {
            let fetchUrl = Config.GITHUB_API_URL;

            // SOLO si la URL es de la API de GitHub añadimos los parámetros de búsqueda
            if (fetchUrl.includes('api.github.com')) {
                const urlObj = new URL(fetchUrl);
                urlObj.searchParams.set('sort', 'updated');
                urlObj.searchParams.set('direction', 'desc');
                urlObj.searchParams.set('per_page', String(Config.MAX_REPOS));
                fetchUrl = urlObj.toString();
            }

            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`Error al cargar: ${response.status}`);
            }

            const repos = await response.json();

            // Mapeamos los datos (funciona igual para la API o para tu repos.json local)
            _projectsData = repos
                .filter(r => !Config.EXCLUDED_REPOS.includes(r.name))
                .map(r => ({
                    name: r.name,
                    description: r.description || 'No description available',
                    language: r.language || 'Python',
                    stars: r.stargazers_count,
                    forks: r.forks_count,
                    updated: Utils.getTimeAgo(r.updated_at),
                    url: r.html_url,
                    visibility: r.visibility,
                }));

            console.log(`Cargados ${_projectsData.length} repositorios`);

        } catch (err) {
            console.error('Error fetching repositories:', err.message);
            _projectsData = FALLBACK_DATA;
        }

        return _projectsData;
    }

    // — Render —

    /**
     * Renderiza las tarjetas de la página solicitada.
     * Si los datos aún no están en caché, hace el fetch primero.
     * @param {number} [page=1]
     */
    async function render(page = 1) {
        const grid = document.getElementById('projects-grid');
        if (!grid) return;

        if (_projectsData === null) await _fetchRepos();

        if (!_projectsData?.length) {
            grid.innerHTML = '<div class="no-projects">No se encontraron proyectos</div>';
            return;
        }

        const totalPages = Math.ceil(_projectsData.length / Config.PROJECTS_PER_PAGE);
        _currentPage = Math.max(1, Math.min(page, totalPages));

        const start = (_currentPage - 1) * Config.PROJECTS_PER_PAGE;
        const slice = _projectsData.slice(start, start + Config.PROJECTS_PER_PAGE);

        // Una sola escritura al DOM
        grid.innerHTML = slice.map(buildProjectCard).join('');

        _renderPagination(totalPages, _currentPage);

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    /**
     * Actualiza el contenedor de paginación y registra el listener de clicks.
     * Separado del render de tarjetas para cumplir SRP.
     * @param {number} totalPages
     * @param {number} page
     */
    function _renderPagination(totalPages, page) {
        let container = document.getElementById('pagination-container');

        if (!container) {
            container = document.createElement('div');
            container.id = 'pagination-container';
            container.className = 'pagination';
            document.getElementById('projects-grid')
                ?.insertAdjacentElement('afterend', container);
        }

        if (totalPages <= 1) { container.innerHTML = ''; return; }

        // Construir HTML (función pura, sin efectos)
        container.innerHTML = buildPaginationHTML(totalPages, page);

        // Bind de eventos: delegación, sin acumulación de listeners
        // Se reemplaza el nodo para garantizar que no quedan listeners previos
        const fresh = container.cloneNode(true);
        container.replaceWith(fresh);

        fresh.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn || btn.disabled) return;
            const nextPage = parseInt(btn.dataset.page, 10);
            if (isNaN(nextPage) || nextPage < 1 || nextPage > totalPages) return;

            render(nextPage);

            document.getElementById('projects')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // — API pública —

    return {
        init: () => render(1),
        render,
        // Expuestos para tests
        buildProjectCard,
        buildPaginationHTML,
        _getLanguageColor,  // prefijo _ indica "interno pero testeable"
    };
})();


const FormModule = (() => {
    // — Validación —
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'Este campo es obligatorio';
        } else if (field.type === 'email' && value && !isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Por favor, introduce un email válido';
        }

        const group = field.closest('.form-group');
        if (group) {
            group.querySelector('.field-error')?.remove();
            field.classList.toggle('field-invalid', !isValid);
            field.classList.toggle('field-valid', isValid && !!value);

            if (!isValid) {
                const err = document.createElement('span');
                err.className = 'field-error';
                err.textContent = errorMessage;
                group.appendChild(err);
            }
        }
        return isValid;
    }

    // — Mensajes —
    function showMessage(form, message, type = 'success') {
        form.nextElementSibling?.classList.contains('form-message') && form.nextElementSibling.remove();
        const el = document.createElement('div');
        el.className = `form-message form-message-${type}`;
        el.textContent = message;
        form.insertAdjacentElement('afterend', el);
        setTimeout(() => el.remove(), 5000);
    }

    // — Submit (CORREGIDO PARA GOOGLE FORMS) —
    function _createSubmitHandler(form) {
        return function handleSubmit(e) {
            // NO ponemos e.preventDefault() al principio, 
            // lo pondremos solo si los campos están mal.

            const fields = ['name', 'email', 'message']
                .map(id => form.querySelector(`#${id}`))
                .filter(Boolean);

            const allValid = fields.map(validateField).every(Boolean);

            if (!allValid) {
                e.preventDefault(); // Detenemos el envío si hay errores
                showMessage(form, 'Por favor, corrige los errores en el formulario', 'error');
                return;
            }

            // Si el código llega aquí, el formulario se envía al iframe automáticamente
            showMessage(form, '¡Mensaje enviado con éxito!', 'success');

            // Limpiamos el formulario después de un segundo
            setTimeout(() => {
                form.reset();
                fields.forEach(f => f.classList.remove('field-valid'));
            }, 1000);
        };
    }

    function _initFieldValidation(form) {
        form.querySelectorAll('input, textarea').forEach(field => {
            field.addEventListener('blur', () => validateField(field));
            field.addEventListener('input', () => {
                if (field.classList.contains('field-invalid')) validateField(field);
            });
        });
    }

    return {
        init: () => {
            const form = document.getElementById('contact-form');
            if (form) {
                form.addEventListener('submit', _createSubmitHandler(form));
                _initFieldValidation(form);
            }
        }
    };
})();

// ============================================================================
// ANIMATIONS MODULE
// Responsabilidades: scroll animations con IntersectionObserver
// Nota: los estilos .animate-on-scroll deben vivir en el CSS externo.
//       Este módulo solo gestiona la lógica de observación.
// ============================================================================

const AnimationsModule = (() => {
    const SELECTORS = [
        '.about-text', '.about-stats', '.stat-card',
        '.skills-category', '.contact-info', '.contact-form', '.section-header',
    ].join(', ');

    function init() {
        const targets = document.querySelectorAll(SELECTORS);
        if (!targets.length) return;

        targets.forEach((el, i) => {
            el.classList.add('animate-on-scroll', `delay-${(i % 4) + 1}`);
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        targets.forEach(el => observer.observe(el));
    }

    return { init };
})();

// ============================================================================
// INIT — orquestador de arranque
// Sin acceso directo al DOM; delega en cada módulo
// ============================================================================

function init() {
    NavigationModule.init();
    TimelineModule.init();
    ProjectsModule.init();
    FormModule.init();
    AnimationsModule.init();
    console.log('Portfolio initialized successfully');
}

// El script se carga con defer → DOM ya listo, pero mantenemos la guarda
// por compatibilidad con entornos de test (jsdom, etc.)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
