const API_URL = 'https://tpiddbbgrupo6-production.up.railway.app/api';

class HomeApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        this.autoCargarPeliculas();
        this.loadUserFromStorage();
        this.bindEvents();
        this.updateUI();
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    async autoCargarPeliculas() {
        try {
            await fetch(`${API_URL}/Seed/peliculas`, { method: 'POST' });
        } catch (e) {
            console.log("Las películas ya estaban cargadas o el servidor no responde.");
        }
    }

    handleResize() {
        const isMobile = window.innerWidth <= 768;
        const menuBtn = document.getElementById('mobile-menu-btn');
        if (menuBtn) {
            menuBtn.style.display = isMobile ? 'block' : 'none';
        }
    }

    loadUserFromStorage() {
        const token = sessionStorage.getItem('token'); // <-- cambiado
        const user = sessionStorage.getItem('user');   // <-- cambiado
        if (token && user) {
            this.currentUser = JSON.parse(user);
        }
    }

    saveUser(token, user) {
        sessionStorage.setItem('token', token); // <-- cambiado
        sessionStorage.setItem('user', JSON.stringify(user)); // <-- cambiado
        this.currentUser = user;
    }

    clearUser() {
        sessionStorage.removeItem('token'); // <-- cambiado
        sessionStorage.removeItem('user');  // <-- cambiado
        this.currentUser = null;
    }

    getToken() {
        return sessionStorage.getItem('token'); // <-- cambiado
    }

    bindEvents() {
        document.getElementById('btn-login').addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('btn-register').addEventListener('click', () => this.showAuthModal('register'));
        document.getElementById('close-auth').addEventListener('click', () => this.hideAuthModal());
        document.getElementById('switch-to-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthForm('register');
        });
        document.getElementById('switch-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthForm('login');
        });

        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('btn-logout').addEventListener('click', () => this.handleLogout());

        document.getElementById('btn-crear-sala').addEventListener('click', () => this.crearSala());
        document.getElementById('btn-unirse-sala').addEventListener('click', () => this.unirseSala());
        document.getElementById('codigo-sala-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.unirseSala();
        });
    }

    updateUI() {
        const userGuest = document.getElementById('user-guest');
        const userLogged = document.getElementById('user-logged');
        const btnCrearSala = document.getElementById('btn-crear-sala');
        
        if (this.currentUser) {
            userGuest.style.display = 'none';
            userLogged.style.display = 'flex';
            document.getElementById('username-display').textContent = this.currentUser.username;
            if (btnCrearSala) {
                btnCrearSala.disabled = false;
                btnCrearSala.title = 'Crear una nueva sala';
            }
        } else {
            userGuest.style.display = 'flex';
            userLogged.style.display = 'none';
            if (btnCrearSala) {
                btnCrearSala.disabled = true;
                btnCrearSala.title = 'Inicia sesión para crear una sala';
            }
        }
    }

    showAuthModal(form = 'login') {
        document.getElementById('auth-modal').style.display = 'flex';
        this.showAuthForm(form);
    }

    hideAuthModal() {
        document.getElementById('auth-modal').style.display = 'none';
    }

    showAuthForm(form) {
        document.getElementById('login-form-container').style.display = form === 'login' ? 'block' : 'none';
        document.getElementById('register-form-container').style.display = form === 'register' ? 'block' : 'none';
    }

    async handleLogin(e) {
        e.preventDefault();
        const identificador = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identificador, password })
            });

            const data = await response.json();
            if (response.ok) {
                this.saveUser(data.token, data.usuario);
                this.hideAuthModal();
                this.updateUI();
                this.showToast('Sesión iniciada correctamente', 'success');
            } else {
                this.showToast(data.message || 'Error al iniciar sesión', 'error');
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        const emailLower = email.toLowerCase().trim();
        if (!emailLower.endsWith('@gmail.com') && !emailLower.endsWith('@hotmail.com')) {
            this.showToast('Solo se permiten correos de @gmail.com o @hotmail.com', 'error');
            return; 
        }

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            if (response.ok) {
                this.saveUser(data.token, data.usuario);
                this.hideAuthModal();
                this.updateUI();
                this.showToast('Registro exitoso', 'success');
            } else {
                this.showToast(data.message || 'Error al registrarse', 'error');
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    handleLogout() {
        this.clearUser();
        this.updateUI();
        this.showToast('Sesión cerrada', 'info');
    }

    async crearSala() {
        if (!this.currentUser) {
            this.showToast('Debes iniciar sesión para crear una sala', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/salas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({})
            });

            const data = await response.json();
            const codigo = data.codigoAcceso || data.CodigoAcceso || data.codigo || data.id;

            if (response.ok && codigo) {
                localStorage.setItem('salaPendiente', codigo);
                window.location.href = `sala.html#${codigo}`;
            } else {
                this.showToast('Error al crear la sala', 'error');
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    async unirseSala() {
        const codigo = document.getElementById('codigo-sala-input').value.toUpperCase().trim();
        if (!codigo) {
            this.showToast('Ingresa un código de sala', 'error');
            return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/salas/codigo/${codigo}`, {
                method: 'GET',
                headers: headers
            });
            
            if (response.ok) {
                localStorage.setItem('salaPendiente', codigo);
                window.location.href = `sala.html#${codigo}`;
            } else {
                this.showToast('Sala no encontrada', 'error');
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new HomeApp();
});