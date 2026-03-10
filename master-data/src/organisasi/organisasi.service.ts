import { Injectable, NotFoundException } from '@nestjs/common';
import { Organisasi } from './entities/organisasi.entity';

@Injectable()
export class OrganisasiService {
  private organisasi: Organisasi[] = [
    { id: 1, kode: '1', nama: 'Urusan Pemerintahan Bidang Pendidikan', tipe: 'bidang', parent_id: null },
    { id: 2, kode: '1.01', nama: 'Dinas Pendidikan dan Kebudayaan', tipe: 'skpd', parent_id: 1 },
    { id: 3, kode: '1.01.01', nama: 'Sekretariat', tipe: 'unit_kerja', parent_id: 2 },
    { id: 4, kode: '1.01.02', nama: 'Bidang SD', tipe: 'unit_kerja', parent_id: 2 },
    { id: 5, kode: '1.01.03', nama: 'Bidang SMP', tipe: 'unit_kerja', parent_id: 2 },
    { id: 6, kode: '2', nama: 'Urusan Pemerintahan Bidang Kesehatan', tipe: 'bidang', parent_id: null },
    { id: 7, kode: '2.01', nama: 'Dinas Kesehatan', tipe: 'skpd', parent_id: 6 },
    { id: 8, kode: '2.01.01', nama: 'Sekretariat', tipe: 'unit_kerja', parent_id: 7 },
    { id: 9, kode: '2.01.02', nama: 'Bidang P2P', tipe: 'unit_kerja', parent_id: 7 },
    { id: 10, kode: '6', nama: 'Urusan Pemerintahan Bidang Perencanaan', tipe: 'bidang', parent_id: null },
    { id: 11, kode: '6.01', nama: 'Badan Perencanaan Pembangunan Daerah', tipe: 'skpd', parent_id: 10 },
    { id: 12, kode: '6.01.01', nama: 'Sekretariat', tipe: 'unit_kerja', parent_id: 11 },
  ];

  findAll(tipe?: string, parentId?: number): Organisasi[] {
    let filtered = [...this.organisasi];

    if (tipe) {
      filtered = filtered.filter((o) => o.tipe === tipe);
    }
    if (parentId !== undefined) {
      filtered = filtered.filter((o) => o.parent_id === parentId);
    }

    return filtered;
  }

  findOne(id: number): Organisasi {
    const org = this.organisasi.find((o) => o.id === id);
    if (!org) {
      throw new NotFoundException(`Organisasi dengan id ${id} tidak ditemukan`);
    }

    const children = this.organisasi.filter((o) => o.parent_id === id);
    return { ...org, children };
  }
}
