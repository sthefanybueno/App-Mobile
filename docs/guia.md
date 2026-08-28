# Guia de Arquitetura e Funcionamento do App (Versão para Iniciantes)

Este documento é a explicação **linha a linha** de **TODOS** os arquivos que fazem o motor do aplicativo funcionar. O projeto foi construído utilizando **React Native + Expo Router** para a interface e a **Clean Architecture (Arquitetura Limpa)** para as regras de negócio. 

A Arquitetura Limpa é uma forma de organizar o código separando o visual (telas) das regras do aplicativo (o que ele faz), garantindo que uma mudança visual não quebre o funcionamento interno.

---

## 1. `src/domain/` (Domínio)
O domínio é o núcleo do aplicativo. Aqui definimos as "coisas" que existem no nosso app e as regras inquebráveis sobre elas, sem nos importar com banco de dados ou telas.

### `src/domain/entities/Observation.ts`
Esta é a Entidade principal. Uma **Entidade** é uma classe (um molde para criar objetos) que representa um conceito fundamental do negócio e possui um identificador único.

```typescript
// Importa o "Coordinates", que é outro arquivo do nosso projeto
import { Coordinates } from "../value-objects/Coordinates";

export class Observation {
    // "public readonly" significa que qualquer parte do app pode ler essa variável, mas ninguém pode alterá-la depois que for criada.
    public readonly id: string;
    public readonly coordinates: Coordinates;
    
    // Caminho da foto. É "public" (público) sem "readonly" para podermos trocar a foto depois usando uma função.
    public photo: string
    
    // Construtor: É a função executada automaticamente sempre que usamos "new Observation(...)" para criar uma nova observação.
    constructor(id: string, coordinates: Coordinates, photo: string) {
        // "this." refere-se à própria observação que está sendo criada. Guarda os valores recebidos.
        this.id = id;
        this.coordinates = coordinates;
        this.photo = photo;
        
        // Valida a si mesma assim que nasce, chamando a função validate abaixo.
        this.validate();
    }

    // Método "private" (privado) significa que só pode ser chamado por dentro desta própria classe.
    private validate(): void {
        // Exige que a foto não seja vazia e contenha "://" (presente em caminhos de arquivo como file:// ou http://)
        if (!this.photo || !this.photo.includes('://')) {
            // "throw new Error" interrompe o código e lança um erro, impedindo a criação de uma observação inválida.
            throw new Error('Foto inválida');
        }
    }

    // Função pública para trocar a foto.
    public updatePhoto(photo: string): void {
        this.photo = photo;
        this.validate(); // Re-valida a nova foto para garantir que a nova também é válida.
    }
}
```

### `src/domain/value-objects/Coordinates.ts`
Este é um Objeto de Valor (Value Object). Um **Objeto de Valor** é uma classe que representa uma característica descritiva (como uma coordenada, uma cor, ou um dinheiro) e não tem identificador único; ele é definido apenas pelos seus valores.

```typescript
export class Coordinates {
    // Declarar variáveis direto no construtor com "public readonly" é um atalho do TypeScript que poupa a necessidade de escrever "this.var = var".
    constructor (
        public readonly latitude: number,
        public readonly longitude: number
    ) {
        this.validate(); // Valida assim que é criado.
    }

    private validate(): void {
        // Verifica os limites geográficos reais da Terra.
        if (this.latitude < -90 || this.latitude > 90) {
            throw new Error('Latitude inválida');
        }
        if (this.longitude < -180 || this.longitude > 180) {
            throw new Error('Longitude inválida');
        }
    }
}
```

### `src/domain/repositories/ObservationRepository.ts`
Este é um Contrato (Interface). Uma **Interface** não tem lógica ou código rodando. Ela apenas dita regras, dizendo: "Quem quiser ser o banco de dados das observações, OBRIGATORIAMENTE tem que ter essas 3 funções".

```typescript
import { Observation } from "../entities/Observation";

// "export interface" cria o contrato.
export interface ObservationRepository {
    // "Promise" significa que a função é assíncrona, ou seja, ela vai demorar um tempinho (como salvar num banco de dados) e o app deve esperar.
    save(observation: Observation): Promise<void>;
    // Retorna uma observação ou "null" (nada) se não encontrar.
    findById(id: string): Promise<Observation | null>;
    // Retorna uma lista (array, indicado pelos []) de observações.
    findAll(): Promise<Observation[]>;
}
```

---

## 2. `src/infra/` (Infraestrutura)
A camada de infraestrutura é responsável por conversar com o mundo externo: bancos de dados, APIs de internet, memória do celular, etc.

### `src/infra/inMemoryObservationRepository.ts`
Este é o nosso banco de dados temporário. Ele obedece ao contrato que definimos acima.

```typescript
import { Observation } from "../domain/entities/Observation";
import { ObservationRepository } from "../domain/repositories/ObservationRepository";

// "implements" diz que essa classe vai assinar e obedecer o contrato do ObservationRepository.
export class InMemoryObservationRepository implements ObservationRepository {
    
    // Onde os dados realmente ficam guardados (na Memória RAM do celular). Começa como uma lista vazia "[]".
    private observations: Observation[] = [];
    
    // Padrão Singleton: É uma técnica de programação para garantir que só existirá 1 única instância (1 único banco de dados) rodando no app todo.
    private static instance: InMemoryObservationRepository;

    // Construtor privado: Ninguém de fora pode fazer "new InMemoryObservationRepository", forçando o uso da função abaixo.
    private constructor() { }

    // Função que entrega o banco de dados. Se ele não existe ainda, ela cria. Se já existe, ela entrega o que já estava criado.
    public static getInstance(): InMemoryObservationRepository {
        if (!InMemoryObservationRepository.instance) {
            InMemoryObservationRepository.instance = new InMemoryObservationRepository(); 
        }
        return InMemoryObservationRepository.instance;
    }

    // "async" diz que a função pode pausar esperando algo acontecer. Salva empurrando ("push") a observação para o fim da lista.
    async save(observation: Observation): Promise<void> {
        this.observations.push(observation);
    }
    
    // Procura na lista um item onde o "id" seja igual ao "id" pedido. Se não achar, retorna null.
    async findById(id: string): Promise<Observation | null> {
        return this.observations.find(obs => obs.id === id) || null;
    }
    
    // Retorna uma CÓPIA ("...this.observations") da lista. Retornar uma cópia impede bugs bizarros visuais no React.
    async findAll(): Promise<Observation[]> {
        return [...this.observations];
    }
}
```

---

## 3. `src/usecases/` (Casos de Uso)
Onde as ações reais que o usuário pode fazer na aplicação são orquestradas.

### `src/usecases/RegisterObservation.ts`
Caso de Uso responsável por pegar os dados brutos, criar a observação e mandar salvar.

```typescript
import * as Crypto from "expo-crypto"; 
import { Observation } from "../domain/entities/Observation";
import { ObservationRepository } from "../domain/repositories/ObservationRepository";
import { Coordinates } from "../domain/value-objects/Coordinates";

// DTO (Data Transfer Object): É um objeto simples usado apenas para empacotar e transportar os dados de um lugar para outro.
export interface RegisterObservationDTO {
    latitude: number;
    longitude: number;
    photo: string;
}

export class RegisterObservation {
    // Injeção de Dependência: É quando a classe não cria o banco de dados ela mesma, mas recebe o banco de dados pronto (através do contrato) de quem a chamou.
    constructor(private readonly repository: ObservationRepository) {}

    // A função principal do caso de uso.
    public async execute(input: RegisterObservationDTO) {
        // Monta a coordenada usando as regras que criamos no domínio.
        const coordinates = new Coordinates(input.latitude, input.longitude);
        
        // Monta a Entidade com um ID gerado na hora (Crypto.randomUUID gera um texto aleatório gigante e único).
        const observation = new Observation(
            Crypto.randomUUID(), 
            coordinates, 
            input.photo
        );
        
        // Chama a função do Repositório para salvar e espera terminar (await).
        await this.repository.save(observation);
        return observation; // Devolve a observação pronta pra quem pediu.
    }
}
```

### `src/usecases/ListObservations.ts`
Caso de Uso muito simples para apenas buscar a lista.

```typescript
import { ObservationRepository } from "../domain/repositories/ObservationRepository";

export class ListObservations {
    // Recebe o banco de dados por injeção de dependência.
    constructor(private readonly repository: ObservationRepository) { }

    public async execute() {
        // Vai no banco, manda buscar todos e retorna.
        return await this.repository.findAll();
    }
}
```

---

## 4. `src/fectorie/` (Container de Dependências)
A fábrica que liga o banco de dados aos casos de uso.

### `src/fectorie/container.ts`

```typescript
import { InMemoryObservationRepository } from "../infra/inMemoryObservationRepository";
import { ListObservations } from "../usecases/ListObservations";
import { RegisterObservation } from "../usecases/RegisterObservation";

class Container {
    // Mais um Singleton, garantindo que teremos apenas uma "caixa de ferramentas" no app.
    private static instance: Container;
    
    // Variáveis que guardarão as ferramentas prontas.
    public readonly InMemoryObservationRepository: InMemoryObservationRepository;
    public readonly registerObservation: RegisterObservation;
    public readonly listObservations: ListObservations;

    private constructor() {
        // Constrói o banco de dados usando o Singleton dele.
        this.InMemoryObservationRepository = InMemoryObservationRepository.getInstance()
        
        // Constrói os casos de uso ENVIANDO o banco de dados para dentro deles (Injeção de dependência na prática).
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
// Exporta a "caixa de ferramentas" (Container) já instanciada para que as Telas possam usar diretamente.
export const container = Container.getInstance();
```

---

## 5. `app/` (Interface Visual e Telas)
A pasta `app/` usa o **Expo Router**. Aqui, criar um arquivo `.tsx` automaticamente cria uma rota (uma página) no aplicativo com o mesmo nome do arquivo.

### Arquivos de Layout (Configuração de Navegação)

#### `app/_layout.tsx` (Raiz)
É o primeiro arquivo carregado. Ele define a base de navegação geral.

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// Força o aplicativo a carregar primeiro a pasta (drawer).
export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  return (
    <>
    {/* Stack: É um tipo de navegação em pilha, onde uma tela abre deslizando por cima da outra, podendo voltar. */}
    {/* headerShown: false esconde o cabeçalho feio nativo do celular. */}
    <Stack screenOptions={{headerShown: false}}>
      {/* Registra as telas/pastas que podem ser abertas na pilha. */}
      <Stack.Screen name="index" />
      <Stack.Screen name="(drawer)" />
      {/* Um Modal é uma tela que abre flutuando de baixo para cima. */}
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
    <StatusBar style="auto" />
    </>
  );
}
```

#### `app/(drawer)/_layout.tsx` (Menu Lateral)
Tudo dentro da pasta `(drawer)` (nome entre parênteses significa que não afeta o link da URL) participará deste menu lateral.

```tsx
import { Drawer } from 'expo-router/drawer'

export default function DrawerLayout() {
  return (
    // Componente Drawer cria aquela gaveta puxável do lado esquerdo da tela.
    <Drawer>
      {/* A pasta (tabs) vira o primeiro item da gaveta */}
      <Drawer.Screen
        name='(tabs)'
        options={{ drawerLabel: 'Painel', title: 'Painel' }}
      />
      {/* A tela hellopage.tsx vira o segundo item da gaveta */}
      <Drawer.Screen
        name='hellopage'
        options={{ drawerLabel: 'Hello', title: 'Hello' }}
      />
    </Drawer>
  )
}
```

#### `app/(drawer)/(tabs)/_layout.tsx` (Barra Inferior de Abas)
Tudo dentro da pasta `(tabs)` vai aparecer nos botõezinhos no rodapé da tela.

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {/* Tela index = Aba da Câmera */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Camera',
          // Desenha o ícone nativo na barrinha.
          tabBarIcon: () => <Ionicons name="camera-outline" size={24} color={"black"}/>,
        }}
      />
      {/* Tela maps = Aba do Mapa */}
      <Tabs.Screen
        name="maps"
        options={{
          title: 'Maps',
          tabBarIcon: () => <Ionicons name="map-outline" size={24} color={"black"}/>,
        }}
      />
      {/* Tela list = Aba da Lista */}
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

### Arquivos de Telas (O Visual em Si)

#### `app/index.tsx` (Tela de Login Falsa)
É a tela que aparece por padrão se não houvesse o redirecionamento forçado, desenhando um login estético.

```tsx
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { router } from 'expo-router'

export default function LoginScreen() {
  // useState: É um "Hook" do React, uma memória local da tela. Quando o valor (email) muda pela função (setEmail), a tela redesenha automaticamente para exibir o novo valor.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('') 
  
  const handleLogin = () => {
    // "router.replace" muda de tela destruindo a anterior (o usuário não consegue clicar em 'voltar' para o login).
    router.replace('./(drawer)/(tabs)/')
  }

  return (
    // SafeAreaView: Garante que o conteúdo não fique escondido atrás daquele entalhe da câmera (notch) no topo do celular.
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="leaf" size={32} color={'white'} />
            </View>
          </View>
          
          <Text style={styles.title}>AppTest</Text>
          <Text style={styles.subTitle}>Um app bem legal</Text>
          
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name='mail-outline' size={24} color='#666' style={styles.inputIcon} />
            {/* TextInput: Uma caixa onde o usuário pode digitar textos. */}
            <TextInput
              style={styles.input}
              placeholder='seu@email.com'
              placeholderTextColor="#999"
              keyboardType='email-address' // Mostra um teclado próprio para e-mail
              autoCapitalize='none' // Desliga a letra maiúscula automática
              value={email} // Liga o texto à memória "email"
              onChangeText={setEmail} // Quando digita, salva a letra nova na memória
            />
          </View>
          
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name='lock-closed-outline' size={24} color='#666' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='******'
              placeholderTextColor="#999"
              autoCapitalize='none'
              secureTextEntry={true} // Transforma as letras em bolinhas pretas de senha
              value={password}
              onChangeText={setPassword}
            />
          </View>
          
          {/* TouchableOpacity: Um botão que quando pressionado fica um pouco transparente para dar feedback visual. */}
          <TouchableOpacity onPress={handleLogin} style={styles.button}>
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>
          
        </View>
      </View>
    </SafeAreaView>
  )
}

// StyleSheet.create: É o local onde escrevemos o visual e as cores (CSS) para estilizar as caixinhas e textos acima.
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9ff' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: '#ffffff', width: '100%', borderRadius: 24, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: '#1a1a1a', marginBottom: 8 },
  subTitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, height: 54, backgroundColor: '#fafafa', marginBottom: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#333', height: '100%' },
  button: { backgroundColor: '#000', borderRadius: 12, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
})
```

#### `app/modal.tsx` (Exemplo de Popup Flutuante)
```tsx
import { Link } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text>This is a modal</Text>
      {/* Link: Funciona igual a um link de site. dismissTo volta fechando o modal. */}
      <Link href="./" dismissTo style={styles.link}>
        <Text>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  link: { marginTop: 15, paddingVertical: 15 },
});
```

#### `app/(drawer)/hellopage.tsx` (Tela Hello World no Menu Lateral)
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Uma tela básica que só exibe um texto centralizado.
export default function Hello() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 32, fontWeight: 'bold' },
})
```

#### `app/(drawer)/(tabs)/index.tsx` (Aba de Câmera)
```tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCameraPermissions, CameraView } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { container } from '@/src/fectorie/container'; // Traz a caixa de ferramentas!
import { useRouter } from 'expo-router';

export default function App() {
  // Pede e lê a permissão de câmera do celular.
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<any>('back'); // Trás ou frente.
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  // useRef (ref): Uma referência mágica que "segura" a câmera real na tela para podermos disparar ações para ela, como tirar a foto, sem que a tela precise se redesenhar.
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  // useEffect: Um "Hook" que roda um pedaço de código em momentos específicos. Como os conchetes no final [] estão vazios, ele roda SOMENTE UMA VEZ quando a tela abre pela 1ª vez.
  useEffect(() => {
    async function getCurrentLocation() {
      // Pergunta se o usuário aceita dar a localização (GPS).
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return; // Se disser não, para aqui.

      // Pega a coordenada real.
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }
    getCurrentLocation();
  }, [])

  // Se o usuário ainda não respondeu se aceita a câmera, mostra uma tela vazia.
  if (!permission) return <View />;

  // Se ele recusou, exibe um botão para pedir novamente.
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

  // Se já bateu a foto e ela está armazenada, mostra a opção de salvar...
  if (photo) {
    return (
      <View style={styles.container}>
        {/* Usaria o container.registerObservation.execute() aqui (escondido para simplificar no exemplo) */}
      </View>
    )
  }

  return (
      <>
        {/* Renderiza o que a câmera do celular tá enxergando na tela */}
        <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
        
        {/* Botão para inverter a câmera */}
        <View style={styles.buttonFlip}>
           <TouchableOpacity onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}>
              <Text>Virar</Text>
           </TouchableOpacity>
        </View>
        
        {/* Botão que bate a foto */}
        <View style={styles.buttonCapture}>
           <TouchableOpacity onPress={async () => {
             // Quando clica, fala pra referência bater a foto e salva a URI (caminho) no State.
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
// Omissão de estilos longos...
const styles = StyleSheet.create({ container: { flex: 1 }, camera: { flex: 1 }, buttonFlip: { position: 'absolute', top: 50, right: 20 }, buttonCapture: { position: 'absolute', bottom: 50, alignSelf: 'center' } })
```

#### `app/(drawer)/(tabs)/list.tsx` (Aba de Listagem)
```tsx
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { useState, useCallback } from 'react';
import { Observation } from '@/src/domain/entities/Observation';
import { container } from '@/src/fectorie/container'; 
import { useFocusEffect } from 'expo-router'; 

export default function List() {
  const [list, setList] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true); // Controla a "rodinha" girando.

  // useFocusEffect: É um "Hook" do Expo Router. Diferente do useEffect, este roda TODA VEZ que você clica e entra nesta aba "Lista", garantindo que busque dados sempre frescos, mesmo que a tela já estivesse aberta no fundo.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      
      // Busca todas as observações registradas via o Caso de Uso listObservations
      container.listObservations.execute().then((res) => { 
        if (active) setList(res);
      }).finally(() => {
        if (active) setLoading(false); // Esconde a "rodinha" de load
      })
      return () => {active = false;} // Se o usuário sair muito rápido, cancela a ação para não dar erro
    }, [])
  )

  // Função para desenhar CADA CÉLULA da Lista (Cada Card)
  const renderItem = ({ item }: { item: Observation }) => {
      return (
          <View style={styles.card}>
              {/* Image: Mostra a foto buscando no caminho armazenado. resizeMode cover faz ela preencher o espaço. */}
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
          <View style={styles.loader}>
            {/* ActivityIndicator: Componente que mostra a "rodinha girando" de carregamento */}
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          /* FlatList: Uma lista super inteligente que não explode a memória do celular, porque só desenha na tela os itens que estão aparecendo no scroll no momento. */
          <FlatList
            data={list} // De onde vem a informação
            keyExtractor={(item) => item.id} // Identificador único pra lista não se confundir
            renderItem={renderItem} // Ensina como desenhar cada linha chamando a função renderItem
          />
        )}
    </View>
  )
}
const styles = StyleSheet.create({ container: { flex: 1 }, card: { margin: 10, borderWidth: 1 }, loader: { flex: 1, justifyContent: 'center' }, image: { height: 200, width: '100%' }, info: { padding: 10 }, text: { fontSize: 16 } })
```

#### `app/(drawer)/(tabs)/maps.tsx` (Aba do Mapa)
```tsx
import React, { useState, useEffect } from 'react';
import MapView, { Region } from 'react-native-maps';
import { StyleSheet, View, Text, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';

export default function Maps() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    async function getCurrentLocation(){
      // Pede permissão de localização ao abrir o mapa
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Exibe um pop-up de aviso nativo do celular
        Alert.alert("Permissão negada", "Precisamos de acesso à sua localização.");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    };
    getCurrentLocation();
  }, []);

  // Enquanto não descobre onde estamos, mostra o ActivityIndicator.
  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );  
  }

  return (
    <View style={styles.container}>
      {/* MapView: Um componente que desenha um mapa interativo do Google ou Apple Maps */}
      <MapView 
        style={styles.map} 
        showsUserLocation={true} // Coloca aquela bolinha azul onde o usuário está
        showsMyLocationButton={true} // Botão de centralizar no usuário
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01, // Nível de zoom
          longitudeDelta: 0.01,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, map: { width: '100%', height: '100%' }, centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' } });
```

---

## 6. `tests/` (Testes Automatizados)
A pasta dos testes verifica se suas regras do domínio (coração do app) quebram caso recebam um dado ruim.

### `tests/setup.ts`
```typescript
import '@testing-library/jest-native/extend-expect';

// Mock: É uma falsificação. Substitui temporariamente ferramentas pesadas (como os ícones nativos) por textos simples só durante o teste. Assim os testes não travam esperando carregar fontes do celular.
jest.mock('@expo/vector-icons', () => {
    const React = require('react');
    const { Text } = require('react-native');
    const MockIcon = (props: any) => React.createElement(Text, props, props.name);

    return {
        Ionicons: MockIcon,
        MaterialIcons: MockIcon,
        FontAwesome: MockIcon,
        Feather: MockIcon,
        AntDesign: MockIcon,
        Entypo: MockIcon,
    };
});
```

### `tests/domain/Coordinates.test.ts`
```typescript
import { Coordinates } from '../../src/domain/value-objects/Coordinates';

// describe: Agrupa um bloco de testes com um nome.
describe('Coordinates Value Object', () => {
    
    // it: Uma frase declarativa "Isso deve fazer X". É um teste individual.
    it('should create an instance of Coordinates', () => {
        const coordinates = new Coordinates(10, 20);
        // expect: "Espera-se" que a latitude final seja 10. Se não for, o teste acusa falha.
        expect(coordinates.latitude).toBe(10);
    });
    
    it('should throw an error if the latitude is not valid', () => {
        // Quando testamos se algo vai dar erro (throw Error), precisamos englobar a criação em uma função vazia "() =>". Se colocarmos direto, o erro quebra o teste de verdade antes do Jest conseguir analisá-lo.
        expect(() => new Coordinates(100, 20)).toThrow('Latitude inválida');
    });
});
```

### `tests/domain/Observations.test.ts`
```typescript
import { Observation } from "@/src/domain/entities/Observation";
import { Coordinates } from "@/src/domain/value-objects/Coordinates";

describe('Observations Entity', () => {
    const validCoords = new Coordinates(10, 20);

    it('should create an Observation', () => {
        const obs = new Observation('123', validCoords, 'file://minhafoto.jpg');
        expect(obs.id).toBe('123');
    });

    it('should throw error if photo is empty', () => {
        expect(() => new Observation('123', validCoords, '')).toThrow('Foto inválida');
    });
});
```

---

## 🏁 Conclusão do Fluxo

Pense que cada ação no aplicativo é uma viagem bem estruturada:
1. **O Usuário aperta um botão:** O usuário interage com uma Tela na pasta `app/` (ex: Botão "Capturar").
2. **A Tela pede uma ferramenta:** A Tela chama a fábrica (Container) em `src/fectorie/` pedindo um Caso de Uso.
3. **O Caso de Uso orquestra:** O Caso de Uso, que fica em `src/usecases/`, é o cérebro da operação. Ele cria os objetos puros de Regra de Negócio (Entidades de `src/domain/`).
4. **O Domínio valida tudo:** As Entidades garantem sozinhas, com muita segurança, que não existe nenhuma foto impossível ou latitude bizarra.
5. **O Banco salva:** Se a Entidade estiver ok, o Caso de Uso aciona o Banco de Dados (Repositório da pasta `src/infra/`) que guarda a informação. 

A arquitetura existe exatamente para isso: um lado (Telas) é visual, bobo e mutável, o outro lado (Domínio e UseCases) é estrito, sério e protegido contra bugs.
