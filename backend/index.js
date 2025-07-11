// IMPORTAÇÃO DE MÓDULOS
require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser'); 
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const { error } = require("console");
const { Script } = require("vm");
const algorithm = "aes-256-cbc";
const key = crypto
  .createHash("sha256")
  .update(String(process.env.ENCRYPTION_SECRET))
  .digest();
const iv = Buffer.alloc(16, 0);

const router = express.Router();

// Configuração do pool de conexões
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ===== CRIPTOGRAFIA =====
// Criptografando
function encrypt(text) {
  if (!text) return null;

  // Cria uma máquina de criptografia
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  // Transforma o texto normal em texto criptografado
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

// Descriptografando
function decrypt(encrypted) {
  if (!encrypted) return null;

  // Cria uma máquina de descriptografia
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  // Transforma o texto secreto em texto normal
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Exibe erro se houver
function encrypt(text) {
  try {
    if (!text) return null;
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    return null;
  }
}

//====== API CADASTRO ======
router.post("/register", async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  // Validações do Cadastro
  if (password !== confirmPassword) {
    return res.status(400).json({
      error: "As senhas não coincidem!",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "A senha deve ter no mínimo 6 caracteres",
    });
  }

  try {
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        error: "Este Email já está cadastrado!",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hashedPassword]
    );

    // Resposta Sucesso/Erro no Cadastro
    res.status(201).json({
      message: "Cadastro realizado com sucesso!",
      userId: result.insertId,
      email: email,
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({
      error: "Ocorreu um erro inesperado. Por favor, tente novamente.",
    });
  }
});

//======== API LOGIN ========
// Rota de Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validações do login
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    // Busca o usuário no banco de dados
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    // Verifica se o usuário existe
    if (users.length === 0) {
      return res.status(404).json({ error: "Email não encontrado!" });
    }

    const user = users[0];

    // Compara a senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Gmail ou senha incorretos!" });
    }

    // Gera os tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Gerar tokens
    function generateTokens(user) {
      const accessToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_SHORT_IN || '15m' } // Token de acesso curto
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } // Token de refresh longo
      );

      return { accessToken, refreshToken };
    }

    // Retorna o token e informações do usuário
    res.json({
      message: 'Login bem-sucedido!',
      token: accessToken, // Mantém 'token' para compatibilidade
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro ao processar login" });
  }
});

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  // Obter o token do header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expirado. Faça login novamente ou renove o token.' 
        });
      }
      return res.status(403).json({ 
        error: 'Token inválido' 
      });
    }
    
    req.user = user;
    next();
  });
};

// Rota protegida
router.get("/perfil", authenticateToken, async (req, res) => {
  try {
    const [user] = await pool.query(
      "SELECT id, email, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    res.json(user[0]);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar perfil" });
  }
});

// ======== ROTAS DE TOKEN ========
// Rota para refresh token
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token não fornecido' });
  }
  
  try {
    // Verifica se o token é válido
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Verifica se o token está no banco
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ? AND refresh_token = ?',
      [decoded.id, refreshToken]
    );
    
    if (users.length === 0) {
      return res.status(403).json({ error: 'Refresh token inválido' });
    }
    
    // Gera novos tokens
    const { accessToken, newRefreshToken } = generateTokens(users[0]);
    
    // Atualiza o refresh token no banco
    await pool.query(
      'UPDATE users SET refresh_token = ? WHERE id = ?',
      [newRefreshToken, users[0].id]
    );
    
    res.json({ 
      accessToken, 
      refreshToken: newRefreshToken 
    });
    
  } catch (error) {
    console.error('Erro no refresh token:', error);
    res.status(403).json({ error: 'Token inválido ou expirado' });
  }
});

// Rota de logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET refresh_token = NULL WHERE id = ?',
      [req.user.id]
    );
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
});

//====== API RECUPERAÇÃO DE SENHA ======
// Configuração do Nodemailer para envio de Email - Gmail
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Rota para solicitar redefinição de senha
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Verifica se o email existe
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ error: "Email não encontrado!" });
    }

    // Gera token e data de expiração
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hora para expirar

    // Atualiza o usuário com o token
    await pool.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
      [token, expires.toISOString().slice(0, 19).replace("T", " "), email]
    );

    // Envia o email - ===MODIFICAR PARA URL REAL DO SITE===
    const resetUrl = `http://127.0.0.1:5500/redefinir/senha/?token=${token}`;

    // Html - Resetar senha
    const mailOptions = {
      to: email,
      subject: "Redefinição de Senha - StrayWollf",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #6a0dad; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #000; padding: 20px; text-align: center;">
            <img src="https://i.pinimg.com/736x/43/73/aa/4373aabd959242d67d328c69a7f037de.jpg" alt="StrayWollf" style="max-width: 150px;">
          </div>
          <div style="padding: 30px; background-color:rgb(255, 255, 255);">
            <h2 style="color: #6a0dad; text-align: center;">REDEFINIÇÃO DE SENHA</h2>
            <p style="color: #333; text-align: center;" >Clique no botão abaixo para redefinir sua senha:</p>
            <a href="${resetUrl}" style="display: block; width: fit-content; margin: 0 auto; background-color: #6a0dad; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px auto; text-align: center;">Redefinir Senha</a>
            <p style="color: #666; font-size: 12px; text-align: center;">Se você não solicitou esta redefinição, ignore este email.</p>
            <p style="color: #999; font-size: 10px; text-align: center;">Link válido por 1 hora</p>
          </div>
          <div style="background-color: #000; padding: 15px; text-align: center; color: #fff; font-size: 12px;">
            © ${new Date().getFullYear()} StrayWollf. Todos os direitos reservados.
          </div>
        </div>
      `,
    };

    // Mensagem de solicitação
    await transporter.sendMail(mailOptions);
    res.json({
      success: true,
      message: "Email de redefinição enviado! Verifique sua caixa de entrada ou Spam.",
    });
  } catch (error) {
    console.error("Erro no forgot-password:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao processar solicitação. Tente novamente mais tarde.",
    });
  }
});

// Rota para validar token e redefinir senha
router.post("/reset-password", async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  try {
    // Validações
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "As senhas não coincidem",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "A senha deve ter no mínimo 6 caracteres",
      });
    }

    // Busca usuário pelo token válido
    const [users] = await pool.query(
      `SELECT * FROM users 
       WHERE reset_token = ? 
       AND reset_token_expires > UTC_TIMESTAMP()`, // Usando UTC para evitar problemas de fuso
      [token]
    );

    if (users.length === 0) {
      // Verifica se token existe mas expirou
      const [expired] = await pool.query(
        `SELECT * FROM users 
         WHERE reset_token = ? 
         AND reset_token_expires <= UTC_TIMESTAMP()`,
        [token]
      );

      return res.status(400).json({
        success: false,
        error: expired.length
          ? "Link expirado. Solicite um novo."
          : "Token inválido.",
      });
    }

    // Atualiza senha e limpa token
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await connection.query(
        "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
        [hashedPassword, users[0].id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Senha redefinida com sucesso! Redirecionando...",
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Erro no reset-password:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao redefinir senha. Tente novamente.",
    });
  }
});

//====== API PERFIL USUARIO ======
// Caminhos da imagen de perfil
router.use("/profile-pictures", express.static(path.join(__dirname, "icons")));
const uploadDir = path.join(__dirname, "icons");

// Criar diretório se não existir
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Filtro de arquivo e tamanho
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.mimetype.startsWith('image/') && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    // Crie um erro personalizado que será capturado pelo middleware de erro
    const error = new Error('Apenas imagens são permitidas!');
    error.status = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
  },
});

// Rota para obter dados do perfil
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const [userRows] = await pool.query("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);

    if (userRows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = userRows[0];

    res.json({
      profile_picture: user.profile_picture,
      full_name: decrypt(user.full_name),
      display_name: getShortName(decrypt(user.full_name)),
      email: user.email ? censorEmail(user.email) : "",
      phone: user.phone ? censorPhone(decrypt(user.phone)) : "",
      cpf: user.cpf ? censorCPF(decrypt(user.cpf)) : "",
      birth_date: user.birth_date
        ? censorBirthDate(decrypt(user.birth_date))
        : "",
      cep: decrypt(user.cep),
      address_street: decrypt(user.address_street),
      address_number: decrypt(user.address_number),
      address_complement: decrypt(user.address_complement),
      address_neighborhood: decrypt(user.address_neighborhood),
      address_city: decrypt(user.address_city),
      address_state: decrypt(user.address_state),
    });
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    res.status(500).json({ error: "Erro ao buscar dados do perfil" });
  }
});

// Rota para atualizar perfil
router.put("/profile", authenticateToken, async (req, res) => {
  const {
    full_name,
    phone,
    cpf,
    birth_date,
    cep,
    address_street,
    address_number,
    address_complement,
    address_neighborhood,
    address_city,
    address_state,
  } = req.body;

  try {
    await pool.query(
      `UPDATE users SET 
        full_name = ?, phone = ?, cpf = ?, birth_date = ?, cep = ?,
        address_street = ?, address_number = ?, address_complement = ?,
        address_neighborhood = ?, address_city = ?, address_state = ?
      WHERE id = ?`,
      [
        encrypt(full_name),
        encrypt(phone),
        encrypt(cpf),
        encrypt(birth_date),
        encrypt(cep),
        encrypt(address_street),
        encrypt(address_number),
        encrypt(address_complement),
        encrypt(address_neighborhood),
        encrypt(address_city),
        encrypt(address_state),
        req.user.id,
      ]
    );

    res.json({ message: "Perfil atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

// Rota icon do perfil
// Modifique o endpoint de upload para lidar melhor com erros
router.post(
  "/profile/picture",
  authenticateToken,
  (req, res, next) => {
    upload.single("profile_picture")(req, res, (err) => {
      if (err) {
        // Captura erros do Multer e passa para o middleware de erro
        return next(err);
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem foi enviada" });
      }

      // Verifique se o arquivo foi realmente enviado
      if (!req.file.path) {
        return res.status(400).json({ error: "Falha no upload do arquivo" });
      }

      // Obtenha a foto atual
      const [users] = await pool.query(
        "SELECT profile_picture FROM users WHERE id = ?",
        [req.user.id]
      );

      // Apague a foto antiga se existir
      if (users[0]?.profile_picture) {
        try {
          const oldFilePath = path.join(
            uploadDir,
            path.basename(users[0].profile_picture)
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (err) {
          console.error("Erro ao apagar imagem antiga:", err);
        }
      }

      // Atualize o banco de dados
      const picturePath = `/icons/${req.file.filename}`;
      await pool.query("UPDATE users SET profile_picture = ? WHERE id = ?", [
        picturePath,
        req.user.id,
      ]);

      res.json({
        message: "Foto de perfil atualizada com sucesso!",
        profile_picture: picturePath,
      });

    } catch (error) {
      console.error("Erro na atualização da foto:", error);
      
      // Limpe o arquivo enviado se ocorreu um erro
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Erro ao limpar upload falho:", cleanupError);
        }
      }
      
      res.status(500).json({ 
        error: "Falha ao atualizar foto de perfil",
        details: error.message 
      });
    }
  }
);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Erros do Multer (como LIMIT_FILE_SIZE)
    return res.status(400).json({
      error: err.message || 'Erro no upload do arquivo'
    });
  } else if (err.message === 'Apenas imagens são permitidas!') {
    // Nosso erro personalizado
    return res.status(400).json({
      error: err.message
    });
  }
  
  // Outros tipos de erros
  console.error(err.stack);
  res.status(500).json({ error: 'Ocorreu um erro no servidor' });
});

// Funções auxiliares para censurar dados
function censorEmail(email) {
  const [name, domain] = email.split("@");
  return `${name[0]}${"*".repeat(name.length - 2)}${name.slice(-1)}@${domain}`;
}

function censorPhone(phone) {
  return `${phone.substring(0, 2)}****-${phone.slice(-4)}`;
}

function censorCPF(cpf) {
  return `***${cpf.slice(-7, -4)}.***-**`;
}

function censorBirthDate(date) {
  const d = new Date(date);
  return `**/**/${d.getFullYear()}`;
}

function getShortName(fullName) {
  if (!fullName) return "";
  const names = fullName.split(" ");
  return names.length >= 2
    ? `${names[0]} ${names[names.length - 1]}`
    : names[0];
}

// Rota para obter dados não censurados
router.get("/profile/real", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = users[0];

    res.json({
      full_name: decrypt(user.full_name),
      phone: decrypt(user.phone),
      cpf: decrypt(user.cpf),
      birth_date: decrypt(user.birth_date),
      cep: decrypt(user.cep),
      address_street: decrypt(user.address_street),
      address_number: decrypt(user.address_number),
      address_complement: decrypt(user.address_complement),
      address_neighborhood: decrypt(user.address_neighborhood),
      address_city: decrypt(user.address_city),
      address_state: decrypt(user.address_state),
    });
  } catch (error) {
    console.error("Erro ao buscar perfil real:", error);
    res.status(500).json({ error: "Erro ao buscar dados reais do perfil" });
  }
});

// Teste de conexão
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅Index.js conectado ao MySQL com sucesso!🥳🎉");
    connection.release();
  } catch (error) {
    console.error("❌Erro de conexão❌:", error);
    process.exit(1); // Encerra o servidor se não conectar
  }
})();

module.exports = router;