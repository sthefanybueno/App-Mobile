import { InMemoryObservationRepository } from "../infra/inMemoryObservationRepository";
import { ListObservations } from "../usecases/ListObservations";
import { RegisterObservation } from "../usecases/RegisterObservation";

class Container {
    private static instance: Container;
    public readonly InMemoryObservationRepository: InMemoryObservationRepository;
    public readonly registerObservation: RegisterObservation;
    public readonly listObservations: ListObservations;


    private constructor() {
        this.InMemoryObservationRepository = InMemoryObservationRepository.getInstance()
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
export const container = Container.getInstance();

//tmb é um singleton (unica instancia)
// oq faz: é como uma fabrica de dependencias, ele cria as dependencias e injeta nas classes
// é um padrão de projeto que facilita o teste e a manutenção do código
// facilita se for trocar o banco de dados por exemplo, so trocar aqui no container
// faz com que as classes fiquem menos acopladas