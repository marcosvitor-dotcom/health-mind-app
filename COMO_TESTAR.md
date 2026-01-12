# Como Testar a Integração da API

## 🎯 Guia Rápido de Teste

### Pré-requisitos
- App instalado no seu dispositivo ou emulador
- API rodando em: `https://health-mind-api.vercel.app`
- Credenciais de teste (solicitar ao admin)

## 📝 Cenários de Teste

### 1. Teste de Login

#### Teste 1.1: Login com Credenciais Válidas
```
1. Abra o app
2. Digite email: [email cadastrado]
3. Digite senha: [senha cadastrada]
4. Clique em "Entrar"

✅ Resultado esperado:
- Loading indicator aparece
- Login bem-sucedido
- Redirecionamento para dashboard correto (Clínica/Psicólogo/Paciente)
- Token salvo no AsyncStorage
```

#### Teste 1.2: Login com Credenciais Inválidas
```
1. Abra o app
2. Digite email: usuario@invalido.com
3. Digite senha: senhaerrada
4. Clique em "Entrar"

✅ Resultado esperado:
- Erro exibido: "Erro ao fazer login"
- Usuário permanece na tela de login
```

#### Teste 1.3: Persistência de Login
```
1. Faça login com credenciais válidas
2. Feche o app completamente
3. Abra o app novamente

✅ Resultado esperado:
- App carrega diretamente no dashboard
- Não solicita login novamente
```

---

### 2. Teste de Convite de Psicólogo (Clínica)

#### Teste 2.1: Enviar Convite
```
1. Faça login como Clínica
2. Navegue para "Psicólogos"
3. Clique em "Convidar Psicólogo"
4. Preencha:
   - Email: psicologo.teste@email.com
   - Nome: Dr. Teste Silva
   - CRP: 06/999999
   - Telefone: (11) 98765-4321
   - Adicione especialidades: TCC, Ansiedade
5. Clique em "Enviar Convite"

✅ Resultado esperado:
- Loading indicator aparece
- Mensagem de sucesso exibida
- Voltar para tela anterior
- E-mail enviado para o psicólogo
```

#### Teste 2.2: Validação de Campos Obrigatórios
```
1. Navegue para "Convidar Psicólogo"
2. Deixe campos vazios
3. Clique em "Enviar Convite"

✅ Resultado esperado:
- Erro: "Preencha todos os campos obrigatórios"
```

---

### 3. Teste de Convite de Paciente (Psicólogo)

#### Teste 3.1: Enviar Convite
```
1. Faça login como Psicólogo
2. Navegue para "Pacientes"
3. Clique em "Convidar Paciente"
4. Preencha:
   - Email: paciente.teste@email.com
   - Nome: Maria Teste
   - Telefone: (11) 98765-4321
   - Data de Nascimento: 15/05/1990
5. Clique em "Enviar Convite"

✅ Resultado esperado:
- Loading indicator aparece
- Mensagem de sucesso exibida
- Voltar para tela anterior
- E-mail enviado para o paciente
```

---

### 4. Teste de Finalização de Cadastro

#### Teste 4.1: Validar Token de Convite
```
1. Abra o link de convite recebido por e-mail
   (health-mind-app://complete-registration?token=XXX)
2. App abre na tela de registro

✅ Resultado esperado:
- Loading "Validando convite..."
- Dados pré-preenchidos aparecem (nome, email)
- Tag com o tipo de usuário (Clínica/Psicólogo/Paciente)
```

#### Teste 4.2: Completar Cadastro de Psicólogo
```
1. Acesse link de convite de psicólogo
2. Preencha:
   - Senha: SenhaForte123!
   - Confirmar Senha: SenhaForte123!
   - Telefone: (11) 98765-4321
   - Biografia: "Psicólogo com experiência em TCC..."
3. Clique em "Finalizar Cadastro"

✅ Resultado esperado:
- Loading indicator aparece
- Mensagem: "Cadastro concluído! Bem-vindo!"
- Login automático
- Redirecionamento para dashboard de psicólogo
```

#### Teste 4.3: Completar Cadastro de Paciente
```
1. Acesse link de convite de paciente
2. Preencha:
   - Senha: SenhaForte123!
   - Confirmar Senha: SenhaForte123!
   - CPF: 123.456.789-00
   - Contato de Emergência:
     - Nome: Pedro Santos
     - Telefone: (11) 98765-9999
     - Relacionamento: Irmão
3. Clique em "Finalizar Cadastro"

✅ Resultado esperado:
- Loading indicator aparece
- Mensagem: "Cadastro concluído! Bem-vindo!"
- Login automático
- Redirecionamento para dashboard de paciente
```

#### Teste 4.4: Validação de Senhas
```
1. Acesse link de convite
2. Preencha:
   - Senha: senha123
   - Confirmar Senha: senha456
3. Clique em "Finalizar Cadastro"

✅ Resultado esperado:
- Erro: "As senhas não coincidem"
```

#### Teste 4.5: Token Inválido
```
1. Tente acessar com token expirado ou inválido

✅ Resultado esperado:
- Erro: "Convite inválido ou expirado"
- Voltar para tela de login
```

---

### 5. Teste de Logout

#### Teste 5.1: Logout Normal
```
1. Faça login
2. Navegue para "Perfil"
3. Clique em "Sair" (se houver botão)

✅ Resultado esperado:
- Tokens limpos do AsyncStorage
- Voltar para tela de login
```

---

### 6. Teste de Renovação de Token

#### Teste 6.1: Token Expirado
```
1. Faça login
2. Aguarde o token expirar (ou modifique manualmente para expirar)
3. Faça uma requisição qualquer (ex: carregar lista de pacientes)

✅ Resultado esperado:
- Interceptor detecta token expirado
- Tenta renovar com refreshToken
- Se sucesso: requisição é refeita automaticamente
- Se falha: logout automático
```

---

## 🐛 Problemas Comuns

### Problema: "Erro ao conectar com o servidor"
**Solução**: Verifique se a API está rodando e acessível

### Problema: Login não funciona
**Solução**:
1. Verifique credenciais
2. Veja logs no console do Metro Bundler
3. Teste a API diretamente com Postman

### Problema: Token não persiste
**Solução**:
1. Verifique se AsyncStorage está instalado
2. Veja logs de erro no console
3. Limpe cache do app

### Problema: Convite não envia e-mail
**Solução**:
1. Verifique configuração de e-mail no backend
2. Em desenvolvimento, o link aparece no console do backend
3. Use o link manualmente para testar

---

## 📊 Checklist de Testes

- [ ] Login com credenciais válidas
- [ ] Login com credenciais inválidas
- [ ] Persistência de login após fechar app
- [ ] Envio de convite de psicólogo
- [ ] Envio de convite de paciente
- [ ] Validação de token de convite
- [ ] Finalização de cadastro de psicólogo
- [ ] Finalização de cadastro de paciente
- [ ] Validação de senhas no registro
- [ ] Token inválido ou expirado
- [ ] Logout
- [ ] Renovação automática de token

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique logs no Metro Bundler
2. Verifique logs no backend
3. Consulte [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)
4. Consulte [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)

---

**Boa sorte nos testes! 🚀**
