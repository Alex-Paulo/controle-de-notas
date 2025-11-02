import 'dotenv/config'; // Carrega as variáveis do .env
import express from "express";
import sqlite3 from "sqlite3";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import fs from 'fs'; // Importa o File System

const app = express();

// === Lógica de Deploy (PORTA e DB_PATH) ===
// 1. Define a porta: Usa a porta do Render (process.env.PORT) ou 3000 se estiver local
const PORTA = process.env.PORT || 3000;

// 2. Define o caminho do DB: Usa o caminho do Render (process.env.DB_PATH) ou ./database.sqlite local
const DB_PATH = process.env.DB_PATH || './database.sqlite';

// 3. Garante que o diretório do banco de dados exista (necessário para o Render)
// O Render usa '/var/data/database.sqlite'. Precisamos garantir que '/var/data' exista.
if (process.env.DB_PATH) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Diretório do banco de dados criado em: ${dir}`);
    }
}
// ==========================================

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Erro ao abrir o banco de dados:", err.message);
    } else {
        console.log(`Conectado ao banco de dados SQLite em: ${DB_PATH}`);
    }
});

// Chave secreta lida do .env
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// Caminho correto para /public
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "public")));

// Cria tabela se não existir
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS notas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    data TEXT,
    empresa TEXT,
    numero TEXT,
    valor REAL,
    observacoes TEXT
)`);

// Registrar usuário
app.post("/api/register", async (req,res)=>{
    const { username, password } = req.body;
    if(!username || !password) return res.status(400).json({error:"Preencha usuário e senha"});

    const hash = await bcrypt.hash(password,10);
    db.run("INSERT INTO users (username,password_hash) VALUES (?,?)",
        [username, hash], function(err){
            if(err) return res.status(400).json({error:"Usuário já existe"});
            
            // Verifica se JWT_SECRET foi carregado
            if (!JWT_SECRET) {
                return res.status(500).json({ error: "Erro interno do servidor: Chave secreta não configurada." });
            }
            const token = jwt.sign({id:this.lastID, username}, JWT_SECRET);
            res.json({token});
        });
});

// Login
app.post("/api/login", (req,res)=>{
    const {username, password} = req.body;
    db.get("SELECT * FROM users WHERE username=?", [username], async (err, user)=>{
        if(!user) return res.status(400).json({error:"Usuário não encontrado"});
        if(!await bcrypt.compare(password,user.password_hash)) return res.status(400).json({error:"Senha inválida"});
        
        // Verifica se JWT_SECRET foi carregado
        if (!JWT_SECRET) {
            return res.status(500).json({ error: "Erro interno do servidor: Chave secreta não configurada." });
        }
        const token = jwt.sign({id:user.id, username}, JWT_SECRET);
        res.json({token});
    });
});

// Middleware auth
function auth(req,res,next){
    const token = req.headers.authorization?.split(" ")[1];
    if(!token) return res.sendStatus(401);
    
    // Verifica se JWT_SECRET foi carregado
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
app.get("/api/notas", auth, (req,res)=>{
    db.all("SELECT * FROM notas WHERE user_id=?", [req.user.id], (err,rows)=>{
        res.json(rows);
    });
});

app.post("/api/notas", auth, (req,res)=>{
    const {data, empresa, numero, valor, observacoes} = req.body;
    db.run("INSERT INTO notas (user_id,data,empresa,numero,valor,observacoes) VALUES (?,?,?,?,?,?)",
        [req.user.id, data, empresa, numero, valor, observacoes], function(){
            res.json({id:this.lastID});
        });
});

app.delete("/api/notas/:id", auth, (req,res)=>{
    db.run("DELETE FROM notas WHERE id=? AND user_id=?", [req.params.id, req.user.id], ()=>{
        res.sendStatus(200);
    });
});

// ATUALIZAR (Update) nota
app.put("/api/notas/:id", auth, (req,res)=>{
    const {data, empresa, numero, valor, observacoes} = req.body;
    
    db.run(
        "UPDATE notas SET data=?, empresa=?, numero=?, valor=?, observacoes=? WHERE id=? AND user_id=?",
        [data, empresa, numero, valor, observacoes, req.params.id, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: "Falha ao atualizar a nota." });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: "Nota não encontrada ou não pertence ao usuário." });
            }
            res.sendStatus(200); // OK
        }
    );
});


// Start
app.listen(PORTA, ()=> console.log(`Servidor rodando em http://localhost:${PORTA}`));

