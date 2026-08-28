# Tutorial Definitivo: Como Expandir o Seu Aplicativo Passo a Passo

Este tutorial é um guia prático, detalhado e à prova de falhas para adicionar novas telas, testes e funcionalidades no seu projeto. Ele foi feito para que você ou qualquer outro desenvolvedor consiga escalar o app sem quebrar a Arquitetura Limpa (Clean Architecture) ou a navegação do Expo Router.

Se você tiver uma ideia nova, veja qual cenário abaixo se encaixa melhor e siga a "receita".

---

## 🛠 Cenário 1: Criando uma Nova Tela Simples (Sem Banco de Dados)
Imagine que você quer criar uma tela de **"Sobre o App"** ou **"Configurações"** que só exibe textos ou botões visuais.

### Opção A: Uma Tela no Menu Lateral (Drawer)
1. Crie o arquivo `app/(drawer)/sobre.tsx`.
2. Escreva o código visual padrão:
   ```tsx
   import React from 'react';
   import { View, Text, StyleSheet } from 'react-native';

   export default function Sobre() {
     return (
       <View style={styles.container}>
         <Text style={styles.titulo}>Sobre este App</Text>
         <Text>Versão 1.0. Desenvolvido para mapear observações.</Text>
       </View>
     );
   }

   const styles = StyleSheet.create({
     container: { flex: 1, padding: 20, justifyContent: 'center' },
     titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 }
   });
   ```
3. Abra o arquivo `app/(drawer)/_layout.tsx` para fazer o item aparecer na gaveta lateral.
4. Adicione um novo `<Drawer.Screen>` dentro do `<Drawer>`:
   ```tsx
   <Drawer.Screen
     name='sobre' // Tem que ser exatamente o nome do arquivo que você criou (sem o .tsx)
     options={{
       drawerLabel: 'Sobre o App', // Nome que aparece na listinha do menu lateral
       title: 'Sobre' // Nome que aparece no cabeçalho quando a tela abre
     }}
   />
   ```

### Opção B: Uma Nova Tela na Barra Inferior (Tabs)
Se você quiser que a nova tela fique lá embaixo, do lado da "Câmera" e da "Lista":
1. Crie o arquivo `app/(drawer)/(tabs)/configuracoes.tsx`.
2. Escreva o código visual igual ao passo 2 acima.
3. Abra o arquivo `app/(drawer)/(tabs)/_layout.tsx`.
4. Adicione uma nova `<Tabs.Screen>`:
   ```tsx
   <Tabs.Screen
     name="configuracoes" // Nome do arquivo criado
     options={{
       title: 'Configurações',
       tabBarIcon: () => <Ionicons name="settings-outline" size={24} color={"black"}/>,
     }}
   />
   ```
*Dica: Você pode pesquisar outros nomes de ícones do Ionicons na documentação oficial do Expo Vector Icons para usar no lugar de `settings-outline`.*

---

## 🚀 Cenário 2: Criando uma Nova Funcionalidade com Banco de Dados (Regras de Negócio)
Se a sua nova tela precisa salvar, apagar ou carregar dados (ex: Um perfil de usuário, uma anotação de texto, um aviso de alerta), você não pode simplesmente jogar o código na tela. Você tem que usar a **Arquitetura Limpa**.

Vamos imaginar que vamos criar um sistema de **"Relatar Problema"** (Onde o usuário digita um problema que viu no app e salva).

### Passo 1: O Domínio (A Entidade)
Crie um arquivo `src/domain/entities/Problema.ts`.
```typescript
export class Problema {
    public readonly id: string;
    public descricao: string;

    constructor(id: string, descricao: string) {
        this.id = id;
        this.descricao = descricao;
        this.validate();
    }

    private validate(): void {
        // Regra de ouro: O problema não pode estar vazio e tem que ter mais de 10 letras
        if (this.descricao.length < 10) {
            throw new Error('A descrição precisa ser mais detalhada.');
        }
    }
}
```

### Passo 2: O Contrato (Repositório)
Crie um arquivo `src/domain/repositories/ProblemaRepository.ts`.
```typescript
import { Problema } from "../entities/Problema";

export interface ProblemaRepository {
    save(problema: Problema): Promise<void>;
}
```

### Passo 3: O Banco de Dados (Infraestrutura)
Crie um arquivo `src/infra/inMemoryProblemaRepository.ts`.
```typescript
import { Problema } from "../domain/entities/Problema";
import { ProblemaRepository } from "../domain/repositories/ProblemaRepository";

export class InMemoryProblemaRepository implements ProblemaRepository {
    private problemas: Problema[] = [];
    private static instance: InMemoryProblemaRepository;

    private constructor() { }

    public static getInstance(): InMemoryProblemaRepository {
        if (!InMemoryProblemaRepository.instance) {
            InMemoryProblemaRepository.instance = new InMemoryProblemaRepository();
        }
        return InMemoryProblemaRepository.instance;
    }

    async save(problema: Problema): Promise<void> {
        this.problemas.push(problema);
    }
}
```

### Passo 4: O Caso de Uso
Crie o arquivo `src/usecases/RegistrarProblema.ts`.
```typescript
import * as Crypto from "expo-crypto";
import { Problema } from "../domain/entities/Problema";
import { ProblemaRepository } from "../domain/repositories/ProblemaRepository";

export class RegistrarProblema {
    constructor(private readonly repository: ProblemaRepository) {}

    public async execute(descricao: string) {
        const novoProblema = new Problema(Crypto.randomUUID(), descricao);
        await this.repository.save(novoProblema);
        return novoProblema;
    }
}
```

### Passo 5: A Fábrica (Container)
Vá em `src/fectorie/container.ts` e ligue os fios.
```typescript
// Importe as duas classes que você criou nos passos 3 e 4 no topo do arquivo...
// Adicione as variáveis na classe:
public readonly inMemoryProblemaRepository: InMemoryProblemaRepository;
public readonly registrarProblema: RegistrarProblema;

// E no constructor adicione:
this.inMemoryProblemaRepository = InMemoryProblemaRepository.getInstance();
this.registrarProblema = new RegistrarProblema(this.inMemoryProblemaRepository);
```

### Passo 6: Usar na Tela
Lá na sua tela visual (no `app/`), você faria um botão salvar que roda:
```tsx
import { container } from '@/src/fectorie/container';

async function salvarProblema() {
  try {
    await container.registrarProblema.execute("O botão de virar a câmera está sumindo");
    alert("Salvo com sucesso!");
  } catch (error) {
    // Se a descrição for menor que 10, o throw new Error() da Entidade vai cair exatamente aqui no catch!
    alert(error.message); 
  }
}
```

---

## 🧪 Cenário 3: Adicionando Novos Testes (Jest)

Você precisa testar o que acabou de criar no Passo 2 (Para ter certeza absoluta que a regra das 10 letras funciona antes mesmo de construir as telas do app).

1. Vá na pasta `tests/domain/` e crie `Problema.test.ts`.
2. Escreva o teste pensando nas 3 etapas: **Arrumar** (Variáveis), **Agir** (Executar a lógica), **Afirmar** (Ver se deu certo).

```typescript
import { Problema } from '../../src/domain/entities/Problema';

describe('Entidade Problema', () => {

    it('Deve criar um problema normalmente se tiver mais de 10 letras', () => {
        // Agir
        const problema = new Problema('id-123', 'A tela está travando demais');
        
        // Afirmar
        expect(problema.id).toBe('id-123');
        expect(problema.descricao).toBe('A tela está travando demais');
    });

    it('Deve dar erro se o problema for muito curto', () => {
        // Ao testar erros, você PRECISA englobar a criação numa função anônima () =>
        // Se colocar direto, o Jest não consegue segurar o erro e ele "quebra" o teste
        expect(() => new Problema('123', 'Erro')).toThrow('A descrição precisa ser mais detalhada.');
    });

});
```

3. Abra seu terminal, digite `npx jest` e pressione `Enter`. Se os testes passarem, significa que sua lógica de negócios é a prova de balas.

---

## 📸 Cenário 4: Copiando a Magia da Câmera e GPS

Se a sua nova funcionalidade também precisa usar as ferramentas do celular nativo, não reinvente a roda. 
Toda a base para isso está no seu arquivo `app/(drawer)/(tabs)/index.tsx`.

- **Se precisar de GPS em uma tela:** Pegue o código do `Location.requestForegroundPermissionsAsync()` e o Hook de state `[location, setLocation]` e coloque no `useEffect` da sua nova tela.
- **Se precisar da Câmera:** Use o componente da biblioteca `expo-camera`. Lembre-se sempre de importar o `useCameraPermissions`, criar um if perguntando `if (!permission.granted)` para pedir pro usuário confirmar que o app pode usar a câmera dele.

Com isso, o seu app pode crescer infinitamente organizado e seguro!
