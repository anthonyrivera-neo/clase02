/* ============================================
   CONFIGURACIÓN Y ESTADO GLOBAL
   ============================================ */

const API_URL = 'http://127.0.0.1:8000';

let appState = {
    usuarioLogueado: null,
    servicios: [],
    mascotas: [],
    tabActual: 'inicio'
};

const TABS_PROTEGIDOS = ['servicios', 'mascotas', 'reporte'];
const TABS_PUBLICOS = ['inicio', 'acceso'];

/* ============================================
   INICIALIZACIÓN
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
});

function inicializarApp() {
    cargarServicios();
    configurarEventListeners();
    switchTab('inicio');
}

/* ============================================
   MANEJO DE TABS
   ============================================ */

function switchTab(tabName) {
    // Validar acceso a tabs protegidos
    if (TABS_PROTEGIDOS.includes(tabName) && !appState.usuarioLogueado) {
        mostrarAlerta('error', 'Debes iniciar sesión para acceder a esta sección');
        return;
    }

    // Quitar clase "active" de todos los .section
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Agregar "active" solo al section del tab seleccionado
    const sectionId = `${tabName}-section`;
    const section = document.getElementById(sectionId);
    
    if (section) {
        section.classList.add('active');
        appState.tabActual = tabName;
    }

    // Si entramos al tab de reporte, pre-llenar el correo
    if (tabName === 'reporte' && appState.usuarioLogueado) {
        document.getElementById('input-reporte-correo').value = appState.usuarioLogueado;
    }

    // Cargar datos del tab si es necesario
    if (tabName === 'mascotas' && appState.usuarioLogueado) {
        cargarMascotas();
    }
}

function actualizarEstadoNavegacion() {
    // Actualizar estado de los links de navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        const tabName = link.getAttribute('data-tab');
        
        // Eliminar clase active de todos
        link.classList.remove('active');
        
        // Marcar como activo el tab actual
        if (tabName === appState.tabActual) {
            link.classList.add('active');
        }

        // Bloquear/desbloquear tabs protegidos
        if (TABS_PROTEGIDOS.includes(tabName)) {
            if (appState.usuarioLogueado) {
                link.classList.remove('locked');
                link.style.pointerEvents = 'auto';
                link.style.opacity = '1';
            } else {
                link.classList.add('locked');
                link.style.pointerEvents = 'none';
                link.style.opacity = '0.4';
            }
        }
    });
}

/* ============================================
   CONFIGURACIÓN DE EVENT LISTENERS
   ============================================ */

function configurarEventListeners() {
    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.getAttribute('data-tab');
            switchTab(tabName);
            actualizarEstadoNavegacion();
        });
    });

    // Botón de salir
    document.getElementById('btn-logout').addEventListener('click', logout);

    // Formularios
    document.getElementById('form-saludo').addEventListener('submit', handleFormSaludo);
    document.getElementById('form-registro').addEventListener('submit', handleFormRegistro);
    document.getElementById('form-login').addEventListener('submit', handleFormLogin);
    document.getElementById('form-servicio').addEventListener('submit', handleFormServicio);
    document.getElementById('form-mascota').addEventListener('submit', handleFormMascota);
    document.getElementById('btn-buscar-reporte').addEventListener('click', handleBuscarReporte);

    // Input de búsqueda de mascotas
    document.getElementById('input-buscador-mascotas').addEventListener('input', filtrarMascotas);

    // Inicializar estado de navegación
    actualizarEstadoNavegacion();
}

/* ============================================
   FUNCIONES DE API (FETCH)
   ============================================ */

async function apiCall(metodo, endpoint, body = null) {
    try {
        const opciones = {
            method: metodo,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            opciones.body = JSON.stringify(body);
        }

        const respuesta = await fetch(`${API_URL}${endpoint}`, opciones);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.detail || 'Error en la solicitud');
        }

        return datos;
    } catch (error) {
        console.error('Error en API:', error);
        throw error;
    }
}

/* ============================================
   MANEJADORES DE FORMULARIOS
   ============================================ */

async function handleFormSaludo(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('input-nombre-saludo').value;

    try {
        const respuesta = await apiCall('GET', `/bienvenido/${nombre}`);
        mostrarAlerta('success', respuesta.mensaje);
        document.getElementById('form-saludo').reset();
    } catch (error) {
        mostrarAlerta('error', 'Error al saludar: ' + error.message);
    }
}

async function handleFormRegistro(e) {
    e.preventDefault();

    const correo = document.getElementById('input-registro-email').value;
    const contrasena = document.getElementById('input-registro-password').value;
    const confirmar = document.getElementById('input-registro-confirm-password').value;

    if (contrasena !== confirmar) {
        mostrarAlerta('error', 'Las contraseñas no coinciden');
        return;
    }

    try {
        await apiCall('POST', '/register', {
            correo,
            contrasena
        });
        mostrarAlerta('success', 'Registro exitoso. Ya puedes iniciar sesión.');
        document.getElementById('form-registro').reset();
        switchTab('acceso');
        actualizarEstadoNavegacion();
    } catch (error) {
        mostrarAlerta('error', 'Error en el registro: ' + error.message);
    }
}

async function handleFormLogin(e) {
    e.preventDefault();

    const correo = document.getElementById('input-login-email').value;
    const contrasena = document.getElementById('input-login-password').value;

    try {
        const respuesta = await apiCall('POST', '/login', {
            correo,
            contrasena
        });

        appState.usuarioLogueado = correo;
        
        // Actualizar badge de usuario
        actualizarBadgeUsuario(correo);
        
        mostrarAlerta('success', 'Sesión iniciada correctamente');
        document.getElementById('form-login').reset();
        
        // Desbloquear tabs protegidos
        actualizarEstadoNavegacion();
        
        // Ir al tab de inicio
        switchTab('inicio');
    } catch (error) {
        mostrarAlerta('error', 'Error en el login: ' + error.message);
    }
}

async function handleFormServicio(e) {
    e.preventDefault();

    if (!appState.usuarioLogueado) {
        mostrarAlerta('error', 'Debes iniciar sesión');
        return;
    }

    const nombre = document.getElementById('input-servicio-nombre').value;
    const precio = parseFloat(document.getElementById('input-servicio-precio').value);

    try {
        await apiCall('POST', '/agregar-servicio', {
            nombre,
            precio
        });

        mostrarAlerta('success', 'Servicio agregado exitosamente');
        document.getElementById('form-servicio').reset();
        
        // Recargar servicios
        await cargarServicios();
    } catch (error) {
        mostrarAlerta('error', 'Error al agregar servicio: ' + error.message);
    }
}

async function handleFormMascota(e) {
    e.preventDefault();

    if (!appState.usuarioLogueado) {
        mostrarAlerta('error', 'Debes iniciar sesión');
        return;
    }

    const correo = document.getElementById('input-mascota-correo').value;
    const nombre = document.getElementById('input-mascota-nombre').value;
    const tipo_servicio = document.getElementById('select-mascota-servicio').value;
    const fecha = document.getElementById('input-mascota-fecha').value;

    if (!tipo_servicio) {
        mostrarAlerta('error', 'Debes seleccionar un servicio');
        return;
    }

    try {
        await apiCall('POST', '/registrar-mascota', {
            correo,
            nombre,
            tipo_servicio,
            fecha
        });

        mostrarAlerta('success', 'Mascota registrada exitosamente');
        document.getElementById('form-mascota').reset();
        
        // Recargar mascotas
        await cargarMascotas();
    } catch (error) {
        mostrarAlerta('error', 'Error al registrar mascota: ' + error.message);
    }
}

async function handleBuscarReporte() {
    if (!appState.usuarioLogueado) {
        mostrarAlerta('error', 'Debes iniciar sesión');
        return;
    }

    const correo = document.getElementById('input-reporte-correo').value;

    if (!correo) {
        mostrarAlerta('error', 'Ingresa un correo para buscar');
        return;
    }

    try {
        const respuesta = await apiCall('GET', `/reporte/${correo}`);
        renderizarReporte(respuesta);
    } catch (error) {
        mostrarAlerta('error', 'Error al obtener reporte: ' + error.message);
    }
}

/* ============================================
   FUNCIONES DE CARGA DE DATOS
   ============================================ */

async function cargarServicios() {
    try {
        const respuesta = await apiCall('GET', '/servicios');
        appState.servicios = respuesta.servicios || [];
        
        renderizarServicios();
        actualizarSelectServicios();
    } catch (error) {
        console.error('Error al cargar servicios:', error);
    }
}

async function cargarMascotas() {
    if (!appState.usuarioLogueado) return;

    try {
        const respuesta = await apiCall('GET', `/mascotas/${appState.usuarioLogueado}`);
        appState.mascotas = respuesta.mascotas || [];
        
        renderizarMascotas();
    } catch (error) {
        console.error('Error al cargar mascotas:', error);
    }
}

/* ============================================
   FUNCIONES DE RENDERIZADO
   ============================================ */

function renderizarServicios() {
    const lista = document.getElementById('lista-servicios');
    lista.innerHTML = '';

    if (appState.servicios.length === 0) {
        lista.innerHTML = '<li style="text-align: center; color: #6b7280;">No hay servicios registrados</li>';
        return;
    }

    appState.servicios.forEach(servicio => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${servicio.nombre}</strong>
                <p style="color: #6b7280; font-size: 14px;">Precio: $${servicio.precio.toFixed(2)}</p>
            </div>
            <span style="background-color: #0ea5a0; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">$${servicio.precio.toFixed(2)}</span>
        `;
        lista.appendChild(li);
    });
}

function actualizarSelectServicios() {
    const select = document.getElementById('select-mascota-servicio');
    const opcionActual = select.value;
    
    // Limpiar opciones excepto la primera
    while (select.options.length > 1) {
        select.remove(1);
    }

    appState.servicios.forEach(servicio => {
        const option = document.createElement('option');
        option.value = servicio.nombre;
        option.textContent = `${servicio.nombre} ($${servicio.precio.toFixed(2)})`;
        select.appendChild(option);
    });

    select.value = opcionActual;
}

function renderizarMascotas() {
    const lista = document.getElementById('lista-mascotas');
    lista.innerHTML = '';

    if (appState.mascotas.length === 0) {
        lista.innerHTML = '<li style="text-align: center; color: #6b7280;">No hay mascotas registradas</li>';
        return;
    }

    appState.mascotas.forEach(mascota => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${mascota.nombre}</strong>
                <p style="color: #6b7280; font-size: 14px;">Correo: ${mascota.correo}</p>
                <p style="color: #6b7280; font-size: 14px;">Servicio: ${mascota.tipo_servicio}</p>
                <p style="color: #6b7280; font-size: 14px;">Fecha: ${mascota.fecha}</p>
            </div>
        `;
        lista.appendChild(li);
    });
}

function filtrarMascotas() {
    const filtro = document.getElementById('input-buscador-mascotas').value.toLowerCase();
    
    document.querySelectorAll('#lista-mascotas li').forEach(li => {
        const texto = li.textContent.toLowerCase();
        
        if (texto.includes(filtro)) {
            li.style.display = '';
        } else {
            li.style.display = 'none';
        }
    });
}

function renderizarReporte(datos) {
    const areaResultados = document.getElementById('area-resultados-reporte');
    
    if (!datos) {
        areaResultados.innerHTML = '<p style="color: #6b7280;">No se encontraron datos</p>';
        return;
    }

    let html = `
        <div style="width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="stat-box" style="background: linear-gradient(135deg, rgba(14, 165, 160, 0.1), rgba(52, 211, 153, 0.1)); padding: 16px; border-radius: 8px; border-left: 4px solid #0ea5a0;">
                <p style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 8px;">CANTIDAD DE SERVICIOS</p>
                <p style="font-size: 28px; font-weight: 700; color: #0ea5a0;">${datos.cantidad_servicios || 0}</p>
            </div>
            <div class="stat-box" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.1)); padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
                <p style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 8px;">TOTAL GASTADO</p>
                <p style="font-size: 28px; font-weight: 700; color: #10b981;">$${(datos.total_gastado || 0).toFixed(2)}</p>
            </div>
            <div class="stat-box" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1)); padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 8px;">CORREO</p>
                <p style="font-size: 14px; font-weight: 600; color: #1f2937; word-break: break-all;">${datos.correo}</p>
            </div>
        </div>
    `;

    // Servicios usados
    if (datos.servicios && datos.servicios.length > 0) {
        html += `
            <div style="margin-top: 24px;">
                <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #1f2937;">Servicios Utilizados</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        `;
        
        datos.servicios.forEach(servicio => {
            html += `
                <span style="
                    background-color: #0ea5a0;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                ">${servicio}</span>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    areaResultados.innerHTML = html;
}

/* ============================================
   FUNCIONES DE AUTENTICACIÓN
   ============================================ */

function actualizarBadgeUsuario(correo) {
    const userInitials = document.querySelector('.user-initials');
    const userName = document.querySelector('.user-name');

    // Extraer iniciales del correo
    const iniciales = correo.split('@')[0].slice(0, 2).toUpperCase();
    userInitials.textContent = iniciales;
    userName.textContent = correo;
}

function logout() {
    // Limpiar estado
    appState.usuarioLogueado = null;
    appState.mascotas = [];

    // Resetear badge
    document.querySelector('.user-initials').textContent = 'NC';
    document.querySelector('.user-name').textContent = 'Neo C.';

    // Bloquear tabs protegidos
    actualizarEstadoNavegacion();

    // Ir a la sección de acceso
    switchTab('acceso');

    mostrarAlerta('success', 'Sesión cerrada correctamente');
}

/* ============================================
   FUNCIONES DE ALERTAS
   ============================================ */

function mostrarAlerta(tipo, mensaje) {
    // Crear contenedor de alerta si no existe
    let contenedorAlertas = document.getElementById('alertas-container');
    
    if (!contenedorAlertas) {
        contenedorAlertas = document.createElement('div');
        contenedorAlertas.id = 'alertas-container';
        contenedorAlertas.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(contenedorAlertas);
    }

    // Crear alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
    alerta.style.cssText = `
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease-in-out;
        ${tipo === 'success' ? `
            background-color: #d1fae5;
            border: 1px solid #10b981;
            color: #10b981;
        ` : `
            background-color: #fee2e2;
            border: 1px solid #ef4444;
            color: #ef4444;
        `}
    `;

    contenedorAlertas.appendChild(alerta);

    // Eliminar alerta después de 4 segundos
    setTimeout(() => {
        alerta.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => {
            alerta.remove();
        }, 300);
    }, 4000);
}

/* ============================================
   ANIMACIONES CSS
   ============================================ */

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
