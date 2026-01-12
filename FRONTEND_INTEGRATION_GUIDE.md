# Guia de Integração Frontend - Health Mind API

## Base URL
```
Development: http://localhost:5000/api
Production: https://seu-dominio.vercel.app/api
```

---

## 🔐 Autenticação

### Fluxo de Autenticação
1. O usuário faz login ou registro via convite
2. A API retorna `token` (JWT) e `refreshToken`
3. O front-end armazena ambos (localStorage/sessionStorage)
4. Todas as requisições autenticadas devem incluir o header:
   ```
   Authorization: Bearer {token}
   ```
5. Quando o token expirar, use o refreshToken para renovar

---

## 🎯 **NOVO**: Sistema de Convites e Pré-Cadastro

### Visão Geral

O sistema de cadastro funciona em **duas etapas**:

1. **Pré-cadastro**: Admin/Clínica/Psicólogo envia um convite com dados básicos
2. **Finalização**: O convidado recebe um e-mail e completa o cadastro

### Fluxos de Cadastro

```
Admin → Convida Clínica
  ↓ E-mail com link único
Clínica → Completa cadastro → Pode convidar Psicólogos
  ↓ E-mail com link único
Psicólogo → Completa cadastro → Pode convidar Pacientes
  ↓ E-mail com link único
Paciente → Completa cadastro
```

**📖 Documentação completa**: Ver [INVITATION_SYSTEM_GUIDE.md](INVITATION_SYSTEM_GUIDE.md)

---

## 📨 Rotas de Convites

### 1. [ADMIN] Convidar Clínica
**POST** `/invitations/clinic`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body:**
```json
{
  "email": "clinica@example.com",
  "name": "Clínica Saúde Mental",
  "cnpj": "12.345.678/0001-90"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Convite enviado com sucesso",
  "data": {
    "invitation": {
      "id": "65abc123...",
      "email": "clinica@example.com",
      "role": "clinic",
      "status": "pending",
      "expiresAt": "2024-01-16T...",
      "invitationUrl": "http://localhost:3000/auth/complete-registration/abc123..."
    }
  }
}
```

---

### 2. [CLINIC] Convidar Psicólogo
**POST** `/invitations/psychologist`

**Headers:**
```
Authorization: Bearer {clinic_token}
Content-Type: application/json
```

**Body:**
```json
{
  "email": "psicologo@example.com",
  "name": "Dr. João Silva",
  "crp": "06/123456",
  "specialties": ["TCC", "Ansiedade"],
  "phone": "(11) 98765-4321"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Convite enviado com sucesso",
  "data": {
    "invitation": {
      "id": "65def456...",
      "email": "psicologo@example.com",
      "role": "psychologist",
      "status": "pending",
      "expiresAt": "2024-01-16T...",
      "invitationUrl": "http://localhost:3000/auth/complete-registration/def456..."
    }
  }
}
```

---

### 3. [PSYCHOLOGIST/CLINIC] Convidar Paciente
**POST** `/invitations/patient`

**Headers:**
```
Authorization: Bearer {psychologist_or_clinic_token}
Content-Type: application/json
```

**Body (Psicólogo):**
```json
{
  "email": "paciente@example.com",
  "name": "Maria Santos",
  "phone": "(11) 98765-4321",
  "birthDate": "1990-05-15"
}
```

**Body (Clínica - especificar psicólogo):**
```json
{
  "email": "paciente@example.com",
  "name": "Maria Santos",
  "phone": "(11) 98765-4321",
  "birthDate": "1990-05-15",
  "psychologistId": "65def456..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Convite enviado com sucesso",
  "data": {
    "invitation": {
      "id": "65ghi789...",
      "email": "paciente@example.com",
      "role": "patient",
      "status": "pending",
      "expiresAt": "2024-01-16T...",
      "invitationUrl": "http://localhost:3000/auth/complete-registration/ghi789..."
    }
  }
}
```

---

### 4. Validar Token de Convite
**GET** `/invitations/validate/:token`

**Access:** Public (sem autenticação)

**Response (sucesso):**
```json
{
  "success": true,
  "data": {
    "email": "clinica@example.com",
    "role": "clinic",
    "preFilledData": {
      "name": "Clínica Saúde Mental",
      "cnpj": "12345678000190"
    },
    "expiresAt": "2024-01-16T..."
  }
}
```

---

### 5. Listar Convites Enviados
**GET** `/invitations`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` (opcional): `pending`, `accepted`, `expired`
- `role` (opcional): `clinic`, `psychologist`, `patient`

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "65def456...",
      "email": "psicologo@example.com",
      "role": "psychologist",
      "status": "pending",
      "expiresAt": "2024-01-16T...",
      "createdAt": "2024-01-09T..."
    }
  ]
}
```

---

### 6. Reenviar Convite
**POST** `/invitations/:id/resend`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 7. Cancelar Convite
**DELETE** `/invitations/:id`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 📋 Rotas de Finalização de Cadastro

### 1. Finalizar Cadastro de Clínica
**POST** `/auth/complete-registration/clinic`

**Access:** Public (sem autenticação)

**Body:**
```json
{
  "token": "abc123...",
  "password": "SenhaForte123!",
  "phone": "(11) 3456-7890",
  "address": {
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Sala 4",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cadastro concluído com sucesso",
  "data": {
    "user": {
      "_id": "65abc123...",
      "name": "Clínica Saúde Mental",
      "email": "clinica@example.com",
      "role": "clinic",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 2. Finalizar Cadastro de Psicólogo
**POST** `/auth/complete-registration/psychologist`

**Access:** Public (sem autenticação)

**Body:**
```json
{
  "token": "def456...",
  "password": "SenhaForte123!",
  "phone": "(11) 98765-4321",
  "bio": "Psicólogo com 10 anos de experiência..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cadastro concluído com sucesso",
  "data": {
    "user": {
      "_id": "65def456...",
      "name": "Dr. João Silva",
      "email": "psicologo@example.com",
      "role": "psychologist",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 3. Finalizar Cadastro de Paciente
**POST** `/auth/complete-registration/patient`

**Access:** Public (sem autenticação)

**Body:**
```json
{
  "token": "ghi789...",
  "password": "SenhaForte123!",
  "cpf": "123.456.789-00",
  "emergencyContact": {
    "name": "Pedro Santos",
    "phone": "(11) 98765-9999",
    "relationship": "Irmão"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cadastro concluído com sucesso",
  "data": {
    "user": {
      "_id": "65ghi789...",
      "name": "Maria Santos",
      "email": "paciente@example.com",
      "role": "patient",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 📋 Rotas de Autenticação (Legacy)

> ⚠️ **Nota**: As rotas abaixo ainda funcionam, mas o **sistema de convites é o método recomendado** para novos cadastros em produção.

### 1. Registro Direto de Clínica (Legacy)
**POST** `/auth/register/clinic`

**Body:**
```json
{
  "name": "Clínica Saúde Mental",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@clinica.com",
  "password": "SenhaForte123!",
  "phone": "(11) 98765-4321",
  "address": {
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Sala 4",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Clínica registrada com sucesso",
  "data": {
    "user": {
      "_id": "65abc123...",
      "name": "Clínica Saúde Mental",
      "email": "contato@clinica.com",
      "role": "clinic",
      "cnpj": "12345678000190",
      "phone": "(11) 98765-4321",
      "address": { ... },
      "createdAt": "2024-01-09T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 2. Registro de Psicólogo
**POST** `/auth/register/psychologist`

**Body:**
```json
{
  "clinicId": "65abc123...",
  "name": "Dr. João Silva",
  "email": "joao@clinica.com",
  "password": "SenhaForte123!",
  "crp": "06/123456",
  "phone": "(11) 98765-4321",
  "specialties": ["Terapia Cognitivo-Comportamental", "Ansiedade", "Depressão"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Psicólogo registrado com sucesso",
  "data": {
    "user": {
      "_id": "65def456...",
      "name": "Dr. João Silva",
      "email": "joao@clinica.com",
      "role": "psychologist",
      "crp": "06/123456",
      "clinicId": "65abc123...",
      "specialties": ["Terapia Cognitivo-Comportamental", "Ansiedade", "Depressão"],
      "createdAt": "2024-01-09T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 3. Registro de Paciente
**POST** `/auth/register/patient`

**Body:**
```json
{
  "psychologistId": "65def456...",
  "name": "Maria Santos",
  "email": "maria@email.com",
  "password": "SenhaForte123!",
  "phone": "(11) 98765-4321",
  "birthDate": "1990-05-15",
  "cpf": "123.456.789-00",
  "emergencyContact": {
    "name": "Pedro Santos",
    "phone": "(11) 98765-9999",
    "relationship": "Irmão"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Paciente registrado com sucesso",
  "data": {
    "user": {
      "_id": "65ghi789...",
      "name": "Maria Santos",
      "email": "maria@email.com",
      "role": "patient",
      "psychologistId": "65def456...",
      "phone": "(11) 98765-4321",
      "birthDate": "1990-05-15",
      "cpf": "12345678900",
      "emergencyContact": { ... },
      "createdAt": "2024-01-09T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 4. Login
**POST** `/auth/login`

**Body:**
```json
{
  "email": "joao@clinica.com",
  "password": "SenhaForte123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "_id": "65def456...",
      "name": "Dr. João Silva",
      "email": "joao@clinica.com",
      "role": "psychologist",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 5. Renovar Token
**POST** `/auth/refresh-token`

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token renovado com sucesso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 6. Obter Dados do Usuário Logado
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65def456...",
    "name": "Dr. João Silva",
    "email": "joao@clinica.com",
    "role": "psychologist",
    ...
  }
}
```

---

### 7. Logout
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

### 8. Login com Google OAuth (Opcional)
**GET** `/auth/google`

Redireciona o usuário para a página de autenticação do Google.

**Callback:** `/auth/google/callback`

Após o sucesso, redireciona para:
```
{FRONTEND_URL}/auth/callback?token={token}&refreshToken={refreshToken}
```

O front-end deve capturar os tokens da URL e armazená-los.

---

## 👨‍⚕️ CRUD de Psicólogos

### 1. Obter Dados do Psicólogo
**GET** `/psychologists/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Permissões:** Próprio psicólogo ou clínica vinculada

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65def456...",
    "name": "Dr. João Silva",
    "email": "joao@clinica.com",
    "role": "psychologist",
    "crp": "06/123456",
    "clinicId": "65abc123...",
    "specialties": ["TCC", "Ansiedade"],
    "avatar": "https://cloudinary.com/...",
    "phone": "(11) 98765-4321",
    "createdAt": "2024-01-09T..."
  }
}
```

---

### 2. Atualizar Dados do Psicólogo
**PUT** `/psychologists/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Permissões:** Próprio psicólogo ou clínica vinculada

**Body:**
```json
{
  "name": "Dr. João Silva Jr.",
  "phone": "(11) 99999-8888",
  "specialties": ["TCC", "Ansiedade", "Depressão"],
  "bio": "Psicólogo com 10 anos de experiência..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Psicólogo atualizado com sucesso",
  "data": { ... }
}
```

---

### 3. Upload de Avatar do Psicólogo
**POST** `/psychologists/:id/avatar`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Permissões:** Apenas o próprio psicólogo

**Body (FormData):**
```javascript
const formData = new FormData();
formData.append('avatar', file); // Arquivo de imagem
```

**Response:**
```json
{
  "success": true,
  "message": "Avatar atualizado com sucesso",
  "data": {
    "avatar": "https://res.cloudinary.com/..."
  }
}
```

**Observações:**
- Formatos aceitos: JPG, JPEG, PNG, GIF
- Tamanho máximo: 5MB
- A imagem será otimizada automaticamente
- A URL antiga será removida do Cloudinary

---

### 4. Listar Pacientes do Psicólogo
**GET** `/psychologists/:id/patients`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65ghi789...",
      "name": "Maria Santos",
      "email": "maria@email.com",
      "avatar": "https://cloudinary.com/...",
      "phone": "(11) 98765-4321",
      "createdAt": "2024-01-09T..."
    }
  ]
}
```

---

### 5. Listar Agendamentos do Psicólogo
**GET** `/psychologists/:id/appointments`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65jkl012...",
      "patientId": {
        "_id": "65ghi789...",
        "name": "Maria Santos"
      },
      "date": "2024-01-15T10:00:00.000Z",
      "status": "scheduled",
      "type": "in-person",
      "notes": "Primeira consulta"
    }
  ]
}
```

---

## 🧑‍🦱 CRUD de Pacientes

### 1. Obter Dados do Paciente
**GET** `/patients/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Permissões:** Próprio paciente, psicólogo vinculado ou clínica

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65ghi789...",
    "name": "Maria Santos",
    "email": "maria@email.com",
    "role": "patient",
    "psychologistId": "65def456...",
    "avatar": "https://cloudinary.com/...",
    "phone": "(11) 98765-4321",
    "birthDate": "1990-05-15",
    "cpf": "12345678900",
    "emergencyContact": {
      "name": "Pedro Santos",
      "phone": "(11) 98765-9999",
      "relationship": "Irmão"
    },
    "createdAt": "2024-01-09T..."
  }
}
```

---

### 2. Atualizar Dados do Paciente
**PUT** `/patients/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Permissões:** Próprio paciente ou psicólogo vinculado

**Body:**
```json
{
  "name": "Maria Santos Silva",
  "phone": "(11) 99999-7777",
  "emergencyContact": {
    "name": "Pedro Santos",
    "phone": "(11) 98765-9999",
    "relationship": "Irmão"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Paciente atualizado com sucesso",
  "data": { ... }
}
```

---

### 3. Upload de Avatar do Paciente
**POST** `/patients/:id/avatar`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Permissões:** Apenas o próprio paciente

**Body (FormData):**
```javascript
const formData = new FormData();
formData.append('avatar', file); // Arquivo de imagem
```

**Response:**
```json
{
  "success": true,
  "message": "Avatar atualizado com sucesso",
  "data": {
    "avatar": "https://res.cloudinary.com/..."
  }
}
```

---

### 4. Listar Agendamentos do Paciente
**GET** `/patients/:id/appointments`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65jkl012...",
      "psychologistId": {
        "_id": "65def456...",
        "name": "Dr. João Silva"
      },
      "date": "2024-01-15T10:00:00.000Z",
      "status": "scheduled",
      "type": "in-person"
    }
  ]
}
```

---

### 5. Listar Documentos do Paciente
**GET** `/patients/:id/documents`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65mno345...",
      "title": "Anamnese Inicial",
      "type": "anamnesis",
      "fileUrl": "https://cloudinary.com/...",
      "createdAt": "2024-01-09T..."
    }
  ]
}
```

---

## 🏥 CRUD de Clínicas

### 1. Obter Dados da Clínica
**GET** `/clinics/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Permissões:** Apenas a própria clínica

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65abc123...",
    "name": "Clínica Saúde Mental",
    "email": "contato@clinica.com",
    "role": "clinic",
    "cnpj": "12345678000190",
    "logo": "https://cloudinary.com/...",
    "phone": "(11) 98765-4321",
    "address": { ... },
    "createdAt": "2024-01-09T..."
  }
}
```

---

### 2. Atualizar Dados da Clínica
**PUT** `/clinics/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "name": "Clínica Saúde Mental LTDA",
  "phone": "(11) 99999-6666",
  "address": {
    "street": "Av. Paulista",
    "number": "1000",
    "city": "São Paulo",
    "state": "SP"
  }
}
```

---

### 3. Upload de Logo da Clínica
**POST** `/clinics/:id/logo`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body (FormData):**
```javascript
const formData = new FormData();
formData.append('logo', file); // Arquivo de imagem
```

**Response:**
```json
{
  "success": true,
  "message": "Logo atualizado com sucesso",
  "data": {
    "logo": "https://res.cloudinary.com/..."
  }
}
```

---

### 4. Listar Psicólogos da Clínica
**GET** `/clinics/:id/psychologists`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65def456...",
      "name": "Dr. João Silva",
      "email": "joao@clinica.com",
      "crp": "06/123456",
      "specialties": ["TCC", "Ansiedade"],
      "avatar": "https://cloudinary.com/..."
    }
  ]
}
```

---

### 5. Obter Estatísticas da Clínica
**GET** `/clinics/:id/stats`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPsychologists": 5,
    "totalPatients": 42,
    "activeAppointments": 15,
    "completedAppointments": 120,
    "monthlyRevenue": 25000
  }
}
```

---

## 🖼️ Sistema de Imagens (Upload de Avatar/Logo)

### Como Funciona

1. **Cloudinary Integration**: As imagens são armazenadas no Cloudinary
2. **Formato**: Use `multipart/form-data` para upload
3. **Campo do Formulário**: `avatar` (psicólogos/pacientes) ou `logo` (clínicas)
4. **Validações**:
   - Formatos aceitos: JPG, JPEG, PNG, GIF
   - Tamanho máximo: 5MB
   - Apenas uma imagem por vez

### Exemplo de Upload (JavaScript)

```javascript
async function uploadAvatar(userId, file) {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch(`/api/psychologists/${userId}/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();
  return data.data.avatar; // URL da imagem
}
```

### Exemplo React Component

```jsx
import { useState } from 'react';

function AvatarUpload({ userId, currentAvatar }) {
  const [preview, setPreview] = useState(currentAvatar);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview
    setPreview(URL.createObjectURL(file));

    // Upload
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`/api/psychologists/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setPreview(data.data.avatar);
        alert('Avatar atualizado!');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao fazer upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <img
        src={preview || '/default-avatar.png'}
        alt="Avatar"
        style={{ width: 100, height: 100, borderRadius: '50%' }}
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={loading}
      />
      {loading && <p>Enviando...</p>}
    </div>
  );
}
```

---

## 🔒 Permissões e Autorização

### Hierarquia de Permissões

```
Clínica
  ├── Pode gerenciar seus próprios dados
  ├── Pode ver/editar psicólogos vinculados
  └── Pode ver estatísticas de todos os psicólogos/pacientes

Psicólogo
  ├── Pode gerenciar seus próprios dados
  ├── Pode ver/editar pacientes vinculados
  └── Pode ver agendamentos dos seus pacientes

Paciente
  ├── Pode gerenciar seus próprios dados
  ├── Pode ver seus agendamentos
  └── Pode ver seus documentos
```

### Exemplos de Validação no Front-end

```javascript
// Verificar role do usuário
const user = JSON.parse(localStorage.getItem('user'));

if (user.role === 'clinic') {
  // Mostrar dashboard de clínica
} else if (user.role === 'psychologist') {
  // Mostrar dashboard de psicólogo
} else if (user.role === 'patient') {
  // Mostrar dashboard de paciente
}

// Verificar permissão para editar
function canEdit(resourceOwnerId) {
  if (user.role === 'clinic') {
    // Clínica pode editar se o psicólogo pertence a ela
    return true;
  }
  return user._id === resourceOwnerId;
}
```

---

## 📱 Fluxo Completo de Registro (ATUALIZADO)

### Fluxo Recomendado: Sistema de Convites

#### 1. Admin convida Clínica
```javascript
// Admin envia convite
POST /api/invitations/clinic
{
  "email": "clinica@example.com",
  "name": "Clínica Saúde Mental",
  "cnpj": "12345678000190"
}

// Sistema envia e-mail automático com link
// Clínica recebe: http://localhost:3000/auth/complete-registration/{token}
```

#### 2. Clínica completa cadastro
```javascript
// Página: /auth/complete-registration/:token

// 1. Validar token ao carregar página
GET /api/invitations/validate/{token}

// 2. Mostrar dados pré-preenchidos (read-only)
// 3. Formulário para senha + dados adicionais

// 4. Enviar finalização
POST /api/auth/complete-registration/clinic
{
  "token": "{token}",
  "password": "SenhaForte123!",
  "phone": "(11) 3456-7890",
  "address": { ... }
}

// 5. Salvar tokens e redirecionar para dashboard
```

#### 3. Clínica convida Psicólogo
```javascript
// Clínica cria convite
POST /api/invitations/psychologist
{
  "email": "psicologo@example.com",
  "name": "Dr. João Silva",
  "crp": "06/123456",
  "specialties": ["TCC"]
}

// Sistema envia e-mail automático
```

#### 4. Psicólogo completa cadastro
```javascript
// Mesmo fluxo da clínica
POST /api/auth/complete-registration/psychologist
{
  "token": "{token}",
  "password": "SenhaForte123!",
  "bio": "Psicólogo especializado..."
}
```

#### 5. Psicólogo/Clínica convida Paciente
```javascript
// Psicólogo cria convite
POST /api/invitations/patient
{
  "email": "paciente@example.com",
  "name": "Maria Santos",
  "phone": "(11) 98765-4321"
}

// Sistema envia e-mail automático
```

#### 6. Paciente completa cadastro
```javascript
POST /api/auth/complete-registration/patient
{
  "token": "{token}",
  "password": "SenhaForte123!",
  "cpf": "12345678900",
  "emergencyContact": { ... }
}
```

---

## 💻 Implementação no Frontend

### Componente: Página de Convite

```jsx
import { useState } from 'react';
import api from './api';

function InvitePsychologistPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    crp: '',
    specialties: [],
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/invitations/psychologist', formData);

      if (response.data.success) {
        alert('Convite enviado! O psicólogo receberá um e-mail.');

        // Opcional: Mostrar link no modo dev
        console.log('Link:', response.data.data.invitation.invitationUrl);

        // Redirecionar para lista de convites
        window.location.href = '/dashboard/invitations';
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao enviar convite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Convidar Psicólogo</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="E-mail"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Nome completo"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="CRP (ex: 06/123456)"
          value={formData.crp}
          onChange={(e) => setFormData({...formData, crp: e.target.value})}
        />
        <input
          type="tel"
          placeholder="Telefone"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar Convite'}
        </button>
      </form>
    </div>
  );
}
```

---

### Componente: Página de Finalização de Cadastro

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from './api';

function CompleteRegistrationPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [additionalData, setAdditionalData] = useState({});

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await api.get(`/invitations/validate/${token}`);

      if (response.data.success) {
        setInvitationData(response.data.data);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Convite inválido ou expirado');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const endpoint = `/auth/complete-registration/${invitationData.role}`;

      const payload = {
        token,
        password,
        ...additionalData
      };

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        // Salvar tokens
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));

        alert('Cadastro concluído com sucesso! Bem-vindo!');
        navigate('/dashboard');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao completar cadastro');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Validando convite...</div>;
  }

  return (
    <div>
      <h1>Complete seu Cadastro</h1>
      <p>Bem-vindo, <strong>{invitationData.preFilledData.name}</strong>!</p>
      <p>E-mail: {invitationData.email}</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Senha *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
          />
        </div>

        <div>
          <label>Confirmar Senha *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Digite a senha novamente"
            required
          />
        </div>

        {/* Campos adicionais baseados no role */}
        {invitationData.role === 'clinic' && (
          <>
            <div>
              <label>Telefone</label>
              <input
                type="tel"
                onChange={(e) => setAdditionalData({
                  ...additionalData,
                  phone: e.target.value
                })}
              />
            </div>
            <div>
              <label>Endereço</label>
              {/* Campos de endereço */}
            </div>
          </>
        )}

        {invitationData.role === 'psychologist' && (
          <div>
            <label>Biografia</label>
            <textarea
              onChange={(e) => setAdditionalData({
                ...additionalData,
                bio: e.target.value
              })}
              placeholder="Conte um pouco sobre você..."
            />
          </div>
        )}

        {invitationData.role === 'patient' && (
          <>
            <div>
              <label>CPF</label>
              <input
                type="text"
                onChange={(e) => setAdditionalData({
                  ...additionalData,
                  cpf: e.target.value
                })}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label>Contato de Emergência</label>
              {/* Campos de emergência */}
            </div>
          </>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Finalizando...' : 'Finalizar Cadastro'}
        </button>
      </form>
    </div>
  );
}
```

---

### Componente: Lista de Convites

```jsx
import { useState, useEffect } from 'react';
import api from './api';

function InvitationsListPage() {
  const [invitations, setInvitations] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, [filter]);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/invitations?status=${filter}`);
      setInvitations(response.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (id) => {
    try {
      await api.post(`/invitations/${id}/resend`);
      alert('Convite reenviado com sucesso!');
    } catch (error) {
      alert('Erro ao reenviar convite');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Deseja cancelar este convite?')) return;

    try {
      await api.delete(`/invitations/${id}`);
      loadInvitations();
      alert('Convite cancelado');
    } catch (error) {
      alert('Erro ao cancelar convite');
    }
  };

  return (
    <div>
      <h2>Convites Enviados</h2>

      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="pending">Pendentes</option>
        <option value="accepted">Aceitos</option>
        <option value="expired">Expirados</option>
      </select>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Expira em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv._id}>
                <td>{inv.email}</td>
                <td>{inv.preFilledData.name}</td>
                <td>{inv.role}</td>
                <td>{inv.status}</td>
                <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                <td>
                  {inv.status === 'pending' && (
                    <>
                      <button onClick={() => handleResend(inv._id)}>
                        Reenviar
                      </button>
                      <button onClick={() => handleCancel(inv._id)}>
                        Cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

### Rotas no React Router

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Finalização de cadastro - PÚBLICA */}
        <Route
          path="/auth/complete-registration/:token"
          element={<CompleteRegistrationPage />}
        />

        {/* Dashboard - PRIVADA */}
        <Route path="/dashboard" element={<ProtectedRoute />}>
          <Route index element={<DashboardHome />} />

          {/* Convites */}
          <Route path="invite/psychologist" element={<InvitePsychologistPage />} />
          <Route path="invite/patient" element={<InvitePatientPage />} />
          <Route path="invitations" element={<InvitationsListPage />} />
        </Route>

        {/* Login */}
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

---

## 🚨 Tratamento de Erros

### Códigos de Status HTTP

- **200 OK**: Sucesso
- **201 Created**: Recurso criado com sucesso
- **400 Bad Request**: Dados inválidos
- **401 Unauthorized**: Token inválido ou expirado
- **403 Forbidden**: Sem permissão
- **404 Not Found**: Recurso não encontrado
- **429 Too Many Requests**: Rate limit excedido
- **500 Internal Server Error**: Erro no servidor

### Formato de Erro

```json
{
  "success": false,
  "message": "Descrição do erro"
}
```

### Exemplo de Tratamento (JavaScript)

```javascript
async function apiRequest(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Tratamento específico por código
      if (response.status === 401) {
        // Token expirado - tentar renovar
        await refreshAuthToken();
        return apiRequest(url, options); // Retry
      }

      if (response.status === 403) {
        alert('Você não tem permissão para esta ação');
        return;
      }

      throw new Error(data.message || 'Erro na requisição');
    }

    return data;
  } catch (error) {
    console.error('Erro na API:', error);
    throw error;
  }
}

async function refreshAuthToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('refreshToken', data.data.refreshToken);
  } else {
    // Refresh token também expirou - redirecionar para login
    localStorage.clear();
    window.location.href = '/login';
  }
}
```

---

## 🎯 Resumo das Rotas por Perfil

### Clínica
- `POST /auth/register/clinic` - Registro
- `POST /auth/login` - Login
- `GET /auth/me` - Dados do usuário
- `GET /clinics/:id` - Dados da clínica
- `PUT /clinics/:id` - Atualizar dados
- `POST /clinics/:id/logo` - Upload de logo
- `POST /auth/register/psychologist` - Cadastrar psicólogo
- `GET /clinics/:id/psychologists` - Listar psicólogos
- `GET /clinics/:id/stats` - Estatísticas

### Psicólogo
- `POST /auth/login` - Login (registro via clínica)
- `GET /auth/me` - Dados do usuário
- `GET /psychologists/:id` - Dados do psicólogo
- `PUT /psychologists/:id` - Atualizar dados
- `POST /psychologists/:id/avatar` - Upload de avatar
- `POST /auth/register/patient` - Cadastrar paciente
- `GET /psychologists/:id/patients` - Listar pacientes
- `GET /psychologists/:id/appointments` - Listar agendamentos

### Paciente
- `POST /auth/login` - Login (registro via psicólogo)
- `GET /auth/me` - Dados do usuário
- `GET /patients/:id` - Dados do paciente
- `PUT /patients/:id` - Atualizar dados
- `POST /patients/:id/avatar` - Upload de avatar
- `GET /patients/:id/appointments` - Listar agendamentos
- `GET /patients/:id/documents` - Listar documentos

---

## 🔧 Configurações Recomendadas

### Axios Interceptor (Opcional)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Request interceptor - adiciona token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - trata erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Token expirado
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh-token', { refreshToken });

        localStorage.setItem('token', data.data.token);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 📝 Notas Importantes

1. **Validação de Senha**: A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.

2. **CNPJ/CPF**: Podem ser enviados com ou sem formatação. A API remove a formatação automaticamente.

3. **Soft Delete**: Usuários deletados não são removidos do banco, apenas marcados como `isDeleted: true`.

4. **Rate Limiting**: Máximo de 100 requisições a cada 15 minutos por IP.

5. **CORS**: Configure o `FRONTEND_URL` no arquivo `.env` da API.

6. **Google OAuth**: É opcional. Verifique se está configurado antes de usar.

7. **Upload de Imagens**:
   - Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` no `.env`
   - As imagens antigas são automaticamente removidas ao fazer upload de uma nova

8. **Tokens JWT**:
   - `token`: Expira em 1 dia
   - `refreshToken`: Expira em 7 dias
   - Use o refreshToken para renovar antes de expirar

9. **Sistema de Convites** (NOVO):
   - Convites expiram em 7 dias
   - E-mails são enviados automaticamente (se configurado)
   - Tokens são únicos e não reutilizáveis
   - Para mais detalhes, veja: [INVITATION_SYSTEM_GUIDE.md](INVITATION_SYSTEM_GUIDE.md)

---

## 📚 Documentação Adicional

- 📨 **[INVITATION_SYSTEM_GUIDE.md](INVITATION_SYSTEM_GUIDE.md)** - Guia completo do sistema de convites
- 📧 **[EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md)** - Como configurar envio de e-mails
- 🚀 **[INVITATION_QUICK_START.md](INVITATION_QUICK_START.md)** - Quick start com exemplos
- ✅ **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Resumo da implementação
