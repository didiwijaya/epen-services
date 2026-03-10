import { Injectable } from '@nestjs/common';

@Injectable()
export class DropdownService {
  private akun = [
    { kode: '5', uraian: 'Belanja', level: 1, parent_kode: null },
    { kode: '5.1', uraian: 'Belanja Operasi', level: 2, parent_kode: '5' },
    { kode: '5.1.01', uraian: 'Belanja Pegawai', level: 3, parent_kode: '5.1' },
    { kode: '5.1.02', uraian: 'Belanja Barang dan Jasa', level: 3, parent_kode: '5.1' },
    { kode: '5.1.02.01', uraian: 'Belanja Barang', level: 4, parent_kode: '5.1.02' },
    { kode: '5.1.02.01.01', uraian: 'Belanja Barang Pakai Habis', level: 5, parent_kode: '5.1.02.01' },
    { kode: '5.1.02.01.01.0001', uraian: 'Belanja Alat Tulis Kantor', level: 6, parent_kode: '5.1.02.01.01' },
    { kode: '5.1.02.01.01.0002', uraian: 'Belanja Alat Listrik dan Elektronik', level: 6, parent_kode: '5.1.02.01.01' },
    { kode: '5.1.02.02', uraian: 'Belanja Jasa', level: 4, parent_kode: '5.1.02' },
    { kode: '5.1.02.02.01', uraian: 'Belanja Jasa Kantor', level: 5, parent_kode: '5.1.02.02' },
    { kode: '5.1.02.02.01.0001', uraian: 'Belanja Telepon', level: 6, parent_kode: '5.1.02.02.01' },
    { kode: '5.1.02.02.01.0002', uraian: 'Belanja Air', level: 6, parent_kode: '5.1.02.02.01' },
    { kode: '5.2', uraian: 'Belanja Modal', level: 2, parent_kode: '5' },
    { kode: '5.2.01', uraian: 'Belanja Modal Tanah', level: 3, parent_kode: '5.2' },
    { kode: '5.2.02', uraian: 'Belanja Modal Peralatan dan Mesin', level: 3, parent_kode: '5.2' },
  ];

  private satuan = [
    { id: 1, nama: 'Unit', singkatan: 'Unit' },
    { id: 2, nama: 'Buah', singkatan: 'Bh' },
    { id: 3, nama: 'Paket', singkatan: 'Pkt' },
    { id: 4, nama: 'Lembar', singkatan: 'Lbr' },
    { id: 5, nama: 'Rim', singkatan: 'Rim' },
    { id: 6, nama: 'Kilogram', singkatan: 'Kg' },
    { id: 7, nama: 'Liter', singkatan: 'Ltr' },
    { id: 8, nama: 'Meter', singkatan: 'M' },
    { id: 9, nama: 'Orang', singkatan: 'Org' },
    { id: 10, nama: 'Hari', singkatan: 'Hari' },
    { id: 11, nama: 'Bulan', singkatan: 'Bln' },
    { id: 12, nama: 'Tahun', singkatan: 'Thn' },
  ];

  private bidang = [
    { id: 1, kode: '1', nama: 'Urusan Pemerintahan Bidang Pendidikan' },
    { id: 2, kode: '2', nama: 'Urusan Pemerintahan Bidang Kesehatan' },
    { id: 3, kode: '3', nama: 'Urusan Pemerintahan Bidang Pekerjaan Umum dan Penataan Ruang' },
    { id: 4, kode: '4', nama: 'Urusan Pemerintahan Bidang Perumahan Rakyat' },
    { id: 5, kode: '5', nama: 'Urusan Pemerintahan Bidang Ketentraman dan Ketertiban Umum' },
    { id: 6, kode: '6', nama: 'Urusan Pemerintahan Bidang Perencanaan' },
  ];

  private program = [
    { id: 1, bidang_id: 1, kode: '1.01.01', nama: 'Program Pengelolaan Pendidikan' },
    { id: 2, bidang_id: 1, kode: '1.01.02', nama: 'Program Pengembangan Kurikulum' },
    { id: 3, bidang_id: 2, kode: '2.01.01', nama: 'Program Pemenuhan Upaya Kesehatan Perorangan' },
    { id: 4, bidang_id: 2, kode: '2.01.02', nama: 'Program Peningkatan Kapasitas Sumber Daya Manusia Kesehatan' },
    { id: 5, bidang_id: 6, kode: '6.01.01', nama: 'Program Perencanaan, Pengendalian dan Evaluasi Pembangunan Daerah' },
    { id: 6, bidang_id: 6, kode: '6.01.02', nama: 'Program Koordinasi dan Sinkronisasi Perencanaan Pembangunan Daerah' },
  ];

  private kegiatan = [
    { id: 1, program_id: 1, kode: '1.01.01.1.01', nama: 'Pengelolaan Pendidikan Sekolah Dasar' },
    { id: 2, program_id: 1, kode: '1.01.01.1.02', nama: 'Pengelolaan Pendidikan Sekolah Menengah Pertama' },
    { id: 3, program_id: 3, kode: '2.01.01.1.01', nama: 'Penyediaan Fasilitas Pelayanan Kesehatan' },
    { id: 4, program_id: 5, kode: '6.01.01.1.01', nama: 'Penyusunan Perencanaan dan Pendanaan' },
  ];

  private subKegiatan = [
    { id: 1, kegiatan_id: 1, kode: '1.01.01.1.01.0001', nama: 'Pembangunan Sarana, Prasarana dan Utilitas SD' },
    { id: 2, kegiatan_id: 1, kode: '1.01.01.1.01.0002', nama: 'Pengadaan Perlengkapan Peserta Didik SD' },
    { id: 3, kegiatan_id: 2, kode: '1.01.01.1.02.0001', nama: 'Pembangunan Sarana, Prasarana dan Utilitas SMP' },
    { id: 4, kegiatan_id: 3, kode: '2.01.01.1.01.0001', nama: 'Pembangunan Puskesmas' },
    { id: 5, kegiatan_id: 4, kode: '6.01.01.1.01.0001', nama: 'Penyusunan Rencana Pembangunan Daerah' },
  ];

  getAkun(level?: number, parentKode?: string, search?: string) {
    let filtered = [...this.akun];

    if (level) {
      filtered = filtered.filter((a) => a.level === level);
    }
    if (parentKode) {
      filtered = filtered.filter((a) => a.parent_kode === parentKode);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (a) => a.kode.includes(s) || a.uraian.toLowerCase().includes(s),
      );
    }

    return filtered;
  }

  getSatuan() {
    return this.satuan;
  }

  getBidang() {
    return this.bidang;
  }

  getProgram(bidangId: number) {
    return this.program.filter((p) => p.bidang_id === bidangId);
  }

  getKegiatan(programId: number) {
    return this.kegiatan.filter((k) => k.program_id === programId);
  }

  getSubKegiatan(kegiatanId: number) {
    return this.subKegiatan.filter((sk) => sk.kegiatan_id === kegiatanId);
  }
}
