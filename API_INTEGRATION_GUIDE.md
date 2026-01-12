# Guia de Integração da API - Health Mind App

## 🎉 Integração Completa

A integração com a API `https://health-mind-api.vercel.app` foi implementada com sucesso!

## 📋 O Que Foi Implementado

### 1. **Serviços de API**

- ✅ **`src/services/api.ts`** - Cliente Axios configurado com interceptors
  - Adiciona automaticamente o token Bearer em todas as requisições
  - Renovação automática de tokens quando expiram
  - Tratamento centralizado de erros

- ✅ **`src/services/authService.ts`** - Serviços de autenticação completos
  - `login()` - Login de usuário
  - `logout()` - Logout de usuário
  - `getMe()` - Buscar dados do usuário logado
  - `inviteClinic()` - Convidar clínica (Admin)
  - `invitePsychologist()` - Convidar psicólogo (Clínica)
  - `invitePatient()` - Convidar paciente (Psicólogo/Clínica)
  - `validateInvitationToken()` - Validar token de convite
  - `listInvitations()` - Listar convites enviados
  - `resendInvitation()` - Reenviar convite
  - `cancelInvitation()` - Cancelar convite
  - `completeClinicRegistration()` - Finalizar cadastro de clínica
  - `completePsychologistRegistration()` - Finalizar cadastro de psicólogo
  - `completePatientRegistration()` - Finalizar cadastro de paciente

### 2. **Gerenciamento de Estado**

- ✅ **`src/contexts/AuthContext.tsx`** - Context atualizado
  - Integração completa com a API real
  - Carregamento automático de usuário do AsyncStorage ao iniciar
  - Verificação automática de token válido
  - Função `refreshUserData()` para atualizar dados do usuário

- ✅ **`src/utils/storage.ts`** - Utilitários de armazenamento
  - Gerenciamento de tokens (token e refreshToken)
  - Persistência de dados do usuário
  - Funções de limpeza de dados

### 3. **Telas de Autenticação**

- ✅ **`src/screens/auth/LoginScreen.tsx`** - Tela de login atualizada
  - Removido seletor de role (role vem da API)
  - Integração com API real
  - Tratamento de erros aprimorado

- ✅ **`src/screens/auth/CompleteRegistrationScreen.tsx`** - Nova tela
  - Validação de token de convite
  - Formulários dinâmicos baseados no tipo de usuário
  - Campos específicos para clínica, psicólogo e paciente
  - Finalização de cadastro com salvamento automático

### 4. **Telas de Convites**

- ✅ **`src/screens/clinic/InvitePsychologistScreen.tsx`**
  - Formulário para convidar psicólogos
  - Gerenciamento de especialidades
  - Envio de convite via API

- ✅ **`src/screens/psychologist/InvitePatientScreen.tsx`**
  - Formulário para convidar pacientes
  - Máscara de data de nascimento
  - Envio de convite via API

### 5. **Navegação Atualizada**

- ✅ **`src/navigation/AppNavigator.tsx`**
  - Suporte à tela de registro por convite
  - Loading state durante verificação de autenticação
  - Suporte para role 'patient' (convertido para 'client' no frontend)

- ✅ **`src/navigation/ClinicNavigator.tsx`**
  - Rota para tela de convite de psicólogo

- ✅ **`src/navigation/PsychologistNavigator.tsx`**
  - Rota para tela de convite de paciente

### 6. **Types & Interfaces**

- ✅ **`src/types/index.ts`** - Tipos atualizados
  - Interfaces de requisição e resposta da API
  - Tipos de convite (InvitationData, Invitation, etc.)
  - Tipos de requisição de registro completo
  - User interface expandida com campos da API

## 🚀 Como Usar

### 1. **Login**

```typescript
import { useAuth } from '../contexts/AuthContext';

function LoginScreen() {
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login('email@example.com', 'senha123');
      // Login bem-sucedido - navegação automática
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };
}
```

### 2. **Convidar Psicólogo (Clínica)**

```typescript
import * as authService from '../../services/authService';

const handleInvite = async () => {
  try {
    await authService.invitePsychologist({
      email: 'psicologo@email.com',
      name: 'Dr. João Silva',
      crp: '06/123456',
      specialties: ['TCC', 'Ansiedade'],
      phone: '(11) 98765-4321',
    });
    Alert.alert('Sucesso', 'Convite enviado!');
  } catch (error) {
    Alert.alert('Erro', error.message);
  }
};
```

### 3. **Convidar Paciente (Psicólogo)**

```typescript
import * as authService from '../../services/authService';

const handleInvite = async () => {
  try {
    await authService.invitePatient({
      email: 'paciente@email.com',
      name: 'Maria Santos',
      phone: '(11) 98765-4321',
      birthDate: '1990-05-15',
    });
    Alert.alert('Sucesso', 'Convite enviado!');
  } catch (error) {
    Alert.alert('Erro', error.message);
  }
};
```

### 4. **Finalizar Cadastro (via link de convite)**

O usuário recebe um e-mail com link:
```
health-mind-app://complete-registration?token={TOKEN}
```

O app automaticamente:
1. Valida o token
2. Mostra dados pré-preenchidos
3. Solicita senha e dados adicionais
4. Finaliza o cadastro
5. Faz login automático

### 5. **Listar Convites Enviados**

```typescript
import * as authService from '../../services/authService';

const loadInvitations = async () => {
  try {
    const invitations = await authService.listInvitations('pending', 'psychologist');
    setInvitations(invitations);
  } catch (error) {
    Alert.alert('Erro', error.message);
  }
};
```

### 6. **Logout**

```typescript
import { useAuth } from '../contexts/AuthContext';

function ProfileScreen() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Navegação automática para login
  };
}
```

## 🔐 Segurança

### Tokens
- **Token**: Expira em 1 dia
- **RefreshToken**: Expira em 7 dias
- Renovação automática via interceptor

### Armazenamento
- Tokens salvos no AsyncStorage de forma segura
- Limpeza automática ao fazer logout
- Verificação de token ao iniciar o app

## 🎯 Fluxo Completo

### Fluxo 1: Login Normal
```
1. Usuário abre o app
2. Tela de login
3. Digita email e senha
4. Login via API
5. Tokens salvos
6. Redirecionamento para dashboard baseado em role
```

### Fluxo 2: Cadastro por Convite
```
1. Admin/Clínica/Psicólogo envia convite
2. Convidado recebe e-mail
3. Clica no link
4. App abre tela de registro
5. Valida token
6. Mostra dados pré-preenchidos
7. Solicita senha e dados extras
8. Finaliza cadastro
9. Login automático
10. Redirecionamento para dashboard
```

### Fluxo 3: Renovação de Token
```
1. Usuário faz requisição
2. Token expirou (401)
3. Interceptor detecta
4. Tenta renovar com refreshToken
5. Se sucesso: refaz requisição original
6. Se falha: logout automático
```

## 📱 Telas Disponíveis

### Públicas (Não Autenticadas)
- ✅ LoginScreen
- ✅ CompleteRegistrationScreen

### Clínica
- ✅ OverviewScreen
- ✅ PsychologistsScreen
- ✅ InvitePsychologistScreen (Nova!)
- ✅ ScheduleScreen
- ✅ ProfileScreen

### Psicólogo
- ✅ ClientsScreen
- ✅ InvitePatientScreen (Nova!)
- ✅ PsychScheduleScreen
- ✅ DocumentsScreen
- ✅ ReportsScreen
- ✅ ProfileScreen

### Paciente/Cliente
- ✅ ChatScreen
- ✅ AppointmentsScreen
- ✅ EmergencyScreen
- ✅ ProfileScreen

## 🛠️ Próximos Passos

Para adicionar funcionalidades específicas, você pode usar os serviços existentes como base:

1. **Criar novos serviços de API**:
   ```typescript
   // src/services/patientService.ts
   import api from './api';

   export const getPatients = async () => {
     const { data } = await api.get('/psychologists/:id/patients');
     return data;
   };
   ```

2. **Adicionar telas de listagem de convites**:
   - Criar `InvitationsListScreen.tsx`
   - Mostrar convites pendentes, aceitos e expirados
   - Opções de reenviar e cancelar

3. **Implementar deep linking**:
   - Configurar deep links no app.json
   - Capturar parâmetros de URL
   - Navegar automaticamente para CompleteRegistrationScreen

## 🐛 Troubleshooting

### Token não está sendo enviado
- Verifique se o token está salvo: `await getToken()`
- Verifique os headers da requisição no console

### Login não funciona
- Verifique se a URL da API está correta
- Verifique credenciais no backend
- Veja logs de erro no console

### Refresh token falha
- Token pode ter expirado (> 7 dias)
- Usuário precisa fazer login novamente
- Verifique se o refreshToken está salvo

## 📚 Referências

- Documentação da API: [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)
- Sistema de Convites: [INVITATION_SYSTEM_GUIDE.md](INVITATION_SYSTEM_GUIDE.md)
- API Base: `https://health-mind-api.vercel.app/api`

## ✅ Checklist de Implementação

- [x] Serviço de API com Axios
- [x] Interceptors de request/response
- [x] Serviços de autenticação
- [x] AuthContext integrado com API
- [x] Armazenamento persistente (AsyncStorage)
- [x] Tela de login atualizada
- [x] Tela de registro por convite
- [x] Telas de envio de convites
- [x] Navegação atualizada
- [x] Types e interfaces da API
- [ ] Deep linking configurado (próximo passo)
- [ ] Tela de lista de convites (próximo passo)
- [ ] Outras CRUDs (pacientes, psicólogos, etc) (próximo passo)

---

**Desenvolvido com ❤️ para Health Mind App**
