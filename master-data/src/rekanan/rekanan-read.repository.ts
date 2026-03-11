export interface RekananReadRow {
  id: number;
  nama: string;
  npwp: string;
  npwp_clean: string | null;
  kode_usaha: string | null;
  alamat: string;
  kota: string | null;
  telepon: string | null;
  email: string | null;
  kode_swift: string | null;
  status: string;
  nama_lower: string | null;
  created_at: Date | null;
  updated_at: Date;
}

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { READ_POOL } from '../database/database.module';

@Injectable()
export class RekananReadRepository {
  constructor(@Inject(READ_POOL) private readonly pool: Pool) {}

  async findAll(
    page: number,
    perPage: number,
    search?: string,
    status?: string,
    kodeUsaha?: string,
  ): Promise<{ data: RekananReadRow[]; meta: { current_page: number; per_page: number; total: number; last_page: number } }> {
    let where = '1=1';
    const params: unknown[] = [];

    if (search) {
      where += ' AND (nama_lower LIKE ? OR npwp_clean LIKE ?)';
      const term = `%${search.toLowerCase().replace(/[.\s-]/g, '')}%`;
      params.push(term, term);
    }
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (kodeUsaha) {
      where += ' AND kode_usaha = ?';
      params.push(kodeUsaha);
    }

    const [countResult] = await this.pool.execute(
      `SELECT COUNT(*) as count FROM rekanan WHERE ${where}`,
      params as (string | number)[],
    );
    const total = Array.isArray(countResult) && countResult.length > 0
      ? Number((countResult as { count: number }[])[0].count)
      : 0;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const offset = (page - 1) * perPage;

    const [rows] = await this.pool.execute(
      `SELECT id, nama, npwp, npwp_clean, kode_usaha, alamat, kota, telepon, email, kode_swift, status, nama_lower, created_at, updated_at
       FROM rekanan WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset] as (string | number)[],
    );
    const data = (Array.isArray(rows) ? rows : []) as RekananReadRow[];

    return {
      data,
      meta: { current_page: page, per_page: perPage, total, last_page: lastPage },
    };
  }

  async findOne(id: number): Promise<RekananReadRow> {
    const [rows] = await this.pool.execute(
      `SELECT id, nama, npwp, npwp_clean, kode_usaha, alamat, kota, telepon, email, kode_swift, status, nama_lower, created_at, updated_at
       FROM rekanan WHERE id = ?`,
      [id],
    );
    const arr = (Array.isArray(rows) ? rows : []) as RekananReadRow[];
    const row = arr[0];
    if (!row) throw new NotFoundException(`Rekanan dengan id ${id} tidak ditemukan`);
    return row;
  }

  async lookup(npwp?: string, nama?: string, kodeSwift?: string): Promise<RekananReadRow[]> {
    let where = "status = 'aktif'";
    const params: unknown[] = [];

    if (npwp) {
      where += ' AND (npwp LIKE ? OR npwp_clean LIKE ?)';
      const term = `%${npwp.replace(/[.\s-]/g, '')}%`;
      params.push(`%${npwp}%`, term);
    }
    if (nama) {
      where += ' AND nama_lower LIKE ?';
      params.push(`%${nama.toLowerCase()}%`);
    }
    if (kodeSwift) {
      where += ' AND kode_swift = ?';
      params.push(kodeSwift);
    }

    const [rows] = await this.pool.execute(
      `SELECT id, nama, npwp, npwp_clean, kode_usaha, alamat, kota, telepon, email, kode_swift, status, nama_lower, created_at, updated_at
       FROM rekanan WHERE ${where} LIMIT 50`,
      params as (string | number)[],
    );
    return (Array.isArray(rows) ? rows : []) as RekananReadRow[];
  }

  /** Dipanggil dari Kafka consumer: upsert read model dari event */
  async upsertFromEvent(row: {
    id: number;
    nama: string;
    npwp: string;
    kode_usaha?: string | null;
    alamat?: string;
    kota?: string | null;
    telepon?: string | null;
    email?: string | null;
    kode_swift?: string | null;
    status: string;
    created_at?: string | null;
    updated_at: string;
  }): Promise<void> {
    const npwpClean = row.npwp.replace(/[.\s-]/g, '');
    const namaLower = row.nama.toLowerCase();
    const created = new Date(row.created_at ?? row.updated_at);
    const updated = new Date(row.updated_at);
    const createdAt = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')} ${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}:${String(created.getSeconds()).padStart(2, '0')}`;
    const updatedAt = `${updated.getFullYear()}-${String(updated.getMonth() + 1).padStart(2, '0')}-${String(updated.getDate()).padStart(2, '0')} ${String(updated.getHours()).padStart(2, '0')}:${String(updated.getMinutes()).padStart(2, '0')}:${String(updated.getSeconds()).padStart(2, '0')}`;

    await this.pool.execute(
      `INSERT INTO rekanan (id, nama, npwp, npwp_clean, kode_usaha, alamat, kota, telepon, email, kode_swift, status, nama_lower, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nama = VALUES(nama),
         npwp = VALUES(npwp),
         npwp_clean = VALUES(npwp_clean),
         kode_usaha = VALUES(kode_usaha),
         alamat = VALUES(alamat),
         kota = VALUES(kota),
         telepon = VALUES(telepon),
         email = VALUES(email),
         kode_swift = VALUES(kode_swift),
         status = VALUES(status),
         nama_lower = VALUES(nama_lower),
         updated_at = VALUES(updated_at)`,
      [
        row.id,
        row.nama,
        row.npwp,
        npwpClean,
        row.kode_usaha ?? null,
        row.alamat ?? '',
        row.kota ?? null,
        row.telepon ?? null,
        row.email ?? null,
        row.kode_swift ?? null,
        row.status,
        namaLower,
        createdAt,
        updatedAt,
      ],
    );
  }

  /** Update status saja (deactivated) */
  async setStatus(id: number, status: string): Promise<void> {
    await this.pool.execute(
      `UPDATE rekanan SET status = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [status, id],
    );
  }
}
