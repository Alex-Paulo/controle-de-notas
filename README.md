Controle de Notas Fiscais

Um aplicativo web full-stack completo para registro e gerenciamento de notas fiscais. Permite que usuários se registrem, façam login e controlem suas notas com um dashboard analítico.

Você pode testar o aplicativo ao vivo aqui:
https://controle-de-notas.onrender.com

🚀 Funcionalidades Principais

Autenticação de Usuário: Sistema completo de Registro e Login seguro.

Segurança: Senhas criptografadas com bcrypt e autenticação de sessão via JSON Web Tokens (JWT).

CRUD Completo: Crie, Leia, Edite e Delete notas.

Dashboard Analítico: Veja um resumo de "Total de notas", "Valor total" e "Média por dia/mês".

Gráfico Interativo: Visualização de gastos mensais usando Chart.js.

Filtros Dinâmicos:

Busca em tempo real (por empresa, número ou observação).

Filtro por Mês (ex: "Dezembro/2025").

Exportação de Dados: Exporte a tabela de notas para um arquivo .xlsx (Excel) usando SheetJS.

Design Responsivo: Interface moderna com efeito "vidro fosco" (frosted glass) que funciona em desktops e celulares.

Banco de Dados Persistente: Os dados são salvos na nuvem e não se perdem.

🛠️ Tecnologias Utilizadas

Este projeto foi construído do zero, combinando um backend Node.js com um frontend de JavaScript puro (Vanilla JS).

Backend

Node.js

Express.js (Para o servidor e rotas da API)

PostgreSQL (pg) (Banco de dados de produção)

bcrypt (Para hashing de senhas)

jsonwebtoken (JWT) (Para autenticação)

dotenv (Para gerenciamento de variáveis de ambiente)

CORS (Para segurança da API)

Frontend

HTML5 (Estrutura semântica)

CSS3 (Layout moderno com Grid/Flexbox e design responsivo)

JavaScript (ES6+) (Toda a lógica do app, fetch para a API, manipulação do DOM)

Chart.js (Para o gráfico de barras)

SheetJS (XLSX) (Para exportação para Excel)

Deploy (Hospedagem)

API (Backend): Render

Banco de Dados (PostgreSQL): Neon

Código-fonte: GitHub

⚙️ Como Rodar Localmente

Para rodar este projeto no seu próprio computador:

Clone o repositório:

git clone [https://github.com/Alex-Paulo/controle-de-notas.git](https://github.com/Alex-Paulo/controle-de-notas.git)
cd controle-de-notas


Instale as dependências:

npm install


Crie as Variáveis de Ambiente:

Crie um arquivo chamado .env na raiz do projeto.

Você precisará de duas variáveis (pode usar o Neon para o DATABASE_URL e um gerador de senhas para o JWT_SECRET):

DATABASE_URL="postgres://usuario:senha@host/banco"
JWT_SECRET="sua-senha-secreta-muito-longa-aqui"


Inicie o servidor:

npm start


Abra seu navegador e acesse http://localhost:3000.

👨‍💻 Autor

Desenvolvido por Alex Paulo Nascimento Moreira