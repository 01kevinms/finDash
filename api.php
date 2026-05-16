<?php
// ============================================================
// API.PHP — Backend para db.json
// Acoes via ?action=nome_fixo  |  dados via $_POST['dados']
//                              |  id via $_POST['id'] ou $_GET['id']
// ============================================================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Helpers ──────────────────────────────────────────────────

function lerDB() {
    $json = file_get_contents('db.json');
    if ($json === false) {
        http_response_code(500);
        echo json_encode(['erro' => 'db.json nao encontrado']);
        exit;
    }
    $data = json_decode($json, true);
    if (!is_array($data)) {
        http_response_code(500);
        echo json_encode(['erro' => 'db.json corrompido']);
        exit;
    }
    return $data;
}

function salvarDB($data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $fp   = fopen('db.json', 'w');
    if ($fp === false) {
        http_response_code(500);
        echo json_encode(['erro' => 'Sem permissao para salvar']);
        exit;
    }
    flock($fp, LOCK_EX);
    fwrite($fp, $json);
    flock($fp, LOCK_UN);
    fclose($fp);
}

function gerarId($prefixo) {
    return $prefixo . '_' . base_convert((string)time(), 10, 36) . bin2hex(random_bytes(2));
}

// Lê body: campo "dados" (JSON string) enviado via FormData
function dadosPost() {
    $raw = isset($_POST['dados']) ? $_POST['dados'] : '';
    if ($raw === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// Id pode vir via POST (mutações) ou GET (buscas)
function pegaId() {
    if (isset($_POST['id']) && $_POST['id'] !== '') return trim($_POST['id']);
    if (isset($_GET['id'])  && $_GET['id']  !== '') return trim($_GET['id']);
    return '';
}

// ── Leitura da action (valor comparado explicitamente) ───────
$action = isset($_GET['action']) ? $_GET['action'] : '';

// ── LISTAR CATEGORIES ────────────────────────────────────────
if ($action === 'listar_categories') {
    $db = lerDB();
    echo json_encode($db['categories'] ?? [], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── LISTAR TRANSACTIONS ──────────────────────────────────────
if ($action === 'listar_transactions') {
    $db = lerDB();
    echo json_encode($db['transactions'] ?? [], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── LISTAR USERS ─────────────────────────────────────────────
if ($action === 'listar_users') {
    $db = lerDB();
    echo json_encode($db['users'] ?? [], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── LISTAR SETTINGS ──────────────────────────────────────────
if ($action === 'listar_settings') {
    $db = lerDB();
    echo json_encode($db['settings'] ?? [], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── BUSCAR CATEGORIA POR ID ──────────────────────────────────
if ($action === 'buscar_categoria') {
    $id = pegaId();
    if ($id === '') { http_response_code(400); echo json_encode(['erro' => 'id obrigatorio']); exit; }
    $db = lerDB();
    foreach ($db['categories'] as $item) {
        if (isset($item['id']) && $item['id'] === $id) {
            echo json_encode($item, JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['erro' => 'Categoria nao encontrada']);
    exit;
}

// ── BUSCAR TRANSACTION POR ID ────────────────────────────────
if ($action === 'buscar_transaction') {
    $id = pegaId();
    if ($id === '') { http_response_code(400); echo json_encode(['erro' => 'id obrigatorio']); exit; }
    $db = lerDB();
    foreach ($db['transactions'] as $item) {
        if (isset($item['id']) && $item['id'] === $id) {
            echo json_encode($item, JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['erro' => 'Transacao nao encontrada']);
    exit;
}

// ── CRIAR CATEGORIA ──────────────────────────────────────────
if ($action === 'criar_categoria') {
    $body = dadosPost();
    if (empty($body)) { http_response_code(400); echo json_encode(['erro' => 'Body vazio']); exit; }
    $db = lerDB();
    if (empty($body['id'])) $body['id'] = gerarId('cat');
    $db['categories'][] = $body;
    salvarDB($db);
    http_response_code(201);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── CRIAR TRANSACTION ────────────────────────────────────────
if ($action === 'criar_transaction') {
    $body = dadosPost();
    if (empty($body)) { http_response_code(400); echo json_encode(['erro' => 'Body vazio']); exit; }
    $db = lerDB();
    if (empty($body['id'])) $body['id'] = gerarId('tx');
    $db['transactions'][] = $body;
    salvarDB($db);
    http_response_code(201);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── CRIAR USER ───────────────────────────────────────────────
if ($action === 'criar_user') {
    $body = dadosPost();
    if (empty($body)) { http_response_code(400); echo json_encode(['erro' => 'Body vazio']); exit; }
    $db = lerDB();
    if (empty($body['id'])) $body['id'] = gerarId('usr');
    $db['users'][] = $body;
    salvarDB($db);
    http_response_code(201);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── ATUALIZAR CATEGORIA ──────────────────────────────────────
if ($action === 'atualizar_categoria') {
    $id   = pegaId();
    $body = dadosPost();
    if ($id === '')    { http_response_code(400); echo json_encode(['erro' => 'id obrigatorio']); exit; }
    if (empty($body))  { http_response_code(400); echo json_encode(['erro' => 'Body vazio']); exit; }
    $db = lerDB();
    $encontrado = false;
    $atualizado = [];
    foreach ($db['categories'] as $k => $item) {
        if (isset($item['id']) && $item['id'] === $id) {
            $merged = array_merge($item, $body);
            $merged['id'] = $id;
            $db['categories'][$k] = $merged;
            $atualizado = $merged;
            $encontrado = true;
            break;
        }
    }
    if (!$encontrado) { http_response_code(404); echo json_encode(['erro' => 'Categoria nao encontrada']); exit; }
    salvarDB($db);
    echo json_encode($atualizado, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── ATUALIZAR TRANSACTION ────────────────────────────────────
if ($action === 'atualizar_transaction') {
    $id   = pegaId();
    $body = dadosPost();
    if ($id === '')    { http_response_code(400); echo json_encode(['erro' => 'id obrigatorio']); exit; }
    if (empty($body))  { http_response_code(400); echo json_encode(['erro' => 'Body vazio']); exit; }
    $db = lerDB();
    $encontrado = false;
    $atualizado = [];
    foreach ($db['transactions'] as $k => $item) {
        if (isset($item['id']) && $item['id'] === $id) {
            $merged = array_merge($item, $body);
            $merged['id'] = $id;
            $db['transactions'][$k] = $merged;
            $atualizado = $merged;
            $encontrado = true;
            break;
        }
    }
    if (!$encontrado) { http_response_code(404); echo json_encode(['erro' => 'Transacao nao encontrada']); exit; }
    salvarDB($db);
    echo json_encode($atualizado, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── ATUALIZAR SETTINGS ───────────────────────────────────────
if ($action === 'atualizar_settings') {
    $body = dadosPost();
    if (empty($body)) { http_response_code(400); echo json_encode(['erro' => 'Body vazio']); exit; }
    $db = lerDB();
    $db['settings'] = array_merge($db['settings'], $body);
    salvarDB($db);
    echo json_encode($db['settings'], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── DELETAR CATEGORIA ────────────────────────────────────────
if ($action === 'deletar_categoria') {
    $id = pegaId();
    if ($id === '') { http_response_code(400); echo json_encode(['erro' => 'id obrigatorio']); exit; }
    $db    = lerDB();
    $antes = count($db['categories']);
    $nova  = [];
    foreach ($db['categories'] as $item) {
        if ((string)($item['id'] ?? '') !== $id) $nova[] = $item;
    }
    if (count($nova) === $antes) { http_response_code(404); echo json_encode(['erro' => 'Categoria nao encontrada']); exit; }
    $db['categories'] = $nova;
    salvarDB($db);
    echo json_encode(['deletado' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── DELETAR TRANSACTION ──────────────────────────────────────
if ($action === 'deletar_transaction') {
    $id = pegaId();
    if ($id === '') { http_response_code(400); echo json_encode(['erro' => 'id obrigatorio']); exit; }
    $db    = lerDB();
    $antes = count($db['transactions']);
    $nova  = [];
    foreach ($db['transactions'] as $item) {
        if ((string)($item['id'] ?? '') !== $id) $nova[] = $item;
    }
    if (count($nova) === $antes) { http_response_code(404); echo json_encode(['erro' => 'Transacao nao encontrada']); exit; }
    $db['transactions'] = $nova;
    salvarDB($db);
    echo json_encode(['deletado' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── DELETAR USER ─────────────────────────────────────────────
if ($action === 'deletar_user') {
    $id = pegaId();
    if ($id === '') { http_response_code(400); echo json_encode(['erro' => 'id obrigatorio']); exit; }
    $db    = lerDB();
    $antes = count($db['users']);
    $nova  = [];
    foreach ($db['users'] as $item) {
        if ((string)($item['id'] ?? '') !== $id) $nova[] = $item;
    }
    if (count($nova) === $antes) { http_response_code(404); echo json_encode(['erro' => 'Usuario nao encontrado']); exit; }
    $db['users'] = $nova;
    salvarDB($db);
    echo json_encode(['deletado' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Fallback ─────────────────────────────────────────────────
http_response_code(400);
echo json_encode(['erro' => 'action nao reconhecida: ' . htmlspecialchars($action)]);
