# Tutorial Definitivo: Como Expandir o Seu Aplicativo Passo a Passo

Este tutorial é um guia prático, detalhado e à prova de falhas para adicionar novas telas, testes e funcionalidades no seu projeto. Ele foi feito para que você consiga escalar o app sem quebrar a Arquitetura Limpa ou a navegação do Expo Router.

Se você tiver uma ideia nova, veja qual cenário abaixo se encaixa melhor e siga a "receita".

---

## 🛠 Cenário 1: Criando Novas Telas (Drawer, Tabs e Modais)

Quando usar: Você quer adicionar uma tela estática, seja uma tela comum no menu lateral, uma aba extra no rodapé, ou uma janelinha que abre por cima de tudo (modal).

### Opção A: Uma Tela no Menu Lateral (Drawer)
Use para telas gerais, como "Dúvidas Frequentes" ou "Suporte".

1. Crie o arquivo `app/(drawer)/suporte.tsx`.
2. Escreva o código visual padrão:
   ```tsx
   import React from 'react';
   import { View, Text, StyleSheet } from 'react-native';

   export default function Suporte() {
     return (
       <View style={styles.container}>
         <Text style={styles.titulo}>Suporte Técnico</Text>
         <Text>Fale conosco pelo telefone: 0800-1234.</Text>
       </View>
     );
   }

   const styles = StyleSheet.create({
     container: { flex: 1, padding: 20, justifyContent: 'center' },
     titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 }
   });
   ```
3. Abra o arquivo `app/(drawer)/_layout.tsx` e adicione um `<Drawer.Screen>` para ela:
   ```tsx
   <Drawer.Screen
     name='suporte' // Nome exato do arquivo sem .tsx
     options={{ drawerLabel: 'Suporte', title: 'Ajuda' }}
   />
   ```

### Opção B: Uma Tela na Barra Inferior (Tabs)
Use para funcionalidades principais de uso rápido, como um "Perfil".

1. Crie o arquivo `app/(drawer)/(tabs)/perfil.tsx`.
2. Cole o código visual idêntico ao Passo 2 da opção acima, apenas trocando o nome para `Perfil`.
3. Abra `app/(drawer)/(tabs)/_layout.tsx` e adicione na lista de abas:
   ```tsx
   <Tabs.Screen
     name="perfil"
     options={{
       title: 'Perfil',
       tabBarIcon: () => <Ionicons name="person-outline" size={24} color={"black"}/>,
     }}
   />
   ```

### Opção C: Uma Tela Flutuante (Modal)
Use para exibir um aviso rápido por cima de tudo (como "Termos de Uso") de onde o usuário pode voltar com um swipe (arrastar para baixo).

1. Crie o arquivo `app/termos.tsx`.
2. Escreva o código do modal:
   ```tsx
   import { View, Text, StyleSheet } from 'react-native';

   export default function TermosModal() {
     return (
       <View style={styles.container}>
         <Text>Aqui estão os longos termos de uso do aplicativo...</Text>
       </View>
     );
   }
   const styles = StyleSheet.create({ container: { flex: 1, padding: 20 } });
   ```
3. Abra o arquivo `app/_layout.tsx` (o principal) e registre o modal na pilha:
   ```tsx
   {/* Coloque junto com as outras Stack.Screen já existentes */}
   <Stack.Screen name="termos" options={{ presentation: 'modal', title: 'Termos de Uso' }} />
   ```

---

## 🚀 Cenário 2: Movimentando o Usuário (Navegação via Código e Links)

Quando usar: Quando o usuário clica num botão e você precisa enviá-lo para outra página (como ao terminar o Login).

### Opção A: Navegação Direta via Botão (Router Replace)
Use quando quiser que o usuário vá para a próxima tela e **não possa voltar** para a anterior (ex: Logar e ir para o painel principal).
   ```tsx
   import { router } from 'expo-router';
   import { TouchableOpacity, Text } from 'react-native';

   export default function MeuComponente() {
     return (
       <TouchableOpacity onPress={() => router.replace('./(drawer)/(tabs)/')}>
         <Text>Acessar Sistema</Text>
       </TouchableOpacity>
     )
   }
   ```

### Opção B: Navegação Flexível via Link
Use quando quiser um comportamento de link normal, como clicar para ver o Modal de Termos que criamos, podendo ser facilmente fechado (dispensado).
   ```tsx
   import { Link } from 'expo-router';
   import { Text } from 'react-native';

   export default function OutraTela() {
     return (
       <Link href="/termos" dismissTo style={{ padding: 15 }}>
         <Text>Leia nossos termos clicando aqui</Text>
       </Link>
     )
   }
   ```

---

## ⏱ Cenário 3: Gerenciando o Carregamento da Tela (useEffect vs useFocusEffect)

Quando usar: Quando você precisa buscar dados antes de exibi-los. Escolher o hook errado causará telas que não atualizam ou gastam bateria em excesso.

### Opção A: Apenas na Primeira Vez (useEffect)
Use para algo pesado que só precisa rodar UMA vez quando a tela for ligada, como pedir permissão para acessar o microfone.
   ```tsx
   import { useEffect } from 'react';
   
   export default function Gravador() {
     useEffect(() => {
       // Tudo o que está aqui só roda quando a tela abre pela 1ª vez na vida útil do app.
       console.log("Pedindo permissão ao usuário...");
     }, []); // Esse array vazio é o segredo!
     return null;
   }
   ```

### Opção B: Toda Vez que a Aba for Aberta (useFocusEffect)
Use em telas que exibem dados que mudam com frequência, como um extrato bancário (se o usuário depositou e voltou pra tela, o saldo deve estar novo).
   ```tsx
   import { useState, useCallback } from 'react';
   import { useFocusEffect } from 'expo-router';
   
   export default function Extrato() {
     const [saldo, setSaldo] = useState(0);

     useFocusEffect(
       useCallback(() => {
         // Tudo o que está aqui roda DE NOVO sempre que o usuário pisar nesta aba
         let ativo = true;
         // Simulando uma busca de saldo...
         setTimeout(() => { if (ativo) setSaldo(50); }, 500);

         // Proteção para o caso de o usuário clicar e fechar a aba muito rápido
         return () => { ativo = false; } 
       }, [])
     );
     return null;
   }
   ```

---

## 📸 Cenário 4: Copiando a Magia das Ferramentas do Celular

Quando usar: O usuário precisa tirar uma foto ou pegar sua localização em uma nova funcionalidade (ex: Criar um check-in).

- **Se precisar de GPS:** 
  Pegue o código do `Location.requestForegroundPermissionsAsync()` na documentação e o Hook `[location, setLocation]`. Jogue no seu `useEffect`. Toda a base já existe no arquivo `maps.tsx` e `index.tsx`.
- **Se precisar da Câmera:** 
  Use a biblioteca nativa `expo-camera`. Lembre-se sempre de criar um if dizendo `if (!permission.granted)` para garantir que uma tela com o botão "Pedir permissão" apareça se o celular travar a câmera. A sintaxe de uso com `<CameraView>` já existe na Aba de Câmera (`index.tsx` de abas).

---

## 🏗 Cenário 5: Criando Funcionalidade com Banco de Dados (Regras de Negócio)

Quando usar: Se a sua nova tela precisa salvar, apagar ou enviar informações (ex: Cadastrar um "Lembrete"). Nunca jogue lógica direta na tela; use Arquitetura Limpa.

### Passo 1: O Domínio (A Entidade e Contrato)
Crie o arquivo `src/domain/entities/Lembrete.ts` com regras inquebráveis.
```typescript
import * as Crypto from "expo-crypto"; // Vamos gerar o ID na entidade desta vez para variar o exemplo

export class Lembrete {
    public readonly id: string;
    public titulo: string;

    constructor(titulo: string) {
        this.id = Crypto.randomUUID();
        this.titulo = titulo;
        if (this.titulo.length < 3) {
            throw new Error('O título precisa ter pelo menos 3 letras.');
        }
    }
}
```
Crie `src/domain/repositories/LembreteRepository.ts`:
```typescript
import { Lembrete } from "../entities/Lembrete";
export interface LembreteRepository { save(lembrete: Lembrete): Promise<void>; }
```

### Passo 2: O Banco de Dados (Infraestrutura)
Crie `src/infra/inMemoryLembreteRepository.ts`.
```typescript
import { Lembrete } from "../domain/entities/Lembrete";
import { LembreteRepository } from "../domain/repositories/LembreteRepository";

export class InMemoryLembreteRepository implements LembreteRepository {
    private lembretes: Lembrete[] = [];
    private static instance: InMemoryLembreteRepository;

    private constructor() { }

    public static getInstance(): InMemoryLembreteRepository {
        if (!InMemoryLembreteRepository.instance) {
            InMemoryLembreteRepository.instance = new InMemoryLembreteRepository();
        }
        return InMemoryLembreteRepository.instance;
    }

    async save(lembrete: Lembrete): Promise<void> { this.lembretes.push(lembrete); }
}
```

### Passo 3: O Caso de Uso
Crie `src/usecases/CriarLembrete.ts`.
```typescript
import { Lembrete } from "../domain/entities/Lembrete";
import { LembreteRepository } from "../domain/repositories/LembreteRepository";

export class CriarLembrete {
    constructor(private readonly repository: LembreteRepository) {}

    public async execute(titulo: string) {
        const novoLembrete = new Lembrete(titulo);
        await this.repository.save(novoLembrete);
        return novoLembrete;
    }
}
```

### Passo 4: A Fábrica (Container)
Abra `src/fectorie/container.ts` e ligue tudo:
```typescript
import { InMemoryLembreteRepository } from "../infra/inMemoryLembreteRepository";
import { CriarLembrete } from "../usecases/CriarLembrete";

// Dentro da classe Container:
public readonly inMemoryLembreteRepository: InMemoryLembreteRepository;
public readonly criarLembrete: CriarLembrete;

// No construtor:
this.inMemoryLembreteRepository = InMemoryLembreteRepository.getInstance();
this.criarLembrete = new CriarLembrete(this.inMemoryLembreteRepository);
```

### Passo 5: Usar na Tela Visual
No arquivo da tela no seu `app/`, você chamaria:
```tsx
import { container } from '@/src/fectorie/container';

async function salvarNovoLembrete() {
  try {
    await container.criarLembrete.execute("Ir ao mercado");
    alert("Salvo com sucesso!");
  } catch (error) {
    // A regra de ter menos de 3 letras seria capturada aqui!
    alert(error.message); 
  }
}
```

---

## 🧪 Cenário 6: Adicionando Novos Testes Unitários

Quando usar: Para garantir que as regras da sua nova Entidade Lembrete funcionem, antes mesmo de criar o design da tela. Você não precisa testar a tela visual (botões), apenas o núcleo.

1. Na pasta `tests/domain/`, crie `Lembrete.test.ts`.
2. Escreva o teste verificando falhas e sucessos.
```typescript
import { Lembrete } from '../../src/domain/entities/Lembrete';

describe('Entidade Lembrete', () => {

    it('Deve criar um lembrete válido e gerar ID automaticamente', () => {
        const lembrete = new Lembrete('Comprar Pão');
        expect(lembrete.titulo).toBe('Comprar Pão');
        // Checa se gerou um ID aleatório (qualquer string longa)
        expect(lembrete.id.length).toBeGreaterThan(10);
    });

    it('Deve rejeitar lembretes curtos demais', () => {
        // Envolve em () => para que o Jest não crashe ao ver o Error
        expect(() => new Lembrete('Oi')).toThrow('O título precisa ter pelo menos 3 letras.');
    });
});
```

*Nota: Se o seu teste for renderizar algum visual nativo com fontes e ícones, o arquivo `tests/setup.ts` já contém o código (Mocks) necessário para pular o carregamento das fontes do Expo, garantindo que tudo rode liso.*
