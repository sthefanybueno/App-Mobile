// Um "Objeto de Valor" (Value Object) representa uma característica pura, não possui ID único (diferente da Entidade).
// Duas coordenadas com os mesmos números são a mesma coordenada na vida real, então são imutáveis (readonly).
export class Coordinates {
    // Declarar variáveis direto dentro do constructor com "public readonly" é um atalho do TypeScript
    // que evita a necessidade de escrever this.latitude = latitude.
    constructor (
        public readonly latitude: number,
        public readonly longitude: number
    ) {
        this.validate();
    }

    private validate(): void {
        // Regras inquebráveis da geografia: a latitude da Terra não passa de 90 e a longitude não passa de 180.
        // Assim protegemos nosso banco de dados de receber coordenadas falsas (ex: 500, 900).
        if (this.latitude < -90 || this.latitude > 90) {
            throw new Error('Latitude inválida');
        }
        if (this.longitude < -180 || this.longitude > 180) {
            throw new Error('Longitude inválida');
        }
    }
}