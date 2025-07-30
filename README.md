# 🤖 Bot de Atendimento WhatsApp - Sistema Completo

Sistema automatizado de atendimento técnico integrado ao WhatsApp com painel administrativo web para gerenciamento de Ordens de Serviço (OS).

## 📋 Funcionalidades Implementadas

### 🔧 Bot WhatsApp
- ✅ Conexão automática via Baileys
- ✅ Recebimento e processamento de comandos
- ✅ Criação automática de OS
- ✅ Sistema de hierarquia (Root, Admin, Técnico, Usuário)
- ✅ Comandos completos para todos os níveis
- ✅ Integração com OpenAI (opcional)
- ✅ Sistema de logs avançado
- ✅ Banco de dados SQLite
- ✅ Limpeza automática de dados antigos

### 🌐 Painel Administrativo Web
- ✅ Dashboard com estatísticas em tempo real
- ✅ Visualização de todas as OS
- ✅ Filtros por status e busca
- ✅ Interface moderna e responsiva
- ✅ API REST completa
- ✅ Atualização de status das OS

## 🚀 Instalação e Configuração

### 1. Pré-requisitos
- Node.js 16+ instalado
- WhatsApp instalado no celular
- Chave da OpenAI (opcional)

### 2. Instalação das Dependências

```bash
# Instalar dependências do bot
cd bot-whatsapp
npm install

# Instalar dependências do painel web (na raiz)
cd ..
npm install sqlite3
```

### 3. Configuração do Bot

```bash
# Inicializar banco de dados com dados de exemplo
cd bot-whatsapp
node init-db.js
```

### 4. Configurar Variáveis de Ambiente

Edite o arquivo `bot-whatsapp/.env`:

```env
# Configurações do Bot WhatsApp
OPENAI_API_KEY=sua_chave_openai_aqui

# Números de telefone
BOT_NUMBER=69981248816
ROOT_NUMBERS=69981170027,6884268042

# Configurações do banco de dados
DB_PATH=./db/atendimento.db

# Configurações gerais
NODE_ENV=development
LOG_LEVEL=info

# Mensagens padrão
MENSAGEM_SAUDACAO=Olá! Sou o assistente técnico. Como posso ajudá-lo hoje?
MENSAGEM_FINAL=Atendimento finalizado. Obrigado por utilizar nossos serviços!
```

## 🎯 Como Usar

### 1. Iniciar o Painel Web

```bash
# Na raiz do projeto
npm run dev
```

Acesse: http://localhost:8000

### 2. Iniciar o Bot WhatsApp

```bash
# Em outro terminal
cd bot-whatsapp
npm start
```

1. Escaneie o QR Code que aparecerá no terminal
2. Aguarde a confirmação de conexão
3. O bot estará pronto para receber mensagens!

## 📱 Comandos do WhatsApp

### 👤 Comandos de Usuário

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `!ajuda` | Lista todos os comandos | `!ajuda` |
| `!status [id]` | Consulta status da OS | `!status 123` |
| `!cancelar [id]` | Cancela uma OS | `!cancelar 123` |
| `!dados` | Inicia coleta de dados detalhados | `!dados` |

### 🔧 Comandos de Técnico

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `!menu` | Menu de comandos técnicos | `!menu` |
| `!atendendo [id]` | Assume uma OS | `!atendendo 123` |
| `!prioridade [id]` | Marca como prioritário | `!prioridade 123` |
| `!setor [id]=[setor]` | Altera setor da OS | `!setor 123=Financeiro` |
| `!mensagem [id]=[texto]` | Envia mensagem ao usuário | `!mensagem 123=Verificando problema` |
| `!list` | Lista OS abertas | `!list` |
| `!finalizado [id]` | Finaliza atendimento | `!finalizado 123` |
| `!adm` | Chama um administrador | `!adm` |

### 👑 Comandos Administrativos

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `!config` | Menu de configurações | `!config` |
| `!listtc` | Lista técnicos | `!listtc` |
| `!listadm` | Lista administradores | `!listadm` |
| `!menss=[texto]` | Altera saudação | `!menss=Olá! Como posso ajudar?` |
| `!msfinal=[texto]` | Altera mensagem final | `!msfinal=Obrigado pelo contato!` |
| `!ping` | Testa sistema | `!ping` |
| `!tecnico=[numero]` | Promove a técnico | `!tecnico=5511999999999` |
| `!adm=[numero]` | Promove a admin | `!adm=5511999999999` |
| `!historico` | Visualiza histórico | `!historico` |

## 🔄 Fluxo de Atendimento

### 1. Abertura Simples de Chamado
```
Usuário: "Minha impressora não está funcionando"
Bot: ✅ CHAMADO CRIADO COM SUCESSO
     🎫 OS #123
     📝 Problema: Minha impressora não está funcionando
     📅 Criado em: 30/01/2024 14:30:25
```

### 2. Abertura Detalhada com !dados
```
Usuário: !dados
Bot: 📝 COLETA DE DADOS PARA CHAMADO
     1️⃣ Seu nome completo:

Usuário: João Silva
Bot: 2️⃣ Local do atendimento (ex: Recepção, Sala 101):

Usuário: Recepção
Bot: 3️⃣ Equipamento com problema:

Usuário: Impressora HP LaserJet
Bot: 4️⃣ ID do AnyDesk (se aplicável, ou digite "não"):

Usuário: 123456789
Bot: 5️⃣ Descreva detalhadamente o problema:

Usuário: Impressora não imprime e papel fica atolando
Bot: ✅ CHAMADO CRIADO COM SUCESSO
     🎫 OS #124
     👤 Usuário: João Silva
     📍 Local: Recepção
     💻 Equipamento: Impressora HP LaserJet
     🖥️ AnyDesk: 123456789
     📝 Problema: Impressora não imprime e papel fica atolando
```

### 3. Atendimento Técnico
```
Técnico: !list
Bot: 📋 ORDENS DE SERVIÇO ABERTAS
     🔴 OS #124
     👤 João Silva
     📍 Recepção
     💻 Impressora HP LaserJet
     📅 30/01/2024 14:30:25

Técnico: !atendendo 124
Bot: ✅ Você assumiu a OS #124. Status alterado para EM ANDAMENTO.

Técnico: !mensagem 124=Estou indo até a recepção verificar a impressora
Bot: ✅ Mensagem enviada para o usuário.

Técnico: !finalizado 124
Bot: ✅ OS #124 finalizada com sucesso!
```

## 🌐 Painel Administrativo

### Dashboard
- **Estatísticas em tempo real**: Total, Abertas, Em Andamento, Finalizadas, Alta Prioridade
- **Gráficos visuais** com cores intuitivas
- **Atualização automática** dos dados

### Funcionalidades
- **Filtros avançados**: Por status, busca por nome/problema/ID
- **Tabela completa**: Todas as informações das OS
- **Ações rápidas**: Iniciar, Finalizar OS diretamente do painel
- **Interface responsiva**: Funciona em desktop, tablet e mobile

### API Endpoints
- `GET /api/orders` - Lista ordens de serviço
- `PUT /api/orders` - Atualiza status das ordens

## 📊 Dados de Exemplo

O sistema vem com 6 ordens de serviço de exemplo:

1. **Ana Oliveira** - Impressora HP (Recepção) - Em Andamento
2. **Carlos Mendes** - Computador Dell (Sala 201) - Em Andamento  
3. **Fernanda Lima** - Monitor Samsung (Financeiro) - Aberta
4. **Roberto Alves** - Notebook Lenovo (RH) - Finalizada
5. **Lucia Ferreira** - Telefone IP (Vendas) - Finalizada
6. **Marcos Silva** - Scanner Epson (Almoxarifado) - Cancelada

## 🗂️ Estrutura do Projeto

```
/
├── bot-whatsapp/              # Bot WhatsApp
│   ├── bot.js                 # Arquivo principal do bot
│   ├── start.js               # Script de inicialização
│   ├── init-db.js             # Inicialização do banco
│   ├── package.json           # Dependências do bot
│   ├── .env                   # Configurações
│   ├── config/
│   │   └── config.js          # Configurações gerais
│   ├── db/
│   │   ├── database.js        # Gerenciador do banco
│   │   └── atendimento.db     # Banco SQLite
│   ├── handlers/
│   │   └── commands.js        # Processador de comandos
│   ├── utils/
│   │   └── logger.js          # Sistema de logs
│   ├── logs/                  # Logs do sistema
│   ├── auth_info_baileys/     # Sessão WhatsApp
│   └── docs/
│       └── README.md          # Documentação detalhada
├── src/                       # Painel Web Next.js
│   ├── app/
│   │   ├── page.tsx           # Página principal
│   │   ├── layout.tsx         # Layout da aplicação
│   │   └── api/
│   │       └── orders/
│   │           └── route.ts   # API das ordens
│   └── components/ui/         # Componentes UI
├── package.json               # Dependências do painel
└── README.md                  # Este arquivo
```

## 🔧 Tecnologias Utilizadas

### Bot WhatsApp
- **@whiskeysockets/baileys** - Conexão WhatsApp
- **sqlite3** - Banco de dados
- **winston** - Sistema de logs
- **openai** - Integração IA (opcional)
- **qrcode-terminal** - QR Code no terminal

### Painel Web
- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Shadcn/ui** - Componentes UI
- **SQLite3** - Conexão com banco

## 🔐 Segurança e Hierarquia

### Níveis de Acesso
- **Root** (69981170027, 6884268042): Acesso total
- **Admin**: Gerenciar técnicos e configurações
- **Técnico**: Atender chamados e gerenciar OS
- **Usuário**: Abrir e consultar próprios chamados

### Recursos de Segurança
- Validação de permissões em todos os comandos
- Logs detalhados de todas as ações
- Isolamento de dados por usuário
- Limpeza automática de dados antigos

## 🔄 Manutenção

### Limpeza Automática
- OS finalizadas são removidas após 7 dias
- Logs são rotacionados automaticamente
- Configurável via arquivo de configuração

### Backup
```bash
# Backup do banco de dados
cp bot-whatsapp/db/atendimento.db backup/

# Backup dos logs
cp bot-whatsapp/logs/bot.log backup/

# Backup da sessão WhatsApp
cp -r bot-whatsapp/auth_info_baileys backup/
```

## 🚨 Solução de Problemas

### Bot não conecta
1. Verifique se o QR Code foi escaneado
2. Confirme se o WhatsApp está ativo no celular
3. Verifique logs em `bot-whatsapp/logs/bot.log`

### Painel não carrega dados
1. Verifique se o banco existe: `bot-whatsapp/db/atendimento.db`
2. Execute: `cd bot-whatsapp && node init-db.js`
3. Reinicie o servidor: `npm run dev`

### Comandos não funcionam
1. Verifique permissões do usuário
2. Confirme sintaxe do comando
3. Consulte logs para erros

## 📞 Suporte

- **Números Root**: 69981170027, 6884268042
- **Bot**: 69981248816
- **Logs**: `bot-whatsapp/logs/bot.log`
- **Painel**: http://localhost:8000

## 🎉 Status do Projeto

✅ **COMPLETO E FUNCIONAL**

- ✅ Bot WhatsApp totalmente operacional
- ✅ Painel administrativo web funcionando
- ✅ Banco de dados com dados de exemplo
- ✅ API REST completa
- ✅ Sistema de comandos implementado
- ✅ Hierarquia de usuários funcionando
- ✅ Logs e monitoramento ativos
- ✅ Documentação completa

**O sistema está pronto para uso em produção!**

---

**Desenvolvido com ❤️ para otimizar o atendimento técnico via WhatsApp**
