const API_URL = 'https://tpiddbbgrupo6-production.up.railway.app/api';
const SIGNALR_URL = 'https://tpiddbbgrupo6-production.up.railway.app/chatHub';

class SalaApp {
    constructor() {
        this.currentUser = null;
        this.currentSala = null;
        this.signalRConnection = null;
        this.votacionActiva = null;
        this.votacionInterval = null;
        this.haVotadoEnEstaVotacion = false;
        this.peliculasSeleccionadasVotacion = [];
        
        this.init();
    }

    async init() {
        this.loadUserFromStorage();
        this.bindEvents();
        this.updateUI();
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
        
        await this.cargarSalaDesdeUrl();
    }

    async cargarSalaDesdeUrl() {
        // Buscamos primero en el hash (#)
        let codigo = window.location.hash.replace('#', '');
        
        // Si no está, buscamos en la query string vieja (?)
        if (!codigo) {
            const urlParams = new URLSearchParams(window.location.search);
            codigo = urlParams.get('sala');
        }

        // Si sigue sin estar, buscamos en el localStorage
        if (!codigo || codigo === 'undefined' || codigo === 'null') {
            codigo = localStorage.getItem('salaPendiente');
            if (codigo) {
                window.history.replaceState({}, '', `#${codigo}`);
            }
        }

        if (!codigo || codigo === 'undefined' || codigo === 'null') {
            this.showToast('Error: Código de sala inválido', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = this.getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_URL}/salas/codigo/${codigo}`, {
                method: 'GET',
                headers: headers
            });
            
            if (!response.ok) {
                this.showToast('Sala no encontrada o inactiva', 'error');
                setTimeout(() => window.location.href = 'index.html', 2000);
                return;
            }

            localStorage.removeItem('salaPendiente');
            const sala = await response.json();
            this.currentSala = sala;
            
            this.actualizarInfoSala();
            this.actualizarBotonesVotacion();
            this.cargarMensajes(sala.id);
            this.conectarSignalR(sala.id);
            this.actualizarChatUI();
            this.verificarVotacionActiva(sala.id);
            
            if (sala.peliculaActualId) {
                this.cargarPeliculaActual(sala.peliculaActualId);
            }
        } catch (error) {
            this.showToast('Error de conexión al cargar la sala', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
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

    isSalaDueno() {
        return this.currentSala && this.currentUser && this.currentSala.duenoId === this.currentUser.id;
    }

    getToken() {
        return sessionStorage.getItem('token');
    }

    getVotosRealizados() {
        const votos = localStorage.getItem('votosRealizados');
        return votos ? JSON.parse(votos) : {};
    }

    guardarVoto(votacionId, peliculaId) {
        const votos = this.getVotosRealizados();
        votos[this.currentUser.id] = { votacionId, peliculaId };
        localStorage.setItem('votosRealizados', JSON.stringify(votos));
    }

    yaVotoEnVotacion(votacionId) {
        const votos = this.getVotosRealizados();
        return votos[this.currentUser.id]?.votacionId === votacionId;
    }

    getVotoEnVotacion(votacionId) {
        const votos = this.getVotosRealizados();
        if (!this.currentUser) return null;
        if (votos[this.currentUser.id]?.votacionId === votacionId) {
            return votos[this.currentUser.id].peliculaId;
        }
        return null;
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
        
        document.getElementById('btn-iniciar-votacion').addEventListener('click', () => this.onVotacionClick());
        document.getElementById('btn-elegir-peliculas').addEventListener('click', () => this.mostrarSelectorPeliculasVotacion());
        document.getElementById('btn-confirmar-seleccion').addEventListener('click', () => this.confirmarSeleccionPeliculas());
        document.getElementById('btn-cerrar-votacion').addEventListener('click', () => this.cerrarVotacion());
        
        document.getElementById('close-peliculas').addEventListener('click', () => {
            document.getElementById('peliculas-modal').style.display = 'none';
        });
        document.getElementById('peliculas-modal').addEventListener('click', (e) => {
            if (e.target.id === 'peliculas-modal') {
                document.getElementById('peliculas-modal').style.display = 'none';
            }
        });

        document.getElementById('close-seleccionar-votacion').addEventListener('click', () => {
            document.getElementById('seleccionar-votacion-modal').style.display = 'none';
        });
        document.getElementById('seleccionar-votacion-modal').addEventListener('click', (e) => {
            if (e.target.id === 'seleccionar-votacion-modal') {
                document.getElementById('seleccionar-votacion-modal').style.display = 'none';
            }
        });
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
        
        this.actualizarChatUI();
        this.actualizarBotonesVotacion();
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
                
                if (this.currentSala && this.signalRConnection) {
                    this.reconectarSignalR();
                }
            } else {
                this.showToast(data.message || 'Error al iniciar sesión', 'error');
            }
        } catch (error) {
            this.showToast('Error de conexión', 'error');
        }
    }
    
    async reconectarSignalR() {
        if (!this.currentSala || !this.signalRConnection) return;
        
        const salaId = this.currentSala.id;
        
        try {
            this.signalRConnection.stop();
            this.actualizarSignalRStatus('connecting');
            
            let builder = new signalR.HubConnectionBuilder();
            builder.withUrl(SIGNALR_URL, { accessTokenFactory: () => this.getToken() });
            
            this.signalRConnection = builder.withAutomaticReconnect().build();
            
            this.signalRConnection.on('RecibirMensaje', (mensaje) => this.agregarMensajeChat(mensaje));
            this.signalRConnection.on('VotacionIniciada', (votacion) => this.onVotacionIniciada(votacion));
            this.signalRConnection.on('VotosActualizados', (votacion) => this.actualizarVotacion(votacion));
            this.signalRConnection.on('ParticipantesActualizados', (participantes) => this.actualizarParticipantes(participantes));
            this.signalRConnection.on('NuevoParticipante', (participante) => this.agregarParticipante(participante));
            this.signalRConnection.on('ParticipanteDesconectado', (data) => this.quitarParticipante(data.connectionId));
            
            await this.signalRConnection.start();
            this.actualizarSignalRStatus('online');
            await this.signalRConnection.invoke('JoinSala', salaId);
            
            console.log('SignalR reconectado con nuevo token');
        } catch (error) {
            console.error('Error reconectando SignalR:', error);
            this.actualizarSignalRStatus('offline');
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
            const salaId = this.currentSala?.id;
            this.signalRConnection.invoke('LeaveSala', salaId).catch(() => {});
            this.signalRConnection.stop();
        }
        window.location.href = 'index.html'; 
    }

    cerrarSala() {
        if (this.signalRConnection) {
            const salaId = this.currentSala?.id;
            this.signalRConnection.invoke('LeaveSala', salaId).catch(() => {});
            this.signalRConnection.stop();
        }
        window.location.href = 'index.html';
    }

    mostrarQR(codigo) {
        const modal = document.getElementById('qr-modal');
        const container = document.getElementById('qr-code-container');
        const codigoTexto = document.getElementById('qr-codigo-texto');
        
        container.innerHTML = '';
        codigoTexto.textContent = codigo;
        
        const joinUrl = `${window.location.origin}/sala.html#${codigo}`;
        new QRCode(container, {
            text: joinUrl,
            width: 180,
            height: 180,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        modal.style.display = 'flex';
    }

    copySalaLink() {
        const codigo = document.getElementById('qr-codigo-texto').textContent;
        const joinUrl = `${window.location.origin}/sala.html#${codigo}`;
        navigator.clipboard.writeText(joinUrl).then(() => {
            this.showToast('Link copiado al portapapeles', 'success');
        });
    }

    copySalaLinkFromSala() {
        if (!this.currentSala) return;
        const joinUrl = `${window.location.origin}/sala.html#${this.currentSala.codigoAcceso}`;
        navigator.clipboard.writeText(joinUrl).then(() => {
            this.showToast('Link copiado al portapapeles', 'success');
        });
    }

    actualizarInfoSala() {
        const codigoBadge = document.getElementById('sala-codigo-badge');
        if (codigoBadge) {
            codigoBadge.textContent = this.currentSala.codigoAcceso;
        }

        const estadoEl = document.getElementById('sala-estado');
        if (estadoEl) {
            estadoEl.textContent = this.currentSala.estado;
            estadoEl.className = `sala-estado ${this.currentSala.estado}`;
        }
    }

    actualizarBotonesVotacion() {
        const esDueno = this.isSalaDueno();
        const btnElegirPeliculas = document.getElementById('btn-elegir-peliculas');
        const btnIniciarVotacion = document.getElementById('btn-iniciar-votacion');
        
        if (!this.currentSala) return;
        
        if (esDueno) {
            // Lógica para el DUEÑO
            if (btnElegirPeliculas) btnElegirPeliculas.style.display = 'inline-block';
            
            if (btnIniciarVotacion) {
                const tienePeliculasSeleccionadas = this.currentSala.peliculasParaVotar && 
                                                    this.currentSala.peliculasParaVotar.length >= 3;
                btnIniciarVotacion.style.display = tienePeliculasSeleccionadas ? 'inline-block' : 'none';
                btnIniciarVotacion.textContent = '🗳️ Iniciar Votación';
                
                // Nos aseguramos de que el dueño siempre tenga su botón habilitado
                btnIniciarVotacion.disabled = false;
                btnIniciarVotacion.style.opacity = '1';
                btnIniciarVotacion.style.cursor = 'pointer';
                btnIniciarVotacion.title = '';
            }
        } else {
            // Lógica para los INVITADOS
            if (btnElegirPeliculas) btnElegirPeliculas.style.display = 'none';
            
            if (btnIniciarVotacion) {
                btnIniciarVotacion.textContent = '🗳️ Votar';
                btnIniciarVotacion.className = 'btn btn-small btn-primary';
                btnIniciarVotacion.style.display = 'inline-block';
                
                // LA MAGIA: Si la sala ya está en reproducción, apagamos el botón
                if (this.currentSala.estado === 'Reproduciendo') {
                    btnIniciarVotacion.disabled = true;
                    btnIniciarVotacion.style.opacity = '0.5'; // Lo hace ver "apagado"
                    btnIniciarVotacion.style.cursor = 'not-allowed'; // Muestra el cursor de bloqueado
                    btnIniciarVotacion.title = 'La película ya está en reproducción';
                } else {
                    // Si están en modo 'Esperando' o 'Votando', lo encendemos
                    btnIniciarVotacion.disabled = false;
                    btnIniciarVotacion.style.opacity = '1';
                    btnIniciarVotacion.style.cursor = 'pointer';
                    btnIniciarVotacion.title = '';
                }
            }
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

    async verificarVotacionActiva() {
        if (!this.currentSala) return;
        
        try {
            const response = await fetch(`${API_URL}/votaciones/sala/${this.currentSala.id}/activa`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.id) {
                    this.mostrarVotacion(data);
                }
            }
        } catch (error) {
            console.log('No se pudo verificar votación activa:', error);
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
            if (response.ok) this.mostrarMensajes(mensajes);
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
            username: this.currentUser.username,
            contenido: contenido,
            timestamp: new Date().toISOString()
        };

        this.agregarMensajeChat(mensajeTemporal);
        input.value = '';

        try {
            await fetch(`${API_URL}/mensajeschat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({ salaId: this.currentSala.id, contenido })
            });
        } catch (error) {
            this.showToast('Error al enviar mensaje', 'error');
        }
    }

   async conectarSignalR(salaId) {
        this.actualizarSignalRStatus('connecting');
        try {
            const token = this.getToken();
            
            let builder = new signalR.HubConnectionBuilder();
            
            if (token) {
                builder.withUrl(SIGNALR_URL, { accessTokenFactory: () => token });
            } else {
                builder.withUrl(SIGNALR_URL);
            }

            this.signalRConnection = builder.withAutomaticReconnect().build();

            // Eventos de SignalR
            this.signalRConnection.on('RecibirMensaje', (mensaje) => this.agregarMensajeChat(mensaje));
            this.signalRConnection.on('VotacionIniciada', (votacion) => this.onVotacionIniciada(votacion));
            this.signalRConnection.on('VotosActualizados', (votacion) => this.actualizarVotacion(votacion));
            this.signalRConnection.on('ParticipantesActualizados', (participantes) => this.actualizarParticipantes(participantes));
            this.signalRConnection.on('NuevoParticipante', (participante) => this.agregarParticipante(participante));
            this.signalRConnection.on('ParticipanteDesconectado', (data) => this.quitarParticipante(data.connectionId));
            this.signalRConnection.on('SalaActualizada', (sala) => {
                console.log("Orden de actualizar recibida del dueño:", sala);
                
                // TRUCO: Leemos las variables en minúscula (JS) o Mayúscula (C#) para evitar errores
                const idSalaRecibida = sala.id || sala.Id;
                const peliGanadora = sala.peliculaActualId || sala.PeliculaActualId;
                const nuevoEstado = sala.estado || sala.Estado;

                if (this.currentSala && idSalaRecibida === this.currentSala.id) {
                    this.currentSala.peliculaActualId = peliGanadora;
                    this.currentSala.estado = nuevoEstado;
                    
                    // ¡AQUÍ ESTÁ LA MAGIA! Si llega una película, forzamos a recargar el reproductor
                    if (peliGanadora) {
                        this.cargarPeliculaActual(peliGanadora);
                    }
                    
                    this.actualizarInfoSala();
                }
            });
            this.signalRConnection.onclose(() => this.actualizarSignalRStatus('offline'));
            this.signalRConnection.onreconnecting(() => this.actualizarSignalRStatus('connecting'));
            this.signalRConnection.onreconnected(() => this.actualizarSignalRStatus('connected'));

            // Iniciamos la conexión
            await this.signalRConnection.start();
            console.log("Conectado a SignalR como:", token ? "Usuario Registrado" : "Invitado Anónimo");
            
            // Nos unimos a la sala
            await this.signalRConnection.invoke('JoinSala', salaId);
            
            this.actualizarSignalRStatus('connected');
            
            // Pedimos la lista de participantes a los 500ms de conectar
            setTimeout(async () => await this.inicializarParticipantes(), 500);
            
        } catch (error) {
            // Agregamos este console.error para poder ver si falla otra cosa en el futuro
            console.error("Error crítico conectando a SignalR:", error);
            this.actualizarSignalRStatus('offline');
        }
    }

    actualizarSignalRStatus(estado) {
        const indicator = document.getElementById('signalr-indicator');
        const text = document.getElementById('signalr-text');
        if (!indicator || !text) return;
        
        indicator.className = 'signalr-indicator ' + estado;
        if (estado === 'connected') text.textContent = 'Conectado';
        else if (estado === 'offline') text.textContent = 'Desconectado';
        else if (estado === 'connecting') text.textContent = 'Conectando...';
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

    async inicializarParticipantes() {
        if (!this.currentSala || !this.signalRConnection) return;
        try {
            const participantes = await this.signalRConnection.invoke('ObtenerParticipantes', this.currentSala.id);
            if (participantes) this.actualizarParticipantes(participantes);
        } catch (e) {
            console.log('No se pudieron obtener participantes:', e);
        }
    }

   actualizarParticipantes(participantes) {
        const container = document.getElementById('participantes-list');
        const countEl = document.getElementById('participantes-count');
        
        // Vaciamos la lista visual
        container.innerHTML = '';
        
        // Actualizamos el número total sumando a todos (registrados y anónimos)
        if (countEl) countEl.textContent = participantes.length.toString();
        
        // Solo dibujamos el cartel para los usuarios que SÍ tienen cuenta (registrados)
        participantes.forEach(p => {
            if (!p.isAnonimo && p.username) {
                const badge = document.createElement('span');
                badge.className = 'participante-badge registrado';
                badge.textContent = p.username;
                container.appendChild(badge);
            }
        });
    }

    agregarParticipante(participante) {
        const container = document.getElementById('participantes-list');
        const countEl = document.getElementById('participantes-count');
        
        // Sumamos 1 al número total visualmente
        if (countEl) {
            const count = parseInt(countEl.textContent) || 0;
            countEl.textContent = (count + 1).toString();
        }
        
        // Si el participante está registrado, agregamos su nombre a la lista
        if (!participante.isAnonimo && participante.username) {
            const existe = Array.from(container.children).some(child => 
                child.textContent === participante.username
            );
            
            if (!existe) {
                const badge = document.createElement('span');
                badge.className = 'participante-badge registrado';
                badge.textContent = participante.username;
                container.appendChild(badge);
            }
        }
    }

    quitarParticipante(connectionId) {
        const countEl = document.getElementById('participantes-count');
        
        // Restamos 1 al contador visual
        if (countEl) {
            const count = parseInt(countEl.textContent) || 1;
            countEl.textContent = Math.max(0, count - 1).toString();
        }
        
        // Para mantener los nombres de los registrados perfectamente sincronizados
        // al salir alguien, forzamos un refresco de la lista desde el servidor:
        if (this.signalRConnection && this.currentSala) {
            this.inicializarParticipantes();
        }
    }

    async onVotacionClick() {
        if (this.isSalaDueno()) await this.iniciarVotacion();
        else await this.mostrarVotacionActual();
    }

    async verificarVotacionActiva(salaId) {
        try {
            const response = await fetch(`${API_URL}/votaciones/sala/${salaId}/activa`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.id) {
                    if (this.currentUser && this.getToken()) {
                        const votoResponse = await fetch(`${API_URL}/votaciones/${data.id}/voto`, {
                            headers: { 'Authorization': `Bearer ${this.getToken()}` }
                        });
                        if (votoResponse.ok) {
                            const votoData = await votoResponse.json();
                            if (votoData.yaVoto) {
                                this.guardarVoto(data.id, votoData.peliculaId);
                            }
                        }
                    }
                    this.mostrarVotacion(data, true);
                }
            }
        } catch (error) {
            console.error('Error al verificar votación activa:', error);
        }
    }

    async onVotacionIniciada(votacion) {
        try {
            if (this.getToken()) {
                const votoResponse = await fetch(`${API_URL}/votaciones/${votacion.id}/voto`, {
                    headers: { 'Authorization': `Bearer ${this.getToken()}` }
                });
                if (votoResponse.ok) {
                    const votoData = await votoResponse.json();
                    if (votoData.yaVoto) {
                        this.guardarVoto(votacion.id, votoData.peliculaId);
                    }
                }
            }
            this.mostrarVotacion(votacion, false);
        } catch (error) {
            this.mostrarVotacion(votacion, false);
        }
    }

    async mostrarVotacionActual() {
        if (!this.currentSala || !this.currentUser) {
            this.showToast('Debes iniciar sesión para ver la votación', 'error');
            return;
        }
        try {
            const response = await fetch(`${API_URL}/votaciones/sala/${this.currentSala.id}/activa`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.id) {
                    if (this.getToken()) {
                        const votoResponse = await fetch(`${API_URL}/votaciones/${data.id}/voto`, {
                            headers: { 'Authorization': `Bearer ${this.getToken()}` }
                        });
                        if (votoResponse.ok) {
                            const votoData = await votoResponse.json();
                            if (votoData.yaVoto) {
                                this.guardarVoto(data.id, votoData.peliculaId);
                            }
                        }
                    }
                    this.mostrarVotacion(data, false);
                }
                else this.showToast('No hay votación activa', 'info');
            } else {
                this.showToast('No hay votación activa', 'info');
            }
        } catch (error) {
            this.showToast('Error al verificar votación', 'info');
        }
    }

    mostrarVotacion(votacion, skipToast = false) {
        this.votacionActiva = votacion;
        
        const ahora = new Date();
        const fin = new Date(votacion.fechaFin);
        
        if (ahora >= fin) {
            this.finalizarVotacion();
            return;
        }
        
        const votoPrevio = this.getVotoEnVotacion(votacion.id);
        this.haVotadoEnEstaVotacion = !!votoPrevio;
        
        const panel = document.getElementById('votacion-panel');
        const opcionesContainer = document.getElementById('votacion-opciones');
        opcionesContainer.innerHTML = '';
        
        votacion.opciones.forEach(opcion => {
            const div = document.createElement('div');
            const yaVotoEstaOpcion = votoPrevio === opcion.peliculaId;
            div.className = 'votacion-opcion' + (yaVotoEstaOpcion ? ' seleccionada' : '');
            div.dataset.peliculaId = opcion.peliculaId;
            div.innerHTML = `
                <img src="${opcion.portadaUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%2260%22><rect fill=%22%23333%22 width=%22100%22 height=%2260%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22>No Cover</text></svg>'}" alt="${this.escapeHtml(opcion.titulo)}">
                <div class="votacion-opcion-info">
                    <div class="votacion-opcion-titulo">${this.escapeHtml(opcion.titulo)} ${yaVotoEstaOpcion ? '<span style="color: var(--color-success);">✓ (Ya votaste)</span>' : ''}</div>
                    <div class="votacion-opcion-votos">Votos: <span>${votacion.votosPorOpcion[opcion.peliculaId] || 0}</span></div>
                </div>
            `;
            if (!yaVotoEstaOpcion) {
                div.addEventListener('click', () => this.votar(opcion.peliculaId));
            }
            opcionesContainer.appendChild(div);
        });

        panel.style.display = 'block';
        this.iniciarContadorVotacion(votacion);
        
        if (!skipToast) {
            this.showToast('Votación en curso', 'info');
        }
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
            
            document.getElementById('votacion-tiempo-restante').textContent = `${minutos}:${segundos.toString().padStart(2, '0')}`;

            if (restante <= 0) {
                clearInterval(this.votacionInterval);
                this.finalizarVotacion();
            }
        }, 1000);
    }

    async votar(peliculaId) {
        if (!this.currentUser || !this.votacionActiva || this.haVotadoEnEstaVotacion) return;

        try {
            await this.signalRConnection.invoke('Votar', this.votacionActiva.id, peliculaId);
            this.haVotadoEnEstaVotacion = true;
            this.guardarVoto(this.votacionActiva.id, peliculaId);
            
            document.querySelectorAll('.votacion-opcion').forEach(el => {
                el.classList.remove('seleccionada');
                const titulo = el.querySelector('.votacion-opcion-titulo');
                titulo.innerHTML = titulo.textContent.replace(' ✓ (Ya votaste)', '');
                el.onclick = null;
            });
            const votedEl = document.querySelector(`[data-pelicula-id="${peliculaId}"]`);
            if (votedEl) {
                votedEl.classList.add('seleccionada');
                const titulo = votedEl.querySelector('.votacion-opcion-titulo');
                titulo.innerHTML = titulo.textContent + ' <span style="color: var(--color-success);">✓ (Ya votaste)</span>';
            }
            this.showToast('Voto registrado', 'success');
        } catch (error) {
            if (error.message && error.message.includes('ya votó')) {
                this.haVotadoEnEstaVotacion = true;
                this.showToast('Ya has votado en esta votación', 'info');
            } else {
                this.showToast('Error al votar', 'error');
            }
        }
    }

   async finalizarVotacion() {
        if (!this.votacionActiva) return;

        // 1. Frenamos el reloj
        if (this.votacionInterval) {
            clearInterval(this.votacionInterval);
            this.votacionInterval = null;
        }

        // 2. Escondemos el panel para TODOS
        document.getElementById('votacion-panel').style.display = 'none';

        // 3. SOLO EL DUEÑO decide el ganador y da la orden general
        if (this.isSalaDueno()) {
            let maxVotos = 0, peliculaGanadoraId = null, hayEmpate = false;
            
            Object.entries(this.votacionActiva.votosPorOpcion).forEach(([peliculaId, votos]) => {
                if (votos > maxVotos) { maxVotos = votos; peliculaGanadoraId = peliculaId; hayEmpate = false; }
                else if (votos === maxVotos && maxVotos > 0) hayEmpate = true;
            });

            // Desempate automático
            if (maxVotos === 0 || hayEmpate) {
                const opciones = this.votacionActiva.opciones;
                const randomIndex = Math.floor(Math.random() * opciones.length);
                peliculaGanadoraId = opciones[randomIndex].peliculaId;
                this.showToast(`Selección aleatoria: ${opciones[randomIndex].titulo}`, 'info');
            }

            if (peliculaGanadoraId) {
                this.currentSala.peliculaActualId = peliculaGanadoraId;
                this.currentSala.estado = 'Reproduciendo';
                
                // El dueño se auto-carga la película
                this.cargarPeliculaActual(peliculaGanadoraId);
                
                try {
                    // Guardamos en la Base de Datos
                    await fetch(`${API_URL}/salas/${this.currentSala.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
                        body: JSON.stringify({ peliculaActualId: peliculaGanadoraId, estado: 'Reproduciendo' })
                    });

                    // LE DAMOS LA ORDEN A LOS INVITADOS POR SIGNALR
                    if (this.signalRConnection) {
                        this.signalRConnection.invoke('ActualizarSala', this.currentSala.id, {
                            id: this.currentSala.id,
                            peliculaActualId: peliculaGanadoraId,
                            estado: 'Reproduciendo'
                        }).catch(console.error);
                    }
                } catch (error) {
                    console.error('Error guardando ganador:', error);
                }
            }
        }

        this.votacionActiva = null;
    }

    async iniciarVotacion() {
        if (!this.currentSala || !this.currentUser) return;
        const peliculaIds = this.currentSala.peliculasParaVotar;
        
        if (!peliculaIds || peliculaIds.length < 3) {
            this.showToast('Selecciona entre 3 y 6 películas primero', 'error');
            return;
        }
        
        if (this.signalRConnection && this.signalRConnection.state === signalR.HubConnectionState.Connected) {
            try {
                await this.signalRConnection.invoke('IniciarVotacion', this.currentSala.id, peliculaIds);
                this.showToast('Votación iniciada', 'info');
            } catch (error) {
                this.showToast('Error al iniciar votación', 'error');
            }
        }
    }

    cerrarVotacion() {
        if (this.votacionInterval) clearInterval(this.votacionInterval);
        document.getElementById('votacion-panel').style.display = 'none';
        this.votacionActiva = null;
    }

    async mostrarSelectorPeliculasVotacion() {
        try {
            const response = await fetch(`${API_URL}/peliculas`);
            const peliculas = await response.json();
            
            this.peliculasSeleccionadasVotacion = [];
            const container = document.getElementById('peliculas-seleccion-grid');
            container.innerHTML = '';
            
            peliculas.forEach(pelicula => {
                const card = document.createElement('div');
                card.className = 'pelicula-card';
                card.dataset.peliculaId = pelicula.id;
                card.innerHTML = `
                    <div class="check-icon">✓</div>
                    <img src="${pelicula.portadaUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22100%22><rect fill=%22%23333%22 width=%22150%22 height=%22100%22/><text x=%2275%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22>No Cover</text></svg>'}" alt="${this.escapeHtml(pelicula.titulo)}">
                    <div class="pelicula-card-info">
                        <div class="pelicula-card-titulo">${this.escapeHtml(pelicula.titulo)}</div>
                        <div class="pelicula-card-duracion">${pelicula.duracion} min</div>
                    </div>
                `;
                card.addEventListener('click', () => this.toggleSeleccionPelicula(card, pelicula));
                container.appendChild(card);
            });
            
            this.actualizarContadorSeleccion();
            document.getElementById('seleccionar-votacion-modal').style.display = 'flex';
        } catch (error) {
            this.showToast('Error cargando catálogo', 'error');
        }
    }

    toggleSeleccionPelicula(card, pelicula) {
        const index = this.peliculasSeleccionadasVotacion.findIndex(p => p.id === pelicula.id);
        if (index >= 0) {
            this.peliculasSeleccionadasVotacion.splice(index, 1);
            card.classList.remove('seleccionada');
        } else {
            if (this.peliculasSeleccionadasVotacion.length >= 6) return this.showToast('Máximo 6 películas', 'info');
            this.peliculasSeleccionadasVotacion.push(pelicula);
            card.classList.add('seleccionada');
        }
        this.actualizarContadorSeleccion();
    }

    actualizarContadorSeleccion() {
        const contador = document.getElementById('seleccion-contador');
        const btnConfirmar = document.getElementById('btn-confirmar-seleccion');
        const count = this.peliculasSeleccionadasVotacion.length;
        
        if (count < 3) {
            contador.textContent = `Selecciona ${3 - count} más (mínimo 3, máximo 6)`;
            btnConfirmar.disabled = true;
        } else {
            contador.textContent = `${count} películas seleccionadas (máximo 6)`;
            btnConfirmar.disabled = false;
        }
    }

    async confirmarSeleccionPeliculas() {
        const peliculaIds = this.peliculasSeleccionadasVotacion.map(p => p.id);
        try {
            const response = await fetch(`${API_URL}/salas/${this.currentSala.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
                body: JSON.stringify({ peliculasParaVotar: peliculaIds })
            });
            
            if (response.ok) {
                this.currentSala.peliculasParaVotar = peliculaIds;
                document.getElementById('seleccionar-votacion-modal').style.display = 'none';
                this.actualizarBotonesVotacion();
                this.showToast('Películas guardadas para votación', 'success');
            }
        } catch (error) {
            this.showToast('Error guardando selección', 'error');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SalaApp();
});