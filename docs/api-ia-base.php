<?php
// ============================================================
// ia-base.php - API Dynamique : Auth + Bases + IA
// Aucune donnée sensible n'est codée en dur.
// Si user_bases.tables est vide → toutes les tables sont utilisées.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================
// 1. INCLUSION DE LA CONNEXION BDD PRINCIPALE (Auth & Gestion)
// ============================================================
require '../database/database.php'; // Fournit la variable $pdo

if (!isset($pdo)) {
    echo json_encode(['error' => 'Configuration serveur invalide.']);
    exit;
}

// ============================================================
// LECTURE DE LA REQUÊTE
// ============================================================
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

// ============================================================
// ACTION 1 : CONNEXION UTILISATEUR
// ============================================================
if ($action === 'login') {
    $login = trim($input['login'] ?? '');
    $mdp = trim($input['mdp'] ?? '');

    if (empty($login) || empty($mdp)) {
        echo json_encode(['error' => 'Veuillez remplir le login et le mot de passe.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT utilisateur_id, nom_prenom, role, type, etat FROM utilisateurs WHERE login = :login AND mdp = :mdp LIMIT 1");
        $stmt->execute([':login' => $login, ':mdp' => $mdp]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['error' => 'Login ou mot de passe incorrect.']);
            exit;
        }

        if (in_array(strtolower($user['etat'] ?? ''), ['inactif', 'bloqué', 'suspendu'])) {
            echo json_encode(['error' => 'Votre compte est désactivé. Contactez l\'administrateur.']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'user' => [
                'id'   => $user['utilisateur_id'],
                'nom'  => $user['nom_prenom'],
                'role' => $user['role'],
                'type' => $user['type']
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
    }
    exit;
}

// ============================================================
// ACTION 2 : LISTE DES BASES AUTORISÉES
// ============================================================
if ($action === 'get_bases') {
    $userId = trim($input['user_id'] ?? '');

    if (empty($userId)) {
        echo json_encode(['error' => 'Identifiant utilisateur manquant.']);
        exit;
    }

    try {
        $stmtUser = $pdo->prepare("SELECT utilisateur_id FROM utilisateurs WHERE utilisateur_id = :id LIMIT 1");
        $stmtUser->execute([':id' => $userId]);
        if (!$stmtUser->fetch()) {
            echo json_encode(['error' => 'Utilisateur introuvable.']);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT 
                ub.id AS acces_id,
                ub.base_id,
                ub.statut,
                ub.tables,
                b.hote,
                b.nom_base
            FROM user_bases ub
            INNER JOIN bases b ON ub.base_id = b.base_id
            WHERE ub.utilisateur_id = :user_id
            AND ub.statut = 'actif'
            ORDER BY b.nom_base ASC
        ");
        $stmt->execute([':user_id' => $userId]);
        $bases = $stmt->fetchAll();

        foreach ($bases as &$base) {
            // ✅ MODIFICATION : Si tables est vide, indiquer "Toutes les tables"
            $tablesRaw = trim($base['tables'] ?? '');
            if (empty($tablesRaw)) {
                $base['tables_list'] = [];
                $base['all_tables'] = true; // ✅ Flag pour le frontend
            } else {
                $base['tables_list'] = array_filter(array_map('trim', explode(',', $tablesRaw)));
                $base['all_tables'] = false;
            }
            unset($base['tables']);
        }

        echo json_encode([
            'success' => true,
            'bases'   => $bases
        ]);
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
    }
    exit;
}

// ============================================================
// ACTION 3 : INTERROGER L'IA (Connexions 100% dynamiques)
// ============================================================
if ($action === 'ask_ia') {
    $userId   = trim($input['user_id'] ?? '');
    $baseId   = trim($input['base_id'] ?? '');
    $question = trim($input['question'] ?? '');

    if (empty($userId) || empty($baseId) || empty($question)) {
        echo json_encode(['error' => 'Paramètres manquants (user_id, base_id, question).']);
        exit;
    }

    try {
        // --------------------------------------------------------
        // ÉTAPE A : Récupérer les accès depuis la BDD de gestion
        // --------------------------------------------------------
        $stmtAccess = $pdo->prepare("
            SELECT 
                b.hote,
                b.nom_base,
                b.utilisateur AS db_user,
                b.mot_passe AS db_pass,
                ub.api_key AS groq_key,
                ub.url AS groq_url,
                ub.tables AS allowed_tables
            FROM user_bases ub
            INNER JOIN bases b ON ub.base_id = b.base_id
            WHERE ub.utilisateur_id = :user_id
            AND ub.base_id = :base_id
            AND ub.statut = 'actif'
            LIMIT 1
        ");
        $stmtAccess->execute([':user_id' => $userId, ':base_id' => $baseId]);
        $access = $stmtAccess->fetch();

        if (!$access) {
            echo json_encode(['error' => 'Accès refusé : vous n\'avez pas les droits sur cette base de données.']);
            exit;
        }

        if (empty($access['groq_key'])) {
            echo json_encode(['error' => 'Configuration IA manquante pour cette base (clé API absente).']);
            exit;
        }

        $groqUrl = !empty($access['groq_url']) 
            ? $access['groq_url'] 
            : 'https://api.groq.com/openai/v1/chat/completions';

        // --------------------------------------------------------
        // ÉTAPE B : Connexion à la base de données CIBLE
        // --------------------------------------------------------
        $targetDsn = "mysql:host={$access['hote']};dbname={$access['nom_base']};charset=utf8mb4";
        
        $targetPdo = new PDO($targetDsn, $access['db_user'], $access['db_pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT            => 10
        ]);

        // --------------------------------------------------------
        // ÉTAPE C : Construire le schéma des tables
        // ✅ MODIFICATION : Si tables est vide → SHOW TABLES (toutes)
        // --------------------------------------------------------
        $allowedTables = array_filter(array_map('trim', explode(',', $access['allowed_tables'] ?? '')));

        // ✅ Si aucune table spécifique n'est configurée, prendre TOUTES les tables
        if (empty($allowedTables)) {
            try {
                $stmtTables = $targetPdo->query("SHOW TABLES");
                $allTables = $stmtTables->fetchAll(PDO::FETCH_COLUMN);
                $allowedTables = $allTables;
            } catch (Exception $e) {
                echo json_encode(['error' => 'Impossible de récupérer la liste des tables : ' . $e->getMessage()]);
                exit;
            }
        }

        if (empty($allowedTables)) {
            echo json_encode(['error' => 'Aucune table trouvée dans cette base de données.']);
            exit;
        }

        // Construire le schéma
        $schema = "";
        foreach ($allowedTables as $table) {
            try {
                $stmtDesc = $targetPdo->query("DESCRIBE `$table`");
                $cols = [];
                while ($row = $stmtDesc->fetch()) {
                    $cols[] = $row['Field'] . " " . $row['Type'];
                }
                if (!empty($cols)) {
                    $schema .= "Table $table (" . implode(", ", $cols) . ")\n";
                }
            } catch (Exception $e) {
                // Table inaccessible, on ignore
            }
        }

        if (empty($schema)) {
            echo json_encode(['error' => 'Aucune table accessible dans cette base de données.']);
            exit;
        }

        // --------------------------------------------------------
        // ÉTAPE D : Appel à l'API Groq
        // --------------------------------------------------------
        $prompt = "Tu es un expert SQL MySQL. Génère UNIQUEMENT la requête SELECT, sans markdown, sans explication, sans backticks.\n\nSchéma BDD:\n{$schema}\n\nQuestion: {$question}\n\nSQL:";

        $ch = curl_init($groqUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $access['groq_key'],
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'model'       => 'llama-3.3-70b-versatile',
            'messages'    => [['role' => 'user', 'content' => $prompt]],
            'temperature' => 0.1,
            'max_tokens'  => 500
        ]));

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            echo json_encode(['error' => 'Erreur réseau IA : ' . $curlError]);
            exit;
        }

        if ($httpCode !== 200) {
            $errData = json_decode($response, true);
            $errMsg = $errData['error']['message'] ?? "Erreur IA (HTTP $httpCode)";
            echo json_encode(['error' => $errMsg]);
            exit;
        }

        $aiData = json_decode($response, true);
        if (!isset($aiData['choices'][0]['message']['content'])) {
            echo json_encode(['error' => 'Réponse invalide de l\'IA.']);
            exit;
        }

        // --------------------------------------------------------
        // ÉTAPE E : Nettoyage, Validation et Exécution du SQL
        // --------------------------------------------------------
        $generatedSql = trim(str_replace(['```sql', '```', '`'], '', $aiData['choices'][0]['message']['content']));
        $sqlLower = strtolower($generatedSql);

        if (strpos($sqlLower, 'select') !== 0) {
            echo json_encode([
                'error' => "L'IA a généré une requête invalide (non-SELECT).",
                'sql'   => $generatedSql
            ]);
            exit;
        }

        $forbidden = ['drop ', 'delete ', 'update ', 'insert ', 'alter ', 'truncate ', 'create ', 'grant ', 'revoke ', 'exec ', 'execute '];
        foreach ($forbidden as $word) {
            if (strpos($sqlLower, $word) !== false) {
                echo json_encode([
                    'error' => 'Requête bloquée par sécurité (opération interdite).',
                    'sql'   => $generatedSql
                ]);
                exit;
            }
        }

        try {
            $stmtResult = $targetPdo->query($generatedSql);
            $results = $stmtResult->fetchAll();

            echo json_encode([
                'success' => true,
                'sql'     => $generatedSql,
                'results' => $results,
                'count'   => count($results)
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'error' => 'Erreur SQL : ' . $e->getMessage(),
                'sql'   => $generatedSql
            ]);
        }

    } catch (PDOException $e) {
        echo json_encode(['error' => 'Erreur de connexion à la base cible : ' . $e->getMessage()]);
    }
    exit;
}

// ============================================================
// ACTION 4 : LISTE DES INDICATEURS
// ============================================================
if ($action === 'get_indicateurs') {
    $userId = trim($input['user_id'] ?? '');
    $baseId = trim($input['base_id'] ?? '');

    if (empty($userId) || empty($baseId)) {
        echo json_encode(['error' => 'Paramètres manquants.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT indicateur_id, nom, description, requete_sql, statut
            FROM indicateurs
            WHERE utilisateur_id = :user_id
            AND base_id = :base_id
            AND statut = 'actif'
            ORDER BY nom ASC
        ");
        $stmt->execute([':user_id' => $userId, ':base_id' => $baseId]);
        $indicateurs = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'indicateurs' => $indicateurs
        ]);
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
    }
    exit;
}

// ============================================================
// ACTION 5 : SAUVEGARDER UN INDICATEUR
// ============================================================
if ($action === 'save_indicateur') {
    $userId = trim($input['user_id'] ?? '');
    $baseId = trim($input['base_id'] ?? '');
    $nom = trim($input['nom'] ?? '');
    $description = trim($input['description'] ?? '');
    $requeteSql = trim($input['requete_sql'] ?? '');

    if (empty($userId) || empty($baseId) || empty($nom) || empty($requeteSql)) {
        echo json_encode(['error' => 'Paramètres manquants (nom et requête SQL obligatoires).']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO indicateurs (nom, description, requete_sql, base_id, utilisateur_id, statut)
            VALUES (:nom, :description, :requete_sql, :base_id, :user_id, 'actif')
        ");
        $stmt->execute([
            ':nom' => $nom,
            ':description' => $description,
            ':requete_sql' => $requeteSql,
            ':base_id' => $baseId,
            ':user_id' => $userId
        ]);

        echo json_encode(['success' => true, 'message' => 'Indicateur sauvegardé avec succès.']);
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
    }
    exit;
}

// ============================================================
// ACTION 6 : EXÉCUTER UN INDICATEUR (SANS IA)
// ============================================================
if ($action === 'execute_indicateur') {
    $userId = trim($input['user_id'] ?? '');
    $indicateurId = trim($input['indicateur_id'] ?? '');

    if (empty($userId) || empty($indicateurId)) {
        echo json_encode(['error' => 'Paramètres manquants.']);
        exit;
    }

    try {
        // 1. Récupérer l'indicateur et vérifier les droits d'accès
        $stmtInd = $pdo->prepare("
            SELECT i.requete_sql, i.nom, b.hote, b.nom_base, b.utilisateur AS db_user, b.mot_passe AS db_pass
            FROM indicateurs i
            INNER JOIN bases b ON i.base_id = b.base_id
            WHERE i.indicateur_id = :indicateur_id
            AND i.utilisateur_id = :user_id
            AND i.statut = 'actif'
            LIMIT 1
        ");
        $stmtInd->execute([':indicateur_id' => $indicateurId, ':user_id' => $userId]);
        $indicateur = $stmtInd->fetch();

        if (!$indicateur) {
            echo json_encode(['error' => 'Indicateur introuvable ou accès refusé.']);
            exit;
        }

        // 2. Connexion à la base de données cible
        $targetDsn = "mysql:host={$indicateur['hote']};dbname={$indicateur['nom_base']};charset=utf8mb4";
        $targetPdo = new PDO($targetDsn, $indicateur['db_user'], $indicateur['db_pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT            => 10
        ]);

        // 3. Sécurité : vérifier que c'est bien un SELECT
        $sqlLower = strtolower(trim($indicateur['requete_sql']));
        if (strpos($sqlLower, 'select') !== 0) {
            echo json_encode(['error' => 'Requête invalide (seulement SELECT autorisé).', 'sql' => $indicateur['requete_sql']]);
            exit;
        }

        $forbidden = ['drop ', 'delete ', 'update ', 'insert ', 'alter ', 'truncate ', 'create ', 'grant ', 'revoke ', 'exec ', 'execute '];
        foreach ($forbidden as $word) {
            if (strpos($sqlLower, $word) !== false) {
                echo json_encode(['error' => 'Requête bloquée par sécurité.', 'sql' => $indicateur['requete_sql']]);
                exit;
            }
        }

        // 4. Exécution de la requête
        $stmtResult = $targetPdo->query($indicateur['requete_sql']);
        $results = $stmtResult->fetchAll();

        echo json_encode([
            'success' => true,
            'sql'     => $indicateur['requete_sql'],
            'results' => $results,
            'count'   => count($results),
            'nom'     => $indicateur['nom']
        ]);

    } catch (PDOException $e) {
        echo json_encode(['error' => 'Erreur SQL : ' . $e->getMessage(), 'sql' => $indicateur['requete_sql'] ?? '']);
    }
    exit;
}

// ============================================================
// ACTION 7 : SUPPRIMER UN INDICATEUR
// ============================================================
if ($action === 'delete_indicateur') {
    $userId = trim($input['user_id'] ?? '');
    $indicateurId = trim($input['indicateur_id'] ?? '');

    if (empty($userId) || empty($indicateurId)) {
        echo json_encode(['error' => 'Paramètres manquants.']);
        exit;
    }

    try {
        // ⚠️ Sécurité : On vérifie que l'indicateur appartient bien à cet utilisateur
        $stmt = $pdo->prepare("
            DELETE FROM indicateurs 
            WHERE indicateur_id = :indicateur_id 
            AND utilisateur_id = :user_id
        ");
        $stmt->execute([
            ':indicateur_id' => $indicateurId, 
            ':user_id' => $userId
        ]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Indicateur supprimé avec succès.']);
        } else {
            echo json_encode(['error' => 'Indicateur introuvable ou vous n\'avez pas les droits pour le supprimer.']);
        }
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
    }
    exit;
}

// ============================================================
// ACTION 8 : MODIFIER LES ACCÈS (LOGIN ET MOT DE PASSE)
// ============================================================
if ($action === 'update_credentials') {
    $userId = trim($input['user_id'] ?? '');
    $newLogin = trim($input['login'] ?? '');
    $newPassword = trim($input['password'] ?? '');

    if (empty($userId)) {
        echo json_encode(['error' => 'Identifiant utilisateur manquant.']);
        exit;
    }

    if (empty($newLogin)) {
        echo json_encode(['error' => 'Le login ne peut pas être vide.']);
        exit;
    }

    try {
        // Vérifier que l'utilisateur existe
        $stmtCheck = $pdo->prepare("SELECT utilisateur_id FROM utilisateurs WHERE utilisateur_id = :id LIMIT 1");
        $stmtCheck->execute([':id' => $userId]);
        if (!$stmtCheck->fetch()) {
            echo json_encode(['error' => 'Utilisateur introuvable.']);
            exit;
        }

        // Vérifier que le nouveau login n'est pas déjà utilisé par un autre utilisateur
        $stmtCheckLogin = $pdo->prepare("SELECT utilisateur_id FROM utilisateurs WHERE login = :login AND utilisateur_id != :id LIMIT 1");
        $stmtCheckLogin->execute([':login' => $newLogin, ':id' => $userId]);
        if ($stmtCheckLogin->fetch()) {
            echo json_encode(['error' => 'Ce login est déjà utilisé par un autre utilisateur.']);
            exit;
        }

        // Construire la requête de mise à jour
        if (!empty($newPassword)) {
            // Modifier login ET mot de passe
            $stmt = $pdo->prepare("
                UPDATE utilisateurs 
                SET login = :login, mdp = :mdp 
                WHERE utilisateur_id = :id
            ");
            $stmt->execute([
                ':login' => $newLogin,
                ':mdp' => $newPassword,
                ':id' => $userId
            ]);
        } else {
            // Modifier uniquement le login
            $stmt = $pdo->prepare("
                UPDATE utilisateurs 
                SET login = :login 
                WHERE utilisateur_id = :id
            ");
            $stmt->execute([
                ':login' => $newLogin,
                ':id' => $userId
            ]);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Accès mis à jour avec succès.',
            'user' => [
                'login' => $newLogin
            ]
        ]);

    } catch (PDOException $e) {
        echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
    }
    exit;
}



// ============================================================
// ACTION 9 : SURVEILLANCE DES BASES DE DONNÉES
// ============================================================
if ($action === 'monitoring') {
    $userId = trim($input['user_id'] ?? '');
    $baseId = trim($input['base_id'] ?? '');
    $monitoringAction = trim($input['monitoring_action'] ?? 'stats');

    if (empty($userId) || empty($baseId)) {
        echo json_encode(['error' => 'Paramètres manquants.']);
        exit;
    }

    try {
        // Vérifier les droits d'accès
        $stmtAccess = $pdo->prepare("
            SELECT 
                b.hote,
                b.nom_base,
                b.utilisateur AS db_user,
                b.mot_passe AS db_pass
            FROM user_bases ub
            INNER JOIN bases b ON ub.base_id = b.base_id
            WHERE ub.utilisateur_id = :user_id
            AND ub.base_id = :base_id
            AND ub.statut = 'actif'
            LIMIT 1
        ");
        $stmtAccess->execute([':user_id' => $userId, ':base_id' => $baseId]);
        $access = $stmtAccess->fetch();

        if (!$access) {
            echo json_encode(['error' => 'Accès refusé à cette base de données.']);
            exit;
        }

        // Connexion à la base cible
        $targetDsn = "mysql:host={$access['hote']};dbname={$access['nom_base']};charset=utf8mb4";
        $targetPdo = new PDO($targetDsn, $access['db_user'], $access['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);

        // Récupérer les statistiques
        $stats = [
            'connections' => 0,
            'tables' => [],
            'total_columns' => 0,
            'total_rows' => 0,
            'total_size' => '0 Mo',
            'alerts' => []
        ];

        // 1. Récupérer les connexions actives (si possible)
        try {
            $stmt = $targetPdo->query("SHOW STATUS LIKE 'Threads_connected'");
            $row = $stmt->fetch();
            $stats['connections'] = $row ? intval($row['Value']) : 0;
        } catch (Exception $e) {
            $stats['connections'] = 0;
        }

        // 2. Récupérer la liste des tables et leurs informations
        $stmtTables = $targetPdo->query("SHOW TABLE STATUS");
        $tables = $stmtTables->fetchAll();
        $totalRows = 0;
        $totalSizeBytes = 0;

        foreach ($tables as $table) {
            $tableName = $table['Name'];
            $rows = intval($table['Rows'] ?? 0);
            $dataLength = intval($table['Data_length'] ?? 0);
            $indexLength = intval($table['Index_length'] ?? 0);
            $sizeBytes = $dataLength + $indexLength;
            $sizeMo = round($sizeBytes / (1024 * 1024), 2);

            // Vérifier les colonnes
            $stmtCols = $targetPdo->query("SELECT COUNT(*) as cols FROM information_schema.columns WHERE table_schema = '{$access['nom_base']}' AND table_name = '$tableName'");
            $cols = $stmtCols->fetch();
            $colCount = intval($cols['cols'] ?? 0);

            $stats['tables'][] = [
                'name' => $tableName,
                'rows' => $rows,
                'columns' => $colCount,
                'size' => $sizeMo . ' Mo'
            ];

            $totalRows += $rows;
            $totalSizeBytes += $sizeBytes;

            // Alerte si la table dépasse 100 Mo
            if ($sizeMo > 100) {
                $stats['alerts'][] = [
                    'table' => $tableName,
                    'message' => "Taille de {$sizeMo} Mo (dépasse 100 Mo)"
                ];
            }
        }

        // Alerte si la base totale dépasse 1 Go
        $totalSizeMo = round($totalSizeBytes / (1024 * 1024), 2);
        if ($totalSizeMo > 1024) {
            $stats['alerts'][] = [
                'table' => 'Base complète',
                'message' => "Taille totale de {$totalSizeMo} Mo (dépasse 1 Go)"
            ];
        }

        $stats['total_rows'] = $totalRows;
        $stats['total_size'] = $totalSizeMo . ' Mo';
        
        // Compter le total des colonnes
        $stmtTotalCols = $targetPdo->query("SELECT COUNT(*) as total FROM information_schema.columns WHERE table_schema = '{$access['nom_base']}'");
        $totalCols = $stmtTotalCols->fetch();
        $stats['total_columns'] = intval($totalCols['total'] ?? 0);

        echo json_encode([
            'success' => true,
            ...$stats
        ]);

    } catch (PDOException $e) {
        echo json_encode(['error' => 'Erreur de connexion à la base cible : ' . $e->getMessage()]);
    }
    exit;
}

// ============================================================
// ACTION INCONNUE
// ============================================================
echo json_encode(['error' => 'Action inconnue. Actions disponibles : login, get_bases, ask_ia']);
?>
