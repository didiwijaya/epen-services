import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { VirtualAccount } from './entities/virtual-account.entity';

@Injectable()
export class VirtualAccountService {
  private virtualAccounts: VirtualAccount[] = [
    {
      id: 1,
      skpd_id: 1,
      nama_skpd: 'Dinas Pendidikan',
      nomor_va: '3600001234567890',
      bank: 'Bank Jateng',
      status: 'aktif',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    {
      id: 2,
      skpd_id: 2,
      nama_skpd: 'Dinas Kesehatan',
      nomor_va: '3600009876543210',
      bank: 'Bank Jateng',
      status: 'aktif',
      created_at: new Date('2024-01-02'),
      updated_at: new Date('2024-01-02'),
    },
    {
      id: 3,
      skpd_id: 3,
      nama_skpd: 'Bappeda',
      nomor_va: '3600001111222233',
      bank: 'Bank Jateng',
      status: 'nonaktif',
      created_at: new Date('2023-12-01'),
      updated_at: new Date('2024-01-15'),
    },
  ];
  private nextId = 4;

  private skpdNames: Record<number, string> = {
    1: 'Dinas Pendidikan',
    2: 'Dinas Kesehatan',
    3: 'Bappeda',
    4: 'Dinas PUPR',
    5: 'Dinas Perhubungan',
  };

  findAll(page = 1, perPage = 15, skpdId?: number) {
    let filtered = [...this.virtualAccounts];

    if (skpdId) {
      filtered = filtered.filter((v) => v.skpd_id === skpdId);
    }

    const total = filtered.length;
    const lastPage = Math.ceil(total / perPage);
    const data = filtered.slice((page - 1) * perPage, page * perPage);

    return { data, meta: { current_page: page, per_page: perPage, total, last_page: lastPage } };
  }

  create(dto: CreateVirtualAccountDto): VirtualAccount {
    const va: VirtualAccount = {
      id: this.nextId++,
      skpd_id: dto.skpd_id,
      nama_skpd: this.skpdNames[dto.skpd_id] ?? `SKPD ${dto.skpd_id}`,
      nomor_va: dto.nomor_va,
      bank: dto.bank,
      status: 'aktif',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.virtualAccounts.push(va);
    return va;
  }

  findOne(id: number): VirtualAccount {
    const va = this.virtualAccounts.find((v) => v.id === id);
    if (!va) {
      throw new NotFoundException(`Virtual account dengan id ${id} tidak ditemukan`);
    }
    return va;
  }
}
