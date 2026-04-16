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
        window.addEventListener('resize', () => this.handleResize());
    }

    async autoCargarPeliculas() {
        try { await fetch(`${API_URL}/Seed/peliculas`, { method: 'POST' }); } catch (e) {}
    }

    loadUserFromStorage() {
        const user = sessionStorage.getItem('user');
        if (user) this.currentUser = JSON.parse(user);
    }

    saveUser(token, user) {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        this.currentUser = user;
    }

    getToken() { return sessionStorage.getItem('token'); }

    bindEvents() {
        document.getElementById('btn-login')?.addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('btn-register')?.addEventListener('click', () => this.showAuthModal('register'));
        document.getElementById('close-auth')?.addEventListener('click', () => this.hideAuthModal());
        document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            sessionStorage.clear();
            location.reload();
        });
        document.getElementById('btn-crear-sala')?.addEventListener('click', () => this.crearSala());
        document.getElementById('btn-unirse-sala')?.addEventListener('click', () => this.unirseSala());
    }

    showAuthModal(form) {
        document.getElementById('auth-modal').style.display = 'flex';
        document.getElementById('login-form-container').style.display = form === 'login' ? 'block' : 'none';
        document.getElementById('register-form-container').style.display = form === 'register' ? 'block' : 'none';
    }

    hideAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }

    async handleLogin(e) {
        e.preventDefault();
        const identificador = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identificador, password })
        });
        const data = await res.json();
        if (res.ok) {
            this.saveUser(data.token, data.usuario);
            location.reload();
        }
    }

    async crearSala() {
        const res = await fetch(`${API_URL}/salas`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.getToken()}`, 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) location.href = `sala.html#${data.codigoAcceso}`;
    }

    async unirseSala() {
        const cod = document.getElementById('codigo-sala-input').value.toUpperCase();
        location.href = `sala.html#${cod}`;
    }

    updateUI() {
        if (this.currentUser) {
            document.getElementById('user-guest').style.display = 'none';
            document.getElementById('user-logged').style.display = 'flex';
            document.getElementById('username-display').textContent = this.currentUser.username;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { new HomeApp(); });