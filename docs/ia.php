<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Eric IA</title>
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome 6 -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <!-- Leaflet pour les cartes -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <!-- Chart.js pour les graphiques -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    
    <style>
        /* ===== STYLES GÉNÉRAUX ===== */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #ffffff; height: 100vh; overflow: hidden; }

        /* ===== CONTENEUR PRINCIPAL ===== */
        #app { height: 100vh; display: flex; flex-direction: column; background-color: #ffffff; }

        /* ===== HEADER ===== */
        .app-header { height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff; flex-shrink: 0; }
        .app-brand { font-size: 18px; font-weight: 800; color: #6c63ff; }
        .app-brand .brand-icon { font-size: 20px; }
        .header-user { font-size: 11px; color: #6b7280; margin-left: 8px; }
        .header-actions { display: flex; align-items: center; gap: 4px; }
        .header-btn { width: 36px; height: 36px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; font-size: 16px; background-color: #fef2f2; color: #6b7280; transition: all 0.2s ease; cursor: pointer; }
        .header-btn:hover { transform: scale(1.05); }
        .header-btn.active { background-color: #ede9fe; }
        .header-btn.danger:hover { background-color: #fecaca; }
        .header-btn.voice-active { background-color: #ef4444; color: #ffffff; }

        /* ===== ZONE DE CHAT ===== */
        .chat-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; background-color: #ffffff; position: relative; }
        .messages-container { flex: 1; overflow-y: auto; padding: 12px 14px 20px; scroll-behavior: smooth; }

        /* ===== MESSAGES ===== */
        .message { display: flex; margin-bottom: 16px; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .message.user { justify-content: flex-end; }
        .message.assistant { justify-content: flex-start; align-items: flex-start; }
        .message-avatar { width: 32px; height: 32px; border-radius: 50%; background-color: #6c63ff; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: 14px; flex-shrink: 0; margin-right: 10px; }
        .message-bubble { max-width: 88%; padding: 12px 16px; border-radius: 18px; word-wrap: break-word; line-height: 1.5; }
        .message.user .message-bubble { background-color: #f0f4f9; border-bottom-right-radius: 6px; color: #1a1a2e; }
        .message.assistant .message-bubble { background-color: #f8fafc; border-bottom-left-radius: 6px; color: #1e293b; }
        .message-bubble .edit-btn { margin-top: 8px; font-size: 12px; color: #6c63ff; background: none; border: none; cursor: pointer; font-weight: 600; padding: 4px 8px; border-radius: 4px; transition: background 0.2s; }
        .message-bubble .edit-btn:hover { background-color: rgba(108, 99, 255, 0.1); }
        .message-bubble .speak-btn { margin-top: 8px; font-size: 12px; color: #6c63ff; background: #ede9fe; border: none; cursor: pointer; font-weight: 600; padding: 4px 12px; border-radius: 8px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }
        .message-bubble .speak-btn:hover { background: #ddd6fe; }

        /* ===== RÉSULTATS ===== */
        .results-container { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff; width: 100%; }
        .results-header { display: flex; justify-content: space-between; align-items: center; padding: 11px 14px; background-color: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .results-title { font-size: 14px; font-weight: 700; color: #1e293b; }
        .results-count { background-color: #ede9fe; padding: 3px 10px; border-radius: 10px; font-size: 11px; color: #6c63ff; font-weight: 600; }
        .chart-tabs { display: flex; gap: 4px; padding: 4px; background-color: #f1f5f9; border-radius: 8px; margin: 12px 14px 8px; overflow-x: auto; flex-wrap: nowrap; }
        .chart-tab { padding: 8px 12px; border-radius: 6px; border: none; font-size: 11px; font-weight: 600; color: #64748b; background: transparent; white-space: nowrap; cursor: pointer; transition: all 0.2s ease; min-width: 70px; text-align: center; }
        .chart-tab.active { background-color: #ffffff; color: #6c63ff; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .chart-tab:disabled { opacity: 0.4; cursor: not-allowed; }
        .chart-tab:hover:not(:disabled) { background-color: rgba(255,255,255,0.5); }
        .results-content { max-height: 500px; overflow-y: auto; padding: 4px; }

        /* ===== CARTES RÉSULTATS ===== */
        .result-card { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; }
        .result-card:last-child { border-bottom: none; }
        .result-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .result-card-index { font-size: 11px; color: #94a3b8; font-weight: 600; }
        .result-row { display: flex; margin-bottom: 5px; align-items: flex-start; }
        .result-label { font-size: 12px; font-weight: 600; color: #64748b; width: 100px; flex-shrink: 0; margin-right: 8px; }
        .result-value { font-size: 13px; color: #1e293b; word-break: break-word; flex: 1; }

        /* ===== TABLEAU ===== */
        .table-wrapper { max-height: 350px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; margin: 4px; }
        .table-wrapper table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .table-wrapper thead { background-color: #6c63ff; color: #ffffff; position: sticky; top: 0; z-index: 10; }
        .table-wrapper th { padding: 8px 10px; text-align: left; font-weight: 700; white-space: nowrap; min-width: 120px; border-right: 0.5px solid rgba(255,255,255,0.2); }
        .table-wrapper td { padding: 6px 10px; border-bottom: 0.5px solid #e5e7eb; vertical-align: middle; min-width: 120px; }
        .table-wrapper tbody tr:nth-child(even) { background-color: #f8fafc; }
        .table-wrapper tbody tr:hover { background-color: #f1f5f9; }
        .see-more-btn { padding: 12px; text-align: center; background-color: #f0f9ff; border-top: 1px solid #e5e7eb; color: #6c63ff; font-weight: 600; cursor: pointer; border: none; width: 100%; font-size: 13px; transition: background 0.2s; }
        .see-more-btn:hover { background-color: #e0f2fe; }

        /* ===== GRAPHIQUES ===== */
        .chart-container { padding: 16px; min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; width: 100%; }
        .chart-container canvas { max-width: 100% !important; height: auto !important; }
        .chart-clickable { cursor: pointer; position: relative; width: 100%; border-radius: 12px; padding: 8px; }
        .chart-clickable:hover { background: var(--gray-50); }
        .zoom-hint { margin-top: 8px; padding: 6px 12px; background-color: #f1f5f9; border-radius: 20px; font-size: 12px; color: #64748b; display: inline-block; }

        /* ===== MÉDIAS ===== */
        .media-card { background-color: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 10px; border: 1px solid #e5e7eb; }
        .media-card-title { font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .media-card-sub { font-size: 12px; color: #64748b; margin-bottom: 8px; }
        .media-card.error { background-color: #fef2f2; }
        .media-card.error .media-card-title { color: #dc2626; }
        .media-btn { background-color: #6c63ff; color: #ffffff; padding: 10px 16px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
        .media-btn:hover { background-color: #5b52e6; transform: scale(1.02); }
        .media-btn.danger { background-color: #ef4444; }
        .media-btn.danger:hover { background-color: #dc2626; }
        .media-grid { display: flex; flex-wrap: wrap; gap: 10px; padding: 8px; }
        .media-grid-item { width: calc(50% - 5px); border-radius: 12px; overflow: hidden; background-color: #f1f5f9; border: 1px solid #e5e7eb; cursor: pointer; transition: transform 0.2s; }
        .media-grid-item:hover { transform: scale(1.02); }
        .media-grid-item img { width: 100%; height: 120px; object-fit: cover; }
        .media-grid-item .media-label { padding: 8px; font-size: 12px; color: #475569; font-weight: 500; text-align: center; }
        .webview-container { height: 300px; border-radius: 8px; overflow: hidden; background-color: #f1f5f9; margin-top: 8px; position: relative; }
        .webview-container iframe { width: 100%; height: 100%; border: none; }
        .webview-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f8fafc; }
        .webview-loading .spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #6c63ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .webview-loading .loading-text { margin-top: 10px; font-size: 13px; color: #64748b; }
        .no-media { padding: 40px; text-align: center; color: #94a3b8; font-size: 14px; }

        /* ===== LOADING / SPEAKING ===== */
        .status-bar { display: flex; align-items: center; padding: 10px 16px; margin: 0 14px 8px; border-radius: 12px; background-color: #f8fafc; gap: 10px; flex-shrink: 0; }
        .status-bar.speaking { background-color: #ede9fe; }
        .status-bar .status-icon { width: 32px; height: 32px; border-radius: 50%; background-color: #6c63ff; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: 14px; flex-shrink: 0; }
        .status-bar .status-text { font-size: 13px; color: #64748b; flex: 1; }
        .status-bar.speaking .status-text { color: #6c63ff; font-weight: 600; }
        .status-bar .stop-btn { color: #ef4444; font-weight: 700; font-size: 13px; background: none; border: none; cursor: pointer; padding: 4px 8px; }
        .status-bar .stop-btn:hover { text-decoration: underline; }

        /* ===== INPUT ===== */
        .input-area { padding: 10px 14px 12px; border-top: 1px solid #e5e7eb; background-color: #ffffff; flex-shrink: 0; }
        .editing-banner { display: flex; justify-content: space-between; align-items: center; background-color: #f0f4ff; padding: 8px 12px; border-radius: 10px; margin-bottom: 8px; }
        .editing-banner .edit-text { font-size: 13px; color: #6c63ff; font-weight: 600; }
        .editing-banner .cancel-edit { font-size: 13px; color: #ef4444; font-weight: 600; background: none; border: none; cursor: pointer; }
        .input-bar { display: flex; align-items: flex-end; background-color: #f1f5f9; border-radius: 24px; padding: 6px 14px; gap: 4px; }
        .input-bar textarea { flex: 1; font-size: 15px; color: #1e293b; background: transparent; border: none; outline: none; padding: 10px 8px; max-height: 110px; min-height: 40px; resize: none; font-family: inherit; line-height: 1.4; }
        .input-bar textarea::placeholder { color: #94a3b8; }
        .input-bar .voice-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background-color: #e2e8f0; font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .input-bar .voice-btn.active { background-color: #ef4444; color: #ffffff; }
        .input-bar .voice-btn:hover:not(.active) { background-color: #cbd5e1; }
        .input-bar .send-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background-color: #e2e8f0; font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; color: #94a3b8; }
        .input-bar .send-btn.active { background-color: #6c63ff; color: #ffffff; }
        .input-bar .send-btn.active:hover { background-color: #5b52e6; transform: scale(1.05); }
        .input-bar .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .disclaimer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 8px; }

        /* ===== WELCOME ===== */
        .welcome { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; text-align: center; }
        .welcome-icon { width: 64px; height: 64px; border-radius: 50%; background-color: #6c63ff; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 26px; font-weight: bold; margin-bottom: 16px; }
        .welcome-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
        .welcome-text { font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 16px; }
        .welcome-tables { background-color: #f8fafc; border-radius: 10px; padding: 12px; width: 100%; border: 1px solid #e5e7eb; }
        .welcome-tables-title { font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; }
        .welcome-tables-list { font-size: 12px; color: #6c63ff; line-height: 1.6; word-break: break-word; }

        /* ===== MODAL ===== */
        .modal-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fadeIn 0.2s ease; }
        .modal-content { background-color: #ffffff; border-radius: 20px; padding: 28px; width: 100%; max-width: 380px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .modal-title { font-size: 20px; font-weight: 700; color: #1a1a2e; text-align: center; margin-bottom: 6px; }
        .modal-subtitle { font-size: 13px; color: #6b7280; text-align: center; margin-bottom: 20px; line-height: 1.4; }
        .modal-icon { width: 56px; height: 56px; border-radius: 50%; background-color: #ede9fe; display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 14px; }
        .form-group { margin-bottom: 14px; }
        .form-group label { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 4px; display: block; }
        .form-control { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 15px; background-color: #f1f5f9; color: #1e293b; transition: border-color 0.2s; }
        .form-control:focus { outline: none; border-color: #6c63ff; }
        .form-control::placeholder { color: #94a3b8; }
        .btn-primary { background-color: #6c63ff; color: #ffffff; border: none; border-radius: 12px; padding: 15px; font-size: 16px; font-weight: 700; width: 100%; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { background-color: #5b52e6; transform: scale(1.01); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-link { background: none; border: none; color: #6c63ff; font-weight: 600; font-size: 14px; padding: 14px; width: 100%; cursor: pointer; }
        .btn-link:hover { text-decoration: underline; }
        .btn-close-modal { margin-top: 20px; padding: 12px; background: none; border: none; border-top: 1px solid #f1f5f9; color: #64748b; font-weight: 600; width: 100%; cursor: pointer; }
        .btn-close-modal:hover { background-color: #f8fafc; border-radius: 0 0 20px 20px; }

        /* ===== SIDEBAR ===== */
        .sidebar-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 999; animation: fadeIn 0.2s ease; }
        .sidebar { position: fixed; top: 0; left: 0; width: 85%; max-width: 320px; height: 100%; background-color: #ffffff; padding: 50px 16px 16px; box-shadow: 2px 0 20px rgba(0,0,0,0.1); overflow-y: auto; z-index: 1000; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .sidebar-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px; }
        .sidebar-title { font-size: 18px; font-weight: 700; color: #1a1a2e; }
        .sidebar-close { font-size: 22px; color: #64748b; background: none; border: none; cursor: pointer; padding: 4px; }
        .sidebar-close:hover { color: #1a1a2e; }
        .sidebar-search { display: flex; align-items: center; background-color: #f1f5f9; border-radius: 10px; padding: 0 12px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .sidebar-search .search-icon { font-size: 16px; color: #94a3b8; margin-right: 8px; }
        .sidebar-search input { flex: 1; padding: 10px 0; font-size: 14px; background: transparent; border: none; outline: none; color: #1e293b; }
        .indicator-item { display: flex; align-items: center; background-color: #f8fafc; border-radius: 10px; padding: 12px; margin-bottom: 10px; border: 1px solid #e5e7eb; transition: all 0.2s; }
        .indicator-item:hover { border-color: #6c63ff; }
        .indicator-item .indicator-content { flex: 1; cursor: pointer; padding-right: 8px; }
        .indicator-item .indicator-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .indicator-item .indicator-desc { font-size: 12px; color: #64748b; line-height: 1.4; }
        .indicator-item .indicator-actions { display: flex; gap: 4px; }
        .indicator-item .indicator-actions button { padding: 6px; border-radius: 8px; border: 1px solid #fecaca; background-color: #fef2f2; cursor: pointer; font-size: 16px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .indicator-item .indicator-actions button:hover { background-color: #fecaca; }
        .indicator-item .indicator-actions .alert-btn { border-color: #fcd34d; background-color: #fef3c7; }
        .indicator-item .indicator-actions .alert-btn:hover { background-color: #fcd34d; }

        /* ===== ALERTES ===== */
        .alert-item { padding: 12px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #ef4444; background-color: #fef2f2; }
        .alert-item .alert-header { display: flex; justify-content: space-between; align-items: center; }
        .alert-item .alert-name { font-weight: 600; color: #1e293b; }
        .alert-item .alert-value { font-size: 18px; font-weight: 700; color: #ef4444; }
        .alert-item .alert-detail { font-size: 12px; color: #64748b; }
        .alert-item .alert-close { color: #ef4444; font-size: 16px; background: none; border: none; cursor: pointer; }

        /* ===== MODE PRÉSENTATION ===== */
        .presentation-mode { background-color: #0a0a1a; flex: 1; padding: 20px; display: flex; flex-direction: column; }
        .presentation-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .presentation-title { font-size: 18px; font-weight: 700; color: #ffffff; }
        .presentation-close { background-color: #ef4444; padding: 8px 16px; border-radius: 20px; border: none; color: #ffffff; font-weight: 600; font-size: 14px; cursor: pointer; }
        .presentation-close:hover { background-color: #dc2626; }
        .presentation-nav { display: flex; justify-content: center; align-items: center; gap: 20px; padding: 16px 0; }
        .presentation-nav button { width: 50px; height: 50px; border-radius: 50%; border: none; background-color: rgba(255,255,255,0.1); color: #ffffff; font-size: 24px; cursor: pointer; transition: background 0.2s; }
        .presentation-nav button:hover { background-color: rgba(255,255,255,0.2); }
        .presentation-counter { font-size: 16px; color: #94a3b8; font-weight: 600; }
        .presentation-content { text-align: center; padding: 20px 16px; background-color: rgba(255,255,255,0.05); border-radius: 16px; margin-bottom: 20px; }
        .presentation-indicator-name { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
        .presentation-indicator-desc { font-size: 14px; color: #94a3b8; }
        .presentation-messages { flex: 1; overflow-y: auto; padding: 10px 0; }
        .presentation-message.user { align-self: flex-end; background-color: #6c63ff; color: #ffffff; padding: 10px 16px; border-radius: 16px; border-bottom-right-radius: 4px; margin-bottom: 8px; max-width: 85%; }
        .presentation-message.assistant { align-self: flex-start; background-color: rgba(255,255,255,0.08); color: #e2e8f0; padding: 10px 16px; border-radius: 16px; border-bottom-left-radius: 4px; margin-bottom: 8px; max-width: 85%; }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 576px) {
            .modal-content { padding: 20px; margin: 10px; }
            .sidebar { width: 85%; max-width: 300px; }
            .media-grid-item { width: 100%; }
            .result-label { width: 80px; }
            .chart-tab { min-width: 60px; font-size: 10px; padding: 6px 10px; }
        }

        /* ===== SCROLLBAR ===== */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        /* ===== ÉCRAN DE CONNEXION ===== */
        .login-screen { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; background-color: #ffffff; }
        .login-icon { width: 80px; height: 80px; border-radius: 50%; background-color: #6c63ff; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 36px; font-weight: bold; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(108, 99, 255, 0.3); }
        .login-title { font-size: 28px; font-weight: 800; color: #1a1a2e; margin-bottom: 8px; }
        .login-subtitle { font-size: 14px; color: #6b7280; text-align: center; margin-bottom: 32px; line-height: 1.4; }
        .login-form { width: 100%; max-width: 340px; }
        .login-footer { margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; }
        .input-group-custom { display: flex; align-items: center; background-color: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0; padding: 0 14px; margin-bottom: 14px; }
        .input-group-custom .input-icon { font-size: 18px; margin-right: 10px; color: #64748b; }
        .input-group-custom input { flex: 1; padding: 14px 0; font-size: 16px; background: transparent; border: none; outline: none; color: #1e293b; }
        .input-group-custom input::placeholder { color: #94a3b8; }
        .input-group-custom .toggle-pwd { background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px; }

        /* ===== SÉLECTION DES BASES ===== */
        .bases-screen { flex: 1; padding: 20px 16px; overflow-y: auto; }
        .bases-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
        .bases-subtitle { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
        .base-card { background-color: #f8fafc; border-radius: 14px; padding: 16px; margin-bottom: 14px; border: 1px solid #e5e7eb; cursor: pointer; transition: all 0.2s; }
        .base-card:hover { border-color: #6c63ff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .base-card-header { display: flex; align-items: center; margin-bottom: 12px; }
        .base-icon { width: 42px; height: 42px; border-radius: 12px; background-color: #ede9fe; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 12px; flex-shrink: 0; }
        .base-info { flex: 1; }
        .base-name { font-size: 16px; font-weight: 700; color: #1e293b; }
        .base-host { font-size: 12px; color: #64748b; }
        .base-status { background-color: #dcfce7; padding: 4px 10px; border-radius: 12px; font-size: 11px; color: #16a34a; font-weight: 600; }
        .base-tables { background-color: #ffffff; border-radius: 10px; padding: 12px; border: 1px solid #f1f5f9; }
        .base-tables-label { font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; }
        .base-tables-list { font-size: 12px; color: #6c63ff; line-height: 1.6; }
        .base-tables-all { font-size: 12px; color: #16a34a; font-weight: 600; }
        .base-footer { margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: right; }
        .base-footer-text { font-size: 13px; color: #6c63ff; font-weight: 700; }
        .empty-state { text-align: center; padding: 40px 20px; }
        .empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-state .empty-text { font-size: 15px; color: #6b7280; line-height: 1.6; }
        .empty-state .refresh-btn { margin-top: 16px; padding: 10px 20px; background-color: #f1f5f9; border-radius: 10px; border: none; color: #6c63ff; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s; }
        .empty-state .refresh-btn:hover { background-color: #e2e8f0; }

        /* ===== BADGE ALERTE ===== */
        .alert-badge { position: relative; }
        .alert-badge .badge-count { position: absolute; top: -4px; right: -4px; background-color: #ef4444; color: #ffffff; font-size: 10px; font-weight: 700; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>

<div id="app">
    <!-- ===== ÉCRAN DE CONNEXION ===== -->
    <div id="loginScreen" class="login-screen">
        <div class="login-icon">E</div>
        <div class="login-title">Eric IA</div>
        <div class="login-subtitle">Connectez-vous pour accéder à vos bases de données</div>
        <div class="login-form">
            <div class="input-group-custom">
                <span class="input-icon">👤</span>
                <input type="text" id="loginInput" placeholder="Utilisateur" autocomplete="username">
            </div>
            <div class="input-group-custom">
                <span class="input-icon">🔒</span>
                <input type="password" id="passwordInput" placeholder="Mot de passe" autocomplete="current-password">
                <button class="toggle-pwd" id="togglePwd">👁️</button>
            </div>
            <button class="btn-primary" id="loginBtn">Se connecter</button>
            <button class="btn-link" id="forgotBtn">Mot de passe oublié ?</button>
        </div>
        <div class="login-footer">🔐 Connexion sécurisée via le serveur</div>
    </div>

    <!-- ===== ÉCRAN DE SÉLECTION DES BASES ===== -->
    <div id="basesScreen" style="display:none;flex-direction:column;height:100vh;">
        <div class="app-header">
            <div>
                <span class="app-brand">Eric</span>
                <span class="header-user" id="headerUser">👤 Utilisateur</span>
            </div>
            <div class="header-actions">
                <button class="header-btn active" id="voiceToggleBase" title="Activer/Désactiver la voix">🔊</button>
                <button class="header-btn danger" id="logoutBaseBtn">🔒</button>
            </div>
        </div>
        <div class="bases-screen" id="basesContainer">
            <div class="bases-title">📂 Vos bases de données</div>
            <div class="bases-subtitle" id="basesCount">0 base(s) active(s) • Sélectionnez pour interroger</div>
            <div id="basesList"></div>
        </div>
    </div>

    <!-- ===== ÉCRAN PRINCIPAL ===== -->
    <div id="mainScreen" style="display:none;flex-direction:column;height:100vh;">
        <!-- HEADER -->
        <div class="app-header">
            <button class="header-btn" id="backToBases" style="background:#f1f5f9;width:auto;padding:6px 12px;border-radius:8px;font-size:13px;color:#6c63ff;font-weight:600;">
                ← Bases
            </button>
            <div style="flex:1;margin:0 8px;min-width:0;">
                <div class="app-brand" id="currentBaseName" style="font-size:12px;">Base</div>
                <div style="font-size:10px;color:#6b7280;" id="currentBaseInfo">🌐 hôte • 👤 utilisateur</div>
            </div>
            <div class="header-actions">
                <button class="header-btn active" id="voiceToggleMain" title="Activer/Désactiver la voix">🔊</button>
                <button class="header-btn" id="stopSpeakingBtn" style="display:none;background:#fef2f2;" title="Arrêter la parole">⏹</button>
                <button class="header-btn" id="presentationBtn" style="background:#f0f9ff;" title="Mode Présentation">📺</button>
                <button class="header-btn alert-badge" id="alertBtn" style="background:#fef3c7;" title="Alertes">
                    🔔
                    <span class="badge-count" id="alertBadge" style="display:none;">0</span>
                </button>
                <button class="header-btn" id="indicatorsBtn" style="background:#f0f9ff;" title="Indicateurs">📊</button>
                <button class="header-btn danger" id="logoutMainBtn">🔓</button>
            </div>
        </div>

        <!-- CHAT -->
        <div class="chat-area">
            <div class="messages-container" id="messagesContainer">
                <!-- Messages insérés ici -->
            </div>

            <!-- Status bars -->
            <div id="loadingBar" class="status-bar" style="display:none;">
                <div class="status-icon">E</div>
                <div class="spinner" style="width:20px;height:20px;border-width:2px;"></div>
                <span class="status-text">Eric traite votre demande...</span>
            </div>
            <div id="speakingBar" class="status-bar speaking" style="display:none;">
                <div class="status-icon">E</div>
                <span class="status-text">🔊 Eric parle...</span>
                <button class="stop-btn" id="stopSpeakingBar">Arrêter</button>
            </div>

            <!-- INPUT -->
            <div class="input-area">
                <div class="editing-banner" id="editingBanner" style="display:none;">
                    <span class="edit-text">✏️ Modification de la question</span>
                    <button class="cancel-edit" id="cancelEdit">✕ Annuler</button>
                </div>
                <div class="input-bar">
                    <textarea id="messageInput" rows="1" placeholder="Posez votre question..." maxlength="1000"></textarea>
                    <button class="voice-btn" id="voiceBtn" title="Reconnaissance vocale">🎤</button>
                    <button class="send-btn" id="sendBtn" disabled>➤</button>
                </div>
                <div class="disclaimer">🔒 Eric peut faire des erreurs. Vérifiez les informations importantes.</div>
            </div>
        </div>
    </div>

    <!-- ===== MODAL CONNEXION ===== -->
    <div id="authModal" class="modal-overlay" style="display:none;">
        <div class="modal-content">
            <div class="modal-icon">🔑</div>
            <div class="modal-title" id="authModalTitle">Connexion requise</div>
            <div class="modal-subtitle" id="authModalSubtitle">Connectez-vous pour effectuer une réservation</div>
            <div id="authModalBody">
                <div class="form-group" id="registerFields" style="display:none;">
                    <input class="form-control" id="regNom" placeholder="Nom complet">
                    <input class="form-control" id="regEmail" placeholder="Email" style="margin-top:10px;" type="email">
                    <input class="form-control" id="regPhone" placeholder="Téléphone" style="margin-top:10px;">
                </div>
                <div class="form-group">
                    <input class="form-control" id="authLogin" placeholder="Utilisateur">
                </div>
                <div class="form-group" style="position:relative;">
                    <input class="form-control" id="authPassword" placeholder="Mot de passe" type="password">
                </div>
                <button class="btn-primary" id="authBtn">Se connecter</button>
                <button class="btn-link" id="authToggleBtn">Pas de compte ? S'inscrire</button>
            </div>
            <button class="btn-close-modal" id="authCloseBtn">Annuler</button>
        </div>
    </div>

    <!-- ===== MODAL MOT DE PASSE OUBLIÉ ===== -->
    <div id="forgotModal" class="modal-overlay" style="display:none;">
        <div class="modal-content">
            <div class="modal-icon">🔑</div>
            <div class="modal-title">Mot de passe oublié</div>
            <div class="modal-subtitle">Saisissez votre adresse email pour recevoir vos accès</div>
            <div id="forgotBody">
                <div id="forgotSuccess" style="display:none;text-align:center;padding:10px 0;">
                    <div style="font-size:40px;margin-bottom:12px;">✅</div>
                    <div style="font-size:15px;color:#166534;font-weight:600;" id="forgotSuccessMsg"></div>
                    <div style="font-size:12px;color:#6b7280;margin-top:8px;">Vérifiez votre boîte de réception et vos spams.</div>
                </div>
                <div id="forgotForm">
                    <div class="form-group">
                        <input class="form-control" id="resetEmail" placeholder="votre@email.com" type="email">
                    </div>
                    <div id="forgotError" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:#b91c1c;"></div>
                    <button class="btn-primary" id="resetBtn">Envoyer mes accès</button>
                </div>
            </div>
            <button class="btn-close-modal" id="forgotCloseBtn">Annuler</button>
        </div>
    </div>

    <!-- ===== MODAL ALERTES ===== -->
    <div id="alertModal" class="modal-overlay" style="display:none;">
        <div class="modal-content" style="max-width:420px;">
            <div style="text-align:center;padding:10px 0 20px;background:#fef3c7;border-radius:20px;margin:-28px -28px 0;">
                <div class="modal-title" style="color:#1a1a2e;">🔔 Alertes indicateurs</div>
            </div>
            <div id="alertList" style="padding:16px 0;">
                <div style="text-align:center;color:#64748b;padding:20px 0;">✅ Aucune alerte active</div>
            </div>
            <button class="btn-close-modal" id="alertCloseBtn">Fermer</button>
        </div>
    </div>

    <!-- ===== MODAL SEUILS ===== -->
    <div id="thresholdModal" class="modal-overlay" style="display:none;">
        <div class="modal-content">
            <div class="modal-icon">🔔</div>
            <div class="modal-title">Configurer une alerte</div>
            <div class="modal-subtitle" id="thresholdName">Indicateur</div>
            <div style="display:flex;gap:12px;margin-bottom:16px;">
                <div class="form-group" style="flex:1;margin-bottom:0;">
                    <input class="form-control" id="thresholdMin" placeholder="Seuil Min" type="number">
                </div>
                <div class="form-group" style="flex:1;margin-bottom:0;">
                    <input class="form-control" id="thresholdMax" placeholder="Seuil Max" type="number">
                </div>
            </div>
            <div style="font-size:12px;color:#64748b;text-align:center;margin-bottom:16px;">Laissez un champ vide pour ignorer ce seuil.</div>
            <button class="btn-primary" id="thresholdSaveBtn">💾 Sauvegarder les seuils</button>
            <button class="btn-close-modal" id="thresholdCloseBtn">Annuler</button>
        </div>
    </div>

    <!-- ===== MODAL SAUVEGARDE INDICATEUR ===== -->
    <div id="saveIndicatorModal" class="modal-overlay" style="display:none;">
        <div class="modal-content">
            <div class="modal-icon">💾</div>
            <div class="modal-title">Sauvegarder l'indicateur</div>
            <div class="modal-subtitle">Donnez un nom et une description à cette requête</div>
            <div class="form-group">
                <input class="form-control" id="saveIndName" placeholder="Nom de l'indicateur *">
            </div>
            <div class="form-group">
                <textarea class="form-control" id="saveIndDesc" rows="2" placeholder="Description (optionnel)" style="resize:vertical;min-height:70px;"></textarea>
            </div>
            <div style="background:#0f172a;border-radius:10px;padding:12px;margin-bottom:16px;">
                <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:6px;">Requête SQL :</div>
                <div style="font-family:monospace;font-size:11px;color:#a5f3fc;line-height:1.6;max-height:100px;overflow-y:auto;" id="saveIndSql"></div>
            </div>
            <button class="btn-primary" id="saveIndBtn">💾 Sauvegarder</button>
            <button class="btn-close-modal" id="saveIndCloseBtn">Annuler</button>
        </div>
    </div>

    <!-- ===== SIDEBAR INDICATEURS ===== -->
    <div id="sidebarOverlay" class="sidebar-overlay" style="display:none;"></div>
    <div id="sidebar" class="sidebar" style="display:none;">
        <div class="sidebar-header">
            <span class="sidebar-title">📊 Indicateurs</span>
            <button class="sidebar-close" id="sidebarClose">✕</button>
        </div>
        <div class="sidebar-search">
            <span class="search-icon">🔍</span>
            <input id="sidebarSearch" placeholder="Rechercher...">
        </div>
        <div id="indicatorsList"></div>
    </div>

    <!-- ===== MODE PRÉSENTATION ===== -->
    <div id="presentationMode" style="display:none;flex:1;background:#0a0a1a;padding:20px;flex-direction:column;">
        <div class="presentation-header">
            <span class="presentation-title">📺 Mode Présentation</span>
            <button class="presentation-close" id="presentationClose">✕ Fermer</button>
        </div>
        <div id="presentationEmpty" style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:30px;">
            <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:8px;text-align:center;">Aucun indicateur disponible</div>
            <div style="font-size:14px;color:#94a3b8;text-align:center;">Créez des indicateurs pour utiliser le mode présentation</div>
        </div>
        <div id="presentationContent" style="display:none;flex:1;flex-direction:column;">
            <div class="presentation-nav">
                <button id="presentationPrev">◀</button>
                <span class="presentation-counter" id="presentationCounter">1 / 1</span>
                <button id="presentationNext">▶</button>
            </div>
            <div class="presentation-content">
                <div class="presentation-indicator-name" id="presentationIndName">Indicateur</div>
                <div class="presentation-indicator-desc" id="presentationIndDesc"></div>
            </div>
            <div class="presentation-messages" id="presentationMessages"></div>
        </div>
    </div>

    <!-- ===== MODAL IMAGE/VIDÉO PLEIN ÉCRAN ===== -->
    <div id="mediaModal" class="modal-overlay" style="display:none;background:rgba(0,0,0,0.95);">
        <button style="position:absolute;top:50px;right:20px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;color:#fff;font-size:24px;cursor:pointer;z-index:10;" id="mediaModalClose">✕</button>
        <div style="width:100%;max-height:80%;display:flex;flex-direction:column;align-items:center;padding:20px;">
            <div style="color:#fff;font-size:16px;font-weight:700;margin-bottom:12px;text-align:center;" id="mediaModalTitle"></div>
            <div id="mediaModalContent" style="width:100%;flex:1;display:flex;align-items:center;justify-content:center;">
                <img id="mediaModalImage" style="display:none;width:100%;max-height:400px;border-radius:8px;object-fit:contain;" />
                <div id="mediaModalVideo" style="display:none;width:100%;height:300px;background:#1a1a2e;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;">
                    <div style="color:#fff;font-size:24px;margin-bottom:12px;">🎬 Lecture vidéo</div>
                    <div style="color:#94a3b8;font-size:12px;text-align:center;word-break:break-all;" id="mediaModalVideoUrl"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- ===== MODAL GRAPHIQUE AGRANDI ===== -->
    <div id="chartModal" class="modal-overlay" style="display:none;background:rgba(0,0,0,0.85);">
        <div style="background:#fff;border-radius:20px;width:100%;max-height:90%;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #e5e7eb;background:#f8fafc;">
                <span style="font-size:16px;font-weight:700;color:#1e293b;" id="chartModalTitle">📊 Graphique</span>
                <button style="width:36px;height:36px;border-radius:50%;background:#fef2f2;border:none;font-size:18px;color:#ef4444;font-weight:bold;cursor:pointer;" id="chartModalClose">✕</button>
            </div>
            <div style="padding:20px;overflow-y:auto;max-height:600px;display:flex;align-items:center;justify-content:center;" id="chartModalContent">
                <div style="text-align:center;color:#94a3b8;">Graphique agrandi</div>
            </div>
        </div>
    </div>
</div>

<!-- ===== SCRIPTS ===== -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
// ================================================================
// APPLICATION ERIC IA - VERSION WEB
// ================================================================

class EricApp {
    constructor() {
        // ===== ÉTATS =====
        this.state = {
            isLoggedIn: false,
            user: null,
            selectedBase: null,
            bases: [],
            indicators: [],
            messages: [],
            inputText: '',
            isLoading: false,
            isSpeaking: false,
            autoSpeak: true,
            recognizing: false,
            editingIndex: null,
            viewMode: 'cards',
            displayLimit: 10,
            alerts: [],
            alertThresholds: {},
            webViewErrors: {},
            isSidebarVisible: false,
            isPresentationMode: false,
            presentationIndex: 0,
            chartData: null,
            expandedChart: null,
            selectedMedia: null,
            mediaModalVisible: false,
            isSavingIndicator: false,
            chartInstances: {}
        };

        // ===== RÉFÉRENCES =====
        this.speechSynth = window.speechSynthesis;
        this.recognition = null;

        // ===== INIT =====
        this.init();
    }

    // ================================================================
    // INITIALISATION
    // ================================================================
    init() {
        this.loadState();
        this.setupEventListeners();
        this.checkLoginStatus();
    }

    // ================================================================
    // GESTION D'ÉTAT LOCAL (localStorage)
    // ================================================================
    loadState() {
        try {
            const saved = localStorage.getItem('eric_app_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state.alertThresholds = parsed.alertThresholds || {};
                this.state.alerts = parsed.alerts || [];
                this.state.autoSpeak = parsed.autoSpeak !== undefined ? parsed.autoSpeak : true;
            }
        } catch (e) { console.warn('Erreur chargement état:', e); }
    }

    saveState() {
        try {
            const data = {
                alertThresholds: this.state.alertThresholds,
                alerts: this.state.alerts,
                autoSpeak: this.state.autoSpeak,
            };
            localStorage.setItem('eric_app_state', JSON.stringify(data));
        } catch (e) { console.warn('Erreur sauvegarde état:', e); }
    }

    // ================================================================
    // ÉVÉNEMENTS
    // ================================================================
    setupEventListeners() {
        // Connexion
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('loginInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleLogin(); });
        document.getElementById('passwordInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleLogin(); });
        document.getElementById('togglePwd').addEventListener('click', () => this.togglePasswordVisibility());
        document.getElementById('forgotBtn').addEventListener('click', () => this.openForgotModal());

        // Auth modal
        document.getElementById('authCloseBtn').addEventListener('click', () => this.closeAuthModal());
        document.getElementById('authBtn').addEventListener('click', () => this.handleAuth());
        document.getElementById('authToggleBtn').addEventListener('click', () => this.toggleAuthMode());

        // Forgot modal
        document.getElementById('forgotCloseBtn').addEventListener('click', () => this.closeForgotModal());
        document.getElementById('resetBtn').addEventListener('click', () => this.handleResetPassword());
        document.getElementById('resetEmail').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleResetPassword(); });

        // Logout
        document.getElementById('logoutBaseBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('logoutMainBtn').addEventListener('click', () => this.handleLogout());

        // Bases
        document.getElementById('backToBases').addEventListener('click', () => this.goBackToBases());

        // Chat
        document.getElementById('sendBtn').addEventListener('click', () => this.handleSend());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
        document.getElementById('messageInput').addEventListener('input', () => this.updateSendButton());
        document.getElementById('cancelEdit').addEventListener('click', () => this.cancelEdit());

        // Voice
        document.getElementById('voiceBtn').addEventListener('click', () => this.toggleVoiceRecognition());
        document.getElementById('voiceToggleMain').addEventListener('click', () => this.toggleAutoSpeak());
        document.getElementById('voiceToggleBase').addEventListener('click', () => this.toggleAutoSpeak());
        document.getElementById('stopSpeakingBtn').addEventListener('click', () => this.stopSpeaking());
        document.getElementById('stopSpeakingBar').addEventListener('click', () => this.stopSpeaking());

        // Sidebar
        document.getElementById('indicatorsBtn').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebarClose').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebarOverlay').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebarSearch').addEventListener('input', () => this.renderIndicators());

        // Alerts
        document.getElementById('alertBtn').addEventListener('click', () => this.openAlertModal());
        document.getElementById('alertCloseBtn').addEventListener('click', () => this.closeAlertModal());

        // Presentation
        document.getElementById('presentationBtn').addEventListener('click', () => this.togglePresentation());
        document.getElementById('presentationClose').addEventListener('click', () => this.togglePresentation());
        document.getElementById('presentationPrev').addEventListener('click', () => this.prevPresentationSlide());
        document.getElementById('presentationNext').addEventListener('click', () => this.nextPresentationSlide());

        // Threshold modal
        document.getElementById('thresholdCloseBtn').addEventListener('click', () => this.closeThresholdModal());
        document.getElementById('thresholdSaveBtn').addEventListener('click', () => this.saveThreshold());

        // Save indicator modal
        document.getElementById('saveIndCloseBtn').addEventListener('click', () => this.closeSaveIndicatorModal());
        document.getElementById('saveIndBtn').addEventListener('click', () => this.handleSaveIndicator());

        // Media modal
        document.getElementById('mediaModalClose').addEventListener('click', () => this.closeMediaModal());

        // Chart modal
        document.getElementById('chartModalClose').addEventListener('click', () => this.closeChartModal());

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    // ================================================================
    // AUTHENTIFICATION
    // ================================================================
    async handleLogin() {
        const login = document.getElementById('loginInput').value.trim();
        const mdp = document.getElementById('passwordInput').value.trim();

        if (!login || !mdp) {
            this.showToast('Erreur', 'Veuillez remplir le login et le mot de passe.');
            return;
        }

        document.getElementById('loginBtn').disabled = true;
        document.getElementById('loginBtn').innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

        try {
            const res = await fetch('https://cyberic.xyz/api/ia-base.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', login, mdp })
            });
            const data = await res.json();

            if (data.error) {
                this.showToast('Erreur de connexion', data.error);
            } else if (data.success && data.user) {
                this.state.user = data.user;
                this.state.isLoggedIn = true;
                this.speak(`Bienvenue ${data.user.nom}`);
                await this.fetchBases(data.user.id);
                this.showScreen('bases');
            }
        } catch (e) {
            this.showToast('Erreur réseau', 'Impossible de se connecter au serveur.');
        } finally {
            document.getElementById('loginBtn').disabled = false;
            document.getElementById('loginBtn').textContent = 'Se connecter';
        }
    }

    async fetchBases(userId) {
        try {
            const res = await fetch('https://cyberic.xyz/api/ia-base.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_bases', user_id: userId })
            });
            const data = await res.json();
            if (data.error) {
                this.showToast('Erreur', data.error);
            } else {
                this.state.bases = data.bases || [];
                this.renderBases();
            }
        } catch (e) {
            this.showToast('Erreur réseau', 'Impossible de charger les bases.');
        }
    }

    // ================================================================
    // AUTH MODAL
    // ================================================================
    openAuthModal(message = 'Connectez-vous pour continuer') {
        document.getElementById('authModalTitle').textContent = 'Connexion requise';
        document.getElementById('authModalSubtitle').textContent = message;
        document.getElementById('authLogin').value = '';
        document.getElementById('authPassword').value = '';
        document.getElementById('registerFields').style.display = 'none';
        document.getElementById('authBtn').textContent = 'Se connecter';
        document.getElementById('authToggleBtn').textContent = 'Pas de compte ? S\'inscrire';
        this.state.isRegisterMode = false;
        document.getElementById('authModal').style.display = 'flex';
    }

    closeAuthModal() {
        document.getElementById('authModal').style.display = 'none';
    }

    toggleAuthMode() {
        this.state.isRegisterMode = !this.state.isRegisterMode;
        const fields = document.getElementById('registerFields');
        const btn = document.getElementById('authBtn');
        const toggle = document.getElementById('authToggleBtn');

        if (this.state.isRegisterMode) {
            fields.style.display = 'block';
            btn.textContent = 'S\'inscrire';
            toggle.textContent = 'Déjà un compte ? Se connecter';
            document.getElementById('authModalTitle').textContent = 'Créer un compte';
            document.getElementById('authModalSubtitle').textContent = 'Inscrivez-vous pour continuer';
        } else {
            fields.style.display = 'none';
            btn.textContent = 'Se connecter';
            toggle.textContent = 'Pas de compte ? S\'inscrire';
            document.getElementById('authModalTitle').textContent = 'Connexion requise';
            document.getElementById('authModalSubtitle').textContent = 'Connectez-vous pour continuer';
        }
    }

    async handleAuth() {
        const login = document.getElementById('authLogin').value.trim();
        const mdp = document.getElementById('authPassword').value.trim();

        if (!login || !mdp) {
            this.showToast('Erreur', 'Login et mot de passe requis');
            return;
        }

        document.getElementById('authBtn').disabled = true;
        document.getElementById('authBtn').innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

        try {
            let payload = { action: this.state.isRegisterMode ? 'register' : 'login', login, mdp };
            if (this.state.isRegisterMode) {
                const nom = document.getElementById('regNom').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const telephone = document.getElementById('regPhone').value.trim();
                payload = { ...payload, nom_prenom: nom, email, telephone };
            }

            const res = await fetch('https://cyberic.xyz/api/ia-base.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.error) {
                this.showToast('Erreur', data.error);
            } else if (data.success) {
                if (this.state.isRegisterMode) {
                    this.showToast('Succès', 'Compte créé ! Connectez-vous.');
                    this.toggleAuthMode();
                } else {
                    this.state.user = data.user;
                    this.state.isLoggedIn = true;
                    this.closeAuthModal();
                    this.speak(`Bienvenue ${data.user.nom}`);
                    await this.fetchBases(data.user.id);
                    this.showScreen('bases');
                }
            }
        } catch (e) {
            this.showToast('Erreur réseau', 'Impossible de contacter le serveur.');
        } finally {
            document.getElementById('authBtn').disabled = false;
            document.getElementById('authBtn').textContent = this.state.isRegisterMode ? 'S\'inscrire' : 'Se connecter';
        }
    }

    // ================================================================
    // MOT DE PASSE OUBLIÉ
    // ================================================================
    openForgotModal() {
        document.getElementById('forgotModal').style.display = 'flex';
        document.getElementById('forgotSuccess').style.display = 'none';
        document.getElementById('forgotForm').style.display = 'block';
        document.getElementById('forgotError').style.display = 'none';
        document.getElementById('resetEmail').value = '';
    }

    closeForgotModal() {
        document.getElementById('forgotModal').style.display = 'none';
    }

    async handleResetPassword() {
        const email = document.getElementById('resetEmail').value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('forgotError').textContent = 'Veuillez saisir une adresse email valide.';
            document.getElementById('forgotError').style.display = 'block';
            return;
        }

        document.getElementById('resetBtn').disabled = true;
        document.getElementById('resetBtn').innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

        try {
            const res = await fetch('https://cyberic.xyz/api/retrouve-acces.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (data.error) {
                document.getElementById('forgotError').textContent = data.error;
                document.getElementById('forgotError').style.display = 'block';
            } else {
                document.getElementById('forgotSuccess').style.display = 'block';
                document.getElementById('forgotForm').style.display = 'none';
                document.getElementById('forgotSuccessMsg').textContent = data.message || 'Vos accès ont été envoyés.';
            }
        } catch (e) {
            document.getElementById('forgotError').textContent = 'Erreur de connexion au serveur.';
            document.getElementById('forgotError').style.display = 'block';
        } finally {
            document.getElementById('resetBtn').disabled = false;
            document.getElementById('resetBtn').textContent = 'Envoyer mes accès';
        }
    }

    // ================================================================
    // GESTION DES ÉCRANS
    // ================================================================
    showScreen(screen) {
        const loginScreen = document.getElementById('loginScreen');
        const basesScreen = document.getElementById('basesScreen');
        const mainScreen = document.getElementById('mainScreen');

        loginScreen.style.display = 'none';
        basesScreen.style.display = 'none';
        mainScreen.style.display = 'none';

        if (screen === 'login') {
            loginScreen.style.display = 'flex';
        } else if (screen === 'bases') {
            basesScreen.style.display = 'flex';
            document.getElementById('headerUser').textContent = `👤 ${this.state.user?.nom || 'Utilisateur'}`;
            this.renderBases();
        } else if (screen === 'main') {
            mainScreen.style.display = 'flex';
            if (this.state.selectedBase) {
                document.getElementById('currentBaseName').textContent = this.state.selectedBase.nom_base;
                document.getElementById('currentBaseInfo').textContent = `🌐 ${this.state.selectedBase.hote} • 👤 ${this.state.user?.nom || ''}`;
            }
            this.renderMessages();
        }
    }

    goBackToBases() {
        this.state.selectedBase = null;
        this.state.messages = [];
        this.state.indicators = [];
        this.state.isPresentationMode = false;
        document.getElementById('presentationMode').style.display = 'none';
        this.showScreen('bases');
    }

    // ================================================================
    // RENDU DES BASES
    // ================================================================
    renderBases() {
        const container = document.getElementById('basesList');
        const count = document.getElementById('basesCount');
        count.textContent = `${this.state.bases.length} base(s) active(s) • Sélectionnez pour interroger`;

        if (this.state.bases.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🗄️</div>
                    <div class="empty-text">Aucune base de données active associée à votre compte.</div>
                    <button class="refresh-btn" id="refreshBases">🔄 Actualiser</button>
                </div>
            `;
            document.getElementById('refreshBases')?.addEventListener('click', () => this.fetchBases(this.state.user.id));
            return;
        }

        container.innerHTML = this.state.bases.map(base => `
            <div class="base-card" data-base-id="${base.base_id}">
                <div class="base-card-header">
                    <div class="base-icon">🗄️</div>
                    <div class="base-info">
                        <div class="base-name">${base.nom_base}</div>
                        <div class="base-host">🌐 ${base.hote}</div>
                    </div>
                    <div class="base-status">● ${base.statut}</div>
                </div>
                <div class="base-tables">
                    ${base.all_tables ? `
                        <div class="base-tables-label">📋 Accès complet</div>
                        <div class="base-tables-all">🌐 Toutes les tables de la base sont autorisées</div>
                    ` : `
                        <div class="base-tables-label">📋 ${base.tables_list?.length || 0} table(s) autorisée(s)</div>
                        <div class="base-tables-list">${base.tables_list?.join(', ') || 'Aucune table configurée'}</div>
                    `}
                </div>
                <div class="base-footer">
                    <span class="base-footer-text">Interroger cette base →</span>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.base-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.baseId;
                const base = this.state.bases.find(b => b.base_id == id);
                if (base) this.selectBase(base);
            });
        });
    }

    // ================================================================
    // SÉLECTION D'UNE BASE
    // ================================================================
    async selectBase(base) {
        this.state.selectedBase = base;
        this.state.messages = [];
        this.state.indicators = [];
        this.state.editingIndex = null;
        document.getElementById('messageInput').value = '';
        this.state.inputText = '';

        if (this.state.isPresentationMode) this.togglePresentation();

        try {
            const res = await fetch('https://cyberic.xyz/api/ia-base.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_indicateurs', user_id: this.state.user.id, base_id: base.base_id })
            });
            const data = await res.json();
            if (data.success) this.state.indicators = data.indicateurs || [];
        } catch (e) {
            console.error('Erreur chargement indicateurs', e);
        }

        this.speak(`Base sélectionnée: ${base.nom_base}`);
        this.showScreen('main');
        this.renderWelcome();
    }

    // ================================================================
    // MESSAGES
    // ================================================================
    renderWelcome() {
        const container = document.getElementById('messagesContainer');
        const base = this.state.selectedBase;
        container.innerHTML = `
            <div class="welcome">
                <div class="welcome-icon">E</div>
                <div class="welcome-title">Bonjour, je suis Eric</div>
                <div class="welcome-text">Votre assistant IA connecté à votre base de données.<br>Base : ${base.nom_base}</div>
                <div class="welcome-tables">
                    <div class="welcome-tables-title">Tables disponibles :</div>
                    <div class="welcome-tables-list">${base.all_tables ? `🌐 Toutes les tables de la base "${base.nom_base}"` : base.tables_list?.join(', ') || 'Aucune'}</div>
                </div>
            </div>
        `;
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        if (this.state.messages.length === 0) {
            this.renderWelcome();
            return;
        }

        // Nettoyer les anciennes instances de graphiques
        Object.keys(this.state.chartInstances).forEach(key => {
            try { this.state.chartInstances[key].destroy(); } catch(e) {}
            delete this.state.chartInstances[key];
        });

        container.innerHTML = this.state.messages.map((msg, index) => {
            if (msg.role === 'user') {
                return `
                    <div class="message user">
                        <div class="message-bubble">
                            ${this.escapeHtml(msg.content)}
                            <button class="edit-btn" data-index="${index}">✏️ Modifier</button>
                        </div>
                    </div>
                `;
            }
            return this.renderAssistantMessage(msg, index);
        }).join('');

        // Scroll en bas
        container.scrollTop = container.scrollHeight;

        // Événements pour les boutons d'édition
        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                this.handleEdit(idx);
            });
        });

        // Événements pour les boutons d'écoute
        container.querySelectorAll('.speak-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.dataset.text;
                if (text) this.speak(text);
            });
        });

        // Événements pour les onglets
        container.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.mode;
                const msgIdx = parseInt(tab.dataset.msgIndex);
                this.setViewMode(msgIdx, mode);
            });
        });

        // Événements pour les boutons "Voir plus"
        container.querySelectorAll('.see-more-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const msgIdx = parseInt(btn.dataset.msgIndex);
                this.state.displayLimit += 50;
                this.renderMessages();
            });
        });

        // Initialiser les graphiques après le rendu
        setTimeout(() => {
            this.state.messages.forEach((msg, idx) => {
                if (msg.role === 'assistant' && msg.results && msg.results.length > 0) {
                    const chartData = this.getChartData(msg.results);
                    if (chartData && chartData.length > 0) {
                        ['bar', 'line', 'pie', 'radar', 'polarArea'].forEach(mode => {
                            const canvas = document.getElementById(`chart_${mode}_${idx}`);
                            if (canvas) {
                                this.renderChart(canvas, mode, chartData, `chart_${mode}_${idx}`);
                            }
                        });
                    }
                }
            });
        }, 100);
    }

    renderAssistantMessage(msg, index) {
        if (msg.error) {
            return `
                <div class="message assistant">
                    <div class="message-avatar">E</div>
                    <div class="message-bubble" style="background:#fef2f2;border:1px solid #fecaca;">
                        <div style="color:#b91c1c;">⚠️ ${this.escapeHtml(msg.error)}</div>
                        ${msg.sql ? `<div style="background:#1e293b;border-radius:8px;padding:10px;margin-top:8px;font-family:monospace;font-size:11px;color:#fca5a5;overflow-x:auto;">${this.escapeHtml(msg.sql)}</div>` : ''}
                    </div>
                </div>
            `;
        }

        if (msg.content) {
            return `
                <div class="message assistant">
                    <div class="message-avatar">E</div>
                    <div class="message-bubble" style="background:#f8fafc;">
                        <div>${this.escapeHtml(msg.content)}</div>
                        <button class="speak-btn" data-text="${this.escapeHtml(msg.content)}">🔊 Écouter</button>
                    </div>
                </div>
            `;
        }

        if (msg.results && msg.results.length > 0) {
            return this.renderResults(msg, index);
        }

        return `
            <div class="message assistant">
                <div class="message-avatar">E</div>
                <div class="message-bubble" style="background:#f0fdf4;border:1px solid #bbf7d0;">
                    <div style="color:#166534;">✅ Requête exécutée avec succès, mais aucun résultat trouvé.</div>
                </div>
            </div>
        `;
    }

    renderResults(msg, index) {
        const hasResults = msg.results && msg.results.length > 0;
        const media = this.extractMedia(msg.results);
        const chartData = this.getChartData(msg.results);
        const canRenderChart = chartData && chartData.length > 0;

        // Onglets disponibles
        const tabs = ['cards', 'table'];
        if (media.coordinates.length > 0) tabs.push('maps');
        if (media.images.length > 0) tabs.push('images');
        if (media.videos.length > 0) tabs.push('videos');
        if (media.documents.length > 0) tabs.push('documents');
        if (media.pages.length > 0) tabs.push('pages');
        if (canRenderChart) tabs.push('bar', 'line', 'pie', 'radar', 'polarArea');

        const tabLabels = {
            cards: '📋 Résultats',
            table: '📊 Tableau',
            bar: '📶 Barres',
            line: '📈 Lignes',
            pie: '🥧 Camembert',
            radar: '🕸️ Radar',
            polarArea: '🎯 Polaire',
            maps: '🗺 Cartes',
            images: '🖼 Images',
            videos: '🎬 Vidéos',
            documents: '📄 Documents',
            pages: '🌐 Pages'
        };

        const currentView = this.state.viewMode;

        return `
            <div class="message assistant" data-msg-index="${index}">
                <div class="message-avatar">E</div>
                <div class="message-bubble" style="padding:0;background:transparent;max-width:95%;">
                    <div class="results-container">
                        <div class="results-header">
                            <div style="display:flex;align-items:center;gap:6px;">
                                ${msg.isIndicator ? '📊' : '📊'}
                                <span class="results-title">${msg.isIndicator ? `Indicateur : ${msg.nom || 'Résultat'}` : '📊 Résultats'}</span>
                            </div>
                            <span class="results-count">${msg.count || msg.results.length} ligne(s)</span>
                        </div>

                        <div class="chart-tabs">
                            ${tabs.map(mode => `
                                <button class="chart-tab ${currentView === mode ? 'active' : ''}" 
                                        data-mode="${mode}" 
                                        data-msg-index="${index}"
                                        ${(['bar','line','pie','radar','polarArea'].includes(mode) && !canRenderChart) ? 'disabled' : ''}>
                                    ${tabLabels[mode] || mode}
                                </button>
                            `).join('')}
                        </div>

                        <div class="results-content">
                            ${this.renderResultsContent(msg, media, chartData, currentView, index)}
                        </div>

                        ${msg.sql ? `
                            <div style="padding:10px 14px;border-top:1px solid #e5e7eb;background:#f8fafc;">
                                <button class="sql-toggle" style="color:#6c63ff;font-size:13px;font-weight:600;background:none;border:none;cursor:pointer;" onclick="app.toggleSql(${index})">
                                    🔎 Voir le SQL généré
                                </button>
                                ${!msg.isIndicator ? `<button class="save-indicator-btn" style="margin-left:12px;color:#166534;font-size:13px;font-weight:600;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;cursor:pointer;" onclick="app.openSaveIndicatorModal('${this.escapeHtml(msg.sql)}')">💾 Sauvegarder</button>` : ''}
                                <div id="sql-${index}" style="display:none;background:#0f172a;border-radius:10px;padding:12px;margin-top:8px;font-family:monospace;font-size:12px;color:#a5f3fc;line-height:1.6;overflow-x:auto;">${this.escapeHtml(msg.sql)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderResultsContent(msg, media, chartData, viewMode, index) {
        if (viewMode === 'cards') {
            return msg.results.map((row, idx) => `
                <div class="result-card">
                    <div class="result-card-header">
                        <span class="result-card-index">#${idx + 1}</span>
                        <button class="speak-btn" style="background:#ede9fe;padding:4px 8px;border-radius:6px;border:none;font-size:11px;font-weight:600;color:#6c63ff;cursor:pointer;" data-text="${this.escapeHtml(Object.values(row).join(', '))}">🔊</button>
                    </div>
                    ${Object.entries(row).map(([key, value]) => `
                        <div class="result-row">
                            <span class="result-label">${this.escapeHtml(key)}</span>
                            <span class="result-value">${value === null || value === undefined ? 'NULL' : this.escapeHtml(String(value))}</span>
                        </div>
                    `).join('')}
                </div>
            `).join('');
        }

        if (viewMode === 'table') {
            const keys = Object.keys(msg.results[0] || {});
            const displayData = msg.results.slice(0, this.state.displayLimit);
            return `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                ${keys.map(k => `<th>${this.escapeHtml(k)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${displayData.map((row, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    ${keys.map(k => `<td>${row[k] === null || row[k] === undefined ? 'NULL' : this.escapeHtml(String(row[k]))}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${this.state.displayLimit < msg.results.length ? `
                        <button class="see-more-btn" data-msg-index="${index}">
                            Voir plus (${msg.results.length - this.state.displayLimit} lignes restantes)
                        </button>
                    ` : ''}
                </div>
            `;
        }

        if (viewMode === 'maps' && media.coordinates.length > 0) {
            return media.coordinates.map((coord, idx) => {
                const mapId = `map-${index}-${idx}`;
                const errorKey = `map-${index}-${idx}`;
                if (this.state.webViewErrors[errorKey]) {
                    return `
                        <div class="media-card error">
                            <div class="media-card-title" style="color:#dc2626;">⚠️ Carte non disponible</div>
                            <div class="media-card-sub">${coord.name}</div>
                            <button class="media-btn" onclick="app.retryMedia('${errorKey}')">🔄 Réessayer</button>
                        </div>
                    `;
                }
                return `
                    <div class="media-card">
                        <div class="media-card-title">📍 ${coord.name}</div>
                        <div class="media-card-sub">Lat: ${coord.lat}, Lon: ${coord.lon}</div>
                        <div class="webview-container" id="${mapId}">
                            <div class="webview-loading">
                                <div class="spinner"></div>
                                <div class="loading-text">Chargement de la carte...</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (viewMode === 'images' && media.images.length > 0) {
            return `
                <div class="media-grid">
                    ${media.images.map((img, idx) => `
                        <div class="media-grid-item" onclick="app.openMediaModal('${this.escapeHtml(img.uri)}', '${this.escapeHtml(img.name)}', 'image')">
                            <img src="${img.uri}" alt="${img.name}" onerror="this.style.display='none'">
                            <div class="media-label">${img.name}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (viewMode === 'videos' && media.videos.length > 0) {
            return media.videos.map((video, idx) => {
                const errorKey = `video-${index}-${idx}`;
                if (this.state.webViewErrors[errorKey]) {
                    return `
                        <div class="media-card error">
                            <div class="media-card-title" style="color:#dc2626;">⚠️ Vidéo non disponible</div>
                            <div class="media-card-sub">${video.name}</div>
                            <button class="media-btn" onclick="app.retryMedia('${errorKey}')">🔄 Réessayer</button>
                        </div>
                    `;
                }
                let embedUrl = video.uri;
                if (video.isYouTube) {
                    const match = video.uri.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&?]+)/);
                    if (match) embedUrl = `https://www.youtube.com/embed/${match[1]}`;
                }
                const videoId = `video-${index}-${idx}`;
                return `
                    <div class="media-card">
                        <div class="media-card-title">🎬 ${video.name}</div>
                        ${video.isYouTube ? '<div class="media-card-sub">📺 YouTube</div>' : ''}
                        <div class="webview-container" id="${videoId}">
                            <div class="webview-loading">
                                <div class="spinner"></div>
                                <div class="loading-text">Chargement de la vidéo...</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (viewMode === 'documents' && media.documents.length > 0) {
            return media.documents.map((doc, idx) => {
                const errorKey = `doc-${index}-${idx}`;
                if (this.state.webViewErrors[errorKey]) {
                    return `
                        <div class="media-card error">
                            <div class="media-card-title" style="color:#dc2626;">⚠️ Document non disponible</div>
                            <div class="media-card-sub">${doc.name}</div>
                            <button class="media-btn" onclick="app.retryMedia('${errorKey}')">🔄 Réessayer</button>
                        </div>
                    `;
                }
                const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(doc.uri)}&embedded=true`;
                const docId = `doc-${index}-${idx}`;
                return `
                    <div class="media-card">
                        <div class="media-card-title">📄 ${doc.name}</div>
                        <div class="media-card-sub">Type: ${doc.type.toUpperCase()}</div>
                        <div class="webview-container" id="${docId}">
                            <div class="webview-loading">
                                <div class="spinner"></div>
                                <div class="loading-text">Chargement du document...</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (viewMode === 'pages' && media.pages.length > 0) {
            return media.pages.map((page, idx) => {
                const errorKey = `page-${index}-${idx}`;
                if (this.state.webViewErrors[errorKey]) {
                    return `
                        <div class="media-card error">
                            <div class="media-card-title" style="color:#dc2626;">⚠️ Page non disponible</div>
                            <div class="media-card-sub">${page.name}</div>
                            <button class="media-btn" onclick="app.retryMedia('${errorKey}')">🔄 Réessayer</button>
                        </div>
                    `;
                }
                const pageId = `page-${index}-${idx}`;
                return `
                    <div class="media-card">
                        <div class="media-card-title">🌐 ${page.name}</div>
                        <div class="media-card-sub" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${page.uri}</div>
                        <div class="webview-container" id="${pageId}">
                            <div class="webview-loading">
                                <div class="spinner"></div>
                                <div class="loading-text">Chargement de la page...</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Graphiques
        if (['bar', 'line', 'pie', 'radar', 'polarArea'].includes(viewMode) && chartData && chartData.length > 0) {
            const modeNames = {
                'bar': '📶 Graphique en Barres',
                'line': '📈 Graphique en Lignes',
                'pie': '🥧 Graphique en Camembert',
                'radar': '🕸️ Graphique en Radar',
                'polarArea': '🎯 Graphique Polaire'
            };
            const chartId = `chart_${viewMode}_${index}`;
            return `
                <div class="chart-container chart-clickable" onclick="app.openChartModal('${viewMode}', ${index})">
                    <canvas id="${chartId}"></canvas>
                    <div class="zoom-hint">🔍 Cliquer pour agrandir</div>
                </div>
            `;
        }

        return `
            <div class="no-media">Aucun contenu dans cet onglet</div>
        `;
    }

    // ================================================================
    // EXTRACTION DES MÉDIAS
    // ================================================================
    extractMedia(results) {
        if (!results || results.length === 0) return { images: [], videos: [], documents: [], pages: [], coordinates: [] };

        const images = [];
        const videos = [];
        const documents = [];
        const pages = [];
        const coordinates = [];

        const isValidUrl = (url) => {
            if (!url) return false;
            const trimmed = url.trim();
            return trimmed.startsWith('http://') || trimmed.startsWith('https://');
        };

        const splitUrls = (str) => {
            if (!str) return [];
            return str.split(/[;,]\s*/).filter(u => u.trim().length > 0);
        };

        results.forEach((row) => {
            Object.entries(row).forEach(([key, value]) => {
                if (!value) return;
                const strValue = String(value);

                // Coordonnées GPS
                if ((key.toLowerCase().includes('latitude') || key.toLowerCase().includes('lat')) && !isNaN(parseFloat(strValue))) {
                    const lat = parseFloat(strValue);
                    const lonKey = Object.keys(row).find(k => 
                        k.toLowerCase().includes('longitude') || k.toLowerCase().includes('lon') || k.toLowerCase().includes('lng')
                    );
                    if (lonKey && row[lonKey] && !isNaN(parseFloat(row[lonKey]))) {
                        coordinates.push({
                            lat: lat,
                            lon: parseFloat(row[lonKey]),
                            name: row.nom || row.name || `Point ${coordinates.length + 1}`
                        });
                    }
                }

                // YouTube
                const youtubePattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([^\s&]+)/i;
                if (youtubePattern.test(strValue) && isValidUrl(strValue)) {
                    const urls = splitUrls(strValue);
                    urls.forEach(url => {
                        if (youtubePattern.test(url) && isValidUrl(url)) {
                            videos.push({ uri: url.trim(), name: row.nom || row.name || `Vidéo ${videos.length + 1}`, isYouTube: true });
                        }
                    });
                    return;
                }

                // Images
                if ((strValue.match(/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)/i) && isValidUrl(strValue)) ||
                    strValue.match(/^data:image\/[a-zA-Z]+;base64,/)) {
                    const urls = splitUrls(strValue);
                    urls.forEach(url => {
                        if (isValidUrl(url) || url.startsWith('data:image')) {
                            images.push({ uri: url.trim(), name: row.nom || row.name || `Image ${images.length + 1}` });
                        }
                    });
                    return;
                }

                // Vidéos
                if ((strValue.match(/^https?:\/\/.*\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp)/i) && isValidUrl(strValue)) ||
                    strValue.match(/^data:video\/[a-zA-Z]+;base64,/)) {
                    const urls = splitUrls(strValue);
                    urls.forEach(url => {
                        if (isValidUrl(url) || url.startsWith('data:video')) {
                            videos.push({ uri: url.trim(), name: row.nom || row.name || `Vidéo ${videos.length + 1}`, isYouTube: false });
                        }
                    });
                    return;
                }

                // Documents
                if ((strValue.match(/^https?:\/\/.*\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|json|xml|zip|rar|7z)/i) && isValidUrl(strValue)) ||
                    strValue.match(/^data:application\/[a-zA-Z]+;base64,/)) {
                    const urls = splitUrls(strValue);
                    urls.forEach(url => {
                        if (isValidUrl(url) || url.startsWith('data:application')) {
                            documents.push({
                                uri: url.trim(),
                                name: row.nom || row.name || `Document ${documents.length + 1}`,
                                type: url.match(/\.([^.]+)$/)?.[1] || 'fichier'
                            });
                        }
                    });
                    return;
                }

                // Pages web
                if (strValue.match(/^https?:\/\/[^\s]+/) && isValidUrl(strValue)) {
                    const urls = splitUrls(strValue);
                    urls.forEach(url => {
                        const trimmedUrl = url.trim();
                        if (isValidUrl(trimmedUrl) &&
                            !trimmedUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|json|xml|zip|rar|7z)/i) &&
                            !trimmedUrl.match(/^data:/) &&
                            !youtubePattern.test(trimmedUrl)) {
                            pages.push({ uri: trimmedUrl, name: row.nom || row.name || `Page ${pages.length + 1}` });
                        }
                    });
                }
            });
        });

        return { images, videos, documents, pages, coordinates };
    }

    // ================================================================
    // GRAPHIQUES (Chart.js)
    // ================================================================
    getChartData(results) {
        if (!results || results.length === 0) return null;
        const keys = Object.keys(results[0]);
        if (keys.length < 2) return null;

        let labelKey = null;
        let valueKey = null;

        for (const key of keys) {
            const val = results[0][key];
            const isNumeric = !isNaN(parseFloat(val)) && isFinite(val);
            if (isNumeric && !valueKey) valueKey = key;
            else if (!isNumeric && !labelKey) labelKey = key;
        }

        if (!labelKey) labelKey = keys.find(k => k !== valueKey) || keys[0];
        if (!valueKey) valueKey = keys.find(k => k !== labelKey) || keys[1];

        if (!valueKey || !labelKey) return null;
        if (isNaN(parseFloat(results[0][valueKey]))) return null;

        const colors = ['#6c63ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

        return results.map((row, index) => ({
            value: parseFloat(row[valueKey]) || 0,
            label: String(row[labelKey] || 'N/A').substring(0, 15),
            color: colors[index % colors.length]
        }));
    }

    renderChart(canvas, mode, data, chartId) {
        if (!canvas) return;
        if (this.state.chartInstances[chartId]) {
            try { this.state.chartInstances[chartId].destroy(); } catch(e) {}
            delete this.state.chartInstances[chartId];
        }

        const ctx = canvas.getContext('2d');
        const labels = data.map(d => d.label);
        const values = data.map(d => d.value);
        const colors = data.map(d => d.color);

        const isPie = mode === 'pie' || mode === 'polarArea';
        const isRadar = mode === 'radar';

        const config = {
            type: mode,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valeurs',
                    data: values,
                    backgroundColor: isPie ? colors : colors.map(c => c + '80'),
                    borderColor: isPie ? colors : colors,
                    borderWidth: isPie ? 0 : 2,
                    borderRadius: mode === 'bar' ? 4 : 0,
                    tension: mode === 'line' ? 0.4 : undefined,
                    pointBackgroundColor: mode === 'line' ? colors : undefined,
                    pointRadius: mode === 'line' ? 4 : undefined,
                    fill: isRadar ? true : false,
                    pointBorderColor: mode === 'line' ? colors : undefined,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: isPie || isRadar, position: 'bottom', labels: { font: { size: 10 } } }
                },
                scales: isPie ? undefined : {
                    y: { beginAtZero: true, ticks: { font: { size: 10 } } },
                    x: { ticks: { font: { size: 10 }, maxRotation: 45 } }
                }
            }
        };

        this.state.chartInstances[chartId] = new Chart(ctx, config);
    }

    // ================================================================
    // MODAL GRAPHIQUE AGRANDI
    // ================================================================
    openChartModal(mode, idx) {
        const msg = this.state.messages[idx];
        if (!msg || !msg.results) return;
        const chartData = this.getChartData(msg.results);
        if (!chartData || chartData.length === 0) return;

        const modeNames = {
            'bar': '📶 Graphique en Barres',
            'line': '📈 Graphique en Lignes',
            'pie': '🥧 Graphique en Camembert',
            'radar': '🕸️ Graphique en Radar',
            'polarArea': '🎯 Graphique Polaire'
        };
        document.getElementById('chartModalTitle').textContent = modeNames[mode] || '📊 Graphique';
        document.getElementById('chartModalCount').textContent = chartData.length + ' points de données';

        const canvas = document.getElementById('expandedChart');
        if (this.state.expandedChart) {
            try { this.state.expandedChart.destroy(); } catch(e) {}
            this.state.expandedChart = null;
        }

        const ctx = canvas.getContext('2d');
        const labels = chartData.map(d => d.label);
        const values = chartData.map(d => d.value);
        const colors = chartData.map(d => d.color);

        const isPie = mode === 'pie' || mode === 'polarArea';
        const isRadar = mode === 'radar';

        const config = {
            type: mode,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valeurs',
                    data: values,
                    backgroundColor: isPie ? colors : colors.map(c => c + '80'),
                    borderColor: isPie ? colors : colors,
                    borderWidth: isPie ? 0 : 2,
                    borderRadius: mode === 'bar' ? 6 : 0,
                    tension: mode === 'line' ? 0.4 : undefined,
                    pointBackgroundColor: mode === 'line' ? colors : undefined,
                    pointRadius: mode === 'line' ? 6 : undefined,
                    fill: isRadar ? true : false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: isPie || isRadar, position: 'bottom', labels: { font: { size: 12 } } }
                },
                scales: isPie ? undefined : {
                    y: { beginAtZero: true, ticks: { font: { size: 12 } } },
                    x: { ticks: { font: { size: 12 }, maxRotation: 45 } }
                }
            }
        };

        this.state.expandedChart = new Chart(ctx, config);
        document.getElementById('chartModal').style.display = 'flex';
    }

    closeChartModal() {
        document.getElementById('chartModal').style.display = 'none';
        if (this.state.expandedChart) {
            try { this.state.expandedChart.destroy(); } catch(e) {}
            this.state.expandedChart = null;
        }
    }

    // ================================================================
    // SYNTHÈSE VOCALE
    // ================================================================
    speak(text) {
        if (!text || !this.state.autoSpeak) return;
        this.stopSpeaking();

        const cleanText = text.replace(/[*#_`]/g, '').substring(0, 4000);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            this.state.isSpeaking = true;
            document.getElementById('speakingBar').style.display = 'flex';
            document.getElementById('stopSpeakingBtn').style.display = 'flex';
        };

        utterance.onend = () => {
            this.state.isSpeaking = false;
            document.getElementById('speakingBar').style.display = 'none';
            document.getElementById('stopSpeakingBtn').style.display = 'none';
        };

        utterance.onerror = () => {
            this.state.isSpeaking = false;
            document.getElementById('speakingBar').style.display = 'none';
            document.getElementById('stopSpeakingBtn').style.display = 'none';
        };

        this.speechSynth.speak(utterance);
    }

    stopSpeaking() {
        this.speechSynth.cancel();
        this.state.isSpeaking = false;
        document.getElementById('speakingBar').style.display = 'none';
        document.getElementById('stopSpeakingBtn').style.display = 'none';
    }

    toggleAutoSpeak() {
        this.state.autoSpeak = !this.state.autoSpeak;
        const btn = document.getElementById('voiceToggleMain');
        const btnBase = document.getElementById('voiceToggleBase');
        const icon = this.state.autoSpeak ? '🔊' : '🔇';
        btn.textContent = icon;
        btnBase.textContent = icon;
        if (!this.state.autoSpeak) this.stopSpeaking();
        else this.speak('Voix activée');
        this.saveState();
    }

    // ================================================================
    // RECONNAISSANCE VOCALE
    // ================================================================
    toggleVoiceRecognition() {
        if (this.state.isSpeaking) this.stopSpeaking();

        if (this.state.recognizing) {
            if (this.recognition) {
                this.recognition.stop();
            }
            this.state.recognizing = false;
            document.getElementById('voiceBtn').classList.remove('active');
            document.getElementById('voiceBtn').textContent = '🎤';
            return;
        }

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showToast('Non disponible', 'La reconnaissance vocale n\'est pas supportée par votre navigateur.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'fr-FR';
        this.recognition.interimResults = true;
        this.recognition.continuous = false;

        this.recognition.onstart = () => {
            this.state.recognizing = true;
            document.getElementById('voiceBtn').classList.add('active');
            document.getElementById('voiceBtn').textContent = '🎙️';
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('messageInput').value = transcript;
            this.state.inputText = transcript;
            this.updateSendButton();
        };

        this.recognition.onerror = (event) => {
            console.error('Erreur reconnaissance:', event.error);
            this.state.recognizing = false;
            document.getElementById('voiceBtn').classList.remove('active');
            document.getElementById('voiceBtn').textContent = '🎤';
            this.showToast('Erreur', 'Erreur de reconnaissance vocale: ' + event.error);
        };

        this.recognition.onend = () => {
            this.state.recognizing = false;
            document.getElementById('voiceBtn').classList.remove('active');
            document.getElementById('voiceBtn').textContent = '🎤';
        };

        try {
            this.recognition.start();
        } catch (e) {
            console.error('Erreur démarrage:', e);
            this.state.recognizing = false;
            document.getElementById('voiceBtn').classList.remove('active');
            document.getElementById('voiceBtn').textContent = '🎤';
        }
    }

    // ================================================================
    // ENVOI DE MESSAGE
    // ================================================================
    async handleSend() {
        const text = document.getElementById('messageInput').value.trim();
        if (!text || this.state.isLoading || !this.state.selectedBase || !this.state.user) return;

        if (this.state.isSpeaking) this.stopSpeaking();

        let newMessages = [...this.state.messages];
        if (this.state.editingIndex !== null) {
            newMessages = newMessages.slice(0, this.state.editingIndex);
            newMessages.push({ role: 'user', content: text });
            this.state.editingIndex = null;
            document.getElementById('editingBanner').style.display = 'none';
        } else {
            newMessages.push({ role: 'user', content: text });
        }

        this.state.messages = newMessages;
        document.getElementById('messageInput').value = '';
        this.state.inputText = '';
        this.state.isLoading = true;
        this.updateSendButton();
        document.getElementById('loadingBar').style.display = 'flex';
        this.renderMessages();

        try {
            const res = await fetch('https://cyberic.xyz/api/ia-base.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'ask_ia',
                    user_id: this.state.user.id,
                    base_id: this.state.selectedBase.base_id,
                    question: text
                })
            });
            const data = await res.json();

            if (data.error) {
                this.state.messages.push({ role: 'assistant', error: data.error, sql: data.sql || null });
                this.speak("Désolé, " + data.error);
            } else if (data.success) {
                this.state.messages.push({
                    role: 'assistant',
                    results: data.results || [],
                    sql: data.sql,
                    count: data.count || 0
                });

                if (data.results && data.results.length > 0) {
                    let textToSpeak = `J'ai trouvé ${data.count || data.results.length} résultats.`;
                    if (data.results.length === 1) {
                        const r = data.results[0];
                        const firstKey = Object.keys(r)[0];
                        textToSpeak = `Résultat: ${firstKey} ${r[firstKey]}. `;
                        const secondKey = Object.keys(r)[1];
                        if (secondKey) textToSpeak += `${secondKey}: ${r[secondKey]}. `;
                    }
                    this.speak(textToSpeak);
                } else {
                    this.speak("Aucun résultat trouvé pour votre recherche.");
                }
            }
        } catch (e) {
            this.state.messages.push({ role: 'assistant', error: 'Erreur de connexion au serveur.' });
            this.speak("Erreur de connexion au serveur.");
        } finally {
            this.state.isLoading = false;
            document.getElementById('loadingBar').style.display = 'none';
            this.renderMessages();
        }
    }

    // ================================================================
    // INDICATEURS
    // ================================================================
    async executeIndicator(indicateur) {
        if (this.state.isSpeaking) this.stopSpeaking();
        this.state.isLoading = true;
        document.getElementById('loadingBar').style.display = 'flex';
        this.toggleSidebar(false);

        try {
            const res = await fetch('https://cyberic.xyz/api/ia-base.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'execute_indicateur',
                    user_id: this.state.user.id,
                    indicateur_id: indicateur.indicateur_id
                })
            });
            const data = await res.json();

            if (data.error) {
                this.state.messages.push({ role: 'assistant', error: data.error, sql: indicateur.requete_sql });
                this.speak("Erreur lors de l'exécution de l'indicateur.");
            } else if (data.success) {
                if (data.results && data.results.length > 0) {
                    this.checkAlerts(data.results, indicateur.nom, indicateur.indicateur_id);
                }
                this.state.messages.push({
                    role: 'assistant',
                    results: data.results || [],
                    sql: data.sql || indicateur.requete_sql,
                    count: data.count || 0,
                    isIndicator: true,
                    nom: data.nom || indicateur.nom,
                    indicatorId: indicateur.indicateur_id
                });

                if (data.results && data.results.length > 0) {
                    this.speak(`Indicateur ${indicateur.nom}: ${data.count || data.results.length} résultats trouvés.`);
                } else {
                    this.speak(`Indicateur ${indicateur.nom} exécuté, aucun résultat.`);
                }
            }
        } catch (e) {
            this.state.messages.push({ role: 'assistant', error: 'Erreur de connexion au serveur.' });
        } finally {
            this.state.isLoading = false;
            document.getElementById('loadingBar').style.display = 'none';
            this.renderMessages();
        }
    }

    // ================================================================
    // SIDEBAR INDICATEURS
    // ================================================================
    toggleSidebar(show) {
        const isVisible = this.state.isSidebarVisible;
        this.state.isSidebarVisible = show !== undefined ? show : !isVisible;

        document.getElementById('sidebarOverlay').style.display = this.state.isSidebarVisible ? 'block' : 'none';
        document.getElementById('sidebar').style.display = this.state.isSidebarVisible ? 'block' : 'none';

        if (this.state.isSidebarVisible) {
            this.renderIndicators();
        }
    }

    renderIndicators() {
        const search = document.getElementById('sidebarSearch').value.toLowerCase();
        const filtered = this.state.indicators.filter(ind =>
            ind.nom.toLowerCase().includes(search) ||
            (ind.description && ind.description.toLowerCase().includes(search))
        );

        const container = document.getElementById('indicatorsList');

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-sidebar" style="text-align:center;color:#94a3b8;padding:40px 0;">Aucun indicateur trouvé.</div>';
            return;
        }

        container.innerHTML = filtered.map(ind => `
            <div class="indicator-item">
                <div class="indicator-content" onclick="app.executeIndicator(${JSON.stringify(ind).replace(/"/g, '&quot;')})">
                    <div class="indicator-name">📊 ${ind.nom}</div>
                    <div class="indicator-desc">${ind.description || 'Aucune description'}</div>
                </div>
                <div class="indicator-actions">
                    <button class="alert-btn" onclick="app.openThresholdModal(${ind.indicateur_id}, '${ind.nom}')" title="Configurer alerte">🔔</button>
                    <button onclick="app.deleteIndicator(${ind.indicateur_id}, '${ind.nom}')" title="Supprimer">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    async deleteIndicator(indicateurId, nom) {
        if (!confirm(`Voulez-vous vraiment supprimer "${nom}" ?`)) return;

        try {
            const res = await fetch('https://cyberic.xyz/api/ia-base.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_indicateur',
                    user_id: this.state.user.id,
                    indicateur_id: indicateurId
                })
            });
            const data = await res.json();

            if (data.success) {
                this.state.indicators = this.state.indicators.filter(ind => ind.indicateur_id !== indicateurId);
                this.renderIndicators();
                this.showToast('Succès', 'Indicateur supprimé.');
            } else {
                this.showToast('Erreur', data.error || 'Impossible de supprimer.');
            }
        } catch (e) {
            this.showToast('Erreur réseau', 'Impossible de communiquer avec le serveur.');
        }
    }

    // ================================================================
    // ALERTES
    // ================================================================
    checkAlerts(data, indicatorName, indicatorId) {
        const threshold = this.state.alertThresholds[indicatorId];
        if (!threshold) return;

        const firstValue = data[0] ? Object.values(data[0])[0] : null;
        if (firstValue !== null && !isNaN(parseFloat(firstValue))) {
            const value = parseFloat(firstValue);

            if (threshold.min !== undefined && value < threshold.min) {
                this.addAlert(indicatorName, value, 'min', threshold.min);
            }
            if (threshold.max !== undefined && value > threshold.max) {
                this.addAlert(indicatorName, value, 'max', threshold.max);
            }
        }
    }

    addAlert(indicatorName, value, type, threshold) {
        const newAlert = {
            id: Date.now().toString(),
            indicator: indicatorName,
            value: value,
            type: type,
            threshold: threshold,
            time: new Date().toLocaleString()
        };
        this.state.alerts = [newAlert, ...this.state.alerts];
        this.saveState();
        this.updateAlertBadge();
        this.showToast(`🔴 Alerte ${indicatorName}`, `Valeur ${value} ${type === 'min' ? 'inférieure' : 'supérieure'} au seuil ${type === 'min' ? 'min' : 'max'} ${threshold}`);
    }

    removeAlert(index) {
        this.state.alerts = this.state.alerts.filter((_, i) => i !== index);
        this.saveState();
        this.updateAlertBadge();
        this.renderAlertList();
    }

    updateAlertBadge() {
        const badge = document.getElementById('alertBadge');
        const count = this.state.alerts.length;
        if (count > 0) {
            badge.style.display = 'flex';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
    }

    openAlertModal() {
        document.getElementById('alertModal').style.display = 'flex';
        this.renderAlertList();
    }

    closeAlertModal() {
        document.getElementById('alertModal').style.display = 'none';
    }

    renderAlertList() {
        const container = document.getElementById('alertList');
        if (this.state.alerts.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#64748b;padding:20px 0;">✅ Aucune alerte active</div>';
            return;
        }

        container.innerHTML = this.state.alerts.map((alert, idx) => `
            <div class="alert-item">
                <div class="alert-header">
                    <span class="alert-name">📊 ${alert.indicator}</span>
                    <button class="alert-close" onclick="app.removeAlert(${idx})">✕</button>
                </div>
                <div class="alert-value">${alert.value}</div>
                <div class="alert-detail">Seuil ${alert.type === 'min' ? 'minimum' : 'maximum'} : ${alert.threshold} • ${alert.time}</div>
            </div>
        `).join('');
    }

    // ================================================================
    // SEUILS D'ALERTE
    // ================================================================
    openThresholdModal(indicatorId, indicatorName) {
        this.state.currentThresholdIndicator = { id: indicatorId, name: indicatorName };
        const current = this.state.alertThresholds[indicatorId] || {};
        document.getElementById('thresholdName').textContent = indicatorName;
        document.getElementById('thresholdMin').value = current.min !== undefined ? current.min : '';
        document.getElementById('thresholdMax').value = current.max !== undefined ? current.max : '';
        document.getElementById('thresholdModal').style.display = 'flex';
    }

    closeThresholdModal() {
        document.getElementById('thresholdModal').style.display = 'none';
    }

    saveThreshold() {
        const min = document.getElementById('thresholdMin').value;
        const max = document.getElementById('thresholdMax').value;
        const id = this.state.currentThresholdIndicator.id;

        const newThresholds = { ...this.state.alertThresholds };
        if (min === '' && max === '') {
            delete newThresholds[id];
        } else {
            newThresholds[id] = {
                min: min !== '' ? parseFloat(min) : undefined,
                max: max !== '' ? parseFloat(max) : undefined
            };
        }

        this.state.alertThresholds = newThresholds;
        this.saveState();
        this.closeThresholdModal();
        this.showToast('Succès', `Seuils mis à jour pour "${this.state.currentThresholdIndicator.name}"`);
    }

    // ================================================================
    // SAUVEGARDE INDICATEUR
    // ================================================================
    openSaveIndicatorModal(sql) {
        document.getElementById('saveIndSql').textContent = sql;
        document.getElementById('saveIndName').value = '';
        document.getElementById('saveIndDesc').value = '';
        document.getElementById('saveIndicatorModal').style.display = 'flex';
    }

    closeSaveIndicatorModal() {
        document.getElementById('saveIndicatorModal').style.display = 'none';
    }

    async handleSaveIndicator() {
        const name = document.getElementById('saveIndName').value.trim();
        const desc = document.getElementById('saveIndDesc').value.trim();
        const sql = document.getElementById('saveIndSql').textContent;

        if (!name || !sql) {
            this.showToast('Erreur', 'Le nom et la requête SQL sont obligatoires.');
            return;
        }

        document.getElementById('saveIndBtn').disabled = true;
        document.getElementById('saveIndBtn').innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';

        try {
            const res = await fetch('https://cyberic.xyz/api/ia-base.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_indicateur',
                    user_id: this.state.user.id,
                    base_id: this.state.selectedBase.base_id,
                    nom: name,
                    description: desc,
                    requete_sql: sql
                })
            });
            const data = await res.json();

            if (data.success) {
                this.showToast('Succès', 'Indicateur sauvegardé avec succès.');
                this.speak(`Indicateur ${name} sauvegardé.`);
                this.closeSaveIndicatorModal();

                const resInd = await fetch('https://cyberic.xyz/api/ia-base.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'get_indicateurs',
                        user_id: this.state.user.id,
                        base_id: this.state.selectedBase.base_id
                    })
                });
                const dataInd = await resInd.json();
                if (dataInd.success) this.state.indicators = dataInd.indicateurs || [];
            } else {
                this.showToast('Erreur', data.error || 'Impossible de sauvegarder.');
            }
        } catch (e) {
            this.showToast('Erreur réseau', 'Impossible de sauvegarder l\'indicateur.');
        } finally {
            document.getElementById('saveIndBtn').disabled = false;
            document.getElementById('saveIndBtn').textContent = '💾 Sauvegarder';
        }
    }

    // ================================================================
    // MODE PRÉSENTATION
    // ================================================================
    togglePresentation() {
        if (this.state.isSpeaking) this.stopSpeaking();

        this.state.isPresentationMode = !this.state.isPresentationMode;
        const container = document.getElementById('presentationMode');

        if (this.state.isPresentationMode) {
            container.style.display = 'flex';
            this.state.presentationIndex = 0;
            this.updatePresentation();
        } else {
            container.style.display = 'none';
        }
    }

    updatePresentation() {
        const indicators = this.state.indicators;
        if (indicators.length === 0) {
            document.getElementById('presentationEmpty').style.display = 'flex';
            document.getElementById('presentationContent').style.display = 'none';
            return;
        }

        document.getElementById('presentationEmpty').style.display = 'none';
        document.getElementById('presentationContent').style.display = 'flex';

        const idx = this.state.presentationIndex;
        document.getElementById('presentationCounter').textContent = `${idx + 1} / ${indicators.length}`;
        document.getElementById('presentationIndName').textContent = indicators[idx]?.nom || 'Aucun indicateur';
        document.getElementById('presentationIndDesc').textContent = indicators[idx]?.description || '';

        if (indicators[idx]) {
            this.executeIndicator(indicators[idx]);
        }
    }

    nextPresentationSlide() {
        if (this.state.indicators.length === 0) return;
        this.state.presentationIndex = (this.state.presentationIndex + 1) % this.state.indicators.length;
        this.updatePresentation();
    }

    prevPresentationSlide() {
        if (this.state.indicators.length === 0) return;
        const prev = this.state.presentationIndex - 1;
        this.state.presentationIndex = prev < 0 ? this.state.indicators.length - 1 : prev;
        this.updatePresentation();
    }

    // ================================================================
    // MÉDIAS (MODAL)
    // ================================================================
    openMediaModal(uri, name, type) {
        this.state.selectedMedia = { uri, name, type };
        document.getElementById('mediaModalTitle').textContent = name;

        const img = document.getElementById('mediaModalImage');
        const video = document.getElementById('mediaModalVideo');

        img.style.display = 'none';
        video.style.display = 'none';

        if (type === 'image') {
            img.style.display = 'block';
            img.src = uri;
        } else {
            video.style.display = 'flex';
            document.getElementById('mediaModalVideoUrl').textContent = uri;
        }

        document.getElementById('mediaModal').style.display = 'flex';
    }

    closeMediaModal() {
        document.getElementById('mediaModal').style.display = 'none';
        document.getElementById('mediaModalImage').src = '';
    }

    // ================================================================
    // MÉDIAS (WEBVIEW)
    // ================================================================
    retryMedia(key) {
        this.state.webViewErrors = { ...this.state.webViewErrors };
        delete this.state.webViewErrors[key];
        this.renderMessages();
    }

    // ================================================================
    // UTILITAIRES
    // ================================================================
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(title, message) {
        // Utiliser une notification simple
        const container = document.getElementById('toastContainer') || document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;max-width:350px;';
        if (!document.getElementById('toastContainer')) {
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background:#ffffff;
            border-radius:12px;
            padding:14px 18px;
            box-shadow:0 10px 40px rgba(0,0,0,0.15);
            margin-top:10px;
            border-left:4px solid #6c63ff;
            animation:slideInRight 0.3s ease;
            display:flex;
            align-items:flex-start;
            gap:12px;
        `;
        toast.innerHTML = `
            <span style="font-size:20px;flex-shrink:0;">ℹ️</span>
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;color:#1a1a2e;">${title}</div>
                <div style="font-size:12px;color:#6b7280;">${message}</div>
            </div>
            <button style="background:none;border:none;font-size:16px;color:#94a3b8;cursor:pointer;padding:0 4px;" onclick="this.parentElement.remove()">✕</button>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 5000);
    }

    togglePasswordVisibility() {
        const pwd = document.getElementById('passwordInput');
        const btn = document.getElementById('togglePwd');
        if (pwd.type === 'password') {
            pwd.type = 'text';
            btn.textContent = '🙈';
        } else {
            pwd.type = 'password';
            btn.textContent = '👁️';
        }
    }

    updateSendButton() {
        const text = document.getElementById('messageInput').value.trim();
        const btn = document.getElementById('sendBtn');
        if (text && !this.state.isLoading) {
            btn.disabled = false;
            btn.classList.add('active');
        } else {
            btn.disabled = true;
            btn.classList.remove('active');
        }
    }

    handleEdit(index) {
        const msg = this.state.messages[index];
        if (!msg || msg.role !== 'user') return;

        if (this.state.isSpeaking) this.stopSpeaking();

        document.getElementById('messageInput').value = msg.content;
        this.state.inputText = msg.content;
        this.state.editingIndex = index;
        document.getElementById('editingBanner').style.display = 'flex';
        document.getElementById('messageInput').focus();
        this.updateSendButton();
    }

    cancelEdit() {
        document.getElementById('messageInput').value = '';
        this.state.inputText = '';
        this.state.editingIndex = null;
        document.getElementById('editingBanner').style.display = 'none';
        this.updateSendButton();
    }

    setViewMode(msgIndex, mode) {
        this.state.viewMode = mode;
        this.renderMessages();
    }

    toggleSql(index) {
        const el = document.getElementById(`sql-${index}`);
        if (el) {
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }
    }

    handleResize() {
        // Ajustements responsive
    }

    handleLogout() {
        if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return;

        this.stopSpeaking();
        this.state.isLoggedIn = false;
        this.state.user = null;
        this.state.selectedBase = null;
        this.state.bases = [];
        this.state.messages = [];
        this.state.indicators = [];
        this.state.isPresentationMode = false;
        document.getElementById('presentationMode').style.display = 'none';

        // Nettoyer les graphiques
        Object.keys(this.state.chartInstances).forEach(key => {
            try { this.state.chartInstances[key].destroy(); } catch(e) {}
            delete this.state.chartInstances[key];
        });

        document.getElementById('loginInput').value = '';
        document.getElementById('passwordInput').value = '';
        this.showScreen('login');
    }

    checkLoginStatus() {
        this.showScreen('login');
    }
}

// ================================================================
// INITIALISATION
// ================================================================
window.app = new EricApp();

// Initialiser les fonctions globales pour les événements onclick
window.executeIndicator = (ind) => window.app.executeIndicator(ind);
window.deleteIndicator = (id, name) => window.app.deleteIndicator(id, name);
window.openThresholdModal = (id, name) => window.app.openThresholdModal(id, name);
window.removeAlert = (idx) => window.app.removeAlert(idx);
window.retryMedia = (key) => window.app.retryMedia(key);
window.openMediaModal = (uri, name, type) => window.app.openMediaModal(uri, name, type);
window.openSaveIndicatorModal = (sql) => window.app.openSaveIndicatorModal(sql);
window.toggleSql = (idx) => window.app.toggleSql(idx);
window.setViewMode = (msgIdx, mode) => window.app.setViewMode(msgIdx, mode);
window.openChartModal = (mode, idx) => window.app.openChartModal(mode, idx);
window.closeChartModal = () => window.app.closeChartModal();
</script>

</body>
</html>