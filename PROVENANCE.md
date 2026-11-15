# Proveniência declarada — BetStats

Registro da proveniência do conteúdo deste repositório candidato: o que é declarado
como autoral, o que foi reutilizado de terceiros, o que é derivado de análise de um
produto externo e o que permanece desconhecido.

**Natureza deste documento:** proveniência **declarada**, não verificada de forma
independente. Ele registra declarações e observações; não comprova autoria, não
comprova autorização e não é parecer jurídico.

**Estado:** conjunto candidato montado a partir de uma exportação inicial de 57
arquivos, em repositório Git local **sem nenhum commit**, sem remoto e sem
publicação. Depois da exportação, o conjunto recebeu `README.md` e um workflow de CI,
de outro escopo. É um **root novo**, montado por exportação explícita; não é o
histórico anterior higienizado. O projeto original e o histórico antigo ficam
preservados à parte e não fazem parte deste conteúdo.

**Data de corte: 2026-11-15.** Refere-se ao estado do conjunto exportado nessa data;
alterações posteriores não estão refletidas aqui.

---

## 1. Como este conjunto foi formado

- Os arquivos foram copiados por lista explícita do diretório do projeto, sem
  `.git`, sem `node_modules` e sem arquivos ignorados. A exportação inicial tinha 57
  arquivos; `README.md` e o workflow de CI foram acrescentados depois, por outro
  escopo.
- Ficaram de fora, de forma deliberada: a documentação de engenharia reversa, o
  `README.md` do projeto original, o seed com dados de exemplo, o banco local, o
  `.env`, perfis de navegador, caches de build, `graphify-out/` e scripts auxiliares.
- Este repositório não tem histórico anterior, tags ou remoto. Ainda não há commit.

## 2. Proveniência declarada da implementação

Resumo impessoal do que foi declarado sobre a origem do código:

> Não foi identificado código-fonte original do SharkTrack no candidato. A
> proveniência da implementação foi declarada como inspiração visual/funcional;
> nenhuma autorização de terceiros está documentada e essa origem não foi verificada
> independentemente.

Limites dessa declaração:

- Ela registra uma afirmação sobre a origem, não uma comprovação.
- Não cria autorização, licença ou permissão de uso.
- Não substitui a origem observada na seção 3, que permanece registrada.

## 3. Origem observada na análise do produto

A documentação interna do projeto, não versionada neste repositório, registra que a
implementação foi derivada de análise funcional do produto original, com levantamento
de telas, fluxos e contratos. O detalhamento operacional dessa análise não é
reproduzido aqui e não faz parte deste conjunto.

Incerteza relevante, sem conclusão jurídica:

- Não é possível afirmar nem negar, com o material disponível, que a implementação
  reproduza expressão protegida do produto original. Não há fonte original para
  comparação.
- A extensão do uso do produto em execução na fase de análise não foi verificada
  independentemente.
- Não há autorização de terceiros documentada.

Classificação aplicada, sem afirmar violação: **sem cópia direta comprovada**, com
incertezas registradas acima. Nenhuma cópia de código, asset ou expressão protegida
foi comprovada; originalidade independente também não foi demonstrada.

## 4. Neutralização pontual já aplicada neste conjunto

Dois pontos de conteúdo impróprio foram neutralizados antes da exportação:

1. Em `src/components/layout/topbar.tsx`, um valor financeiro específico apresentado
   como saldo de banca foi substituído por texto genérico.
2. Em `prisma/schema.prisma`, um comentário com nome descritivo de banca real foi
   substituído por comentário neutro.

Os valores originais não são reproduzidos aqui. Eles permanecem no histórico antigo,
preservado separadamente e fora deste repositório; este conjunto não os contém.

## 5. Material de terceiros reutilizado

| Origem | O que foi usado | Licença | Obrigação |
| --- | --- | --- | --- |
| shadcn/ui | 7 primitivos em `src/components/ui/` e tokens de tema | MIT | incluir aviso de copyright — feito em `THIRD_PARTY_NOTICES.md` |
| Inter (next/font/google) | fonte baixada em tempo de build | SIL OFL 1.1 | aviso acompanha a fonte quando redistribuída; nada versionado aqui |
| Dependências npm | 29 diretas, 537 no lock | MIT/Apache-2.0/ISC e outras | ver `THIRD_PARTY_NOTICES.md`, seção 4 |

## 6. Impedimentos concretos à publicação

Verificação dirigida a elementos protegidos — expressão, textos e imagens:

- **Imagens e logotipos:** nenhum asset de imagem, ícone ou logotipo está versionado.
  O símbolo da interface é uma inicial "B" em CSS, criada no próprio componente. Não
  há material gráfico de terceiros a substituir.
- **Textos:** os rótulos e mensagens são termos funcionais e genéricos de interface
  ("banca", "saldo", "apostas", "análise"). Nenhum texto identificado como cópia
  literal de material protegido. Não há trecho a substituir por decisão técnica.
- **Contatos e marcas de terceiros:** não há e-mail, handle ou nome de marca do
  produto original em texto visível ao usuário. Em `tailwind.config.ts` permanece o
  identificador interno `shark` (linha 54), token de paleta que não aparece na
  interface; o comentário da linha 53, que citava a marca do produto original, foi
  substituído por texto neutro nesta versão.

Conclusão factual, sem conclusão jurídica: **nenhum item concreto de expressão, texto
ou imagem permanece para remoção** neste conjunto, após a neutralização do comentário
de `tailwind.config.ts:53`. Permanecem as incertezas da seção 7 e a política geral de
não conceder licença enquanto a origem não estiver demonstrada. Nada aqui afirma que a
publicação esteja livre de questionamento de terceiros.

Fora do escopo de direitos, e registrado para não ser confundido com ele: a rota
`/api/internal/me` consulta o primeiro usuário do banco sem autenticação e devolve
dados de perfil. É risco funcional pré-existente, de implantação, não de publicação
de código-fonte.

## 7. Desconhecidos explícitos

1. Autoria: declarada, não comprovada por histórico ou documento.
2. Autorização do titular do produto original: **não documentada**.
3. Termos de uso do serviço original: não lidos; não se sabe se a obtenção de
   informação desse serviço e a reprodução da interface são permitidas.
4. Extensão do uso do produto em execução na fase de análise: não verificada.
5. Licença do projeto: **indefinida**; não há arquivo `LICENSE` e não há concessão de
   direitos neste repositório.
6. Existência de outros trechos de origem externa além dos documentados na seção 5.
7. Conteúdo efetivo de um artefato de build: não inspecionado.

## 8. Literais de marca antiga

- Os literais da marca anterior existem no histórico antigo, preservado à parte; não
  estão neste conjunto. O único comentário que citava a marca do produto original, em
  `tailwind.config.ts:53`, foi substituído por texto neutro. A chave `shark` da linha 54
  é token técnico interno de paleta, sem marca visível, e permanece.
- O histórico antigo não foi reescrito: este conjunto é um root novo, e o histórico
  antigo continua intacto onde está guardado.

## 9. Antes de publicar ou distribuir

- Decidir a licença do projeto. Recomendação: **não criar LICENSE** e registrar que
  nenhuma licença é concedida, sem afirmar titularidade que não está comprovada.
- Se o projeto for publicado, avaliar termos de uso do produto original e a
  possibilidade de obter autorização do titular.
- Não usar este código com dados reais enquanto a rota citada na seção 6 não tiver
  autenticação.
- Qualquer artefato de build distribuído precisa de aviso próprio para as fontes e
  bibliotecas embutidas.
