<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eric IA - Administration</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6c63ff;
            --primary-light: #ede9fe;
            --primary-dark: #5a52d5;
            --success: #16a34a;
            --success-light: #dcfce7;
            --danger: #ef4444;
            --danger-light: #fef2f2;
            --gray-50: #f8fafc;
            --gray-100: #f1f5f9;
            --gray-200: #e5e7eb;
            --gray-300: #e2e8f0;
            --gray-400: #94a3b8;
            --gray-500: #64748b;
            --gray-600: #475569;
            --gray-800: #1e293b;
            --gray-900: #1a1a2e;
            --font: 'Inter', sans-serif;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: var(--font); background: var(--gray-50); color: var(--gray-900); min-height: 100vh; }

        /* ===== ÉCRAN LOGIN ===== */
        #screen-login {
            display: flex;
            height: 100vh;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #f8fafc 0%, #ede9fe 100%);
        }
        #screen-login.hidden { display: none; }
        .login-card {
            background: #ffffff;
            border-radius: 24px;
            padding: 48px 40px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(108, 99, 255, 0.1);
            border: 1px solid var(--gray-200);
        }
        .login-icon {
            width: 80px; height: 80px; border-radius: 50%;
            background: var(--primary);
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px;
            box-shadow: 0 8px 24px rgba(108, 99, 255, 0.3);
        }
        .login-icon span { color: white; font-size: 36px; font-weight: 800; }
        .login-title { font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 8px; }
        .login-subtitle { font-size: 14px; color: var(--gray-500); text-align: center; margin-bottom: 32px; }
        .input-group-custom { position: relative; margin-bottom: 16px; }
        .input-group-custom .input-icon {
            position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
            font-size: 18px; z-index: 5;
        }
        .input-group-custom input {
            width: 100%; padding-left: 48px; height: 52px; border-radius: 12px;
            border: 1px solid var(--gray-300); background: var(--gray-100);
            font-size: 15px; transition: all 0.2s; outline: none;
        }
        .input-group-custom input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
            background: #fff;
        }
        .btn-eye {
            position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
            background: none; border: none; font-size: 18px; cursor: pointer; z-index: 5;
        }
        .btn-login {
            width: 100%; height: 52px; border-radius: 12px;
            background: var(--primary); color: white;
            font-size: 16px; font-weight: 700; border: none;
            margin-top: 8px; transition: all 0.2s; cursor: pointer;
        }
        .btn-login:hover { background: var(--primary-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3); }
        .btn-login:disabled { opacity: 0.6; transform: none; cursor: not-allowed; }
        .login-footer { text-align: center; font-size: 12px; color: var(--gray-400); margin-top: 24px; }
        .login-error {
            background: var(--danger-light); border: 1px solid #fecaca;
            border-radius: 10px; padding: 12px; margin-bottom: 16px;
            color: #b91c1c; font-size: 13px; text-align: center; display: none;
        }
        .login-error.show { display: block; }

        /* ===== PANEL ADMIN ===== */
        #screen-admin { display: none; }
        #screen-admin.active { display: block; }

        .admin-header {
            background: #fff; border-bottom: 1px solid var(--gray-200);
            padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;
            position: sticky; top: 0; z-index: 100;
        }
        .admin-header .brand { font-size: 20px; font-weight: 800; color: var(--primary); }
        .admin-header .subtitle { font-size: 12px; color: var(--gray-500); }
        .admin-header .header-right { display: flex; align-items: center; gap: 12px; }
        .admin-header .user-badge {
            font-size: 12px; color: var(--gray-600); background: var(--gray-100);
            padding: 6px 12px; border-radius: 8px; font-weight: 600;
        }
        .btn-logout {
            padding: 6px 14px; background: var(--danger-light); color: var(--danger);
            border: none; border-radius: 8px; font-size: 12px; font-weight: 600;
            cursor: pointer; transition: all 0.2s;
        }
        .btn-logout:hover { background: #fee2e2; }

        .admin-container { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }

        .nav-tabs-custom { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .nav-tab {
            padding: 10px 20px; border-radius: 10px; border: 1px solid var(--gray-200);
            background: #fff; font-size: 14px; font-weight: 600; color: var(--gray-500);
            cursor: pointer; transition: all 0.2s;
        }
        .nav-tab:hover { border-color: var(--primary); color: var(--primary); }
        .nav-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }

        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .card-custom {
            background: #fff; border: 1px solid var(--gray-200);
            border-radius: 14px; padding: 24px; margin-bottom: 20px;
        }
        .card-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: var(--gray-800); }

        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-size: 12px; font-weight: 600; color: var(--gray-500); margin-bottom: 6px; }
        .form-group input, .form-group select {
            height: 44px; border-radius: 10px; border: 1px solid var(--gray-200);
            padding: 0 14px; font-size: 14px; background: var(--gray-50); transition: all 0.2s;
            outline: none;
        }
        .form-group input:focus, .form-group select:focus {
            border-color: var(--primary); box-shadow: 0 0 0 3px rgba(108,99,255,0.1);
            background: #fff;
        }

        .btn-add {
            margin-top: 16px; padding: 12px 24px; border-radius: 10px;
            background: var(--primary); color: #fff; border: none;
            font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .btn-add:hover { background: var(--primary-dark); }
        .btn-add:disabled { opacity: 0.6; cursor: not-allowed; }

        .table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: var(--gray-50); padding: 10px 12px; text-align: left; font-weight: 600; color: var(--gray-500); border-bottom: 1px solid var(--gray-200); white-space: nowrap; }
        td { padding: 10px 12px; border-bottom: 1px solid var(--gray-100); color: var(--gray-800); }
        tr:hover td { background: var(--gray-50); }

        .badge-active { background: var(--success-light); color: var(--success); padding: 3px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; }
        .badge-inactive { background: var(--danger-light); color: var(--danger); padding: 3px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; }

        .btn-delete {
            background: var(--danger-light); color: var(--danger); border: none;
            border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 600;
            cursor: pointer; transition: all 0.2s;
        }
        .btn-delete:hover { background: #fee2e2; }

        .btn-toggle {
            background: var(--primary-light); color: var(--primary); border: none;
            border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 600;
            cursor: pointer; transition: all 0.2s; margin-right: 6px;
        }
        .btn-toggle:hover { background: #ddd6fe; }

        .alert-msg { padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 13px; font-weight: 500; display: none; }
        .alert-msg.success { background: var(--success-light); color: #166534; border: 1px solid #bbf7d0; display: block; }
        .alert-msg.error { background: var(--danger-light); color: #b91c1c; border: 1px solid #fecaca; display: block; }

        .empty-row { text-align: center; padding: 40px; color: var(--gray-500); }

        @media (max-width: 576px) {
            .login-card { margin: 16px; padding: 32px 24px; }
            .form-grid { grid-template-columns: 1fr; }
            .admin-container { padding: 16px 12px; }
            .admin-header { padding: 12px 16px; }
        }
    </style>
</head>
<body>

    <!-- ============================================================ -->
    <!-- ÉCRAN : CONNEXION ADMIN -->
    <!-- ============================================================ -->
    <div id="screen-login">
        <div class="login-card">
            <div class="login-icon"><span>⚙️</span></div>
            <h1 class="login-title">Eric IA</h1>
            <p class="login-subtitle">Panel d'administration<br>Accès réservé aux administrateurs</p>
            
            <div id="loginError" class="login-error"></div>

            <form onsubmit="return false;">
                <div class="input-group-custom">
                    <span class="input-icon">👤</span>
                    <input type="text" id="adminLogin" placeholder="Identifiant administrateur" autocomplete="username">
                </div>
                <div class="input-group-custom">
                    <span class="input-icon">🔒</span>
                    <input type="password" id="adminMdp" placeholder="Mot de passe" autocomplete="current-password">
                    <button type="button" class="btn-eye" onclick="togglePassword()">
                        <i class="bi bi-eye" id="eyeIcon"></i>
                    </button>
                </div>
                <button type="submit" class="btn-login" id="btnAdminLogin" onclick="handleAdminLogin()">
                    Se connecter
                </button>
            </form>
            
            <p class="login-footer">🔐 Accès sécurisé • Administrateurs uniquement</p>
        </div>
    </div>

    <!-- ============================================================ -->
    <!-- ÉCRAN : PANEL ADMINISTRATION -->
    <!-- ============================================================ -->
    <div id="screen-admin">
        <div class="admin-header">
            <div>
                <div class="brand">Eric IA ⚙️</div>
                <div class="subtitle">Panel d'administration</div>
            </div>
            <div class="header-right">
                <span class="user-badge" id="adminUserBadge">👤 Admin</span>
                <a href="" style="font-size:13px; color:var(--primary); text-decoration:none; font-weight:600;">
                    <i class="bi bi-app"></i> App
                </a>
                <button class="btn-logout" onclick="handleAdminLogout()">
                    <i class="bi bi-box-arrow-right"></i> Déconnexion
                </button>
            </div>
        </div>

        <div class="admin-container">
            <!-- Navigation -->
            <div class="nav-tabs-custom">
                <button class="nav-tab active" onclick="switchTab('bases', this)">🗄️ Bases</button>
                <button class="nav-tab" onclick="switchTab('users', this)">👤 Utilisateurs</button>
                <button class="nav-tab" onclick="switchTab('access', this)">🔗 Accès</button>
            </div>

            <!-- ==================== TAB BASES ==================== -->
            <div id="tab-bases" class="tab-content active">
                <div class="card-custom">
                    <div class="card-title">➕ Ajouter une base de données</div>
                    <div id="alert-bases" class="alert-msg"></div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Identifiant (base_id)</label>
                            <input type="text" id="b_id" placeholder="base_001">
                        </div>
                        <div class="form-group">
                            <label>Hôte</label>
                            <input type="text" id="b_hote" placeholder="localhost">
                        </div>
                        <div class="form-group">
                            <label>Nom de la base</label>
                            <input type="text" id="b_nom" placeholder="u738064605_microfinance">
                        </div>
                        <div class="form-group">
                            <label>Utilisateur MySQL</label>
                            <input type="text" id="b_user" placeholder="u738064605_root">
                        </div>
                        <div class="form-group">
                            <label>Mot de passe MySQL</label>
                            <input type="password" id="b_pass" placeholder="••••••••">
                        </div>
                    </div>
                    <button class="btn-add" onclick="addBase()">
                        <i class="bi bi-plus-circle"></i> Ajouter la base
                    </button>
                </div>

                <div class="card-custom">
                    <div class="card-title">📋 Bases enregistrées</div>
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>ID</th><th>Nom</th><th>Hôte</th><th>Utilisateur</th><th>Actions</th></tr></thead>
                            <tbody id="table-bases"><tr><td colspan="5" class="empty-row">Chargement...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ==================== TAB UTILISATEURS ==================== -->
            <div id="tab-users" class="tab-content">
                <div class="card-custom">
                    <div class="card-title">➕ Ajouter un utilisateur</div>
                    <div id="alert-users" class="alert-msg"></div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Identifiant (utilisateur_id)</label>
                            <input type="text" id="u_id" placeholder="USR001">
                        </div>
                        <div class="form-group">
                            <label>Nom & Prénom</label>
                            <input type="text" id="u_nom" placeholder="Jean Dupont">
                        </div>
                        <div class="form-group">
                            <label>Login</label>
                            <input type="text" id="u_login" placeholder="jdupont">
                        </div>
                        <div class="form-group">
                            <label>Mot de passe</label>
                            <input type="text" id="u_mdp" placeholder="motdepasse123">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="u_email" placeholder="jean@email.com">
                        </div>
                        <div class="form-group">
                            <label>Téléphone</label>
                            <input type="text" id="u_tel" placeholder="+221 77 000 00 00">
                        </div>
                        <div class="form-group">
                            <label>Rôle</label>
                            <select id="u_role">
                                <option value="administrateur">Administrateur</option>
                                <option value="gestionnaire">Gestionnaire</option>
                                <option value="utilisateur" selected>Utilisateur</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>État</label>
                            <select id="u_etat">
                                <option value="actif" selected>Actif</option>
                                <option value="inactif">Inactif</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn-add" onclick="addUser()">
                        <i class="bi bi-person-plus"></i> Ajouter l'utilisateur
                    </button>
                </div>

                <div class="card-custom">
                    <div class="card-title">📋 Utilisateurs enregistrés</div>
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>ID</th><th>Nom</th><th>Login</th><th>Email</th><th>Rôle</th><th>État</th><th>Actions</th></tr></thead>
                            <tbody id="table-users"><tr><td colspan="7" class="empty-row">Chargement...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ==================== TAB ACCÈS ==================== -->
            <div id="tab-access" class="tab-content">
                <div class="card-custom">
                    <div class="card-title">➕ Ajouter un accès (lier utilisateur ↔ base)</div>
                    <div id="alert-access" class="alert-msg"></div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Identifiant accès (id)</label>
                            <input type="text" id="a_id" placeholder="ACC001">
                        </div>
                        <div class="form-group">
                            <label>Utilisateur</label>
                            <select id="a_user"><option value="">Chargement...</option></select>
                        </div>
                        <div class="form-group">
                            <label>Base de données</label>
                            <select id="a_base"><option value="">Chargement...</option></select>
                        </div>
                        <div class="form-group">
                            <label>Clé API (Groq)</label>
                            <input type="text" id="a_key" placeholder="gsk_...">
                        </div>
                        <div class="form-group">
                            <label>URL API (optionnel)</label>
                            <input type="text" id="a_url" placeholder="https://api.groq.com/openai/v1/chat/completions">
                        </div>
                        <div class="form-group">
                            <label>Tables autorisées (vide = toutes)</label>
                            <input type="text" id="a_tables" placeholder="clients, transactions, comptes">
                        </div>
                        <div class="form-group">
                            <label>Statut</label>
                            <select id="a_statut">
                                <option value="actif" selected>Actif</option>
                                <option value="inactif">Inactif</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn-add" onclick="addAccess()">
                        <i class="bi bi-link-45deg"></i> Ajouter l'accès
                    </button>
                </div>

                <div class="card-custom">
                    <div class="card-title">📋 Accès configurés</div>
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>ID</th><th>Utilisateur</th><th>Base</th><th>Tables</th><th>Statut</th><th>Actions</th></tr></thead>
                            <tbody id="table-access"><tr><td colspan="6" class="empty-row">Chargement...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        
        const ADMIN_API = 'https://cyberic.xyz/api/admin.php';

        let adminUser = null;

        // ============================================================
        // AUTH ADMIN
        // ============================================================
        function togglePassword() {
            const input = document.getElementById('adminMdp');
            const icon = document.getElementById('eyeIcon');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'bi bi-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'bi bi-eye';
            }
        }

        // Remplacez la fonction handleAdminLogin par celle-ci :
async function handleAdminLogin() {
    const login = document.getElementById('adminLogin').value.trim();
    const mdp = document.getElementById('adminMdp').value.trim();
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('btnAdminLogin');

    errorEl.classList.remove('show');

    if (!login || !mdp) {
        errorEl.textContent = '⚠️ Veuillez remplir l\'identifiant et le mot de passe.';
        errorEl.classList.add('show');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Connexion...';

    try {
        // ✅ Appel direct à admin.php (plus besoin de ia-base.php)
        const res = await fetch(ADMIN_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', login, mdp })
        });
        const data = await res.json();

        if (data.error) {
            errorEl.textContent = '⚠️ ' + data.error;
            errorEl.classList.add('show');
        } else if (data.success && data.user) {
            adminUser = data.user;
            document.getElementById('adminUserBadge').textContent = `👤 ${adminUser.nom}`;
            document.getElementById('screen-login').classList.add('hidden');
            document.getElementById('screen-admin').classList.add('active');
            document.getElementById('adminLogin').value = '';
            document.getElementById('adminMdp').value = '';
            loadBases();
        }
    } catch (e) {
        errorEl.textContent = '⚠️ Impossible de se connecter au serveur.';
        errorEl.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Se connecter';
    }
}

        function handleAdminLogout() {
            if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
                adminUser = null;
                document.getElementById('screen-admin').classList.remove('active');
                document.getElementById('screen-login').classList.remove('hidden');
            }
        }

        // Raccourcis clavier
        document.getElementById('adminMdp').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') handleAdminLogin();
        });
        document.getElementById('adminLogin').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') document.getElementById('adminMdp').focus();
        });

        // ============================================================
        // NAVIGATION TABS
        // ============================================================
        function switchTab(tab, btn) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + tab).classList.add('active');
            btn.classList.add('active');

            if (tab === 'bases') loadBases();
            if (tab === 'users') loadUsers();
            if (tab === 'access') { loadAccess(); loadSelects(); }
        }

        // ============================================================
        // UTILITAIRES
        // ============================================================
        function showAlert(id, type, msg) {
            const el = document.getElementById(id);
            el.className = 'alert-msg ' + type;
            el.textContent = msg;
            setTimeout(() => { el.className = 'alert-msg'; }, 5000);
        }

        function esc(text) {
            if (!text) return '';
            const d = document.createElement('div');
            d.textContent = String(text);
            return d.innerHTML;
        }

        async function apiCall(body) {
            const res = await fetch(ADMIN_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            return await res.json();
        }

        // ============================================================
        // BASES
        // ============================================================
        async function loadBases() {
            const data = await apiCall({ action: 'list_bases' });
            const tbody = document.getElementById('table-bases');

            if (data.error) { tbody.innerHTML = `<tr><td colspan="5" class="empty-row">⚠️ ${esc(data.error)}</td></tr>`; return; }
            if (!data.data || data.data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Aucune base enregistrée.</td></tr>'; return; }

            tbody.innerHTML = data.data.map(b => `
                <tr>
                    <td><strong>${esc(b.base_id)}</strong></td>
                    <td>${esc(b.nom_base)}</td>
                    <td>${esc(b.hote)}</td>
                    <td>${esc(b.utilisateur)}</td>
                    <td><button class="btn-delete" onclick="deleteBase('${esc(b.base_id)}')">🗑️ Suppr.</button></td>
                </tr>
            `).join('');
        }

        async function addBase() {
            const body = {
                action: 'add_base',
                base_id: document.getElementById('b_id').value.trim(),
                hote: document.getElementById('b_hote').value.trim(),
                nom_base: document.getElementById('b_nom').value.trim(),
                utilisateur: document.getElementById('b_user').value.trim(),
                mot_passe: document.getElementById('b_pass').value.trim()
            };
            const data = await apiCall(body);
            if (data.error) { showAlert('alert-bases', 'error', data.error); }
            else {
                showAlert('alert-bases', 'success', data.message);
                ['b_id','b_hote','b_nom','b_user','b_pass'].forEach(id => document.getElementById(id).value = '');
                loadBases();
            }
        }

        async function deleteBase(id) {
            if (!confirm(`Supprimer la base "${id}" et tous ses accès ?`)) return;
            const data = await apiCall({ action: 'delete_base', base_id: id });
            if (data.error) alert(data.error);
            else loadBases();
        }

        // ============================================================
        // UTILISATEURS
        // ============================================================
        async function loadUsers() {
            const data = await apiCall({ action: 'list_users' });
            const tbody = document.getElementById('table-users');

            if (data.error) { tbody.innerHTML = `<tr><td colspan="7" class="empty-row">⚠️ ${esc(data.error)}</td></tr>`; return; }
            if (!data.data || data.data.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Aucun utilisateur.</td></tr>'; return; }

            tbody.innerHTML = data.data.map(u => `
                <tr>
                    <td><strong>${esc(u.utilisateur_id)}</strong></td>
                    <td>${esc(u.nom_prenom)}</td>
                    <td>${esc(u.login)}</td>
                    <td>${esc(u.email || '-')}</td>
                    <td>${esc(u.role || '-')}</td>
                    <td><span class="${u.etat === 'actif' ? 'badge-active' : 'badge-inactive'}">${esc(u.etat || 'actif')}</span></td>
                    <td><button class="btn-delete" onclick="deleteUser('${esc(u.utilisateur_id)}')">🗑️ Suppr.</button></td>
                </tr>
            `).join('');
        }

        async function addUser() {
            const body = {
                action: 'add_user',
                utilisateur_id: document.getElementById('u_id').value.trim(),
                nom_prenom: document.getElementById('u_nom').value.trim(),
                login: document.getElementById('u_login').value.trim(),
                mdp: document.getElementById('u_mdp').value.trim(),
                email: document.getElementById('u_email').value.trim(),
                telephone: document.getElementById('u_tel').value.trim(),
                role: document.getElementById('u_role').value,
                type: 'standard',
                etat: document.getElementById('u_etat').value
            };
            const data = await apiCall(body);
            if (data.error) { showAlert('alert-users', 'error', data.error); }
            else {
                showAlert('alert-users', 'success', data.message);
                ['u_id','u_nom','u_login','u_mdp','u_email','u_tel'].forEach(id => document.getElementById(id).value = '');
                loadUsers();
            }
        }

        async function deleteUser(id) {
            if (!confirm(`Supprimer l'utilisateur "${id}" et tous ses accès ?`)) return;
            const data = await apiCall({ action: 'delete_user', utilisateur_id: id });
            if (data.error) alert(data.error);
            else loadUsers();
        }

        // ============================================================
        // ACCÈS (USER_BASES)
        // ============================================================
        async function loadSelects() {
            const [usersData, basesData] = await Promise.all([
                apiCall({ action: 'list_users' }),
                apiCall({ action: 'list_bases' })
            ]);

            const userSelect = document.getElementById('a_user');
            const baseSelect = document.getElementById('a_base');

            userSelect.innerHTML = '<option value="">-- Sélectionner --</option>';
            if (usersData.data) {
                usersData.data.forEach(u => {
                    userSelect.innerHTML += `<option value="${esc(u.utilisateur_id)}">${esc(u.nom_prenom)} (${esc(u.utilisateur_id)})</option>`;
                });
            }

            baseSelect.innerHTML = '<option value="">-- Sélectionner --</option>';
            if (basesData.data) {
                basesData.data.forEach(b => {
                    baseSelect.innerHTML += `<option value="${esc(b.base_id)}">${esc(b.nom_base)} (${esc(b.hote)})</option>`;
                });
            }
        }

        async function loadAccess() {
            const data = await apiCall({ action: 'list_access' });
            const tbody = document.getElementById('table-access');

            if (data.error) { tbody.innerHTML = `<tr><td colspan="6" class="empty-row">⚠️ ${esc(data.error)}</td></tr>`; return; }
            if (!data.data || data.data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Aucun accès configuré.</td></tr>'; return; }

            tbody.innerHTML = data.data.map(a => `
                <tr>
                    <td><strong>${esc(a.id)}</strong></td>
                    <td>${esc(a.user_nom || a.utilisateur_id)}</td>
                    <td>${esc(a.base_nom || a.base_id)}</td>
                    <td>${a.tables ? esc(a.tables) : '<em style="color:var(--success)">Toutes</em>'}</td>
                    <td><span class="${a.statut === 'actif' ? 'badge-active' : 'badge-inactive'}">${esc(a.statut)}</span></td>
                    <td>
                        <button class="btn-toggle" onclick="toggleAccess('${esc(a.id)}', '${a.statut === 'actif' ? 'inactif' : 'actif'}')">
                            ${a.statut === 'actif' ? '⏸️ Désactiver' : '▶️ Activer'}
                        </button>
                        <button class="btn-delete" onclick="deleteAccess('${esc(a.id)}')">🗑️</button>
                    </td>
                </tr>
            `).join('');
        }

        async function addAccess() {
            const body = {
                action: 'add_access',
                id: document.getElementById('a_id').value.trim(),
                utilisateur_id: document.getElementById('a_user').value,
                base_id: document.getElementById('a_base').value,
                api_key: document.getElementById('a_key').value.trim(),
                url: document.getElementById('a_url').value.trim(),
                tables: document.getElementById('a_tables').value.trim(),
                statut: document.getElementById('a_statut').value
            };
            const data = await apiCall(body);
            if (data.error) { showAlert('alert-access', 'error', data.error); }
            else {
                showAlert('alert-access', 'success', data.message);
                ['a_id','a_key','a_url','a_tables'].forEach(id => document.getElementById(id).value = '');
                loadAccess();
            }
        }

        async function deleteAccess(id) {
            if (!confirm(`Supprimer l'accès "${id}" ?`)) return;
            const data = await apiCall({ action: 'delete_access', id });
            if (data.error) alert(data.error);
            else loadAccess();
        }

        async function toggleAccess(id, newStatut) {
            const data = await apiCall({ action: 'toggle_access', id, statut: newStatut });
            if (data.error) alert(data.error);
            else loadAccess();
        }
    </script>
</body>
</html>
