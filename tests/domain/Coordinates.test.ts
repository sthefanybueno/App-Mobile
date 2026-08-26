import { Coordinates } from '../../src/domain/value-objects/Coordinates';

describe('Coordinates Value Object', () => {
    it('should create an instance of Coordinates', () => {
        const coordinates = new Coordinates(10, 20);
        expect(coordinates).toBeInstanceOf(Coordinates);
        expect(coordinates.latitude).toBe(10);
        expect(coordinates.longitude).toBe(20);
    });
    
    it('should throw an error if the latitude is not valid', () => {
        expect(() => new Coordinates(100, 20)).toThrow('Latitude inválida');
    });
    
    it('should throw an error if the longitude is not valid', () => {
        expect(() => new Coordinates(10, 200)).toThrow('Longitude inválida');
    });
});