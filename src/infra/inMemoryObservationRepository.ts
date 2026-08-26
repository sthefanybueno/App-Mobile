import { Observation } from "../domain/entities/Observation";
import { ObservationRepository } from "../domain/repositories/ObservationRepository";

//Singleton
export class InMemoryObservationRepository implements ObservationRepository {
    private observations: Observation[] = [];
    private static instance: InMemoryObservationRepository;

    private constructor() { }

    public static getInstance(): InMemoryObservationRepository {
        if (!InMemoryObservationRepository.instance) {
            InMemoryObservationRepository.instance = new InMemoryObservationRepository(); //só cria ela dentro dela mesma ou seja só tem ela
        }
        return InMemoryObservationRepository.instance;
    }

    async save(observation: Observation): Promise<void> {
        this.observations.push(observation);
    }
    async findById(id: string): Promise<Observation | null> {
        return this.observations.find(obs => obs.id === id) || null;
    }
    async findAll(): Promise<Observation[]> {
        return [...this.observations];
    }
}