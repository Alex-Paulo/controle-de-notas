import 'dotenv/config'; // Carrega as variáveis do .env
import express from "express";
// Removido: import sqlite3 from "sqlite3";
import { Pool } from 'pg'; // NOVO: Importa o Pool do PostgreSQL
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// === Lógica de Deploy (PORTA e DATABASE_URL) ===
const PORTA = process.env.PORT || 3000;

// O Render fornece a URL de conexão completa do PostgreSQL via DATABASE_URL
// Se a variável não existir (rodando localmente), ele usará uma URL de teste (que falhará)
const DATABASE_URL = process.env.DATABASE_URL;

// NOVO: Configuração do Pool de Conexões do PostgreSQL
const db = new Pool({
    connectionString: DATABASE_URL,
    // Adiciona SSL/TLS para conexões seguras (obrigatório em muitos hosts como Render/ElephantSQL)
    ssl: {
        rejectUnauthorized: false 
    }
});

// Testa a conexão e cria as tabelas
db.connect(async (err, client, done) => {
    if (err) {
        console.error("Erro ao conectar ao PostgreSQL. Verifique DATABASE_URL e SSL:", err.message);
        return;
    }
    console.log(`Conectado ao banco de dados PostgreSQL em: ${DATABASE_URL}`);

    try {
        // Cria tabela users (Com SERIAL PRIMARY KEY para auto-incremento no PG)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password_hash TEXT
            )
        `);

        // Cria tabela notas
        await client.query(`
            CREATE TABLE IF NOT EXISTS notas (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                data TEXT,
                empresa TEXT,
                numero TEXT,
                valor REAL,
                observacoes TEXT
            )
        `);
        console.log("Tabelas verificadas/criadas no PostgreSQL.");
    } catch (e) {
        console.error("Erro ao criar tabelas no PostgreSQL:", e.message);
    } finally {
        done(); // Libera o cliente de volta para o Pool
    }
});
// ==========================================

const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Caminho correto para /public
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "public")));


// Registrar usuário
app.post("/api/register", async (req,res)=>{
    const { username, password } = req.body;
    if(!username || !password) return res.status(400).json({error:"Preencha usuário e senha"});

    const hash = await bcrypt.hash(password,10);
    
    try {
        // Insere o usuário
        const result = await db.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id",
            [username, hash]
        );
        const userId = result.rows[0].id;
        
        if (!JWT_SECRET) {
            return res.status(500).json({ error: "Erro interno do servidor: Chave secreta não configurada." });
        }
        const token = jwt.sign({id: userId, username}, JWT_SECRET);
        res.json({token});
    } catch (err) {
        if (err.code === '23505') { // Código de erro de violação de chave única (usuário já existe)
            return res.status(400).json({error:"Usuário já existe"});
        }
        console.error('Erro de registro no PostgreSQL:', err.message);
        res.status(500).json({error: "Erro no servidor ao registrar."});
    }
});

// Login
app.post("/api/login", async (req,res)=>{
    const {username, password} = req.body;
    
    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];

        if(!user) return res.status(400).json({error:"Usuário não encontrado"});
        if(!await bcrypt.compare(password, user.password_hash)) return res.status(400).json({error:"Senha inválida"});
        
        if (!JWT_SECRET) {
            return res.status(500).json({ error: "Erro interno do servidor: Chave secreta não configurada." });
        }
        const token = jwt.sign({id: user.id, username}, JWT_SECRET);
        res.json({token});
    } catch (err) {
        console.error('Erro de login no PostgreSQL:', err.message);
        res.status(500).json({error: "Erro no servidor ao fazer login."});
    }
});

// Middleware auth
function auth(req,res,next){
    const token = req.headers.authorization?.split(" ")[1];
    if(!token) return res.sendStatus(401);
    
    if (!JWT_SECRET) {
        return res.status(500).json({ error: "Erro interno do servidor: Chave secreta não configurada." });
    }
    try{
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    }catch{
        res.sendStatus(403);
    }
}

// CRUD notas
app.get("/api/notas", auth, async (req,res)=>{
    try {
        const result = await db.query("SELECT * FROM notas WHERE user_id = $1 ORDER BY data DESC", [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar notas:', err.message);
        res.status(500).json({error: "Erro no servidor ao buscar notas."});
    }
});

app.post("/api/notas", auth, async (req,res)=>{
    const {data, empresa, numero, valor, observacoes} = req.body;
    
    try {
        const result = await db.query(
            "INSERT INTO notas (user_id, data, empresa, numero, valor, observacoes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [req.user.id, data, empresa, numero, valor, observacoes]
        );
        res.json({id: result.rows[0].id});
    } catch (err) {
        console.error('Erro ao inserir nota:', err.message);
        res.status(500).json({error: "Erro no servidor ao inserir nota."});
    }
});

app.delete("/api/notas/:id", auth, async (req,res)=>{
    try {
        // Garante que o usuário só delete as próprias notas
        await db.query("DELETE FROM notas WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
        res.sendStatus(200);
    } catch (err) {
        console.error('Erro ao deletar nota:', err.message);
        res.status(500).json({error: "Erro no servidor ao deletar nota."});
    }
});

// ATUALIZAR (Update) nota
app.put("/api/notas/:id", auth, async (req,res)=>{
    const {data, empresa, numero, valor, observacoes} = req.body;
    
    try {
        const result = await db.query(
            "UPDATE notas SET data=$1, empresa=$2, numero=$3, valor=$4, observacoes=$5 WHERE id=$6 AND user_id=$7",
            [data, empresa, numero, valor, observacoes, req.params.id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Nota não encontrada ou não pertence ao usuário." });
        }
        res.sendStatus(200); // OK
    } catch (err) {
        console.error('Erro ao atualizar nota:', err.message);
        res.status(500).json({error: "Erro no servidor ao atualizar nota."});
    }
});


// Start
app.listen(PORTA, ()=> console.log(`Servidor rodando em http://localhost:${PORTA}`));
