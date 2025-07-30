require('dotenv').config();

const config = {
  // Configurações da API OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-3.5-turbo'
  },

  // Configurações do WhatsApp
  whatsapp: {
    botNumber: process.env.BOT_NUMBER || '69981248816',
    rootNumbers: process.env.ROOT_NUMBERS ? process.env.ROOT_NUMBERS.split(',') : ['69981170027', '6884268042'],
    sessionPath: './auth_info_baileys'
  },

  // Configurações do banco de dados
  database: {
    path: process.env.DB_PATH || './db/atendimento.db'
  },

  // Configurações de log
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: './logs/bot.log'
  },

  // Mensagens padrão
  messages: {
    saudacao: process.env.MENSAGEM_SAUDACAO || 'Olá! Sou o assistente técnico. Como posso ajudá-lo hoje?',
    final: process.env.MENSAGEM_FINAL || 'Atendimento finalizado. Obrigado por utilizar nossos serviços!',
    ajuda: `
🤖 *COMANDOS DISPONÍVEIS*

*USUÁRIOS:*
• !ajuda - Lista de comandos
• !status [id] - Ver status da OS
• !cancelar [id] - Cancelar OS
• !dados - Adicionar dados da máquina

*TÉCNICOS:*
• !menu - Exibir comandos técnicos
• !atendendo [id] - Assumir OS
• !prioridade [id] - Marcar como prioritário
• !setor [id]=[setor] - Alterar setor
• !mensagem [id]=[texto] - Enviar mensagem ao solicitante
• !list - Listar OS abertas
• !finalizado [id] - Marcar como finalizado
• !adm - Chamar administrador

*ADMINISTRADORES:*
• !config - Menu de configurações
• !listtc - Listar técnicos
• !listadm - Listar administradores
• !menss=[texto] - Alterar saudação
• !msfinal=[texto] - Alterar mensagem final
• !ping - Tempo de resposta
• !tecnico=[num] - Tornar técnico
• !adm=[num] - Tornar administrador
• !historico - Ver histórico de OS
    `
  },

  // Hierarquia de usuários
  userRoles: {
    ROOT: 'root',
    ADMIN: 'admin',
    TECNICO: 'tecnico',
    USER: 'user'
  },

  // Status das OS
  orderStatus: {
    ABERTA: 'aberta',
    EM_ANDAMENTO: 'em_andamento',
    FINALIZADA: 'finalizada',
    CANCELADA: 'cancelada'
  },

  // Configurações de limpeza automática
  cleanup: {
    daysToKeep: 7 // Dias para manter OS no histórico
  }
};

module.exports = config;
