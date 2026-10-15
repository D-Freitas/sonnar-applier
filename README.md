# Sonner Applier

Extensão Chrome em TypeScript com WXT. Ao abrir o popup na aba ativa do Indeed, a extensão clica em “Mostrar mais vagas” até a lista parar de crescer e exibe os resultados em uma interface dark monospace.

## Desenvolvimento

```sh
npm install
npm run dev
```

Para gerar a extensão de produção:

```sh
npm run build
```

Carregue a pasta `.output/chrome-mv3` em `chrome://extensions` com o modo do desenvolvedor ativo.

## Organização do código

O código segue uma separação em camadas:

- `src/domain`: tipos e entidades do problema, sem dependências do Chrome.
- `src/application`: casos de uso e contratos (ports) usados pela aplicação.
- `src/infrastructure`: integração com APIs do Chrome e extração do DOM do Indeed.
- `entrypoints`: composição das dependências e interface do side panel.

Os casos de uso são classes com dependências injetadas por interfaces. A função que lê a página Indeed permanece autocontida, pois o Chrome serializa a função ao executá-la na aba.

O resultado inclui título, empresa e link de cada vaga, além do primeiro link de candidatura encontrado na página. A extração usa o conteúdo renderizado da aba ativa e não envia dados a um servidor.
