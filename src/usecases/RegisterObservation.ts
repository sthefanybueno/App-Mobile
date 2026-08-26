import * as Crypto from "crypto";
import { Observation } from "../domain/entities/Observation";
import { ObservationRepository } from "../domain/repositories/ObservationRepository";
import { Coordinates } from "../domain/value-objects/Coordinates";

export interface RegisterObservationDTO {
    latitude: number;
    longitude: number;
    photo: string;
}

export class RegisterObservation {
    constructor(private readonly repository: ObservationRepository) {} //dependencia

    public async execute(input: RegisterObservationDTO) {
        const coordinates = new Coordinates(input.latitude, input.longitude);
        const observation = new Observation(
            Crypto.randomUUID(), 
            coordinates, 
            input.photo
        );
        await this.repository.save(observation);
        return observation;
    }
}