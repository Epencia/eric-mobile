<?php
// ============================================================
// admin.php - API Administration : Auth + Bases + Utilisateurs + Accès
// Fichier autonome : la connexion admin est gérée ici.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require '../database/database.php';

if (!isset($pdo)) {
    echo json_encode(['error' => 'Configuration serveur invalide.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

// ============================================================
// ACTION : CONNEXION ADMINISTRATEUR
// ============================================================
if ($action === 'login') {
    $login = trim($input['login'] ?? '');
    $mdp = trim($input['mdp'] ?? '');

    if (empty($login) || empty($mdp)) {
        echo json_encode(['error' => 'Veuillez remplir le login et le mot de passe.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT utilisateur_id, nom_prenom, role, type, etat 
            FROM utilisateurs 
            WHERE login = :login AND mdp = :mdp AND role='Superviseur'
            LIMIT 1
        ");
        $stmt->execute([':login' => $login, ':mdp' => $mdp]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['error' => 'Login ou mot de passe incorrect.']);
            exit;
        }

        // Vérifier l'état du compte
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
// BASES : Liste
// ============================================================
if ($action === 'list_bases') {
    try {
        $stmt = $pdo->query("SELECT * FROM bases ORDER BY nom_base ASC");
        $bases = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $bases]);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ============================================================
// BASES : Ajouter
// ============================================================
if ($action === 'add_base') {
    $base_id = trim($input['base_id'] ?? '');
    $hote = trim($input['hote'] ?? '');
    $nom_base = trim($input['nom_base'] ?? '');
    $utilisateur = trim($input['utilisateur'] ?? '');
    $mot_passe = trim($input['mot_passe'] ?? '');

    if (empty($base_id) || empty($hote) || empty($nom_base) || empty($utilisateur) || empty($mot_passe)) {
        echo json_encode(['error' => 'Tous les champs sont obligatoires.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO bases (base_id, hote, nom_base, utilisateur, mot_passe) VALUES (:base_id, :hote, :nom_base, :utilisateur, :mot_passe)");
        $stmt->execute([
            ':base_id' => $base_id,
            ':hote' => $hote,
            ':nom_base' => $nom_base,
            ':utilisateur' => $utilisateur,
            ':mot_passe' => $mot_passe
        ]);
        echo json_encode(['success' => true, 'message' => 'Base ajoutée avec succès.']);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            echo json_encode(['error' => 'Cet identifiant de base existe déjà.']);
        } else {
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
    exit;
}

// ============================================================
// BASES : Supprimer
// ============================================================
if ($action === 'delete_base') {
    $base_id = trim($input['base_id'] ?? '');
    if (empty($base_id)) {
        echo json_encode(['error' => 'Identifiant manquant.']);
        exit;
    }

    try {
        $pdo->prepare("DELETE FROM user_bases WHERE base_id = :base_id")->execute([':base_id' => $base_id]);
        $pdo->prepare("DELETE FROM bases WHERE base_id = :base_id")->execute([':base_id' => $base_id]);
        echo json_encode(['success' => true, 'message' => 'Base et accès associés supprimés.']);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ============================================================
// UTILISATEURS : Liste
// ============================================================
if ($action === 'list_users') {
    try {
        $stmt = $pdo->query("SELECT utilisateur_id, matricule, nom_prenom, login, telephone, email, role, type, etat, date_saisie FROM utilisateurs ORDER BY nom_prenom ASC");
        $users = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $users]);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ============================================================
// UTILISATEURS : Ajouter
// ============================================================
if ($action === 'add_user') {
    $utilisateur_id = trim($input['utilisateur_id'] ?? '');
    $nom_prenom = trim($input['nom_prenom'] ?? '');
    $login = trim($input['login'] ?? '');
    $mdp = trim($input['mdp'] ?? '');
    $email = trim($input['email'] ?? '');
    $telephone = trim($input['telephone'] ?? '');
    $role = trim($input['role'] ?? 'utilisateur');
    $type = trim($input['type'] ?? 'standard');
    $etat = trim($input['etat'] ?? 'actif');

    if (empty($utilisateur_id) || empty($nom_prenom) || empty($login) || empty($mdp)) {
        echo json_encode(['error' => 'ID, Nom, Login et Mot de passe sont obligatoires.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO utilisateurs (utilisateur_id, nom_prenom, login, mdp, email, telephone, role, type, etat, date_saisie) 
            VALUES (:id, :nom, :login, :mdp, :email, :tel, :role, :type, :etat, CURDATE())
        ");
        $stmt->execute([
            ':id' => $utilisateur_id,
            ':nom' => $nom_prenom,
            ':login' => $login,
            ':mdp' => $mdp,
            ':email' => $email,
            ':tel' => $telephone,
            ':role' => $role,
            ':type' => $type,
            ':etat' => $etat
        ]);
        echo json_encode(['success' => true, 'message' => 'Utilisateur ajouté avec succès.']);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            echo json_encode(['error' => 'Cet identifiant ou login existe déjà.']);
        } else {
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
    exit;
}

// ============================================================
// UTILISATEURS : Supprimer
// ============================================================
if ($action === 'delete_user') {
    $utilisateur_id = trim($input['utilisateur_id'] ?? '');
    if (empty($utilisateur_id)) {
        echo json_encode(['error' => 'Identifiant manquant.']);
        exit;
    }

    try {
        $pdo->prepare("DELETE FROM user_bases WHERE utilisateur_id = :id")->execute([':id' => $utilisateur_id]);
        $pdo->prepare("DELETE FROM utilisateurs WHERE utilisateur_id = :id")->execute([':id' => $utilisateur_id]);
        echo json_encode(['success' => true, 'message' => 'Utilisateur et accès associés supprimés.']);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ============================================================
// USER_BASES : Liste des accès
// ============================================================
if ($action === 'list_access') {
    try {
        $stmt = $pdo->query("
            SELECT 
                ub.id, ub.utilisateur_id, ub.base_id, ub.api_key, ub.url, ub.tables, ub.statut,
                u.nom_prenom AS user_nom,
                b.nom_base AS base_nom
            FROM user_bases ub
            LEFT JOIN utilisateurs u ON ub.utilisateur_id = u.utilisateur_id
            LEFT JOIN bases b ON ub.base_id = b.base_id
            ORDER BY u.nom_prenom ASC, b.nom_base ASC
        ");
        $access = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $access]);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ============================================================
// USER_BASES : Ajouter un accès
// ============================================================
if ($action === 'add_access') {
    $id = trim($input['id'] ?? '');
    $utilisateur_id = trim($input['utilisateur_id'] ?? '');
    $base_id = trim($input['base_id'] ?? '');
    $api_key = trim($input['api_key'] ?? '');
    $url = trim($input['url'] ?? '');
    $tables = trim($input['tables'] ?? '');
    $statut = trim($input['statut'] ?? 'actif');

    if (empty($id) || empty($utilisateur_id) || empty($base_id) || empty($api_key)) {
        echo json_encode(['error' => 'ID, Utilisateur, Base et Clé API sont obligatoires.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO user_bases (id, utilisateur_id, base_id, api_key, url, tables, statut) 
            VALUES (:id, :user_id, :base_id, :api_key, :url, :tables, :statut)
        ");
        $stmt->execute([
            ':id' => $id,
            ':user_id' => $utilisateur_id,
            ':base_id' => $base_id,
            ':api_key' => $api_key,
            ':url' => $url,
            ':tables' => $tables,
            ':statut' => $statut
        ]);
        echo json_encode(['success' => true, 'message' => 'Accès ajouté avec succès.']);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            echo json_encode(['error' => 'Cet identifiant d\'accès existe déjà.']);
        } else {
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
    exit;
}

// ============================================================
// USER_BASES : Supprimer un accès
// ============================================================
if ($action === 'delete_access') {
    $id = trim($input['id'] ?? '');
    if (empty($id)) {
        echo json_encode(['error' => 'Identifiant manquant.']);
        exit;
    }

    try {
        $pdo->prepare("DELETE FROM user_bases WHERE id = :id")->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Accès supprimé.']);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ============================================================
// USER_BASES : Modifier le statut
// ============================================================
if ($action === 'toggle_access') {
    $id = trim($input['id'] ?? '');
    $statut = trim($input['statut'] ?? '');
    if (empty($id) || empty($statut)) {
        echo json_encode(['error' => 'Paramètres manquants.']);
        exit;
    }

    try {
        $pdo->prepare("UPDATE user_bases SET statut = :statut WHERE id = :id")->execute([':statut' => $statut, ':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Statut mis à jour.']);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

echo json_encode(['error' => 'Action inconnue.']);
?>