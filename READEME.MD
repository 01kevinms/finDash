# 💹 FinDash — Dashboard Financeiro Pessoal

Sistema de controle financeiro pessoal com dashboard interativo, gestão de receitas, despesas e categorias. Desenvolvido com HTML, CSS e JavaScript puro no frontend, e PHP + JSON como backend leve — sem frameworks, sem dependências externas.

---

## 🔐 Acesso

| Campo | Valor |
|-------|-------|
| Usuário | `admin` |
| Senha | `admin` |

---

## ✨ Funcionalidades

- **Dashboard** — KPIs de saldo, receitas, despesas e movimentações; gráfico de barras mensal e donut por categoria
- **Receitas** — cadastro, edição, exclusão e filtros por status, data e busca textual
- **Despesas** — idem, com filtro adicional por categoria
- **Categorias** — criação com ícone emoji, cor customizada e tipo (receita / despesa / ambos)
- **Relatórios** — evolução mensal em linha, distribuição por categoria, indicador de poupança e exportação CSV
- **Autenticação** — login com sessão via `sessionStorage`, proteção de rotas

---

## 🗂 Estrutura do Projeto

```
findash/
├── index.html          # Dashboard principal
├── receitas.html
├── despesas.html
├── categorias.html
├── relatorios.html
├── login.html
│
├── css/
│   └── style.css       # Design system completo (tokens, dark theme)
│
├── js/
│   ├── storage.js      # Camada de dados (API ou localStorage automático)
│   ├── auth.js         # Autenticação e proteção de rotas
│   ├── dashboard.js
│   ├── receitas.js
│   ├── despesas.js
│   ├── categorias.js
│   ├── relatorios.js
│   ├── charts.js       # Gráficos via Canvas API (sem biblioteca)
│   ├── layout.js       # Sidebar e navegação
│   └── utils.js        # Formatação, datas, filtros, toasts
│
├── api.php             # Backend PHP — lê e escreve no db.json
├── api/                # Rotas PHP individuais (alternativa ao api.php)
└── db.json             # Banco de dados em JSON
```

---

## 🚀 Como Rodar

### Opção 1 — Live Server (sem PHP)

Abra o projeto com a extensão **Live Server** do VS Code ou qualquer servidor estático.

O `storage.js` detecta automaticamente que o PHP não está disponível e usa `localStorage` como fallback — os dados de seed são carregados automaticamente na primeira abertura.

> Nesse modo, dados cadastrados ficam salvos no navegador (localStorage).

### Opção 2 — Servidor PHP (XAMPP, Laragon, php -S)

```bash
# Na pasta do projeto:
php -S localhost:8000
```

Acesse `http://localhost:8000/login.html`.

Nesse modo, todos os dados são lidos e salvos diretamente no `db.json` via `api.php`.

> Certifique-se de que o `db.json` tem permissão de escrita:
> ```bash
> chmod 664 db.json
> ```

---

## ⚙️ Como Funciona o Storage

O `storage.js` usa detecção automática de ambiente:

```
Primeira chamada
      │
      ▼
Faz fetch em api.php
      │
      ├── Resposta é JSON válido? ──► MODO API (PHP)
      │                               Lê/escreve em db.json
      │
      └── Resposta começa com '<'? ──► MODO LOCAL
                                       Usa localStorage + seed
```

Isso garante que o projeto funciona tanto em ambiente de desenvolvimento estático quanto em servidor PHP, sem necessidade de alterar nenhuma configuração.

---

## 🛠 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5, CSS3, JavaScript ES2020+ |
| Gráficos | Canvas API (sem biblioteca) |
| Backend | PHP 8+ |
| Banco de dados | JSON flat-file (`db.json`) |
| Autenticação | `sessionStorage` |
| Persistência local | `localStorage` |

---

## 📌 Observações Técnicas

- **Zero dependências** — nenhum npm, nenhum CDN, nenhum framework
- **Dark theme** com design system baseado em CSS custom properties
- **Responsivo** — funciona em desktop e mobile
- **api/`** — pasta com rotas PHP individuais (alternativa modular ao `api.php` monolítico); atualmente o `storage.js` usa o `api.php` raiz
- Dados do `db.json` são fictícios e destinados exclusivamente a demonstração