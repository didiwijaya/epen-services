export class Rekanan {
  id: number;
  nama: string;
  npwp: string;
  kode_usaha: string | null;
  alamat: string;
  kota: string | null;
  telepon: string | null;
  email: string | null;
  kode_swift: string | null;
  status: 'aktif' | 'nonaktif';
  created_at: Date;
  updated_at: Date;
}
