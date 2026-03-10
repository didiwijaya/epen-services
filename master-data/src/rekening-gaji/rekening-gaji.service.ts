import { Injectable, NotFoundException } from '@nestjs/common';
import { RekeningGaji } from './entities/rekening-gaji.entity';

@Injectable()
export class RekeningGajiService {
  private rekening: RekeningGaji[] = [
    {
      id: 1,
      nip: '198501012010011001',
      nama_pegawai: 'Budi Santoso',
      nama_bank: 'Bank BNI',
      nomor_rekening: '2233445566',
      cabang_bank: 'Cabang Semarang',
      skpd_id: 1,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    {
      id: 2,
      nip: '199002102015022002',
      nama_pegawai: 'Siti Rahayu',
      nama_bank: 'Bank BRI',
      nomor_rekening: '3344556677',
      cabang_bank: 'Cabang Semarang Simpang Lima',
      skpd_id: 1,
      created_at: new Date('2024-01-05'),
      updated_at: new Date('2024-01-05'),
    },
    {
      id: 3,
      nip: '198803152012031003',
      nama_pegawai: 'Agus Wijaya',
      nama_bank: 'Bank Mandiri',
      nomor_rekening: '4455667788',
      cabang_bank: 'Cabang Semarang Pandanaran',
      skpd_id: 2,
      created_at: new Date('2024-01-10'),
      updated_at: new Date('2024-01-10'),
    },
  ];

  findAll(page = 1, perPage = 15, nip?: string, nama?: string, bank?: string) {
    let filtered = [...this.rekening];

    if (nip) {
      filtered = filtered.filter((r) => r.nip.includes(nip));
    }
    if (nama) {
      filtered = filtered.filter((r) =>
        r.nama_pegawai.toLowerCase().includes(nama.toLowerCase()),
      );
    }
    if (bank) {
      filtered = filtered.filter((r) =>
        r.nama_bank.toLowerCase().includes(bank.toLowerCase()),
      );
    }

    const total = filtered.length;
    const lastPage = Math.ceil(total / perPage);
    const data = filtered.slice((page - 1) * perPage, page * perPage);

    return { data, meta: { current_page: page, per_page: perPage, total, last_page: lastPage } };
  }

  findOne(id: number): RekeningGaji {
    const rekening = this.rekening.find((r) => r.id === id);
    if (!rekening) {
      throw new NotFoundException(`Rekening gaji dengan id ${id} tidak ditemukan`);
    }
    return rekening;
  }
}
