export interface Cita {
    id_cita?: number;      // Opcional para nuevas citas
    id_mascota?: number;   // Enlace a la mascota registrada
    mascota: string;
    dueno?: string;        // Nombre del dueño asociado a la cita
    veterinario: string;
    fecha: string;         // Formato 'YYYY-MM-DD'
    hora: string;          // Formato 'HH:mm'
    motivo?: string;       // Motivo de la cita
    estado: 'Programada' | 'Confirmada' | 'Atendida' | 'Cancelada' | 'No asistió' | 'Reprogramada'; // Estados definidos
    comentarios?: string;
}