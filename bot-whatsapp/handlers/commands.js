const database = require('../db/database');
const config = require('../config/config');
const { OpenAI } = require('openai');

// Inicializar OpenAI se a chave estiver disponível
let openai = null;
if (config.openai.apiKey) {
  openai = new OpenAI({
    apiKey: config.openai.apiKey
  });
}

class CommandHandler {
  constructor() {
    this.awaitingData = new Map(); // Para armazenar usuários que estão fornecendo dados
  }

  async handleMessage(message, sendMessage, userPhone) {
    try {
      const text = message.body?.trim() || '';
      const user = await database.buscarUsuario(userPhone);
      
      // Criar usuário se não existir
      if (!user) {
        await database.criarOuAtualizarUsuario(userPhone);
      }

      // Se o usuário está fornecendo dados para uma OS
      if (this.awaitingData.has(userPhone)) {
        return await this.handleDataInput(text, sendMessage, userPhone);
      }

      // Processar comandos
      if (text.startsWith('!')) {
        return await this.processCommand(text, sendMessage, userPhone, user);
      }

      // Se não é um comando, tratar como solicitação de suporte
      return await this.handleSupportRequest(text, sendMessage, userPhone, user);

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      await sendMessage('❌ Ocorreu um erro interno. Tente novamente em alguns instantes.');
    }
  }

  async processCommand(text, sendMessage, userPhone, user) {
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const userRole = user?.role || 'user';

    switch (command) {
      // Comandos gerais
      case '!ajuda':
        return await this.handleAjuda(sendMessage, userRole);
      
      case '!status':
        return await this.handleStatus(args, sendMessage, userPhone);
      
      case '!cancelar':
        return await this.handleCancelar(args, sendMessage, userPhone);
      
      case '!dados':
        return await this.handleDados(sendMessage, userPhone);

      // Comandos de técnicos
      case '!menu':
        return await this.handleMenu(sendMessage, userRole);
      
      case '!atendendo':
        return await this.handleAtendendo(args, sendMessage, userPhone, userRole);
      
      case '!prioridade':
        return await this.handlePrioridade(args, sendMessage, userRole);
      
      case '!setor':
        return await this.handleSetor(text, sendMessage, userRole);
      
      case '!mensagem':
        return await this.handleMensagem(text, sendMessage, userRole);
      
      case '!list':
        return await this.handleList(sendMessage, userRole);
      
      case '!finalizado':
        return await this.handleFinalizado(args, sendMessage, userRole);
      
      case '!adm':
        return await this.handleChamarAdmin(sendMessage, userRole);

      // Comandos administrativos
      case '!config':
        return await this.handleConfig(sendMessage, userRole);
      
      case '!listtc':
        return await this.handleListTecnicos(sendMessage, userRole);
      
      case '!listadm':
        return await this.handleListAdmins(sendMessage, userRole);
      
      case '!menss':
        return await this.handleAlterarSaudacao(text, sendMessage, userRole);
      
      case '!msfinal':
        return await this.handleAlterarMensagemFinal(text, sendMessage, userRole);
      
      case '!ping':
        return await this.handlePing(sendMessage, userRole);
      
      case '!tecnico':
        return await this.handlePromoverTecnico(text, sendMessage, userRole);
      
      case '!adm':
        return await this.handlePromoverAdmin(text, sendMessage, userRole);
      
      case '!historico':
        return await this.handleHistorico(sendMessage, userRole);

      default:
        await sendMessage('❓ Comando não reconhecido. Digite !ajuda para ver os comandos disponíveis.');
    }
  }

  // Comandos Gerais
  async handleAjuda(sendMessage, userRole) {
    let helpText = config.messages.ajuda;
    
    if (userRole === 'user') {
      helpText = `
🤖 *COMANDOS DISPONÍVEIS*

*USUÁRIOS:*
• !ajuda - Lista de comandos
• !status [id] - Ver status da OS
• !cancelar [id] - Cancelar OS
• !dados - Adicionar dados da máquina

Para abrir um chamado, apenas descreva seu problema!
      `;
    }
    
    await sendMessage(helpText);
  }

  async handleStatus(args, sendMessage, userPhone) {
    if (args.length === 0) {
      return await sendMessage('❌ Use: !status [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    // Verificar se o usuário pode ver esta OS
    if (os.usuario_telefone !== userPhone) {
      const user = await database.buscarUsuario(userPhone);
      if (!user || !['tecnico', 'admin', 'root'].includes(user.role)) {
        return await sendMessage('❌ Você só pode consultar suas próprias OS.');
      }
    }

    const statusEmoji = {
      'aberta': '🔴',
      'em_andamento': '🟡',
      'finalizada': '🟢',
      'cancelada': '⚫'
    };

    const response = `
📋 *OS #${os.id}*
${statusEmoji[os.status]} Status: ${os.status.toUpperCase()}
👤 Usuário: ${os.usuario_nome}
📍 Local: ${os.local_atendimento || 'Não informado'}
💻 Equipamento: ${os.equipamento || 'Não informado'}
🔧 Técnico: ${os.tecnico_responsavel || 'Não atribuído'}
⚡ Prioridade: ${os.prioridade ? 'ALTA' : 'Normal'}
🏢 Setor: ${os.setor}
📅 Criada: ${new Date(os.created_at).toLocaleString('pt-BR')}
    `;

    await sendMessage(response);
  }

  async handleCancelar(args, sendMessage, userPhone) {
    if (args.length === 0) {
      return await sendMessage('❌ Use: !cancelar [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    if (os.usuario_telefone !== userPhone) {
      return await sendMessage('❌ Você só pode cancelar suas próprias OS.');
    }

    if (os.status === 'finalizada') {
      return await sendMessage('❌ Não é possível cancelar uma OS já finalizada.');
    }

    await database.atualizarStatusOS(osId, 'cancelada');
    await database.adicionarMensagemHistorico(osId, userPhone, 'OS cancelada pelo usuário', 'system');
    
    await sendMessage(`✅ OS #${osId} cancelada com sucesso.`);
  }

  async handleDados(sendMessage, userPhone) {
    this.awaitingData.set(userPhone, { step: 'nome' });
    await sendMessage(`
📝 *COLETA DE DADOS PARA CHAMADO*

Por favor, forneça as seguintes informações:

1️⃣ Seu nome completo:
    `);
  }

  // Comandos de Técnicos
  async handleAtendendo(args, sendMessage, userPhone, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    if (args.length === 0) {
      return await sendMessage('❌ Use: !atendendo [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    if (os.status !== 'aberta') {
      return await sendMessage(`❌ OS #${osId} não está disponível para atendimento.`);
    }

    const user = await database.buscarUsuario(userPhone);
    await database.atualizarStatusOS(osId, 'em_andamento', user.nome || userPhone);
    await database.adicionarMensagemHistorico(osId, userPhone, `Técnico assumiu o atendimento`, 'tecnico');

    await sendMessage(`✅ Você assumiu a OS #${osId}. Status alterado para EM ANDAMENTO.`);
  }

  async handleList(sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    const osAbertas = await database.listarOSAbertas();

    if (osAbertas.length === 0) {
      return await sendMessage('✅ Não há OS abertas no momento.');
    }

    let response = '📋 *ORDENS DE SERVIÇO ABERTAS*\n\n';
    
    osAbertas.forEach(os => {
      const prioridade = os.prioridade ? '⚡' : '';
      const status = os.status === 'aberta' ? '🔴' : '🟡';
      
      response += `${status}${prioridade} *OS #${os.id}*\n`;
      response += `👤 ${os.usuario_nome}\n`;
      response += `📍 ${os.local_atendimento || 'N/I'}\n`;
      response += `💻 ${os.equipamento || 'N/I'}\n`;
      response += `🔧 ${os.tecnico_responsavel || 'Não atribuído'}\n`;
      response += `📅 ${new Date(os.created_at).toLocaleString('pt-BR')}\n\n`;
    });

    await sendMessage(response);
  }

  // Tratamento de solicitações de suporte
  async handleSupportRequest(text, sendMessage, userPhone, user) {
    // Usar IA para analisar o problema se disponível
    let analiseIA = '';
    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: config.openai.model,
          messages: [{
            role: 'system',
            content: 'Você é um assistente técnico. Analise brevemente o problema descrito e sugira uma categoria (Hardware, Software, Rede, Impressora, etc.) e prioridade (Alta, Normal, Baixa).'
          }, {
            role: 'user',
            content: text
          }],
          max_tokens: 150
        });
        
        analiseIA = response.choices[0].message.content;
      } catch (error) {
        console.error('Erro na análise IA:', error);
      }
    }

    // Criar OS automaticamente
    const osData = {
      usuario_nome: user?.nome || 'Usuário',
      usuario_telefone: userPhone,
      problema: text,
      setor: 'TI'
    };

    const osId = await database.criarOS(osData);
    await database.adicionarMensagemHistorico(osId, userPhone, text, 'user');

    let response = `
✅ *CHAMADO CRIADO COM SUCESSO*

🎫 OS #${osId}
📝 Problema: ${text}
📅 Criado em: ${new Date().toLocaleString('pt-BR')}

${analiseIA ? `🤖 Análise IA: ${analiseIA}\n` : ''}

Para adicionar mais informações, use !dados
Para consultar o status, use !status ${osId}
    `;

    await sendMessage(response);

    // Notificar técnicos (implementar notificação para grupo técnico)
    return { osId, created: true };
  }

  // Tratamento de entrada de dados
  async handleDataInput(text, sendMessage, userPhone) {
    const userData = this.awaitingData.get(userPhone);
    
    switch (userData.step) {
      case 'nome':
        userData.nome = text;
        userData.step = 'local';
        await sendMessage('2️⃣ Local do atendimento (ex: Recepção, Sala 101):');
        break;
        
      case 'local':
        userData.local = text;
        userData.step = 'equipamento';
        await sendMessage('3️⃣ Equipamento com problema (ex: Impressora HP, Computador Dell):');
        break;
        
      case 'equipamento':
        userData.equipamento = text;
        userData.step = 'anydesk';
        await sendMessage('4️⃣ ID do AnyDesk (se aplicável, ou digite "não"):');
        break;
        
      case 'anydesk':
        userData.anydesk = text === 'não' ? null : text;
        userData.step = 'problema';
        await sendMessage('5️⃣ Descreva detalhadamente o problema:');
        break;
        
      case 'problema':
        userData.problema = text;
        
        // Criar OS com todos os dados
        const osData = {
          usuario_nome: userData.nome,
          usuario_telefone: userPhone,
          local_atendimento: userData.local,
          equipamento: userData.equipamento,
          anydesk: userData.anydesk,
          problema: userData.problema,
          setor: 'TI'
        };

        const osId = await database.criarOS(osData);
        await database.adicionarMensagemHistorico(osId, userPhone, userData.problema, 'user');
        
        // Atualizar nome do usuário
        await database.criarOuAtualizarUsuario(userPhone, userData.nome);

        this.awaitingData.delete(userPhone);

        const response = `
✅ *CHAMADO CRIADO COM SUCESSO*

🎫 *OS #${osId}*
👤 Usuário: ${userData.nome}
📍 Local: ${userData.local}
💻 Equipamento: ${userData.equipamento}
${userData.anydesk ? `🖥️ AnyDesk: ${userData.anydesk}\n` : ''}📝 Problema: ${userData.problema}
📅 Criado em: ${new Date().toLocaleString('pt-BR')}

Seu chamado foi registrado e será atendido em breve!
        `;

        await sendMessage(response);
        break;
    }
  }

  // Métodos auxiliares para outros comandos...
  async handlePing(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    const startTime = Date.now();
    const stats = await database.obterEstatisticas();
    const endTime = Date.now();

    const response = `
🏓 *PING - STATUS DO SISTEMA*

⏱️ Tempo de resposta: ${endTime - startTime}ms
📊 Estatísticas:
${Object.entries(stats.porStatus || {}).map(([status, total]) => `• ${status}: ${total}`).join('\n')}

✅ Sistema operacional
    `;

    await sendMessage(response);
  }

  // Implementar outros métodos conforme necessário...
  async handleMenu(sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    const menu = `
🔧 *MENU TÉCNICO*

• !atendendo [id] - Assumir OS
• !prioridade [id] - Marcar como prioritário
• !setor [id]=[setor] - Alterar setor
• !mensagem [id]=[texto] - Enviar mensagem
• !list - Listar OS abertas
• !finalizado [id] - Finalizar OS
• !adm - Chamar administrador
    `;

    await sendMessage(menu);
  }

  async handleFinalizado(args, sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    if (args.length === 0) {
      return await sendMessage('❌ Use: !finalizado [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    await database.atualizarStatusOS(osId, 'finalizada');
    await database.adicionarMensagemHistorico(osId, '', 'OS finalizada pelo técnico', 'system');

    await sendMessage(`✅ OS #${osId} finalizada com sucesso!`);
  }
}

module.exports = new CommandHandler();
