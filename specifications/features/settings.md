# Configurações

## Visão Geral

Tela de configurações do aplicativo, incluindo nome da casa, impressora, PIN de acesso e preferências.

## User Stories

### US-01: Configurar nome da casa
**Como** usuário
**Quero** definir o nome da casa
**Para** que apareça nas impressões

### US-02: Configurar impressora
**Como** usuário
**Quero** configurar o IP da impressora
**Para** poder imprimir tarefas

### US-03: Testar impressora
**Como** usuário
**Quero** testar a conexão com a impressora
**Para** verificar se está funcionando

### US-04: Alterar PIN
**Como** usuário
**Quero** alterar o PIN de acesso
**Para** manter a segurança

## Wireframe

```
┌────────────────────────────────────────────────────────┐
│  Configurações                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─ Geral ─────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  Nome da casa                                    │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │ Casa da Praia                             │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                                                  │  │
│  │  Fuso horário                                    │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │ America/Sao_Paulo                     ▼  │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Impressora ────────────────────────────────────┐  │
│  │                                                  │  │
│  │  IP da impressora                                │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │ 192.168.1.230                            │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                                                  │  │
│  │  Tipo                                            │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │ EPSON                                 ▼  │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                                                  │  │
│  │  Status: ✓ Conectada                            │  │
│  │                                                  │  │
│  │  [Testar conexão]  [Imprimir teste]             │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Segurança ─────────────────────────────────────┐  │
│  │                                                  │  │
│  │  PIN de acesso                                   │  │
│  │  ****                                            │  │
│  │                                                  │  │
│  │  [Alterar PIN]                                   │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Impressão automática ──────────────────────────┐  │
│  │                                                  │  │
│  │  Horário padrão                                  │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │ 07:00                                    │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                                                  │  │
│  │  ℹ️  Este horário é usado como padrão ao criar  │  │
│  │     novos jobs de impressão automática.         │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│                                          [Salvar]      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Modal Alterar PIN

```
┌────────────────────────────────────────┐
│  Alterar PIN                       [×] │
├────────────────────────────────────────┤
│                                        │
│  PIN atual                             │
│  ┌──────────────────────────────────┐ │
│  │ ****                              │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Novo PIN                              │
│  ┌──────────────────────────────────┐ │
│  │ ****                              │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Confirmar novo PIN                    │
│  ┌──────────────────────────────────┐ │
│  │ ****                              │ │
│  └──────────────────────────────────┘ │
│                                        │
│              [Cancelar]  [Alterar]     │
│                                        │
└────────────────────────────────────────┘
```

## Componentes

### Página de Configurações

```tsx
interface SettingsPageProps {
  initialSettings: Settings
}

interface Settings {
  house_name: string
  printer_ip: string
  printer_type: PrinterType
  default_print_time: string
}
```

### Seção de Configuração

```tsx
interface SettingsSectionProps {
  title: string
  children: React.ReactNode
}
```

### Campo de IP

```tsx
interface IpInputProps {
  value: string
  onChange: (value: string) => void
  onTest: () => void
  status: 'idle' | 'testing' | 'connected' | 'error'
}
```

### Modal de PIN

```tsx
interface ChangePinModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (currentPin: string, newPin: string) => void
}
```

## Configurações

| Chave | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| house_name | string | "Minha Casa" | Nome exibido nas impressões |
| printer_ip | string | "192.168.1.230" | IP da impressora térmica |
| printer_type | enum | "EPSON" | Tipo da impressora |
| default_print_time | string | "07:00" | Horário padrão para jobs |
| app_pin | string | "1234" | PIN de acesso (não retornado) |

### Tipos de Impressora

```typescript
type PrinterType = 'EPSON' | 'STAR' | 'TANCA' | 'DARUMA'
```

## Validação

### Nome da casa
- Obrigatório
- Máximo: 50 caracteres

### IP da impressora
- Obrigatório
- Formato: IPv4 válido
- Regex: `/^(\d{1,3}\.){3}\d{1,3}$/`

### Horário padrão
- Obrigatório
- Formato: HH:mm (24h)
- Regex: `/^([01]\d|2[0-3]):[0-5]\d$/`

### PIN
- Obrigatório
- Apenas dígitos
- Mínimo: 4 caracteres
- Máximo: 8 caracteres

## Fluxo de Alteração de PIN

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Abrir      │────▶│  Preencher  │────▶│  Validar    │
│   Modal     │     │   Campos    │     │   Dados     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
     ┌─────────────────────────────────────────┘
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Verificar  │────▶│  Atualizar  │────▶│   Fechar    │
│  PIN atual  │     │   no DB     │     │   Modal     │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Teste de Impressora

### Fluxo

1. Usuário clica "Testar conexão"
2. UI mostra "Testando..."
3. Backend tenta conectar via TCP
4. Retorna sucesso ou erro
5. UI atualiza status

### Estados

```typescript
type PrinterStatus =
  | 'idle'      // Não testada
  | 'testing'   // Testando conexão
  | 'connected' // Conectada com sucesso
  | 'error'     // Erro de conexão
```

### Impressão de teste

```
┌─────────────────────────────────────┐
│                                     │
│        ======== TESTE ========      │
│                                     │
│        Casa da Praia                │
│        16/01/2024 14:30             │
│                                     │
│        Impressora OK!               │
│                                     │
│        ========================     │
│                                     │
└─────────────────────────────────────┘
```

## API Calls

### Carregar configurações

```typescript
// GET /api/settings

const { data: settings } = await fetch('/api/settings').then(r => r.json())
// Nota: app_pin nunca é retornado
```

### Salvar configurações

```typescript
// PUT /api/settings

const saveSettings = async (data: Partial<Settings>) => {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  return response.json()
}
```

### Alterar PIN

```typescript
// PUT /api/settings/pin

const changePin = async (currentPin: string, newPin: string) => {
  const response = await fetch('/api/settings/pin', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPin, newPin })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }

  return response.json()
}
```

### Testar impressora

```typescript
// POST /api/settings/test-printer

const testPrinter = async () => {
  const response = await fetch('/api/settings/test-printer', {
    method: 'POST'
  })

  return response.json()
}
```

## Estados do Formulário

### Carregando
```
┌────────────────────────────────────────┐
│  Configurações                         │
├────────────────────────────────────────┤
│                                        │
│        ████████████████████            │
│        ████████████████████            │
│        ████████████████████            │
│                                        │
└────────────────────────────────────────┘
```

### Salvando
- Botão "Salvar" com spinner
- Campos desabilitados
- Sem navegação

### Salvo com sucesso
- Toast de sucesso
- Campos habilitados novamente

### Erro
- Toast com mensagem de erro
- Campos mantidos
- Focus no campo com erro

## Segurança

### PIN
- Nunca enviado em GET
- Comparação em backend
- Hash bcrypt no banco (opcional)
- Não exibido na UI (apenas ****)

### Sessão
- Cookie httpOnly
- Regenerar após mudança de PIN
- Logout em todos os dispositivos (opcional)

## Testes

### Unitários
- Validação de IP
- Validação de horário
- Validação de PIN

### Integração
- Salvar configurações
- Testar impressora
- Alterar PIN

### E2E
- Alterar nome e verificar na impressão
- Testar impressora real
- Alterar PIN e fazer novo login
