# Avisos de terceiros — BetStats

Este arquivo registra o código e os componentes de terceiros presentes no conteúdo
deste repositório candidato, com as licenças correspondentes.

**Estado:** conjunto candidato com exportação inicial de 57 arquivos (o repositório
recebeu depois `README.md` e um workflow de CI, de outro escopo), Git local **sem
commit**, sem remoto. Não há arquivo `LICENSE` do projeto: este repositório **não
concede direitos** sobre o código próprio.

**Data de corte: 2026-11-15.**

Limites deste inventário: as licenças das dependências diretas foram lidas dos pacotes
instalados e conferidas contra o `package-lock.json`; as transitivas foram verificadas
por amostragem, não de forma exaustiva. Este arquivo registra o que foi identificado e
**não** comprova que não existam outros trechos de terceiros no projeto, nem que um
artefato de build seja conforme. Avisos de build — fontes embutidas, binários nativos,
dados de compatibilidade — dependem de inspeção do artefato, que **não foi feita**.

---

## 1. shadcn/ui (MIT)

Os sete primitivos abaixo foram obtidos a partir dos componentes do shadcn/ui e
adaptados ao tema do projeto:

- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/sheet.tsx`

O mesmo aviso cobre os tokens de tema derivados da convenção do shadcn/ui:

- `src/app/globals.css` (variáveis CSS `--background`, `--foreground`, `--card`,
  `--primary`, `--muted`, `--accent`, `--border`, `--ring`, entre outras)
- `tailwind.config.ts` (mapeamento dessas variáveis para as cores do Tailwind)

Fonte da licença: <https://github.com/shadcn-ui/ui/blob/main/LICENSE.md>
(arquivo `LICENSE.md` do repositório `shadcn-ui/ui`, consultado em novembro de 2026).

Texto integral da licença:

```
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Observação de escopo: o shadcn/ui é distribuído como código-fonte copiável, não como
dependência instalada. Não há pacote `shadcn` em `package.json`; por isso o aviso
acima é o registro aplicável a esses arquivos. A identificação destes sete arquivos
não implica que sejam a única origem externa presente no projeto.

---

## 2. Fonte tipográfica Inter (SIL OFL 1.1)

A fonte Inter é carregada em tempo de build por `next/font/google`
(`src/app/layout.tsx`, `const inter = Inter({ subsets: ["latin"] })`).

- Nenhum arquivo de fonte está versionado neste repositório.
- Licença: SIL Open Font License 1.1.
- Copyright: `Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)`.
- Fonte: <https://github.com/rsms/inter/blob/master/LICENSE.txt>.

O `next/font` pode baixar e incorporar os arquivos da fonte ao artefato de build. Se
isso ocorrer, o item 2 das condições da OFL exige que o aviso de copyright e o texto
da licença acompanhem o artefato distribuído. **O artefato não foi inspecionado**, e
não se afirma se a fonte está ou não embutida.

Decisão de escopo: o texto integral da OFL 1.1 não é reproduzido aqui porque nenhum
arquivo de fonte está neste repositório. Antes de distribuir qualquer build que embuta
a fonte, inclua o texto integral disponível no link acima junto do artefato.

---

## 3. Dependências diretas declaradas

Licenças lidas de `node_modules/<pacote>/package.json` (campo `license`) na árvore
instalada local. As versões são as resolvidas pelo `package-lock.json`; as faixas em
`package.json` são mais amplas.

### Runtime (`dependencies`)

| Pacote | Versão instalada | Licença |
| --- | --- | --- |
| `@prisma/client` | 6.19.3 | Apache-2.0 |
| `@radix-ui/react-dialog` | 1.3.1 | MIT |
| `@radix-ui/react-dropdown-menu` | 2.2.1 | MIT |
| `@radix-ui/react-popover` | 1.3.1 | MIT |
| `@radix-ui/react-progress` | 1.2.1 | MIT |
| `@radix-ui/react-select` | 2.4.1 | MIT |
| `@radix-ui/react-slot` | 1.5.0 | MIT |
| `@radix-ui/react-tabs` | 1.2.1 | MIT |
| `@radix-ui/react-tooltip` | 1.4.1 | MIT |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `clsx` | 2.1.1 | MIT |
| `date-fns` | 4.4.0 | MIT |
| `lucide-react` | 0.475.0 | ISC |
| `next` | 15.5.28 | MIT |
| `next-themes` | 0.4.6 | MIT |
| `react` | 19.3.1 | MIT |
| `react-dom` | 19.3.1 | MIT |
| `recharts` | 2.15.4 | MIT |
| `tailwind-merge` | 3.7.0 | MIT |

### Desenvolvimento (`devDependencies`)

| Pacote | Versão instalada | Licença |
| --- | --- | --- |
| `@types/node` | 22.20.5 | MIT |
| `@types/react` | 19.3.0 | MIT |
| `@types/react-dom` | 19.3.0 | MIT |
| `autoprefixer` | 10.6.1 | MIT |
| `eslint` | 9.39.5 | MIT |
| `eslint-config-next` | 15.5.28 | MIT |
| `postcss` | 8.5.31 | MIT |
| `prisma` | 6.19.3 | Apache-2.0 |
| `tailwindcss` | 3.4.19 | MIT |
| `typescript` | 5.9.3 | Apache-2.0 |

Nenhum desses pacotes é copiado para o repositório; todos vêm de `node_modules`,
que não está versionado. Os textos integrais das licenças MIT, Apache-2.0 e ISC não
são reproduzidos aqui; cada pacote os traz no próprio diretório após `npm install`.

---

## 4. Dependências transitivas — limites desta cobertura

O `package-lock.json` registra 537 pacotes além da raiz. A verificação de licenças
foi feita por amostragem nos pacotes instalados, não exaustivamente nos 537.

As famílias abaixo foram lidas no `package-lock.json`, que é a fonte desta seção.
Nem todas saem do grupo MIT/Apache-2.0/ISC; as do grupo aparecem porque são
dependências opcionais do `sharp` e precisam ser distinguidas por plataforma:

| Pacote | Licença | Papel observado |
| --- | --- | --- |
| `sharp` 0.35.5 | Apache-2.0 (dentro do grupo) | dependência opcional de otimização de imagem no runtime do Next |
| `@img/sharp-{darwin,freebsd,linux,linuxmusl,webcontainers}-*` — 12 pacotes, v0.35.5 | Apache-2.0 (dentro do grupo) | binários por plataforma do `sharp` |
| `@img/sharp-libvips-*` — 10 pacotes, v1.3.4 | LGPL-3.0-or-later | bibliotecas nativas por plataforma |
| `@img/sharp-win32-*` — 3 pacotes, v0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | binários nativos do Windows |
| `@img/sharp-wasm32` — 1 pacote, v0.35.5 | Apache-2.0 AND LGPL-3.0-or-later AND MIT | build WebAssembly |
| `caniuse-lite` 1.0.30001816 | CC-BY-4.0 | dados de compatibilidade, usados no build |
| `axe-core` 4.14 | MPL-2.0 | dependência de desenvolvimento (lint) |
| `argparse` 2.0.1 | Python-2.0 | dependência de desenvolvimento |
| `minimatch` 10.2.6 | BlueOak-1.0.0 | dependência de desenvolvimento |
| `language-subtag-registry` 0.3.23 | CC0-1.0 | dados de tags de idioma |

O que isso significa na prática, sem presumir conformidade:

- Nada disso está versionado no repositório. Obrigações de redistribuição precisam ser
  avaliadas **se** um artefato de build ou uma imagem de contêiner for distribuído.
- `sharp` e as famílias `@img/sharp-*` são dependências opcionais do Next. A
  instalação e a inclusão delas em um artefato distribuído **não foram verificadas**;
  se um artefato as incluir, a LGPL do `libvips` passa a exigir aviso e acesso ao
  código-fonte da biblioteca, o que ainda não está preparado.
- `caniuse-lite` (CC-BY-4.0) é usada nos dados de build do Tailwind/Next; se o
  artefato distribuído a contiver, a atribuição CC-BY é exigida.
- `axe-core` (MPL-2.0), `argparse`, `minimatch` e `language-subtag-registry` têm papel
  de desenvolvimento. A inclusão deles no artefato de produção **não foi verificada**
  e depende de como o build é empacotado.

Este documento não afirma conformidade integral de licenças para distribuição. Antes
de publicar qualquer build, imagem ou pacote, é necessário gerar um inventário
completo das 537 entradas do lock e dos arquivos realmente empacotados.

---

## 5. Itens não cobertos aqui

- Licença do próprio projeto: **não definida**; nenhum direito é concedido.
- Marcas, nomes, identidade visual e dados sensíveis do histórico antigo: ver
  `PROVENANCE.md`.
- Conteúdo que ficou fora da exportação — documentação de engenharia reversa,
  `README.md` do projeto original, seed, banco local, `.env`, perfis de navegador,
  caches e `graphify-out/`: fora do versionamento, portanto fora do escopo.
