# Rede de Apoio à Mulher

Landing page responsiva com painel de gerenciamento de conteúdo usando HTML, CSS, JavaScript e JSON. O projeto pode ser publicado gratuitamente no GitHub Pages.

## Estrutura

```text
rede-de-apoio-mulher/
├── index.html             # Landing page pública
├── admin.html             # Painel de conteúdo
├── css/
│   ├── style.css           # Estilos da landing page
│   └── admin.css           # Estilos do painel
├── js/
│   ├── main.js             # Carrega e apresenta os dados do JSON
│   └── admin.js            # Gerencia edição, importação e exportação
└── data/
    └── conteudos.json      # Conteúdo do site
```

## Como testar no computador

O site carrega o arquivo JSON com `fetch`, então precisa ser aberto por um servidor local — não diretamente pelo endereço `file://`.

1. Abra a pasta no VS Code.
2. Inicie a extensão **Live Server** pelo arquivo `index.html`.
3. A landing page abrirá no navegador.
4. Acesse `admin.html` na mesma origem para abrir o painel administrativo.

Também é possível iniciar um servidor simples na pasta do projeto:

```bash
python -m http.server 8000
```

Depois, abra `http://localhost:8000` e `http://localhost:8000/admin.html`.

## Como atualizar o conteúdo publicado

1. Abra `admin.html`.
2. Selecione uma seção no menu lateral.
3. Adicione, edite ou remova os conteúdos e textos.
4. Clique em **Exportar JSON**. O navegador fará o download de `conteudos.json`.
5. No repositório do GitHub, substitua `data/conteudos.json` pelo arquivo exportado.
6. Faça commit das alterações. O GitHub Pages publicará o conteúdo atualizado.

O painel também permite importar um JSON. Um rascunho das alterações fica salvo no `localStorage` do navegador usado pelo administrador; isso facilita continuar a edição, mas não substitui a exportação do arquivo.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos e pastas deste projeto para a raiz do repositório.
3. No GitHub, entre em **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`, depois salve.
6. Aguarde o GitHub Pages publicar o endereço do site.

## Observações importantes

- O projeto não usa servidor nem banco de dados externo.
- O arquivo `data/conteudos.json` é público: não coloque senhas, dados pessoais ou informações privadas nele.
- O painel não possui autenticação segura. Como os dados são públicos e a publicação é feita pelo GitHub, restrinja o acesso ao repositório e não trate uma senha escrita em JavaScript como proteção real.
- As edições feitas no painel só chegam aos visitantes depois que o JSON exportado é enviado ao GitHub.
- Para testar a incorporação, use links públicos do YouTube ou Spotify. Outros formatos continuarão disponíveis como links externos.
- A tipografia Bricolage Grotesque é carregada do Google Fonts; se a fonte não estiver disponível, o site usa fontes alternativas.
