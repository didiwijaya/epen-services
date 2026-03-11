export interface RekananWriteRow {
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

export interface RekananInsertDto {
  nama: string;
  npwp: string;
  kode_usaha?: string | null;
  alamat: string;
  kota?: string | null;
  telepon?: string | null;
  email?: string | null;
  kode_swift?: string | null;
}

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { WRITE_POOL } from '../database/database.module';

@Injectable()
export class RekananWriteRepository {
  constructor(@Inject(WRITE_POOL) private readonly pool: Pool) {}

  async insert(dto: RekananInsertDto): Promise<RekananWriteRow> {
    const [result] = await this.pool.execute(
      `INSERT INTO rekanan (nama, npwp, kode_usaha, alamat, kota, telepon, email, kode_swift, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aktif')`,
      [
        dto.nama,
        dto.npwp,
        dto.kode_usaha ?? null,
        dto.alamat,
        dto.kota ?? null,
        dto.telepon ?? null,
        dto.email ?? null,
        dto.kode_swift ?? null,
      ],
    );
    const insertId = (result as { insertId: number }).insertId;
    const row = await this.findOneById(insertId);
    if (!row) throw new Error('Insert succeeded but rekanan not found');
    return row;
  }

  async update(
    id: number,
    dto: Partial<RekananInsertDto & { status: string }>,
  ): Promise<RekananWriteRow> {
    const existing = await this.findOneById(id);
    if (!existing) throw new NotFoundException(`Rekanan dengan id ${id} tidak ditemukan`);

    const updates: string[] = [];
    const values: unknown[] = [];

    if (dto.nama !== undefined) {
      updates.push('nama = ?');
      values.push(dto.nama);
    }
    if (dto.npwp !== undefined) {
      updates.push('npwp = ?');
      values.push(dto.npwp);
    }
    if (dto.kode_usaha !== undefined) {
      updates.push('kode_usaha = ?');
      values.push(dto.kode_usaha);
    }
    if (dto.alamat !== undefined) {
      updates.push('alamat = ?');
      values.push(dto.alamat);
    }
    if (dto.kota !== undefined) {
      updates.push('kota = ?');
      values.push(dto.kota);
    }
    if (dto.telepon !== undefined) {
      updates.push('telepon = ?');
      values.push(dto.telepon);
    }
    if (dto.email !== undefined) {
      updates.push('email = ?');
      values.push(dto.email);
    }
    if (dto.kode_swift !== undefined) {
      updates.push('kode_swift = ?');
      values.push(dto.kode_swift);
    }
    if (dto.status !== undefined) {
      updates.push('status = ?');
      values.push(dto.status);
    }

    if (updates.length === 0) return existing;
    values.push(id);
    await this.pool.execute(
      `UPDATE rekanan SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      values as (string | number | null)[],
    );
    const row = await this.findOneById(id);
    if (!row) throw new Error('Update succeeded but rekanan not found');
    return row;
  }

  async softDelete(id: number): Promise<void> {
    const existing = await this.findOneById(id);
    if (!existing) throw new NotFoundException(`Rekanan dengan id ${id} tidak ditemukan`);
    await this.pool.execute(
      `UPDATE rekanan SET status = 'nonaktif', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [id],
    );
  }

  async findOneById(id: number): Promise<RekananWriteRow | null> {
    const [rows] = await this.pool.execute(
      'SELECT id, nama, npwp, kode_usaha, alamat, kota, telepon, email, kode_swift, status, created_at, updated_at FROM rekanan WHERE id = ?',
      [id],
    );
    const arr = (Array.isArray(rows) ? rows : []) as RekananWriteRow[];
    return arr[0] ?? null;
  }
}
