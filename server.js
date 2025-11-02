import 'dotenv/config'; // Carrega as variáveis do .env
import express from "express";
import sqlite3 from "sqlite3";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// === MODIFICAÇÃO 1: Caminho do Banco de Dados ===
// Vamos ler o caminho do .env, ou usar o local como padrão
const DB_PATH = process.env.DB_PATH || "./database.sqlite";
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Erro ao abrir o banco de dados:", err.message);
    } else {
        console.log("Conectado ao banco de dados SQLite em:", DB_PATH);
    }
});
// ===============================================

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
        const token = jwt.sign({id:user.id, username}, JWT_SECRET);
        res.json({token});
    });
});

// Middleware auth
function auth(req,res,next){
    const token = req.headers.authorization?.split(" ")[1];
    if(!token) return res.sendStatus(401);
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


// === MODIFICAÇÃO 2: Porta Dinâmica ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Servidor rodando em http://localhost:${PORT}`));
