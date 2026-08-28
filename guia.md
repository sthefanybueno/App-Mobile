# Guia de Arquitetura e Funcionamento do App (Versão Ultra Detalhada)

Este documento é a explicação **linha a linha** de **TODOS** os arquivos que fazem o motor do aplicativo funcionar. O projeto foi construído utilizando **React Native + Expo Router** para a interface e a **Clean Architecture (Arquitetura Limpa)** para as regras de negócio.

---

## 📂 Pasta `src/` (O "Coração" do App)
A pasta `src` abriga todas as lógicas que não dependem da interface. 

### 1. `domain/` (Domínio)
Onde ficam as entidades e contratos.

#### `entities/Observation.ts` (A Entidade Principal)
```typescript
import { Coordinates } from "../value-objects/Coordinates";

export class Observation {
    // public readonly id: Pode ser lido por todos, mas nunca alterado após criar.
    public readonly id: string;
    public readonly coordinates: Coordinates;
    
    // Caminho da foto. É public para podermos trocar a foto depois usando o updatePhoto.
    public photo: string
    
    // Construtor: Executado sempre que fazemos "new Observation(...)"
    constructor(id: string, coordinates: Coordinates, photo: string) {
        this.id = id;
        this.coordinates = coordinates;
        this.photo = photo;
        
        // Valida a si mesma assim que nasce
        this.validate();
    }

    // Método privado (só pode ser chamado por dentro desta classe)
    private validate(): void {
        // Exige que a foto não seja vazia e contenha "://" (presente em file:// ou http://)
        if (!this.photo || !this.photo.includes('://')) {
            throw new Error('Foto inválida');
        }
    }

    // Função pública para trocar a foto
    public updatePhoto(photo: string): void {
        this.photo = photo;
        this.validate(); // Re-valida a nova foto
    }
}
```

#### `value-objects/Coordinates.ts` (Objeto de Valor)
```typescript
export class Coordinates {
    // Declarar variáveis direto no construtor com "public readonly" poupa a criação de "this.var = var"
    constructor (
        public readonly latitude: number,
        public readonly longitude: number
    ) {
        this.validate();
    }

    private validate(): void {
        // Limites geográficos reais da Terra
        if (this.latitude < -90 || this.latitude > 90) {
            throw new Error('Latitude inválida');
        }
        if (this.longitude < -180 || this.longitude > 180) {
            throw new Error('Longitude inválida');
        }
    }
}
```

#### `repositories/ObservationRepository.ts` (O Contrato)
```typescript
import { Observation } from "../entities/Observation";

// A Interface não tem lógica (código rodando). Só dita as regras: 
// "Quem for o banco de dados, OBRIGATORIAMENTE tem que ter essas 3 funções"
export interface ObservationRepository {
    save(observation: Observation): Promise<void>;
    findById(id: string): Promise<Observation | null>;
    findAll(): Promise<Observation[]>;
}
```

---

### 2. `infra/` (Infraestrutura)
A camada de persistência.

#### `inMemoryObservationRepository.ts` (O Banco de Dados Falso)
```typescript
import { Observation } from "../domain/entities/Observation";
import { ObservationRepository } from "../domain/repositories/ObservationRepository";

// Essa classe assina (implements) o contrato do ObservationRepository
export class InMemoryObservationRepository implements ObservationRepository {
    
    // Onde os dados realmente ficam guardados (na Memória RAM)
    private observations: Observation[] = [];
    
    // Padrão Singleton: Só existirá 1 instância (1 banco) rodando no app todo.
    private static instance: InMemoryObservationRepository;

    // Ninguém de fora faz "new InMemoryObservationRepository"
    private constructor() { }

    // Chama-se essa função para obter o banco
    public static getInstance(): InMemoryObservationRepository {
        if (!InMemoryObservationRepository.instance) {
            InMemoryObservationRepository.instance = new InMemoryObservationRepository(); 
        }
        return InMemoryObservationRepository.instance;
    }

    // Salva empurrando (push) a observação para o fim do array
    async save(observation: Observation): Promise<void> {
        this.observations.push(observation);
    }
    
    // Procura no array um id igual ao pedido
    async findById(id: string): Promise<Observation | null> {
        return this.observations.find(obs => obs.id === id) || null;
    }
    
    // Retorna uma CÓPIA ([...array]) do array. Impede bugs no React.
    async findAll(): Promise<Observation[]> {
        return [...this.observations];
    }
}
```

---

### 3. `usecases/` (Casos de Uso)
Onde as regras/ações da aplicação acontecem.

#### `RegisterObservation.ts` (Caso de Uso de Registrar Foto)
```typescript
import * as Crypto from "expo-crypto"; 
import { Observation } from "../domain/entities/Observation";
import { ObservationRepository } from "../domain/repositories/ObservationRepository";
import { Coordinates } from "../domain/value-objects/Coordinates";

// DTO: Os dados brutos necessários para a ação acontecer
export interface RegisterObservationDTO {
    latitude: number;
    longitude: number;
    photo: string;
}

export class RegisterObservation {
    // Injeção de Dependência: Recebe o contrato do Repositório.
    constructor(private readonly repository: ObservationRepository) {}

    public async execute(input: RegisterObservationDTO) {
        // Monta a coordenada
        const coordinates = new Coordinates(input.latitude, input.longitude);
        
        // Monta a Entidade com um ID gerado na hora
        const observation = new Observation(
            Crypto.randomUUID(), 
            coordinates, 
            input.photo
        );
        
        // Chama a função do Repositório para salvar
        await this.repository.save(observation);
        return observation;
    }
}
```

#### `ListObservations.ts` (Caso de Uso de Listar)
```typescript
import { ObservationRepository } from "../domain/repositories/ObservationRepository";

export class ListObservations {
    constructor(private readonly repository: ObservationRepository) { }

    public async execute() {
        return await this.repository.findAll();
    }
}
```

---

### 4. `fectorie/` (Fábrica)
#### `container.ts` (Injeção de Dependência)
```typescript
import { InMemoryObservationRepository } from "../infra/inMemoryObservationRepository";
import { ListObservations } from "../usecases/ListObservations";
import { RegisterObservation } from "../usecases/RegisterObservation";

class Container {
    // Mais um Singleton.
    private static instance: Container;
    public readonly InMemoryObservationRepository: InMemoryObservationRepository;
    public readonly registerObservation: RegisterObservation;
    public readonly listObservations: ListObservations;

    private constructor() {
        // Constrói o banco 
        this.InMemoryObservationRepository = InMemoryObservationRepository.getInstance()
        // Constrói os casos de uso e passa o banco lá pra dentro deles
        this.registerObservation = new RegisterObservation(this.InMemoryObservationRepository);
        this.listObservations = new ListObservations(this.InMemoryObservationRepository);
    }

    public static getInstance(): Container {
        if (!this.instance) {
            this.instance = new Container();
        }
        return this.instance;
    }
}
// Exporta a "caixa de ferramentas" pronta
export const container = Container.getInstance();
```

---

## 📂 Pasta `app/` (Interface / Expo Router)
Aqui ficam todas as Telas e Roteamentos do aplicativo. O nome dos arquivos e pastas ditam as páginas do app.

### Configurações de Navegação (Layouts)

#### `app/_layout.tsx` (Layout Raiz)
```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated'; // Biblioteca de animações base do Expo

// Força o expo router a carregar a pasta (drawer) primeiro
export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  return (
    <>
    {/* Stack = Navegação de pilha (uma tela por cima da outra) */}
    {/* headerShown: false esconde aquele cabeçalho feio nativo do celular */}
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(drawer)" />
      {/* Exemplo de como abrir uma tela como Modal (Pop-up arrastável) */}
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
    <StatusBar style="auto" />
    </>
  );
}
```

#### `app/(drawer)/_layout.tsx` (Menu Lateral)
```tsx
import { Drawer } from 'expo-router/drawer'

export default function DrawerLayout() {
  return (
    // Componente Drawer cria a gaveta puxável do lado esquerdo
    <Drawer>
      {/* Opção 1 da gaveta: O Painel de Abas */}
      <Drawer.Screen
        name='(tabs)'
        options={{ drawerLabel: 'Painel', title: 'Painel' }}
      />
      {/* Opção 2 da gaveta: Página "Hello" */}
      <Drawer.Screen
        name='hellopage'
        options={{ drawerLabel: 'Hello', title: 'Hello' }}
      />
    </Drawer>
  )
}
```

#### `app/(drawer)/(tabs)/_layout.tsx` (Menu Inferior de Abas)
```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {/* Tela index = Aba Câmera */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Camera',
          // Desenha o ícone na barra usando o pacote nativo Ionicons
          tabBarIcon: () => <Ionicons name="camera-outline" size={24} color={"black"}/>,
        }}
      />
      {/* Tela maps = Aba Maps */}
      <Tabs.Screen
        name="maps"
        options={{
          title: 'Maps',
          tabBarIcon: () => <Ionicons name="map-outline" size={24} color={"black"}/>,
        }}
      />
      {/* Tela list = Aba Lista */}
      <Tabs.Screen
        name="list"
        options={{
          title: 'Lista',
          tabBarIcon: () => <Ionicons name="list-outline" size={24} color={"black"}/>,
        }}
      />
    </Tabs>
  );
}
```

### As Telas (Páginas)

#### `app/(drawer)/(tabs)/index.tsx` (A Câmera)
```tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCameraPermissions, CameraView } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { container } from '@/src/fectorie/container'; // Caixa de ferramentas!
import { useRouter } from 'expo-router';

export default function App() {
  // Pede e lê a permissão de câmera do celular
  const [permission, requestPermission] = useCameraPermissions();
  
  // facing = Controla se a câmera é a de trás (back) ou da frente (front)
  const [facing, setFacing] = useState<any>('back');
  
  // Guarda o caminho (URI) da foto batida
  const [photo, setPhoto] = useState<string | null>(null);
  
  // Guarda as coordenadas do GPS
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  // Referência mágica que "segura" a câmera real para podermos mandar o comando takePicture
  const cameraRef = useRef<CameraView>(null);
  
  // Ferramenta de navegar entre telas
  const router = useRouter();

  // useEffect que roda SOMENTE quando a tela abre pela 1ª vez
  useEffect(() => {
    async function getCurrentLocation() {
      // Pergunta se o usuário aceita dar a localização (GPS)
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Pega a coordenada. "Accuracy.Balanced" tenta ser rápido sem devorar bateria
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }
    getCurrentLocation();
  }, [])

  // Se o usuário ainda não respondeu se aceita a câmera, não renderiza nada
  if (!permission) return <View />;

  // Se ele recusou, exibe um texto e o botão de pedir de novo
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>Permissão de câmera é necessária</Text>
        <TouchableOpacity onPress={requestPermission}>
           <Text>Pedir permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Se tem a foto batida em cache...
  if (photo) {
    return (
      <View style={styles.container}>
        {/* Mostra as ações para Limpar ou Salvar usando os Casos de Uso (container) */}
      </View>
    )
  }

  // O componente Câmera, onde as coisas acontecem
  return (
      <>
        {/* Renderiza o que a câmera do celular tá enxergando */}
        <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
        
        {/* Botão absoluto que inverte a câmera (frente/trás) */}
        <View style={styles.buttonFlip}>
           <TouchableOpacity onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}>
              <Text>Virar</Text>
           </TouchableOpacity>
        </View>
        
        {/* Botão que bate a foto */}
        <View style={styles.buttonCapture}>
           <TouchableOpacity onPress={async () => {
             // Quando clica, fala pra referência bater a foto e salva no State 'photo'
             if (cameraRef.current) {
                const foto = await cameraRef.current.takePictureAsync();
                setPhoto(foto!.uri);
             }
           }}>
              <Text>Capturar</Text>
           </TouchableOpacity>
        </View>
      </>
  )
}
```

#### `app/(drawer)/(tabs)/list.tsx` (A Listagem)
```tsx
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { useState, useCallback } from 'react';
import { Observation } from '@/src/domain/entities/Observation';
import { container } from '@/src/fectorie/container'; 
import { useFocusEffect } from 'expo-router'; 

export default function List() {
  const [list, setList] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true); // Controla a tela de load

  // useFocusEffect atualiza a página INTEIRA vez que você seleciona a aba "Lista"
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      
      // Busca todas as observações registradas no Banco de Dados Fake
      container.listObservations.execute().then((res) => { 
        if (active) setList(res);
      }).finally(() => {
        if (active) setLoading(false); // Some o Load
      })
      return () => {active = false;} 
    }, [])
  )

  // Função para desenhar CADA CÉLULA da Lista (Card)
  const renderItem = ({ item }: { item: Observation }) => {
      return (
          <View style={styles.card}>
              <Image source={{ uri: item.photo }} resizeMode="cover" style={styles.image}/>
              <View style={styles.info}>
                  <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Latitude:</Text> {item.coordinates.latitude.toFixed(4)}</Text>
                  <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Longitude:</Text> {item.coordinates.longitude.toFixed(4)}</Text>
              </View>
          </View>
      )
  }

  return (
    <View style={styles.container}>
      {loading ? (
          // Componente oficial do React Native que roda aquela rodinha nativa do iPhone/Android
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          // Componente FlatList recicla memória. Não explode se tiver 100 mil fotos.
          <FlatList
            data={list} // Os dados
            keyExtractor={(item) => item.id} // Identificador único pra não dar bug
            renderItem={renderItem} // Como desenhar cada linha
          />
        )}
    </View>
  )
}
```

---

## 📂 Pasta `tests/` (Testes Automatizados - Jest)
Responsável por garantir que as Regras de Negócio nunca quebrem. Você manda um dado errado de propósito e verifica se o código se defendeu lançando Erro.

#### `tests/domain/Coordinates.test.ts`
```typescript
import { Coordinates } from '../../src/domain/value-objects/Coordinates';

// describe = Grupo de testes
describe('Coordinates Value Object', () => {
    
    // it = "Isso deve..." (um teste unitário)
    it('should create an instance of Coordinates', () => {
        // Envia dados normais
        const coordinates = new Coordinates(10, 20);
        // Espera-se que latitude seja 10 e não dê erro
        expect(coordinates.latitude).toBe(10);
    });
    
    it('should throw an error if the latitude is not valid', () => {
        // Envia Latitude "100" (Limite da terra é 90)
        // Usa ()=> new ... porque se ele jogar o erro direto o Jest para. 
        // Com a função o Jest "captura" o erro e vê a mensagem.
        expect(() => new Coordinates(100, 20)).toThrow('Latitude inválida');
    });
});
```

#### `tests/domain/Observations.test.ts`
```typescript
import { Observation } from "@/src/domain/entities/Observation";
// ... (omissão para não ficar repetitivo, mas usa a mesma lógica do toThrow('Foto inválida') testando strings vazias ou palavras com a validação "://")
```

---

### Conclusão

Pronto! Ao analisar esse guia, você tem acesso ao **DNA** completo do aplicativo. 
- O **Expo Router** desenha a casca (gaveta, abas e navegação visual).
- Os arquivos dentro do **`app/`** são as janelas do usuário e usam Hooks do React e Ferramentas do Celular (Expo Camera, Expo Location).
- Quando o usuário decide "fazer algo importante" (salvar dados), a interface "conversa" com o **`container.ts`** na pasta `src/`.
- O **Container** já está conectado com os Casos de Uso.
- O **Caso de uso** entende as Regras de Negócio (Entidades e Value Objects) e, se estiver tudo certo, conversa com a Infraestrutura (**Banco de Dados**) e manda arquivar os dados.
