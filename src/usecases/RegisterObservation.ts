import * as Crypto from "expo-crypto";
import { Observation } from "../domain/entities/Observation";
import { ObservationRepository } from "../domain/repositories/ObservationRepository";
import { Coordinates } from "../domain/value-objects/Coordinates";

// DTO (Data Transfer Object): Um objeto simples para transportar os dados puros (string, number) 
// que vêm da tela, antes de virarem uma "Entidade" com regras.
export interface RegisterObservationDTO {
    latitude: number;
    longitude: number;
    photo: string;
}

export class RegisterObservation {
    constructor(private readonly repository: ObservationRepository) {} //dependencia

    public async execute(input: RegisterObservationDTO) {
        const coordinates = new Coordinates(input.latitude, input.longitude);
        
        // Cria a entidade gerando um ID único na hora usando a biblioteca de Criptografia do Expo.
        const observation = new Observation(
            Crypto.randomUUID(), 
            coordinates, 
            input.photo
        );
        await this.repository.save(observation);
        return observation;
    }
}