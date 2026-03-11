import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRekananDto } from './dto/create-rekanan.dto';
import { UpdateRekananDto } from './dto/update-rekanan.dto';
import { Rekanan } from './entities/rekanan.entity';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { RekananWriteRepository } from './rekanan-write.repository';
import { RekananReadRepository } from './rekanan-read.repository';

@Injectable()
export class RekananService {
  constructor(
    private readonly writeRepo: RekananWriteRepository,
    private readonly readRepo: RekananReadRepository,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ─── QUERIES (baca dari read DB) ─────────────────────────────────────────
  findAll(
    page = 1,
    perPage = 15,
    search?: string,
    status?: string,
    kodeUsaha?: string,
  ) {
    return this.readRepo.findAll(+page, +perPage, search, status, kodeUsaha);
  }

  lookup(npwp?: string, nama?: string, kodeSwift?: string) {
    return this.readRepo.lookup(npwp, nama, kodeSwift);
  }

  findOne(id: number): Promise<Rekanan> {
    return this.readRepo.findOne(id).then((row) => this.readRowToEntity(row));
  }

  // ─── COMMANDS (tulis ke write DB, emit Kafka, sync ke read DB) ──────────
  async create(dto: CreateRekananDto): Promise<Rekanan> {
    const row = await this.writeRepo.insert({
      nama: dto.nama,
      npwp: dto.npwp,
      kode_usaha: dto.kode_usaha ?? null,
      alamat: dto.alamat,
      kota: dto.kota ?? null,
      telepon: dto.telepon ?? null,
      email: dto.email ?? null,
      kode_swift: dto.kode_swift ?? null,
    });

    await this.syncReadModelFromWriteRow(row);
    await this.emitEvent('rekanan.created', row);

    return this.writeRowToEntity(row);
  }

  async update(id: number, dto: UpdateRekananDto): Promise<Rekanan> {
    const row = await this.writeRepo.update(id, dto as Record<string, unknown>);

    await this.syncReadModelFromWriteRow(row);
    await this.emitEvent('rekanan.updated', row);

    return this.writeRowToEntity(row);
  }

  async softDelete(id: number): Promise<void> {
    const row = await this.writeRepo.findOneById(id);
    if (!row) throw new NotFoundException(`Rekanan dengan id ${id} tidak ditemukan`);

    await this.writeRepo.softDelete(id);
    await this.readRepo.setStatus(id, 'nonaktif');
    await this.emitEvent('rekanan.deactivated', row);
  }

  private async syncReadModelFromWriteRow(row: {
    id: number;
    nama: string;
    npwp: string;
    kode_usaha: string | null;
    alamat: string;
    kota: string | null;
    telepon: string | null;
    email: string | null;
    kode_swift: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
  }): Promise<void> {
    await this.readRepo.upsertFromEvent({
      id: row.id,
      nama: row.nama,
      npwp: row.npwp,
      kode_usaha: row.kode_usaha,
      alamat: row.alamat,
      kota: row.kota,
      telepon: row.telepon,
      email: row.email,
      kode_swift: row.kode_swift,
      status: row.status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    });
  }

  private async emitEvent(
    eventType: string,
    row: { id: number; nama: string; npwp: string; kode_usaha: string | null; status: string },
  ): Promise<void> {
    await this.kafkaProducer.sendEvent(
      'master-data.rekanan',
      String(row.id),
      {
        eventType,
        version: 1,
        rekananId: row.id,
        nama: row.nama,
        npwp: row.npwp,
        kode_usaha: row.kode_usaha,
        status: row.status,
        timestamp: new Date().toISOString(),
      },
    );
  }

  private writeRowToEntity(row: {
    id: number;
    nama: string;
    npwp: string;
    kode_usaha: string | null;
    alamat: string;
    kota: string | null;
    telepon: string | null;
    email: string | null;
    kode_swift: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
  }): Rekanan {
    return {
      id: row.id,
      nama: row.nama,
      npwp: row.npwp,
      kode_usaha: row.kode_usaha,
      alamat: row.alamat,
      kota: row.kota,
      telepon: row.telepon,
      email: row.email,
      kode_swift: row.kode_swift,
      status: row.status as 'aktif' | 'nonaktif',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private readRowToEntity(row: {
    id: number;
    nama: string;
    npwp: string;
    kode_usaha: string | null;
    alamat: string;
    kota: string | null;
    telepon: string | null;
    email: string | null;
    kode_swift: string | null;
    status: string;
    created_at: Date | null;
    updated_at: Date;
  }): Rekanan {
    return {
      id: row.id,
      nama: row.nama,
      npwp: row.npwp,
      kode_usaha: row.kode_usaha,
      alamat: row.alamat,
      kota: row.kota,
      telepon: row.telepon,
      email: row.email,
      kode_swift: row.kode_swift,
      status: row.status as 'aktif' | 'nonaktif',
      created_at: row.created_at ?? row.updated_at,
      updated_at: row.updated_at,
    };
  }
}
