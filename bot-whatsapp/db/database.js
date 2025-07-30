const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

class Database {
  constructor() {
    this.dbPath = config.database.path;
    this.ensureDirectoryExists();
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Erro ao conectar com o banco de dados:', err.message);
      } else {
        console.log('Conectado ao banco de dados SQLite.');
        this.initializeTables();
      }
    });
  }

  ensureDirectoryExists() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  initializeTables() {
    // Tabela de Ordens de Serviço
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ordens_servico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_nome TEXT NOT NULL,
        usuario_telefone TEXT NOT NULL,
        local_atendimento TEXT,
        equipamento TEXT,
        anydesk TEXT,
        problema TEXT NOT NULL,
        status TEXT DEFAULT 'aberta',
        tecnico_responsavel TEXT,
        prioridade INTEGER DEFAULT 0,
        setor TEXT DEFAULT 'TI',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finalizada_at DATETIME
      )
    `);

    // Tabela de Usuários e Permissões
    this.db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telefone TEXT UNIQUE NOT NULL,
        nome TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Histórico de Mensagens
    this.db.run(`
      CREATE TABLE IF NOT EXISTS historico_mensagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem_id INTEGER,
        usuario_telefone TEXT,
        mensagem TEXT,
        tipo TEXT, -- 'user', 'tecnico', 'system'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ordem_id) REFERENCES ordens_servico (id)
      )
    `);

    // Tabela de Configurações
    this.db.run(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir usuários root se não existirem
    this.initializeRootUsers();
  }

  initializeRootUsers() {
    config.whatsapp.rootNumbers.forEach(numero => {
      this.db.run(`
        INSERT OR IGNORE INTO usuarios (telefone, nome, role) 
        VALUES (?, 'Root User', 'root')
      `, [numero]);
    });
  }

  // Métodos para Ordens de Serviço
  criarOS(dados) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO ordens_servico 
        (usuario_nome, usuario_telefone, local_atendimento, equipamento, anydesk, problema, setor)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        dados.usuario_nome,
        dados.usuario_telefone,
        dados.local_atendimento,
        dados.equipamento,
        dados.anydesk,
        dados.problema,
        dados.setor || 'TI'
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  buscarOS(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM ordens_servico WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  listarOSAbertas() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM ordens_servico WHERE status IN ('aberta', 'em_andamento') ORDER BY prioridade DESC, created_at ASC",
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  atualizarStatusOS(id, status, tecnico = null) {
    return new Promise((resolve, reject) => {
      let sql = 'UPDATE ordens_servico SET status = ?, updated_at = CURRENT_TIMESTAMP';
      let params = [status];

      if (tecnico) {
        sql += ', tecnico_responsavel = ?';
        params.push(tecnico);
      }

      if (status === 'finalizada') {
        sql += ', finalizada_at = CURRENT_TIMESTAMP';
      }

      sql += ' WHERE id = ?';
      params.push(id);

      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  definirPrioridadeOS(id, prioridade = 1) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE ordens_servico SET prioridade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [prioridade, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  alterarSetorOS(id, setor) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE ordens_servico SET setor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [setor, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Métodos para Usuários
  criarOuAtualizarUsuario(telefone, nome = null, role = 'user') {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO usuarios (telefone, nome, role, last_activity)
        VALUES (?, COALESCE(?, (SELECT nome FROM usuarios WHERE telefone = ?)), ?, CURRENT_TIMESTAMP)
      `, [telefone, nome, telefone, role], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  buscarUsuario(telefone) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM usuarios WHERE telefone = ?',
        [telefone],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  listarUsuariosPorRole(role) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM usuarios WHERE role = ? ORDER BY nome',
        [role],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  alterarRoleUsuario(telefone, novaRole) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE usuarios SET role = ? WHERE telefone = ?',
        [novaRole, telefone],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Métodos para Histórico
  adicionarMensagemHistorico(ordemId, telefone, mensagem, tipo = 'user') {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO historico_mensagens (ordem_id, usuario_telefone, mensagem, tipo)
        VALUES (?, ?, ?, ?)
      `, [ordemId, telefone, mensagem, tipo], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  buscarHistoricoOS(ordemId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM historico_mensagens WHERE ordem_id = ? ORDER BY created_at',
        [ordemId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Métodos para Configurações
  salvarConfiguracao(chave, valor) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO configuracoes (chave, valor, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [chave, valor], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  buscarConfiguracao(chave) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT valor FROM configuracoes WHERE chave = ?',
        [chave],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.valor : null);
        }
      );
    });
  }

  // Limpeza automática do histórico
  limparHistoricoAntigo() {
    return new Promise((resolve, reject) => {
      const diasParaManter = config.cleanup.daysToKeep;
      this.db.run(`
        DELETE FROM ordens_servico 
        WHERE status = 'finalizada' 
        AND finalizada_at < datetime('now', '-${diasParaManter} days')
      `, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // Estatísticas
  obterEstatisticas() {
    return new Promise((resolve, reject) => {
      const stats = {};
      
      // Total de OS por status
      this.db.all(`
        SELECT status, COUNT(*) as total 
        FROM ordens_servico 
        GROUP BY status
      `, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        stats.porStatus = {};
        rows.forEach(row => {
          stats.porStatus[row.status] = row.total;
        });
        
        // OS por técnico
        this.db.all(`
          SELECT tecnico_responsavel, COUNT(*) as total 
          FROM ordens_servico 
          WHERE tecnico_responsavel IS NOT NULL 
          GROUP BY tecnico_responsavel
        `, [], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          stats.porTecnico = {};
          rows.forEach(row => {
            stats.porTecnico[row.tecnico_responsavel] = row.total;
          });
          
          resolve(stats);
        });
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Erro ao fechar banco de dados:', err.message);
        } else {
          console.log('Conexão com banco de dados fechada.');
        }
        resolve();
      });
    });
  }
}

module.exports = new Database();
