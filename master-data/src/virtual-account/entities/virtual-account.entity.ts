export class VirtualAccount {
  id: number;
  skpd_id: number;
  nama_skpd: string;
  nomor_va: string;
  bank: string;
  status: 'aktif' | 'nonaktif';
  created_at: Date;
  updated_at: Date;
}
