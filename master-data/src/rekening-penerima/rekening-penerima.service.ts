import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRekeningPenerimaDto } from './dto/create-rekening-penerima.dto';
import { UpdateRekeningPenerimaDto } from './dto/update-rekening-penerima.dto';
import { RekeningPenerima } from './entities/rekening-penerima.entity';

@Injectable()
export class RekeningPenerimaService {
  private rekening: RekeningPenerima[] = [
    {
      id: 1,
      rekanan_id: 1,
      nama_pemilik: 'CV Maju Jaya Abadi',
      nama_bank: 'Bank BNI',
      cabang_bank: 'Cabang Semarang',
      nomor_rekening: '1234567890',
      is_default: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    {
      id: 2,
      rekanan_id: 1,
      nama_pemilik: 'CV Maju Jaya Abadi',
      nama_bank: 'Bank BRI',
      cabang_bank: 'Cabang Semarang Pemuda',
      nomor_rekening: '0987654321',
      is_default: false,
      created_at: new Date('2024-01-05'),
      updated_at: new Date('2024-01-05'),
    },
    {
      id: 3,
      rekanan_id: 2,
      nama_pemilik: 'PT Karya Bersama',
      nama_bank: 'Bank Mandiri',
      cabang_bank: 'Cabang Semarang Ahmad Yani',
      nomor_rekening: '1122334455',
      is_default: true,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
    },
  ];
  private nextId = 4;

  findAll(page = 1, perPage = 15, rekananId?: number, bank?: string) {
    let filtered = [...this.rekening];

    if (rekananId) {
      filtered = filtered.filter((r) => r.rekanan_id === rekananId);
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

  findOne(id: number): RekeningPenerima {
    const rekening = this.rekening.find((r) => r.id === id);
    if (!rekening) {
      throw new NotFoundException(`Rekening penerima dengan id ${id} tidak ditemukan`);
    }
    return rekening;
  }

  create(dto: CreateRekeningPenerimaDto): RekeningPenerima {
    if (dto.is_default) {
      this.rekening
        .filter((r) => r.rekanan_id === dto.rekanan_id)
        .forEach((r) => (r.is_default = false));
    }

    const rekening: RekeningPenerima = {
      id: this.nextId++,
      rekanan_id: dto.rekanan_id,
      nama_pemilik: dto.nama_pemilik,
      nama_bank: dto.nama_bank,
      cabang_bank: dto.cabang_bank ?? null,
      nomor_rekening: dto.nomor_rekening,
      is_default: dto.is_default ?? false,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.rekening.push(rekening);
    return rekening;
  }

  update(id: number, dto: UpdateRekeningPenerimaDto): RekeningPenerima {
    const rekening = this.findOne(id);
    if ((dto as { is_default?: boolean }).is_default) {
      this.rekening
        .filter((r) => r.rekanan_id === rekening.rekanan_id && r.id !== id)
        .forEach((r) => (r.is_default = false));
    }
    Object.assign(rekening, { ...dto, updated_at: new Date() });
    return rekening;
  }
}
