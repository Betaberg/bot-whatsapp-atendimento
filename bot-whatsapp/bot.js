const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Importar módulos do bot
const config = require('./config/config');
const database = require('./db/database');
const commandHandler = require('./handlers/commands');
const { botLogger } = require('./utils/logger');

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 segundos
    
    // Criar diretórios necessários
    this.ensureDirectories();
    
    // Inicializar limpeza automática
    this.setupCleanupSchedule();
  }

  ensureDirectories() {
    const dirs = [
      './logs',
      './db',
      config.whatsapp.sessionPath
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async start() {
    try {
      botLogger.connection('STARTING', 'Iniciando bot WhatsApp...');
      console.log('🤖 Iniciando Bot de Atendimento WhatsApp...');
      
      await this.connectToWhatsApp();
    } catch (error) {
      botLogger.botError(error, 'START');
      console.error('❌ Erro ao iniciar bot:', error);
      process.exit(1);
    }
  }

  async connectToWhatsApp() {
    try {
      // Obter versão mais recente do Baileys
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Usando WhatsApp v${version.join('.')}, é a mais recente: ${isLatest}`);

      // Configurar autenticação
      const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionPath);

      // Criar socket WhatsApp
      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // Vamos usar nossa própria implementação
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
          return { conversation: 'Mensagem não encontrada' };
        }
      });

      // Event listeners
      this.setupEventListeners(saveCreds);

    } catch (error) {
      botLogger.botError(error, 'CONNECT');
      throw error;
    }
  }

  setupEventListeners(saveCreds) {
    // Salvar credenciais quando atualizadas
    this.sock.ev.on('creds.update', saveCreds);

    // Monitorar conexão
    this.sock.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update);
    });

    // Processar mensagens recebidas
    this.sock.ev.on('messages.upsert', async (messageUpdate) => {
      await this.handleIncomingMessages(messageUpdate);
    });

    // Monitorar presença
    this.sock.ev.on('presence.update', (presence) => {
      botLogger.userAction(presence.id, 'PRESENCE_UPDATE', presence.presences ? Object.keys(presence.presences).join(',') : '');
    });

    // Monitorar grupos
    this.sock.ev.on('groups.upsert', (groups) => {
      groups.forEach(group => {
        botLogger.userAction(group.id, 'GROUP_JOINED', group.subject);
      });
    });
  }

  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 QR Code gerado! Escaneie com seu WhatsApp:');
      qrcode.generate(qr, { small: true });
      botLogger.qrCode();
    }

    if (connection === 'close') {
      this.isConnected = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      
      botLogger.connection('CLOSED', `Reason: ${lastDisconnect?.error?.output?.statusCode}`);
      console.log('❌ Conexão fechada:', lastDisconnect?.error);

      if (shouldReconnect) {
        this.handleReconnection();
      } else {
        console.log('🚪 Deslogado do WhatsApp. Execute novamente para reconectar.');
        process.exit(0);
      }
    } else if (connection === 'open') {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      botLogger.connection('OPEN', 'Bot conectado com sucesso');
      console.log('✅ Bot conectado ao WhatsApp com sucesso!');
      console.log(`📞 Número do bot: ${config.whatsapp.botNumber}`);
      console.log(`👑 Números root: ${config.whatsapp.rootNumbers.join(', ')}`);
      console.log('🎯 Bot pronto para receber mensagens!');
      
      // Enviar mensagem de inicialização para números root
      this.notifyRootUsers('🤖 Bot de Atendimento iniciado com sucesso!');
    } else if (connection === 'connecting') {
      botLogger.connection('CONNECTING', 'Conectando ao WhatsApp...');
      console.log('🔄 Conectando ao WhatsApp...');
    }
  }

  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      botLogger.connection('MAX_RECONNECT_REACHED', `Tentativas: ${this.reconnectAttempts}`);
      console.log('❌ Máximo de tentativas de reconexão atingido. Encerrando...');
      process.exit(1);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    botLogger.connection('RECONNECTING', `Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`);
    console.log(`🔄 Tentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts}) em ${delay/1000}s...`);
    
    setTimeout(() => {
      this.connectToWhatsApp();
    }, delay);
  }

  async handleIncomingMessages(messageUpdate) {
    try {
      const messages = messageUpdate.messages;
      
      for (const message of messages) {
        // Ignorar mensagens próprias e de status
        if (message.key.fromMe || message.key.remoteJid === 'status@broadcast') {
          continue;
        }

        // Extrair informações da mensagem
        const messageInfo = this.extractMessageInfo(message);
        if (!messageInfo) continue;

        const { from, text, isGroup, senderPhone } = messageInfo;

        // Log da mensagem recebida
        botLogger.messageReceived(from, text);

        // Marcar como lida
        await this.sock.readMessages([message.key]);

        // Processar apenas mensagens privadas ou menções em grupos
        if (isGroup && !text.includes(`@${config.whatsapp.botNumber}`)) {
          continue;
        }

        // Função para enviar resposta
        const sendMessage = async (responseText) => {
          try {
            await this.sock.sendMessage(from, { text: responseText });
            botLogger.messageSent(from, responseText);
          } catch (error) {
            botLogger.botError(error, 'SEND_MESSAGE');
          }
        };

        // Processar comando/mensagem
        await commandHandler.handleMessage(
          { body: text },
          sendMessage,
          senderPhone
        );
      }
    } catch (error) {
      botLogger.botError(error, 'HANDLE_MESSAGES');
    }
  }

  extractMessageInfo(message) {
    try {
      const from = message.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      
      // Extrair número do remetente
      let senderPhone;
      if (isGroup) {
        senderPhone = message.key.participant?.replace('@s.whatsapp.net', '') || '';
      } else {
        senderPhone = from.replace('@s.whatsapp.net', '');
      }

      // Extrair texto da mensagem
      let text = '';
      if (message.message?.conversation) {
        text = message.message.conversation;
      } else if (message.message?.extendedTextMessage?.text) {
        text = message.message.extendedTextMessage.text;
      } else if (message.message?.imageMessage?.caption) {
        text = message.message.imageMessage.caption;
      } else if (message.message?.videoMessage?.caption) {
        text = message.message.videoMessage.caption;
      }

      if (!text || !senderPhone) {
        return null;
      }

      return {
        from,
        text: text.trim(),
        isGroup,
        senderPhone
      };
    } catch (error) {
      botLogger.botError(error, 'EXTRACT_MESSAGE_INFO');
      return null;
    }
  }

  async notifyRootUsers(message) {
    for (const rootNumber of config.whatsapp.rootNumbers) {
      try {
        const jid = `${rootNumber}@s.whatsapp.net`;
        await this.sock.sendMessage(jid, { text: message });
        botLogger.messageSent(jid, message);
      } catch (error) {
        botLogger.botError(error, `NOTIFY_ROOT_${rootNumber}`);
      }
    }
  }

  setupCleanupSchedule() {
    // Executar limpeza automática a cada 24 horas
    setInterval(async () => {
      try {
        const deletedCount = await database.limparHistoricoAntigo();
        if (deletedCount > 0) {
          botLogger.cleanup(deletedCount);
          console.log(`🧹 Limpeza automática: ${deletedCount} registros antigos removidos`);
        }
      } catch (error) {
        botLogger.botError(error, 'AUTO_CLEANUP');
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
  }

  async stop() {
    try {
      botLogger.connection('STOPPING', 'Parando bot...');
      console.log('🛑 Parando bot...');
      
      if (this.sock) {
        await this.sock.logout();
      }
      
      await database.close();
      
      console.log('✅ Bot parado com sucesso');
      process.exit(0);
    } catch (error) {
      botLogger.botError(error, 'STOP');
      process.exit(1);
    }
  }

  // Método para enviar mensagem programaticamente
  async sendMessage(to, message) {
    try {
      if (!this.isConnected) {
        throw new Error('Bot não está conectado');
      }

      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      await this.sock.sendMessage(jid, { text: message });
      botLogger.messageSent(jid, message);
      return true;
    } catch (error) {
      botLogger.botError(error, 'SEND_PROGRAMMATIC_MESSAGE');
      return false;
    }
  }

  // Método para obter status da conexão
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      botNumber: config.whatsapp.botNumber,
      rootNumbers: config.whatsapp.rootNumbers
    };
  }
}

// Instanciar e iniciar o bot
const bot = new WhatsAppBot();

// Handlers para encerramento gracioso
process.on('SIGINT', () => {
  console.log('\n🛑 Recebido SIGINT, encerrando bot...');
  bot.stop();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recebido SIGTERM, encerrando bot...');
  bot.stop();
});

// Iniciar o bot
bot.start().catch(error => {
  console.error('❌ Erro fatal ao iniciar bot:', error);
  process.exit(1);
});

// Exportar para uso em outros módulos
module.exports = bot;
