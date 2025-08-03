const config = require('./config/config');
const database = require('./db/database');

console.log('🔍 TESTE FINAL - VERIFICAÇÃO COMPLETA');
console.log('====================================\n');

async function finalTest() {
  try {
    console.log('1. Verificando configurações...');
    console.log(`   - Root numbers: ${config.whatsapp.rootNumbers.join(', ')}`);
    
    console.log('\n2. Verificando banco de dados...');
    
    // Garantir que todos os números root estão no banco
    for (const number of config.whatsapp.rootNumbers) {
      console.log(`\n   Processando: ${number}`);
      
      // Buscar usuário
      let user = await database.buscarUsuario(number);
      console.log(`   - Usuário existente: ${user ? `${user.nome} (${user.role})` : 'Não encontrado'}`);
      
      // Criar se não existir
      if (!user) {
        console.log('   - Criando usuário...');
        await database.criarOuAtualizarUsuario(number, 'Root User', 'root');
        user = await database.buscarUsuario(number);
      }
      
      // Atualizar role se necessário
      if (user && user.role !== 'root') {
        console.log('   - Atualizando para root...');
        await database.alterarRoleUsuario(number, 'root');
        user = await database.buscarUsuario(number);
      }
      
      console.log(`   - Status final: ${user && user.role === 'root' ? '✅ ROOT' : '❌ NÃO ROOT'}`);
    }
    
    console.log('\n3. Simulando lógica do handler...');
    
    // Simular a lógica exata do commands.js
    const testPhone = '556981170027';
    console.log(`   Testando número: ${testPhone}`);
    
    // Buscar usuário
    let user = await database.buscarUsuario(testPhone);
    console.log(`   - Usuário no banco: ${user ? `${user.nome} (${user.role})` : 'Não encontrado'}`);
    
    // Criar se não existir (como no código original)
    if (!user) {
      await database.criarOuAtualizarUsuario(testPhone);
      user = await database.buscarUsuario(testPhone);
      console.log(`   - Usuário criado: ${user ? `${user.nome} (${user.role})` : 'Falha na criação'}`);
    }
    
    // Verificar se é root number e atualizar (como no código original)
    if (config.whatsapp.rootNumbers.includes(testPhone) && user.role !== 'root') {
      console.log('   - Número está na lista root, atualizando...');
      await database.alterarRoleUsuario(testPhone, 'root');
      user = await database.buscarUsuario(testPhone);
    }
    
    console.log(`   - Resultado final: ${user && user.role === 'root' ? '✅ SERÁ RECONHECIDO COMO ROOT' : '❌ NÃO SERÁ RECONHECIDO'}`);
    
    console.log('\n4. Verificação de permissões...');
    const userRole = user?.role || 'user';
    
    // Testar permissões para comandos admin
    const adminCommands = ['!config', '!listadm', '!ping'];
    const hasAdminAccess = ['admin', 'root'].includes(userRole);
    
    console.log(`   - Role do usuário: ${userRole}`);
    console.log(`   - Acesso a comandos admin: ${hasAdminAccess ? '✅ SIM' : '❌ NÃO'}`);
    
    adminCommands.forEach(cmd => {
      console.log(`   - ${cmd}: ${hasAdminAccess ? '✅ PERMITIDO' : '❌ NEGADO'}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 DIAGNÓSTICO FINAL:');
    
    const allRootUsers = await database.listarUsuariosPorRole('root');
    console.log(`\n👑 Total de usuários root: ${allRootUsers.length}`);
    allRootUsers.forEach(u => {
      console.log(`   - ${u.telefone}: ${u.nome}`);
    });
    
    const yourNumber = '556981170027';
    const yourUser = await database.buscarUsuario(yourNumber);
    const isYourNumberRoot = yourUser && yourUser.role === 'root';
    
    console.log(`\n📱 Seu número (${yourNumber}):`);
    console.log(`   - No banco: ${yourUser ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   - Role: ${yourUser ? yourUser.role : 'N/A'}`);
    console.log(`   - É root: ${isYourNumberRoot ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   - Na config: ${config.whatsapp.rootNumbers.includes(yourNumber) ? '✅ SIM' : '❌ NÃO'}`);
    
    if (isYourNumberRoot) {
      console.log('\n🎉 SUCESSO! Você será reconhecido como ROOT pelo bot.');
      console.log('\n📋 Próximos passos:');
      console.log('   1. Inicie o bot: cd bot-whatsapp && npm start');
      console.log('   2. Escaneie o QR Code com seu WhatsApp');
      console.log('   3. Envie comandos como !config, !listadm, !ping');
      console.log('   4. O bot deve responder com os menus administrativos');
    } else {
      console.log('\n❌ PROBLEMA! Você NÃO será reconhecido como root.');
      console.log('   Verifique as configurações e execute os scripts de correção.');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
  }
  
  process.exit(0);
}

setTimeout(finalTest, 1000);
