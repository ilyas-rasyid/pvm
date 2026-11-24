# PVMS — Procurement & Vendor Management System

Sistem manajemen pengadaan barang dan vendor (_procure-to-pay_) menyeluruh untuk perusahaan, mulai dari pengajuan kebutuhan (_Purchase Request_), _approval_ manajerial berjenjang, _sourcing_ penawaran harga vendor (RFQ), penerbitan _Purchase Order_ (PO), penerimaan barang (_Goods Receipt_), hingga verifikasi faktur (_3-way invoice matching_).

---

## Prasyarat

- [Bun](https://bun.sh/) (v1.2+)
- [Docker & Docker Compose](https://docs.docker.com/compose/)

---

## Cara Menjalankan

### 1. Clone & Install Dependensi

```bash
bun install
```

### 2. Setup Environment Variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Jalankan Database

Nyalakan container PostgreSQL menggunakan Docker Compose:

```bash
bun run db:up
```

### 4. Migrasi & Seeding Data

Generate client Prisma, jalankan migrasi database, lalu isi data awal (_seed_):

```bash
bun run db:generate
bun run db:migrate:deploy

# Jalankan seeder (DEMO_PASSWORD minimal 15 karakter)
NODE_ENV=development DEMO_PASSWORD='DemoPassword123!' bun run db:seed
```

### 5. Jalankan Aplikasi

Jalankan backend dan frontend secara bersamaan dalam mode development:

```bash
bun run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## Akun Demo Login

Semua akun demo menggunakan password yang ditentukan pada variabel `DEMO_PASSWORD` saat _seeding_ (contoh: `DemoPassword123!`):

| Role / Jabatan          | Email                           | Hak Akses Utama                                        |
| ----------------------- | ------------------------------- | ------------------------------------------------------ |
| **Administrator**       | `admin@pvms.demo`               | Master data organisasi, departemen, dan pengguna       |
| **Department Manager**  | `department-manager@pvms.demo`  | Review & persetujuan (_approval_) Purchase Request     |
| **Procurement Officer** | `procurement-officer@pvms.demo` | Pembuatan RFQ, evaluasi vendor, dan penerbitan PO      |
| **Receiving Officer**   | `receiving-officer@pvms.demo`   | Verifikasi fisik dan pencatatan _Goods Receipt_        |
| **Finance Officer**     | `finance-officer@pvms.demo`     | _3-Way matching_ (PO, GR, Invoice) & verifikasi faktur |
| **Employee**            | `employee@pvms.demo`            | Pengajuan draf Purchase Request (PR)                   |
