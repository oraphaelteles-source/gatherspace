# GatherSpace — Guia de Deploy

## Requisitos no servidor

- Docker + Docker Compose
- Portas abertas: **80** (HTTP), **443** (HTTPS opcional), **3001** (API/WS), **10000-10100/UDP** (WebRTC STUN)

## Deploy em 4 passos

### 1. Clone o projeto no servidor

```bash
git clone <url-do-seu-repo> gatherspace
cd gatherspace
```

### 2. Configure o ambiente

```bash
cp .env.example .env
nano .env
```

Preencha:
```env
DB_PASSWORD=uma-senha-forte
JWT_SECRET=uma-chave-aleatoria-longa
CLIENT_URL=http://SEU_IP_OU_DOMINIO
```

### 3. Suba os containers

```bash
docker compose up -d --build
```

Aguarde ~2 minutos para o build. Verifique:

```bash
docker compose logs -f server
```

Deve aparecer: `🚀 Server running on http://localhost:3001`

### 4. Acesse

Abra `http://SEU_IP` no navegador.

---

## Primeiro acesso

1. Clique em **Cadastrar**
2. Crie sua conta (o primeiro usuário criado pode ser promovido a admin)
3. Para promover admin, execute no servidor:

```bash
docker compose exec postgres psql -U postgres -d gather_clone \
  -c "UPDATE users SET is_admin = true WHERE email = 'seu@email.com';"
```

4. Faça login — como admin, você verá o botão **✏️ Editar Mapa** nas salas

---

## WebRTC / Vídeo

Para vídeo funcionar com usuários **remotos** (fora da mesma rede), você precisa de um servidor TURN.

**Opção gratuita**: Use o Metered TURN (https://metered.ca) — plano gratuito suficiente para 6 pessoas.

Após obter as credenciais, edite `client/src/hooks/useWebRTC.ts`:

```ts
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:SEU_TURN_SERVER',
    username: 'SEU_USERNAME',
    credential: 'SUA_SENHA',
  },
];
```

Se todos estiverem na **mesma rede** (VPN corporativa ou escritório físico), o STUN do Google já é suficiente.

---

## HTTPS (recomendado)

Para HTTPS, use Nginx como reverse proxy com Certbot:

```bash
apt install nginx certbot python3-certbot-nginx
certbot --nginx -d seudominio.com
```

Atualize `CLIENT_URL=https://seudominio.com` no `.env` e reinicie:

```bash
docker compose restart
```

---

## Manutenção

```bash
# Ver logs
docker compose logs -f

# Reiniciar
docker compose restart

# Atualizar
git pull && docker compose up -d --build

# Backup do banco
docker compose exec postgres pg_dump -U postgres gather_clone > backup.sql
```
