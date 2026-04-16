const API_URL = 'http://localhost:57772/api';
const SIGNALR_URL = 'http://localhost:57772/chatHub';

class WatchPartyApp {
    constructor() {
        this.currentUser = null;
        this.currentSala = null;
        this.signalRConnection = null;
        this.votacionActiva = null;
        this.votacionInterval = null;
        this.haVotadoEnEstaVotacion = false;
        
        this.init();
    }

    init() {
        this.loadUserFromStorage();
        this.bindEvents();
        this.checkUrlForSala();
        this.updateUI();
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const isMobile = window.innerWidth <= 768;
        const menuBtn = document.getElementById('mobile-menu-btn');
        if (menuBtn) {
            menuBtn.style.display = isMobile ? 'block' : 'none';
        }
    }

    loadUserFromStorage() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            this.currentUser = JSON.parse(user);
        }
    }

    saveUser(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUser = user;
    }

    clearUser() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
    }

    getToken() {
        return localStorage.getItem('token');
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

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.enviarMensaje();
        });
        document.getElementById('btn-enviar-mensaje').addEventListener('click', () => this.enviarMensaje());
        document.getElementById('btn-login-chat').addEventListener('click', () => this.showAuthModal('login'));

        document.getElementById('close-qr').addEventListener('click', () => {
            document.getElementById('qr-modal').style.display = 'none';
        });
        document.getElementById('qr-modal').addEventListener('click', (e) => {
            if (e.target.id === 'qr-modal') {
                document.getElementById('qr-modal').style.display = 'none';
            }
        });
        document.getElementById('btn-copy-link').addEventListener('click', () => this.copySalaLink());

        document.getElementById('btn-show-qr').addEventListener('click', () => this.mostrarQR(this.currentSala.codigoAcceso));
        document.getElementById('btn-copy-sala-link').addEventListener('click', () => this.copySalaLinkFromSala());
        document.getElementById('btn-cerrar-sala').addEventListener('click', () => this.cerrarSala());
        
        document.getElementById('btn-elegir-pelicula').addEventListener('click', () => this.mostrarSelectorPeliculas());
        document.getElementById('btn-iniciar-votacion').addEventListener('click', () => this.iniciarVotacion());
        
        document.getElementById('btn-cerrar-votacion').addEventListener('click', () => this.cerrarVotacion());
        
        document.getElementById('close-peliculas').addEventListener('click', () => {
            document.getElementById('peliculas-modal').style.display = 'none';
        });
        document.getElementById('peliculas-modal').addEventListener('click', (e) => {
            if (e.target.id === 'peliculas-modal') {
                document.getElementById('peliculas-modal').style.display = 'none';
            }
        });
    }

    copySalaLinkFromSala() {
        if (!this.currentSala) return;
        const joinUrl = `${window.location.origin}/?sala=${this.currentSala.codigoAcceso}`;
        navigator.clipboard.writeText(joinUrl).then(() => {
            this.showToast('Link copiado al portapapeles', 'success');
        });
    }

    cerrarSala() {
        if (this.signalRConnection) {
            const salaId = this.currentSala?.id;
            this.signalRConnection.invoke('LeaveSala', salaId).catch(() => {});
            this.signalRConnection.stop();
            this.signalRConnection = null;
        }
        this.currentSala = null;
        this.votacionActiva = null;
        if (this.votacionInterval) {
            clearInterval(this.votacionInterval);
            this.votacionInterval = null;
        }
        this.resetUI();
        window.history.replaceState({}, '', window.location.pathname);
        this.showToast('Has salido de la sala', 'info');
    }

    handleLogout() {
        if (this.signalRConnection) {
            const salaId = this.currentSala?.id;
            this.signalRConnection.invoke('LeaveSala', salaId).catch(() => {});
            this.signalRConnection.stop();
            this.signalRConnection = null;
        }
        this.clearUser();
        this.currentSala = null;
        this.votacionActiva = null;
        if (this.votacionInterval) {
            clearInterval(this.votacionInterval);
            this.votacionInterval = null;
        }
        this.resetUI();
        this.showToast('Sesión cerrada', 'info');
    }

    resetUI() {
        this.showView('landing');
        this.updateUI();
        
        document.getElementById('player-wrapper').innerHTML = '<div class="video-placeholder"><p>Esperando a que iniziie la reproducción...</p></div>';
        document.getElementById('current-movie-title').textContent = '-';
        document.getElementById('participantes-list').innerHTML = '';
        document.getElementById('participantes-count').textContent = '0';
        document.getElementById('votacion-panel').style.display = 'none';
        document.getElementById('peliculas-modal').style.display = 'none';
        document.getElementById('qr-modal').style.display = 'none';
        this.actualizarSignalRStatus('offline');
    }

    checkUrlForSala() {
        const urlParams = new URLSearchParams(window.location.search);
        const salaCodigo = urlParams.get('sala');
        if (salaCodigo) {
            document.getElementById('codigo-sala-input').value = salaCodigo;
        }
    }

    updateUI() {
        const userGuest = document.getElementById('user-guest');
        const userLogged = document.getElementById('user-logged');
        
        if (this.currentUser) {
            userGuest.style.display = 'none';
            userLogged.style.display = 'flex';
            document.getElementById('username-display').textContent = this.currentUser.username;
        } else {
            userGuest.style.display = 'flex';
            userLogged.style.display = 'none';
        }

        const chatInput = document.getElementById('chat-input');
        const btnEnviar = document.getElementById('btn-enviar-mensaje');
        const chatInputContainer = document.getElementById('chat-input-container');
        const chatLoginPrompt = document.getElementById('chat-login-prompt');

        if (this.currentSala && this.currentUser) {
            chatInput.disabled = false;
            btnEnviar.disabled = false;
            chatInputContainer.style.display = 'flex';
            chatLoginPrompt.style.display = 'none';
        } else {
            chatInput.disabled = true;
            btnEnviar.disabled = true;
            chatInputContainer.style.display = 'none';
            chatLoginPrompt.style.display = 'block';
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
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                this.saveUser(data.token, data.usuario);
                this.hideAuthModal();
                this.updateUI();
                this.showToast('Sesión iniciada correctamente', 'success');
                if (this.currentSala) this.actualizarChatUI();
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
                if (this.currentSala) this.actualizarChatUI();
            } else {
                this.showToast(data.message || 'Error al registrarse', 'error');
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    handleLogout() {
        this.clearUser();
        if (this.signalRConnection) {
            this.signalRConnection.stop();
            this.signalRConnection = null;
        }
        this.currentSala = null;
        this.showView('landing');
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
            if (response.ok) {
                this.unirseASala(data.codigoAcceso);
                this.showToast('Sala creada. Comparte el código: ' + data.codigoAcceso, 'success');
            } else {
                this.showToast('Error al crear la sala', 'error');
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    mostrarQR(codigo) {
        const modal = document.getElementById('qr-modal');
        const container = document.getElementById('qr-code-container');
        const codigoTexto = document.getElementById('qr-codigo-texto');
        
        container.innerHTML = '';
        codigoTexto.textContent = codigo;
        
        const joinUrl = `${window.location.origin}/?sala=${codigo}`;
        new QRCode(container, {
            text: joinUrl,
            width: 180,
            height: 180,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        modal.style.display = 'flex';

        console.log(modal.style.display)

    }

    copySalaLink() {
        const codigo = document.getElementById('qr-codigo-texto').textContent;
        const joinUrl = `${window.location.origin}/?sala=${codigo}`;
        navigator.clipboard.writeText(joinUrl).then(() => {
            this.showToast('Link copiado al portapapeles', 'success');
        });
    }

    async unirseSala() {
        const codigo = document.getElementById('codigo-sala-input').value.toUpperCase().trim();
        if (!codigo) {
            this.showToast('Ingresa un código de sala', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/salas/codigo/${codigo}`);
            const data = await response.json();
            
            if (response.ok) {
                this.unirseASala(codigo);
            } else {
                this.showToast('Sala no encontrada', 'error');
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    async unirseASala(codigo) {
        try {
            const response = await fetch(`${API_URL}/salas/codigo/${codigo}`);
            const sala = await response.json();

            if (!response.ok) {
                this.showToast('Sala no encontrada', 'error');
                return;
            }

            this.currentSala = sala;
            this.showView('sala');
            this.actualizarInfoSala();
            this.cargarMensajes(sala.id);
            this.conectarSignalR(sala.id);
            this.actualizarChatUI();
            
            if (sala.peliculaActualId) {
                this.cargarPeliculaActual(sala.peliculaActualId);
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    showView(view) {
        document.getElementById('landing-view').style.display = view === 'landing' ? 'block' : 'none';
        document.getElementById('sala-view').style.display = view === 'sala' ? 'block' : 'none';
        document.getElementById('sala-info').style.display = view === 'sala' ? 'flex' : 'none';
    }

    actualizarInfoSala() {
        const codigoBadge = document.getElementById('sala-codigo-badge');
        if (codigoBadge) {
            codigoBadge.textContent = this.currentSala.codigoAcceso;
        }
        
        const oldHeaderInfo = document.getElementById('sala-info');
        if (oldHeaderInfo) {
            oldHeaderInfo.style.display = 'none';
        }

        const estadoEl = document.getElementById('sala-estado');
        if (estadoEl) {
            estadoEl.textContent = this.currentSala.estado;
            estadoEl.className = `sala-estado ${this.currentSala.estado}`;
        }

        if (this.currentSala.peliculaActualId) {
            this.cargarPeliculaActual(this.currentSala.peliculaActualId);
        }
    }

    async cargarPeliculaActual(peliculaId) {
        try {
            const response = await fetch(`${API_URL}/peliculas/${peliculaId}`);
            const pelicula = await response.json();
            
            if (response.ok) {
                document.getElementById('current-movie-title').textContent = pelicula.titulo;
                this.cargarVideo(pelicula.urlVideo);
            }
        } catch (error) {
            console.error('Error cargando película:', error);
        }
    }

    cargarVideo(url) {
        const playerWrapper = document.getElementById('player-wrapper');
        
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = this.extractYouTubeId(url);
            playerWrapper.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else if (url.includes('vimeo.com')) {
            const videoId = url.split('/').pop();
            playerWrapper.innerHTML = `<iframe src="https://player.vimeo.com/video/${videoId}?autoplay=1" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
        } else {
            playerWrapper.innerHTML = `<video src="${url}" controls style="width:100%;height:100%;"></video>`;
        }
    }

    extractYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    async cargarMensajes(salaId) {
        try {
            const response = await fetch(`${API_URL}/mensajeschat/sala/${salaId}`);
            const mensajes = await response.json();
            
            if (response.ok) {
                this.mostrarMensajes(mensajes);
            }
        } catch (error) {
            console.error('Error cargando mensajes:', error);
        }
    }

    mostrarMensajes(mensajes) {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';

        if (mensajes.length === 0) {
            container.innerHTML = '<div class="chat-empty">Los mensajes aparecerán aquí</div>';
            return;
        }

        mensajes.forEach(msg => this.agregarMensajeChat(msg));
        container.scrollTop = container.scrollHeight;
    }

    agregarMensajeChat(msg) {
        const container = document.getElementById('chat-messages');
        const emptyMsg = container.querySelector('.chat-empty');
        if (emptyMsg) emptyMsg.remove();

        const div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = `
            <div class="chat-message-header">
                <span class="chat-username">${this.escapeHtml(msg.username)}</span>
                <span class="chat-time">${this.formatTime(msg.timestamp)}</span>
            </div>
            <div class="chat-text">${this.escapeHtml(msg.contenido)}</div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    async enviarMensaje() {
        const input = document.getElementById('chat-input');
        const contenido = input.value.trim();
        
        if (!contenido || !this.currentSala || !this.currentUser) return;

        const mensajeTemporal = {
            id: 'temp-' + Date.now(),
            salaId: this.currentSala.id,
            usuarioId: this.currentUser.id,
            username: this.currentUser.username,
            contenido: contenido,
            timestamp: new Date().toISOString()
        };

        this.agregarMensajeChat(mensajeTemporal);
        input.value = '';

        try {
            const response = await fetch(`${API_URL}/mensajeschat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    salaId: this.currentSala.id,
                    contenido
                })
            });

            if (!response.ok) {
                this.showToast('Error al enviar mensaje', 'error');
            }
        } catch (error) {
            this.showToast('Error al enviar mensaje', 'error');
        }
    }

    async conectarSignalR(salaId) {
        this.actualizarSignalRStatus('connecting');
        
        try {
            this.signalRConnection = new signalR.HubConnectionBuilder()
                .withUrl(SIGNALR_URL)
                .withAutomaticReconnect()
                .build();

            this.signalRConnection.on('RecibirMensaje', (mensaje) => {
                this.agregarMensajeChat(mensaje);
            });

            this.signalRConnection.on('VotacionIniciada', (votacion) => {
                this.mostrarVotacion(votacion);
            });

            this.signalRConnection.on('VotosActualizados', (votacion) => {
                this.actualizarVotacion(votacion);
            });

            this.signalRConnection.on('ParticipantesActualizados', (participantes) => {
                this.actualizarParticipantes(participantes);
            });

            this.signalRConnection.on('NuevoParticipante', (participante) => {
                this.agregarParticipante(participante);
            });

            this.signalRConnection.on('ParticipanteDesconectado', (data) => {
                this.quitarParticipante(data.connectionId);
            });

            this.signalRConnection.on('SalaActualizada', (sala) => {
                if (this.currentSala && sala.id === this.currentSala.id) {
                    this.currentSala = { ...this.currentSala, ...sala };
                    this.actualizarInfoSala();
                }
            });

            this.signalRConnection.onclose(() => {
                this.actualizarSignalRStatus('offline');
            });
            
            this.signalRConnection.onreconnecting(() => {
                this.actualizarSignalRStatus('connecting');
            });
            
            this.signalRConnection.onreconnected(() => {
                this.actualizarSignalRStatus('connected');
            });

            await this.signalRConnection.start();
            await this.signalRConnection.invoke('JoinSala', salaId);
            
            this.actualizarSignalRStatus('connected');
            
            setTimeout(async () => {
                await this.inicializarParticipantes();
            }, 500);
        } catch (error) {
            console.error('Error conectando a SignalR:', error);
            this.actualizarSignalRStatus('offline');
        }
    }

    actualizarSignalRStatus(estado) {
        const indicator = document.getElementById('signalr-indicator');
        const text = document.getElementById('signalr-text');
        
        if (!indicator || !text) return;
        
        indicator.className = 'signalr-indicator ' + estado;
        
        switch (estado) {
            case 'connected':
                text.textContent = 'Conectado';
                break;
            case 'offline':
                text.textContent = 'Desconectado';
                break;
            case 'connecting':
                text.textContent = 'Conectando...';
                break;
        }
    }

    actualizarChatUI() {
        const chatInput = document.getElementById('chat-input');
        const btnEnviar = document.getElementById('btn-enviar-mensaje');
        const chatInputContainer = document.getElementById('chat-input-container');
        const chatLoginPrompt = document.getElementById('chat-login-prompt');

        if (this.currentSala && this.currentUser) {
            chatInput.disabled = false;
            btnEnviar.disabled = false;
            chatInputContainer.style.display = 'flex';
            chatLoginPrompt.style.display = 'none';
        } else {
            chatInput.disabled = true;
            btnEnviar.disabled = true;
            chatInputContainer.style.display = 'none';
            chatLoginPrompt.style.display = 'block';
        }
    }

    mostrarVotacion(votacion) {
        this.votacionActiva = votacion;
        this.haVotadoEnEstaVotacion = false;
        
        document.querySelectorAll('.votacion-opcion').forEach(el => {
            el.classList.remove('seleccionada');
        });
        
        const panel = document.getElementById('votacion-panel');
        const opcionesContainer = document.getElementById('votacion-opciones');
        
        opcionesContainer.innerHTML = '';
        votacion.opciones.forEach(opcion => {
            const div = document.createElement('div');
            div.className = 'votacion-opcion';
            div.dataset.peliculaId = opcion.peliculaId;
            div.innerHTML = `
                <img src="${opcion.portadaUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%2260%22><rect fill=%22%23333%22 width=%22100%22 height=%2260%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22>No Cover</text></svg>'}" alt="${this.escapeHtml(opcion.titulo)}">
                <div class="votacion-opcion-info">
                    <div class="votacion-opcion-titulo">${this.escapeHtml(opcion.titulo)}</div>
                    <div class="votacion-opcion-votos">Votos: <span>0</span></div>
                </div>
            `;
            div.addEventListener('click', () => this.votar(opcion.peliculaId));
            opcionesContainer.appendChild(div);
        });

        panel.style.display = 'block';
        this.iniciarContadorVotacion(votacion);
    }

    actualizarVotacion(votacion) {
        this.votacionActiva = votacion;
        
        document.querySelectorAll('.votacion-opcion').forEach(el => {
            const peliculaId = el.dataset.peliculaId;
            const votos = votacion.votosPorOpcion[peliculaId] || 0;
            el.querySelector('.votacion-opcion-votos span').textContent = votos;
        });
    }

    iniciarContadorVotacion(votacion) {
        if (this.votacionInterval) clearInterval(this.votacionInterval);

        this.votacionInterval = setInterval(() => {
            const ahora = new Date();
            const fin = new Date(votacion.fechaFin);
            const restante = Math.max(0, Math.floor((fin - ahora) / 1000));

            const minutos = Math.floor(restante / 60);
            const segundos = restante % 60;
            
            document.getElementById('votacion-tiempo-restante').textContent = 
                `${minutos}:${segundos.toString().padStart(2, '0')}`;

            if (restante <= 0) {
                clearInterval(this.votacionInterval);
                this.finalizarVotacion();
            }
        }, 1000);
    }

    async votar(peliculaId) {
        if (!this.currentUser) {
            this.showToast('Debes iniciar sesión para votar', 'error');
            return;
        }

        if (!this.votacionActiva) return;

        if (this.haVotadoEnEstaVotacion) {
            this.showToast('Ya has votado en esta elección', 'info');
            return;
        }

        try {
            await this.signalRConnection.invoke('Votar', this.votacionActiva.id, peliculaId);
            this.marcarVotado();
            
            document.querySelectorAll('.votacion-opcion').forEach(el => {
                el.classList.remove('seleccionada');
                if (el.dataset.peliculaId === peliculaId) {
                    el.classList.add('seleccionada');
                }
            });
            this.showToast('Voto registrado', 'success');
        } catch (error) {
            this.showToast('Error al votar', 'error');
        }
    }

    async finalizarVotacion() {
        if (!this.votacionActiva) return;

        let maxVotos = 0;
        let peliculaGanadoraId = null;

        for (const [peliculaId, votos] of Object.entries(this.votacionActiva.votosPorOpcion)) {
            if (votos > maxVotos) {
                maxVotos = votos;
                peliculaGanadoraId = peliculaId;
            }
        }

        if (peliculaGanadoraId) {
            const pelicula = this.votacionActiva.opciones.find(o => o.peliculaId === peliculaGanadoraId);
            this.showToast(`Ganó: ${pelicula.titulo}`, 'info');
            
            this.currentSala.peliculaActualId = peliculaGanadoraId;
            document.getElementById('current-movie-title').textContent = pelicula.titulo;
            
            try {
                const response = await fetch(`${API_URL}/peliculas/${peliculaGanadoraId}`);
                const peliculaData = await response.json();
                if (response.ok) {
                    this.cargarVideo(peliculaData.urlVideo);
                }
            } catch (error) {
                console.error('Error cargando película ganadora:', error);
            }
        }

        document.getElementById('votacion-panel').style.display = 'none';
        this.votacionActiva = null;
    }

    async mostrarSelectorPeliculas() {
        if (!this.currentSala) return;
        
        try {
            const response = await fetch(`${API_URL}/peliculas`);
            const peliculas = await response.json();
            
            if (!response.ok) {
                this.showToast('Error al cargar películas', 'error');
                return;
            }
            
            const container = document.getElementById('peliculas-list');
            container.innerHTML = '';
            
            peliculas.forEach(pelicula => {
                const card = document.createElement('div');
                card.className = 'pelicula-card';
                card.innerHTML = `
                    <img src="${pelicula.portadaUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22100%22><rect fill=%22%23333%22 width=%22150%22 height=%22100%22/><text x=%2275%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22>No Cover</text></svg>'}" alt="${this.escapeHtml(pelicula.titulo)}">
                    <div class="pelicula-card-info">
                        <div class="pelicula-card-titulo">${this.escapeHtml(pelicula.titulo)}</div>
                        <div class="pelicula-card-duracion">${pelicula.duracion} min</div>
                    </div>
                `;
                card.addEventListener('click', () => this.seleccionarPelicula(pelicula));
                container.appendChild(card);
            });
            
            document.getElementById('peliculas-modal').style.display = 'flex';
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    async seleccionarPelicula(pelicula) {
        if (!this.currentSala) return;
        
        try {
            const response = await fetch(`${API_URL}/salas/${this.currentSala.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    peliculaActualId: pelicula.id,
                    estado: 'Reproduciendo'
                })
            });
            
            if (response.ok) {
                this.currentSala.peliculaActualId = pelicula.id;
                this.currentSala.estado = 'Reproduciendo';
                document.getElementById('current-movie-title').textContent = pelicula.titulo;
                this.cargarVideo(pelicula.urlVideo);
                document.getElementById('peliculas-modal').style.display = 'none';
                this.showToast(`Reproduciendo: ${pelicula.titulo}`, 'success');
                
                if (this.signalRConnection) {
                    this.signalRConnection.invoke('ActualizarSala', this.currentSala.id, {
                        peliculaActualId: pelicula.id,
                        estado: 'Reproduciendo'
                    }).catch(console.error);
                }
            } else {
                this.showToast('Error al seleccionar película', 'error');
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }

    async iniciarVotacion() {
        if (!this.currentSala) return;
        
        if (!this.currentUser) {
            this.showToast('Debes iniciar sesión para iniciar una votación', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/peliculas`);
            const peliculas = await response.json();
            
            if (!response.ok || peliculas.length === 0) {
                this.showToast('No hay películas disponibles para votar', 'error');
                return;
            }
            
            const peliculaIds = peliculas.map(p => p.id);
            
            if (this.signalRConnection && this.signalRConnection.state === signalR.HubConnectionState.Connected) {
                await this.signalRConnection.invoke('IniciarVotacion', this.currentSala.id, peliculaIds);
                this.showToast('Votación iniciada', 'info');
            } else {
                this.showToast('No conectado al servidor', 'error');
            }
        } catch (error) {
            console.error('Error votacion:', error);
            this.showToast('Error al iniciar votación: ' + error.message, 'error');
        }
    }

    actualizarParticipantes(participantes) {
        const container = document.getElementById('participantes-list');
        const countEl = document.getElementById('participantes-count');
        
        container.innerHTML = '';
        countEl.textContent = participantes.length.toString();
        
        let anonimos = 0;
        
        participantes.forEach(p => {
            if (p.isAnonimo) {
                anonimos++;
            } else if (p.username) {
                const badge = document.createElement('span');
                badge.className = 'participante-badge registrado';
                badge.textContent = p.username;
                container.appendChild(badge);
            }
        });
        
        if (anonimos > 0) {
            const badge = document.createElement('span');
            badge.className = 'participante-badge anonimo';
            badge.textContent = `Anonimo ${anonimos}`;
            container.appendChild(badge);
        }
    }

    agregarParticipante(participante) {
        const container = document.getElementById('participantes-list');
        const countEl = document.getElementById('participantes-count');
        
        const badgeKey = participante.isAnonimo ? `Anonimo ${participante.numeroAnonimo}` : participante.username;
        const existe = Array.from(container.children).some(child => 
            child.textContent === badgeKey
        );
        
        if (!existe) {
            const badge = document.createElement('span');
            badge.className = participante.isAnonimo ? 'participante-badge anonimo' : 'participante-badge registrado';
            badge.textContent = badgeKey;
            container.appendChild(badge);
            
            if (countEl) {
                const count = parseInt(countEl.textContent) || 0;
                countEl.textContent = (count + 1).toString();
            }
        }
    }

    quitarParticipante(connectionId) {
        const container = document.getElementById('participantes-list');
        const countEl = document.getElementById('participantes-count');
        
        const badges = container.querySelectorAll('.participante-badge');
        badges.forEach(badge => {
            const text = badge.textContent;
            if (text && text.includes(connectionId.substring(0, 8))) {
                badge.remove();
            }
        });
        
        if (countEl) {
            const count = parseInt(countEl.textContent) || 1;
            countEl.textContent = Math.max(0, count - 1).toString();
        }
    }

    async inicializarParticipantes() {
        if (!this.currentSala || !this.signalRConnection) return;
        
        try {
            const participantes = await this.signalRConnection.invoke('ObtenerParticipantes', this.currentSala.id);
            if (participantes) {
                this.actualizarParticipantes(participantes);
            }
        } catch (e) {
            console.log('No se pudieron obtener participantes:', e);
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

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cerrarVotacion() {
        if (this.votacionInterval) {
            clearInterval(this.votacionInterval);
            this.votacionInterval = null;
        }
        document.getElementById('votacion-panel').style.display = 'none';
        this.votacionActiva = null;
        this.showToast('Votación cancelada', 'info');
    }

    yaVotado() {
        return this.haVotadoEnEstaVotacion;
    }

    marcarVotado() {
        this.haVotadoEnEstaVotacion = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new WatchPartyApp();
});