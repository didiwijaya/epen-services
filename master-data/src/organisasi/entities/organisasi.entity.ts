export class Organisasi {
  id: number;
  kode: string;
  nama: string;
  tipe: 'bidang' | 'skpd' | 'unit_kerja';
  parent_id: number | null;
  children?: Organisasi[];
}
