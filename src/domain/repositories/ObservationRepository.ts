import { Observation } from "../entities/Observation";

export interface ObservationRepository {
    save(observation: Observation): Promise<void>;
    findById(id: string): Promise<Observation | null>;
    findAll(): Promise<Observation[]>;
}

//oq vai fazer com a entidade