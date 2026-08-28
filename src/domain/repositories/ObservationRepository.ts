import { Observation } from "../entities/Observation";

// Uma "Interface" (Contrato) não contém código que roda de verdade. 
// Ela serve apenas para estabelecer uma regra: "Seja lá qual for o banco de dados que formos usar, ele OBRIGATORIAMENTE precisa ter essas três funções".
export interface ObservationRepository {
    // Retorna Promise pois salvar no banco é uma ação assíncrona (leva tempo).
    save(observation: Observation): Promise<void>;
    findById(id: string): Promise<Observation | null>;
    findAll(): Promise<Observation[]>;
}