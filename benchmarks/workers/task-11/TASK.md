# Refatorar formulário legado

Refatore o cadastro legado preservando Nome e E-mail, validação nativa e envio único de JSON {name,email} para POST /api/legacy-profile. Nome é obrigatório. E-mail inválido impede envio e recebe foco. Após sucesso anuncie Perfil salvo sem perder os valores informados.

Use o contrato INTEIRO em /__inteiro__/composition.css. Preserve os nomes acessíveis e data-testid publicados. Suporte teclado, target 44px, reduced motion, RTL e as quatro variações de tema. Implemente somente os arquivos de src, sem alterar controles, testes ou baselines. Os dados de fixtures são sintéticos.
