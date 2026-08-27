# Guia de Arquitetura e Funcionamento do App (Versão Detalhada)

Este documento é a explicação **linha a linha** de todos os arquivos que fazem o motor do aplicativo funcionar. O projeto foi construído utilizando **React Native + Expo Router** para a interface e a **Clean Architecture (Arquitetura Limpa)** para as regras de negócio.

---

## 📂 Pasta `src/` (O "Coração" do App)
A pasta `src` abriga todas as lógicas que não dependem da interface. Se amanhã o React Native deixar de existir e formos fazer um site para web, a pasta `src` pode ser aproveitada 100% sem alterações.

### 1. `domain/` (Domínio)
Onde ficam as entidades e contratos do mundo real que o app tenta representar.

#### `entities/Observation.ts` (A Entidade Principal)
```typescript
// Importa a classe Coordinates que fica em outra pasta
import { Coordinates } from "../value-objects/Coordinates";

// Exporta a classe para ela poder ser usada fora do arquivo
export class Observation {
    // public readonly id: O id pode ser lido por qualquer um (public),
    // mas não pode ser alterado depois que a observação é criada (readonly)
    public readonly id: string;
    
    // Mesma lógica do ID, guarda a latitude e longitude
    public readonly coordinates: Coordinates;
    
    // Caminho da foto. É public, mas não é readonly pois podemos trocar a foto depois
    public photo: string
    
    // O construtor é a função chamada quando fazemos "new Observation(...)"
    constructor(id: string, coordinates: Coordinates, photo: string) {
        this.id = id;                     // Salva o id recebido
        this.coordinates = coordinates;   // Salva a coordenada recebida
        this.photo = photo;               // Salva a foto recebida
        
        // Assim que a observação nasce, validamos se os dados fazem sentido
        this.validate();
    }

    // Método privado (ninguém de fora da classe pode chamar)
    private validate(): void {
        // Se a foto não existir, for vazia, ou não tiver "://" (que é padrão em file:// ou http://)
        if (!this.photo || !this.photo.includes('://')) {
            // Lança um erro parando o programa. Não deixa criar a observação inválida.
            throw new Error('Foto inválida');
        }
    }

    // Método público para trocar a foto. Qualquer tela pode chamar.
    public updatePhoto(photo: string): void {
        this.photo = photo; // Atualiza a variável
        this.validate();    // Roda a validação de novo para garantir que a foto nova é boa
    }
}
```

#### `value-objects/Coordinates.ts` (Objeto de Valor)
```typescript
export class Coordinates {
    // O construtor no TypeScript permite já declarar e salvar as variáveis direto aqui,
    // apenas colocando "public readonly" antes do nome, poupando a repetição do "this..."
    constructor (
        public readonly latitude: number,
        public readonly longitude: number
    ) {
        this.validate(); // Ao instanciar a coordenada, a validação é chamada
    }

    private validate(): void {
        // Latitude da Terra varia entre -90 e 90 (Polos Norte/Sul)
        if (this.latitude < -90 || this.latitude > 90) {
            throw new Error('Latitude inválida');
        }
        // Longitude varia entre -180 e 180 (Linha do Equador)
        if (this.longitude < -180 || this.longitude > 180) {
            throw new Error('Longitude inválida');
        }
    }
}
```

#### `repositories/ObservationRepository.ts` (O Contrato)
```typescript
import { Observation } from "../entities/Observation";

// Uma interface é como um contrato. Ela diz "O QUE" deve ser feito, mas não diz "COMO"
export interface ObservationRepository {
    // Quem assinar esse contrato tem que ter um método que recebe uma Observation 
    // e retorna uma Promise vazia (void)
    save(observation: Observation): Promise<void>;
    
    // Tem que buscar pelo ID e devolver a Observação, ou null (vazio) se não achar
    findById(id: string): Promise<Observation | null>;
    
    // Tem que devolver uma Lista completa de Observações.
    findAll(): Promise<Observation[]>;
}
```

---

### 2. `infra/` (Infraestrutura)
A camada que "suja a mão" salvando no banco de dados.

#### `inMemoryObservationRepository.ts` (O Banco de Dados Falso)
```typescript
import { Observation } from "../domain/entities/Observation";
import { ObservationRepository } from "../domain/repositories/ObservationRepository";

// Essa classe "assina" o contrato do ObservationRepository
export class InMemoryObservationRepository implements ObservationRepository {
    
    // É aqui que os dados são guardados de verdade. Um array (lista) privado de observações.
    private observations: Observation[] = [];
    
    // Variável estática que guarda a ÚNICA instância do banco em todo o app (Singleton)
    private static instance: InMemoryObservationRepository;

    // Construtor privado: Ninguém fora dessa classe consegue fazer "new InMemory..."
    private constructor() { }

    // Método que as outras classes chamam para pegar o banco de dados
    public static getInstance(): InMemoryObservationRepository {
        // Se a instância ainda não existir (primeira vez rodando)...
        if (!InMemoryObservationRepository.instance) {
            // ...ele cria ela.
            InMemoryObservationRepository.instance = new InMemoryObservationRepository();
        }
        // Devolve a mesma instância sempre. Assim os dados não somem entre as telas.
        return InMemoryObservationRepository.instance;
    }

    // O "COMO" o método do contrato funciona: ele só dá um .push (adiciona) no array
    async save(observation: Observation): Promise<void> {
        this.observations.push(observation);
    }
    
    // O "COMO" ele busca por ID: Roda um find no array
    async findById(id: string): Promise<Observation | null> {
        return this.observations.find(obs => obs.id === id) || null;
    }
    
    // O "COMO" ele busca tudo: Retorna uma CÓPIA do array ([...array]).
    // Isso é importante no React para ele perceber que algo mudou e atualizar a tela.
    async findAll(): Promise<Observation[]> {
        return [...this.observations];
    }
}
```

---

### 3. `usecases/` (Casos de Uso)
Onde as regras da aplicação (O que o usuário quer fazer) acontecem.

#### `RegisterObservation.ts` (Caso de Uso de Registrar Foto)
```typescript
import * as Crypto from "expo-crypto"; // Biblioteca para gerar IDs aleatórios
import { Observation } from "../domain/entities/Observation";
import { ObservationRepository } from "../domain/repositories/ObservationRepository";
import { Coordinates } from "../domain/value-objects/Coordinates";

// É o DTO (Data Transfer Object). Define os dados brutos que chegam da tela.
export interface RegisterObservationDTO {
    latitude: number;
    longitude: number;
    photo: string;
}

export class RegisterObservation {
    // Injeção de Dependência: O caso de uso pede qualquer coisa que assine o contrato do Repository, 
    // ele não sabe que é de Memória, Firebase, SQLite. Só sabe que tem o método "save".
    constructor(private readonly repository: ObservationRepository) {}

    // A ação principal do caso de uso
    public async execute(input: RegisterObservationDTO) {
        // 1. Cria as coordenadas com os números que vieram da tela
        const coordinates = new Coordinates(input.latitude, input.longitude);
        
        // 2. Cria a Observação usando o gerador de UUID do expo para o ID
        const observation = new Observation(
            Crypto.randomUUID(), 
            coordinates, 
            input.photo
        );
        
        // 3. Manda o repositório salvar a entidade pronta
        await this.repository.save(observation);
        
        // Retorna ela de volta para a tela se precisar exibir
        return observation;
    }
}
```

#### `ListObservations.ts` (Caso de Uso de Listar)
```typescript
import { ObservationRepository } from "../domain/repositories/ObservationRepository";

export class ListObservations {
    // Recebe o repositório
    constructor(private readonly repository: ObservationRepository) { }

    public async execute() {
        // Chama a função de buscar todas do repositório
        return await this.repository.findAll();
    }
}
```

---

### 4. `fectorie/` (Container / Injeção de Dependência)
Responsável por montar o quebra-cabeça juntando Infraestrutura e Casos de Uso.

#### `container.ts`
```typescript
import { InMemoryObservationRepository } from "../infra/inMemoryObservationRepository";
import { ListObservations } from "../usecases/ListObservations";
import { RegisterObservation } from "../usecases/RegisterObservation";

class Container {
    // Mais um Singleton para garantir que só monte o quebra-cabeça 1 vez
    private static instance: Container;
    
    // Variáveis públicas que vão guardar as classes prontas
    public readonly InMemoryObservationRepository: InMemoryObservationRepository;
    public readonly registerObservation: RegisterObservation;
    public readonly listObservations: ListObservations;

    private constructor() {
        // 1. Pega o banco de dados (que também é singleton)
        this.InMemoryObservationRepository = InMemoryObservationRepository.getInstance()
        
        // 2. Constrói o caso de uso de registrar e injeta o banco de dados dentro dele
        this.registerObservation = new RegisterObservation(this.InMemoryObservationRepository);
        
        // 3. Constrói o caso de uso de listar e injeta o banco de dados dentro dele
        this.listObservations = new ListObservations(this.InMemoryObservationRepository);
    }

    public static getInstance(): Container {
        if (!this.instance) {
            this.instance = new Container();
        }
        return this.instance;
    }
}
// Exporta ele já instanciado (uma caixa de ferramentas pronta para a tela usar)
export const container = Container.getInstance();
```

---

## 📂 Pasta `app/` (Interface / Telas com Expo Router)
É a pasta do frontend e da interface do usuário. As pastas entre parênteses ex: `(tabs)` agrupam arquivos, mas não mudam a URL da página.

### `app/(drawer)/(tabs)/index.tsx` (A Câmera)
A tela principal do app.

```tsx
// Imports gigantes de ferramentas e Hooks do React / React Native e Expo
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCameraPermissions, CameraView } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { container } from '@/src/fectorie/container'; // Puxa nossa caixa de ferramentas!
import { useRouter } from 'expo-router';

export default function App() {
  // Hooks de permissão da câmera
  const [permission, requestPermission] = useCameraPermissions();
  
  // States da tela: câmera de frente/trás, link da foto, localização
  const [facing, setFacing] = useState<any>('back');
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  // Referência para controlar o componente de Câmera e mandar ele bater a foto
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter(); // Navegação

  // useEffect que roda na hora que a tela abre, para pegar o GPS
  useEffect(() => {
    async function getCurrentLocation() {
      // Pede permissão do GPS
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      // Pega a localização com precisão balanceada e joga no state 'location'
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }
    getCurrentLocation();
  }, []) // array vazio = roda 1 vez só na abertura

  // Função para tirar a foto
  async function takePicture() {
    if (cameraRef.current) {
      // Bate a foto, processa e joga o URI (caminho) dela no state 'photo'
      const foto = await cameraRef.current.takePictureAsync();
      setPhoto(foto!.uri);
    }
  }

  // Função para limpar a foto (retorna pra câmera)
  function clearPhoto() {
    setPhoto(null);
  }

  // Função final de salvar a foto
  async function savePhoto() {
    // Proteção: Só salva se tiver foto e localização prontas
    if (photo && location) {
      try {
        // Usa o Container do Src/ para rodar o caso de uso!!
        await container.registerObservation.execute({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          photo: photo
        });
        alert('Foto Salva com Sucesso!');
        
        // Limpa e manda o cara para a tela /list
        setPhoto(null);
        router.navigate('/list');
      } catch (error) {
        console.error(error);
        alert('Erro ao salvar foto.');
      }
    } else {
      alert('Aguarde a localização ou tire uma foto!');
    }
  }
  
  // ... [O resto do código tem os IFs que renderizam os botões se tiver foto, 
  //     ou a câmera se não tiver foto. Não coloquei todo o HTML para não poluir]
}
```

### `app/(drawer)/(tabs)/list.tsx` (A Listagem)
A tela que exibe as fotos salvas usando a memória.

```tsx
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { useState, useCallback } from 'react';
import { Observation } from '@/src/domain/entities/Observation';
import { container } from '@/src/fectorie/container'; // Puxa nossa caixa de ferramentas
import { useFocusEffect } from 'expo-router'; // Hook de aba

export default function List() {
  const [list, setList] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  // useFocusEffect roda TODA VEZ que o usuário entra nessa aba
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      
      // Usa o caso de uso de Listar para buscar os dados
      container.listObservations.execute().then((res) => { 
        if (active) {
          setList(res); // Joga os dados na variável de tela 'list'
        }
      }).finally(() => {
        if (active) setLoading(false); // Desliga a bolinha de carregamento
      })
      
      return () => {active = false;} // Se o cara sair rápido, previne erro no state
    }, [])
  )

  // Função que desenha CADA item (cardzinho) da lista
  const renderItem = ({ item }: { item: Observation }) => {
      return (
          <View style={styles.card}>
              {/* O Image exige uri para foto local ou da web */}
              <Image source={{ uri: item.photo }} resizeMode="cover" style={styles.image}/>
              
              <View style={styles.info}>
                  {/* Usa toFixed(4) para não ter um milhão de números quebrados */}
                  <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Latitude:</Text> {item.coordinates.latitude.toFixed(4)}</Text>
                  <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Longitude:</Text> {item.coordinates.longitude.toFixed(4)}</Text>
              </View>
          </View>
      )
  }

  return (
    <View style={styles.container}>
      {loading ? (
          // Mostra a bolinha giratória enquanto aguarda o await do banco de dados
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          // Mostra a lista. data={list} são as fotos. renderItem é a função de cima.
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
    </View>
  )
}
```

Pronto! Agora você tem a enciclopédia completa de como todo o seu app funciona e se interliga!
