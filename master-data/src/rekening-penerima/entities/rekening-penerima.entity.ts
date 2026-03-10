export class RekeningPenerima {
  id: number;
  rekanan_id: number;
  nama_pemilik: string;
  nama_bank: string;
  cabang_bank: string | null;
  nomor_rekening: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}
