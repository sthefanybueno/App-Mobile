import { Coordinates } from "../value-objects/Coordinates";

// Uma "Entidade" (Entity) é a classe principal das nossas Regras de Negócio. 
// Ela representa algo real do nosso app e possui um ID único. Tudo que é vital para uma observação existir está aqui.
export class Observation {
    // "readonly" (somente leitura): O ID não pode ser alterado depois que a observação nasce.
    public readonly id: string;
    public readonly coordinates: Coordinates;
    // "photo" pode ser alterada depois, por isso não é readonly.
    public photo: string
    
    // Construtor é chamado toda vez que fazemos "new Observation(...)".
    constructor(id: string, coordinates: Coordinates, photo: string) {
        this.id = id;
        this.coordinates = coordinates;
        this.photo = photo;
        // A entidade se auto-valida no momento que nasce. Não precisamos confiar que a "Tela" enviou os dados certos.
        this.validate();
    }

    // "private" significa que só a própria classe pode chamar essa função.
    private validate(): void {
        // Regra de Ouro da Entidade: se a foto estiver vazia ou for um link quebrado, lance um Erro impedindo a criação!
        if (!this.photo || !this.photo.includes('://')) {
            throw new Error('Foto inválida');
        }
    }

    public updatePhoto(photo: string): void {
        this.photo = photo;
        this.validate();
    }
}

}
