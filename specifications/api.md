# API REST

## Visão Geral

A API segue padrões REST e utiliza JSON para request/response.

### Base URL
```
http://localhost:3000/api
```

### Autenticação
Todas as rotas (exceto `/api/auth`) requerem cookie de sessão válido.

### Formato de Resposta

**Sucesso:**
```json
{
  "data": { ... }
}
```

**Erro:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro"
  }
}
```

### Códigos de Status
- `200` - Sucesso
- `201` - Criado
- `400` - Bad Request (validação)
- `401` - Não autenticado
- `404` - Não encontrado
- `500` - Erro interno

---

## Autenticação

### POST /api/auth

Verifica PIN e cria sessão.

**Request:**
```json
{
  "pin": "1234"
}
```

**Response (200):**
```json
{
  "data": {
    "authenticated": true
  }
}
```

**Response (401):**
```json
{
  "error": {
    "code": "INVALID_PIN",
    "message": "PIN inválido"
  }
}
```

**Cookies:**
- `session`: token httpOnly (set on success)

### DELETE /api/auth

Encerra sessão (logout).

**Response (200):**
```json
{
  "data": {
    "authenticated": false
  }
}
```

---

## Funcionários

### GET /api/employees

Lista todos os funcionários.

**Query Parameters:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| active | boolean | - | Filtrar por status |

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx123...",
      "name": "Maria",
      "role": "FAXINEIRA",
      "workDays": [1, 2, 3, 4, 5],
      "active": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST /api/employees

Cria novo funcionário.

**Request:**
```json
{
  "name": "Maria",
  "role": "FAXINEIRA",
  "workDays": [1, 2, 3, 4, 5]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "clx123...",
    "name": "Maria",
    "role": "FAXINEIRA",
    "workDays": [1, 2, 3, 4, 5],
    "active": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### GET /api/employees/:id

Retorna funcionário por ID.

**Response (200):**
```json
{
  "data": {
    "id": "clx123...",
    "name": "Maria",
    "role": "FAXINEIRA",
    "workDays": [1, 2, 3, 4, 5],
    "active": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "_count": {
      "tasks": 5
    }
  }
}
```

### PUT /api/employees/:id

Atualiza funcionário.

**Request:**
```json
{
  "name": "Maria Silva",
  "workDays": [1, 2, 3, 4, 5, 6]
}
```

**Response (200):**
```json
{
  "data": {
    "id": "clx123...",
    "name": "Maria Silva",
    "role": "FAXINEIRA",
    "workDays": [1, 2, 3, 4, 5, 6],
    "active": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-16T14:30:00Z"
  }
}
```

### DELETE /api/employees/:id

Remove funcionário (soft delete - marca como inativo).

**Response (200):**
```json
{
  "data": {
    "id": "clx123...",
    "active": false
  }
}
```

---

## Tarefas

### GET /api/tasks

Lista todas as tarefas.

**Query Parameters:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| active | boolean | - | Filtrar por status |
| employeeId | string | - | Filtrar por funcionário |
| category | string | - | Filtrar por categoria |

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx456...",
      "title": "Limpar cozinha",
      "description": "Limpar pia, fogão e bancadas",
      "category": "LIMPEZA",
      "rrule": "FREQ=DAILY",
      "employeeId": "clx123...",
      "active": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "employee": {
        "id": "clx123...",
        "name": "Maria"
      }
    }
  ]
}
```

### POST /api/tasks

Cria nova tarefa.

**Request:**
```json
{
  "title": "Limpar cozinha",
  "description": "Limpar pia, fogão e bancadas",
  "category": "LIMPEZA",
  "rrule": "FREQ=DAILY",
  "employeeId": "clx123..."
}
```

**Response (201):**
```json
{
  "data": {
    "id": "clx456...",
    "title": "Limpar cozinha",
    "description": "Limpar pia, fogão e bancadas",
    "category": "LIMPEZA",
    "rrule": "FREQ=DAILY",
    "employeeId": "clx123...",
    "active": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### GET /api/tasks/:id

Retorna tarefa por ID.

**Response (200):**
```json
{
  "data": {
    "id": "clx456...",
    "title": "Limpar cozinha",
    "description": "Limpar pia, fogão e bancadas",
    "category": "LIMPEZA",
    "rrule": "FREQ=DAILY",
    "employeeId": "clx123...",
    "active": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "employee": {
      "id": "clx123...",
      "name": "Maria",
      "role": "FAXINEIRA"
    }
  }
}
```

### PUT /api/tasks/:id

Atualiza tarefa.

**Request:**
```json
{
  "title": "Limpar cozinha completa",
  "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "clx456...",
    "title": "Limpar cozinha completa",
    "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    "updatedAt": "2024-01-16T14:30:00Z"
  }
}
```

### DELETE /api/tasks/:id

Remove tarefa (soft delete).

**Response (200):**
```json
{
  "data": {
    "id": "clx456...",
    "active": false
  }
}
```

### GET /api/tasks/for-date

Retorna tarefas para uma data específica (para impressão).

**Query Parameters:**
| Param | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| date | string | Sim | Data (YYYY-MM-DD) |
| employeeId | string | Não | Filtrar por funcionário |

**Response (200):**
```json
{
  "date": "2024-01-16",
  "tasks": [
    {
      "id": "clx456...",
      "title": "Limpar cozinha",
      "category": "LIMPEZA",
      "employee": { "id": "clx123...", "name": "Maria", "role": "FAXINEIRA" }
    }
  ],
  "specialTasks": [
    {
      "id": "clx789...",
      "title": "Limpar vidros",
      "dueDays": 7,
      "appearDate": "2024-01-16",
      "dueDate": "2024-01-23",
      "employee": { "id": "clx123...", "name": "Maria", "role": "FAXINEIRA" }
    }
  ],
  "oneOffTasks": [
    {
      "id": "clx999...",
      "title": "Organizar depósito",
      "dueDays": 3,
      "dueDate": "2024-01-19",
      "employee": null
    }
  ]
}
```

### GET /api/tasks/for-week

Retorna agenda semanal de tarefas recorrentes por funcionário.

**Query Parameters:**
| Param | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| date | string | Sim | Qualquer data da semana (YYYY-MM-DD) |

**Response (200):**
```json
{
  "weekStart": "2024-01-13",
  "weekEnd": "2024-01-19",
  "employees": [
    {
      "id": "clx123...",
      "name": "Maria",
      "role": "FAXINEIRA",
      "workDays": [1, 2, 3, 4, 5],
      "days": [
        {
          "date": "2024-01-13",
          "dayOfWeek": 1,
          "tasks": [
            { "id": "clx456...", "title": "Limpar cozinha", "category": "LIMPEZA" }
          ]
        }
      ]
    }
  ],
  "unassigned": null
}
```

**Performance:**
- RRule parseado uma única vez por tarefa
- Queries executadas em paralelo
- Apenas tarefas recorrentes são incluídas

---

## Ocorrências

### GET /api/occurrences

Retorna ocorrências de tarefas para uma data ou período.

**Query Parameters:**
| Param | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| date | string | Sim* | Data específica (YYYY-MM-DD) |
| startDate | string | Sim* | Data inicial do período |
| endDate | string | Sim* | Data final do período |
| employeeId | string | Não | Filtrar por funcionário |

*Usar `date` OU `startDate`+`endDate`

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx789...",
      "taskId": "clx456...",
      "date": "2024-01-16",
      "completed": false,
      "completedAt": null,
      "notes": null,
      "task": {
        "id": "clx456...",
        "title": "Limpar cozinha",
        "category": "LIMPEZA",
        "employee": {
          "id": "clx123...",
          "name": "Maria"
        }
      }
    }
  ]
}
```

**Nota:** Ocorrências são criadas sob demanda. Se uma tarefa tem recorrência para uma data mas não existe ocorrência no banco, o sistema calcula e retorna como se existisse (com `id: null`).

### PUT /api/occurrences/:id

Atualiza ocorrência (toggle completion, add notes).

**Request:**
```json
{
  "completed": true,
  "notes": "Feito às 10h"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "clx789...",
    "taskId": "clx456...",
    "date": "2024-01-16",
    "completed": true,
    "completedAt": "2024-01-16T13:00:00Z",
    "notes": "Feito às 10h"
  }
}
```

### POST /api/occurrences

Cria ocorrência manualmente (para tarefas calculadas).

**Request:**
```json
{
  "taskId": "clx456...",
  "date": "2024-01-16",
  "completed": true
}
```

**Response (201):**
```json
{
  "data": {
    "id": "clx789...",
    "taskId": "clx456...",
    "date": "2024-01-16",
    "completed": true,
    "completedAt": "2024-01-16T13:00:00Z"
  }
}
```

---

## Pratos

### GET /api/dishes

Lista todos os pratos.

**Query Parameters:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| active | boolean | - | Filtrar por status |
| category | string | - | Filtrar por categoria |

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx111...",
      "name": "Arroz com feijão",
      "description": null,
      "category": "ALMOCO",
      "prepTime": 60,
      "servings": 4,
      "ingredients": ["Arroz", "Feijão", "Alho"],
      "active": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST /api/dishes

Cria novo prato.

**Request:**
```json
{
  "name": "Arroz com feijão",
  "category": "ALMOCO",
  "prepTime": 60,
  "servings": 4,
  "ingredients": ["Arroz", "Feijão", "Alho", "Sal", "Óleo"]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "clx111...",
    "name": "Arroz com feijão",
    "category": "ALMOCO",
    "prepTime": 60,
    "servings": 4,
    "ingredients": ["Arroz", "Feijão", "Alho", "Sal", "Óleo"],
    "active": true
  }
}
```

### GET /api/dishes/:id

Retorna prato por ID.

### PUT /api/dishes/:id

Atualiza prato.

### DELETE /api/dishes/:id

Remove prato (soft delete).

---

## Cardápio

### GET /api/meal-schedule

Retorna cardápio para um período.

**Query Parameters:**
| Param | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| month | string | Sim | Mês (YYYY-MM) |

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx222...",
      "date": "2024-01-16",
      "mealType": "ALMOCO",
      "dishId": "clx111...",
      "employeeId": "clx123...",
      "notes": null,
      "dish": {
        "id": "clx111...",
        "name": "Arroz com feijão"
      },
      "employee": {
        "id": "clx123...",
        "name": "Maria"
      }
    }
  ]
}
```

### POST /api/meal-schedule

Agenda refeição.

**Request:**
```json
{
  "date": "2024-01-16",
  "mealType": "ALMOCO",
  "dishId": "clx111...",
  "employeeId": "clx123...",
  "notes": "Fazer porção extra"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "clx222...",
    "date": "2024-01-16",
    "mealType": "ALMOCO",
    "dishId": "clx111...",
    "employeeId": "clx123..."
  }
}
```

### PUT /api/meal-schedule/:id

Atualiza agendamento.

### DELETE /api/meal-schedule/:id

Remove agendamento.

### POST /api/meal-schedule/randomize

Gera cardápio aleatório para período.

**Request:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "mealTypes": ["ALMOCO", "JANTAR"],
  "overwrite": false
}
```

**Response (201):**
```json
{
  "data": {
    "created": 45,
    "skipped": 15
  }
}
```

---

## Impressão

### POST /api/print

Dispara impressão manual.

**Request:**
```json
{
  "type": "DAILY_TASKS",
  "date": "2024-01-16",
  "employeeId": "clx123..."
}
```

**Tipos de impressão:**
- `DAILY_TASKS`: Lista de tarefas do dia
- `SINGLE_TASK`: Ticket de tarefa individual (requer `taskId`)
- `WEEKLY_MENU`: Cardápio da semana

**Response (200):**
```json
{
  "data": {
    "success": true,
    "printLogId": "clx333..."
  }
}
```

### GET /api/print/preview

Retorna preview do que será impresso.

**Query Parameters:**
| Param | Tipo | Required | Descrição |
|-------|------|----------|-----------|
| type | string | Sim | Tipo de impressão |
| date | string | Sim | Data (YYYY-MM-DD) |
| employeeId | string | Não | Funcionário específico |

**Response (200):**
```json
{
  "data": {
    "lines": [
      { "type": "title", "text": "TAREFAS DO DIA" },
      { "type": "subtitle", "text": "Maria - 16/01/2024" },
      { "type": "separator" },
      { "type": "item", "text": "[ ] Limpar cozinha" },
      { "type": "item", "text": "[ ] Lavar roupa" }
    ]
  }
}
```

---

## Jobs de Impressão

### GET /api/print-jobs

Lista jobs de impressão automática.

**Response (200):**
```json
{
  "data": [
    {
      "id": "clx444...",
      "name": "Tarefas da Maria - Manhã",
      "cronExpression": "0 7 * * 1-5",
      "type": "DAILY_TASKS",
      "employeeId": "clx123...",
      "enabled": true,
      "lastRunAt": "2024-01-16T07:00:00Z",
      "employee": {
        "id": "clx123...",
        "name": "Maria"
      }
    }
  ]
}
```

### POST /api/print-jobs

Cria job de impressão.

**Request:**
```json
{
  "name": "Tarefas da Maria - Manhã",
  "cronExpression": "0 7 * * 1-5",
  "type": "DAILY_TASKS",
  "employeeId": "clx123..."
}
```

### PUT /api/print-jobs/:id

Atualiza job.

### DELETE /api/print-jobs/:id

Remove job.

### POST /api/print-jobs/:id/run

Executa job manualmente.

**Response (200):**
```json
{
  "data": {
    "success": true,
    "printLogId": "clx555..."
  }
}
```

---

## Configurações

### GET /api/settings

Retorna todas as configurações.

**Response (200):**
```json
{
  "data": {
    "house_name": "Minha Casa",
    "printer_ip": "192.168.1.230",
    "printer_type": "EPSON",
    "default_print_time": "07:00"
  }
}
```

**Nota:** `app_pin` nunca é retornado por segurança.

### PUT /api/settings

Atualiza configurações.

**Request:**
```json
{
  "house_name": "Casa da Praia",
  "printer_ip": "192.168.1.100"
}
```

**Response (200):**
```json
{
  "data": {
    "house_name": "Casa da Praia",
    "printer_ip": "192.168.1.100",
    "printer_type": "EPSON",
    "default_print_time": "07:00"
  }
}
```

### PUT /api/settings/pin

Altera PIN de acesso.

**Request:**
```json
{
  "currentPin": "1234",
  "newPin": "5678"
}
```

**Response (200):**
```json
{
  "data": {
    "success": true
  }
}
```

### POST /api/settings/test-printer

Testa conexão com impressora.

**Response (200):**
```json
{
  "data": {
    "success": true,
    "message": "Impressora conectada"
  }
}
```

**Response (500):**
```json
{
  "error": {
    "code": "PRINTER_ERROR",
    "message": "Não foi possível conectar à impressora"
  }
}
```

---

## Códigos de Erro

| Código | HTTP | Descrição |
|--------|------|-----------|
| INVALID_PIN | 401 | PIN incorreto |
| UNAUTHORIZED | 401 | Sessão inválida ou expirada |
| NOT_FOUND | 404 | Recurso não encontrado |
| VALIDATION_ERROR | 400 | Dados inválidos |
| DUPLICATE_ENTRY | 400 | Registro já existe |
| PRINTER_ERROR | 500 | Erro de comunicação com impressora |
| INTERNAL_ERROR | 500 | Erro interno do servidor |
