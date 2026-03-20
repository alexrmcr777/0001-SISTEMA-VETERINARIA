export interface Mascota {
    id_mascota?: number;
    id_dueno?: number;
    nombre: string;
    especie?: string;
    raza?: string;
    fecha_nacimiento?: string; // YYYY-MM-DD
    dueno: string;
    telefono: string;
    email: string;
    foto?: string;  // base64 data URL
}