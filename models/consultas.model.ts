export interface Consulta {
  id_consulta: number;
  id_mascota: number;
  nombre_mascota: string;
  id_veterinario: string;
  nombre_veterinario: string;
  fecha: string;         // YYYY-MM-DD
  hora: string;          // HH:mm
  motivo_consulta: string;
  peso_kg?: number;              // kg
  temperatura_c?: number;        // °C
  frecuencia_cardiaca?: number;  // bpm
  frecuencia_respiratoria?: number; // rpm
  diagnostico: string;
  tratamiento?: string;
  medicamentos?: string;
  proxima_cita?: string;         // YYYY-MM-DD
  observaciones?: string;
}
