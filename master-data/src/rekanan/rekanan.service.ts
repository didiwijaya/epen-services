import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRekananDto } from './dto/create-rekanan.dto';
import { UpdateRekananDto } from './dto/update-rekanan.dto';
import { Rekanan } from './entities/rekanan.entity';
import { KafkaProducerService } from '../kafka/kafka.producer.service';

@Injectable()
export class RekananService {
  private rekanan: Rekanan[] = [
    {
      id: 1,
      nama: 'CV Maju Jaya Abadi',
      npwp: '01.234.567.8-901.000',
      kode_usaha: '6201',
      alamat: 'Jl. Pemuda No. 10, Semarang',
      kota: 'Semarang',
      telepon: '024-3456789',
      email: 'majujaya@example.com',
      kode_swift: 'BNINIDJA',
      status: 'aktif',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    },
    {
      id: 2,
      nama: 'PT Karya Bersama',
      npwp: '02.345.678.9-012.000',
      kode_usaha: '4210',
      alamat: 'Jl. Ahmad Yani No. 55, Semarang',
      kota: 'Semarang',
      telepon: '024-7654321',
      email: 'karyabersama@example.com',
      kode_swift: 'CENAIDJA',
      status: 'aktif',
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
    },
    {
      id: 3,
      nama: 'UD Sejahtera Mandiri',
      npwp: '03.456.789.0-123.000',
      kode_usaha: '4610',
      alamat: 'Jl. Pandanaran No. 77, Semarang',
      kota: 'Semarang',
      telepon: '024-9876543',
      email: 'sejahteramandiri@example.com',
      kode_swift: null,
      status: 'nonaktif',
      created_at: new Date('2023-06-01'),
      updated_at: new Date('2024-01-20'),
    },
  ];
  private nextId = 4;

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  findAll(
    page = 1,
    perPage = 15,
    search?: string,
    status?: string,
    kodeUsaha?: string,
  ) {
    let filtered = [...this.rekanan];

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.nama.toLowerCase().includes(s) || r.npwp.toLowerCase().includes(s),
      );
    }
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (kodeUsaha) {
      filtered = filtered.filter((r) => r.kode_usaha === kodeUsaha);
    }

    const total = filtered.length;
    const lastPage = Math.ceil(total / perPage);
    const data = filtered.slice((page - 1) * perPage, page * perPage);

    return { data, meta: { current_page: page, per_page: perPage, total, last_page: lastPage } };
  }

  lookup(npwp?: string, nama?: string, kodeSwift?: string) {
    let filtered = [...this.rekanan].filter((r) => r.status === 'aktif');

    if (npwp) filtered = filtered.filter((r) => r.npwp.includes(npwp));
    if (nama) filtered = filtered.filter((r) => r.nama.toLowerCase().includes(nama.toLowerCase()));
    if (kodeSwift) filtered = filtered.filter((r) => r.kode_swift === kodeSwift);

    return filtered;
  }

  findOne(id: number): Rekanan {
    const rekanan = this.rekanan.find((r) => r.id === id);
    if (!rekanan) {
      throw new NotFoundException(`Rekanan dengan id ${id} tidak ditemukan`);
    }
    return rekanan;
  }

  async create(dto: CreateRekananDto): Promise<Rekanan> {
    const rekanan: Rekanan = {
      id: this.nextId++,
      nama: dto.nama,
      npwp: dto.npwp,
      kode_usaha: dto.kode_usaha ?? null,
      alamat: dto.alamat,
      kota: dto.kota ?? null,
      telepon: dto.telepon ?? null,
      email: dto.email ?? null,
      kode_swift: dto.kode_swift ?? null,
      status: 'aktif',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.rekanan.push(rekanan);

    await this.kafkaProducer.sendEvent(
      'master-data.rekanan',
      String(rekanan.id),
      {
        eventType: 'rekanan.created',
        version: 1,
        rekananId: rekanan.id,
        nama: rekanan.nama,
        npwp: rekanan.npwp,
        kode_usaha: rekanan.kode_usaha,
        status: rekanan.status,
        timestamp: new Date().toISOString(),
      },
    );

    return rekanan;
  }

  async update(id: number, dto: UpdateRekananDto): Promise<Rekanan> {
    const rekanan = this.findOne(id);
    Object.assign(rekanan, { ...dto, updated_at: new Date() });

    await this.kafkaProducer.sendEvent(
      'master-data.rekanan',
      String(rekanan.id),
      {
        eventType: 'rekanan.updated',
        version: 1,
        rekananId: rekanan.id,
        nama: rekanan.nama,
        npwp: rekanan.npwp,
        status: rekanan.status,
        updatedFields: Object.keys(dto),
        timestamp: new Date().toISOString(),
      },
    );

    return rekanan;
  }

  async softDelete(id: number): Promise<void> {
    const rekanan = this.findOne(id);
    rekanan.status = 'nonaktif';
    rekanan.updated_at = new Date();

    await this.kafkaProducer.sendEvent(
      'master-data.rekanan',
      String(rekanan.id),
      {
        eventType: 'rekanan.deactivated',
        version: 1,
        rekananId: rekanan.id,
        nama: rekanan.nama,
        npwp: rekanan.npwp,
        timestamp: new Date().toISOString(),
      },
    );
  }
}
