import { InMemoryObservationRepository } from "../infra/inMemoryObservationRepository";
import { ListObservations } from "../usecases/ListObservations";
import { RegisterObservation } from "../usecases/RegisterObservation";

class Container {
    // Padrão Singleton: Garante que exista apenas uma instância (uma única caixa de ferramentas) rodando no app todo.
    private static instance: Container;
    public readonly InMemoryObservationRepository: InMemoryObservationRepository;
    public readonly registerObservation: RegisterObservation;
    public readonly listObservations: ListObservations;


    // O construtor é privado para impedir que alguém faça "new Container()" fora daqui.
    private constructor() {
        // Constrói o banco de dados
        this.InMemoryObservationRepository = InMemoryObservationRepository.getInstance()
        // Injeção de Dependência: Cria os casos de uso já entregando o banco de dados pronto para eles usarem.
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
// Exporta a instância única para as telas usarem.
export const container = Container.getInstance();

//tmb é um singleton (unica instancia)
// oq faz: é como uma fabrica de dependencias, ele cria as dependencias e injeta nas classes
// é um padrão de projeto que facilita o teste e a manutenção do código
// facilita se for trocar o banco de dados por exemplo, so trocar aqui no container
// faz com que as classes fiquem menos acopladas