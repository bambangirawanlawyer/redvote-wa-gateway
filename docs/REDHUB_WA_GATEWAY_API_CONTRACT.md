# REDHUB WA Gateway — API Contract Baseline

> Status: WA-000 contract baseline. Detail implementation boleh berubah pada WA-001/WA-002 selama semantic contract dan keputusan LOCKED tetap dipertahankan.

Base path baseline:
`/api/v1`

## 1. General Rules

### Authentication
- `GET /health` boleh tanpa auth pada network internal.
- Endpoint lain wajib authenticated.
- Production send API tidak boleh anonymous/public.

Baseline header:

```http
Authorization: Bearer <internal-api-token>
Content-Type: application/json
```

Nilai token tidak pernah ditulis ke Git.

### Response Semantics
HTTP success create-job berarti **job diterima**, bukan WhatsApp delivery sudah sukses.

Delivery sukses ditentukan oleh status asynchronous:
- `PENDING`
- `PREPARING`
- `SENDING`
- `SENT`
- `FAILED`
- `RETRY_PENDING`
- `FAILED_FINAL`

### Tenant Boundary
Request business wajib membawa `tenantId`.

Pilot:
`jember`

### Idempotency
Create invitation wajib membawa `idempotencyKey`.

Request dengan key sama tidak boleh membuat logical invitation kedua.

---

## 2. GET /health

Purpose:
- liveness/readiness baseline.

Example response:

```json
{
  "status": "ok",
  "service": "redhub-wa-gateway",
  "version": "0.1.0",
  "database": "ok"
}
```

Health tidak menampilkan secret/session detail.

---

## 3. GET /api/v1/devices

Purpose:
- daftar device sesuai tenant/authorization.

Query:
- `tenantId`

Example:

```json
{
  "items": [
    {
      "id": "dev_jember_main",
      "tenantId": "jember",
      "name": "WhatsApp Utama Jember",
      "phone": "628xxxxxxxxxx",
      "provider": "baileys",
      "status": "CONNECTED",
      "isDefault": true,
      "lastConnectedAt": "2026-10-04T01:00:00.000Z"
    }
  ]
}
```

Status device baseline:
- `DISCONNECTED`
- `PAIRING`
- `CONNECTING`
- `CONNECTED`
- `ERROR`

---

## 4. POST /api/v1/devices

Purpose:
- membuat logical WhatsApp device.

Example request:

```json
{
  "tenantId": "jember",
  "name": "WhatsApp Utama Jember",
  "provider": "baileys",
  "isDefault": true
}
```

Tidak memasukkan raw session credential pada API response.

---

## 5. POST /api/v1/devices/:deviceId/pair

Purpose:
- memulai/refresh pairing flow untuk device authorized.

Example response:

```json
{
  "deviceId": "dev_jember_main",
  "status": "PAIRING",
  "pairingMode": "QR"
}
```

QR data diambil melalui endpoint pairing state yang protected.

---

## 6. GET /api/v1/devices/:deviceId/pairing

Purpose:
- membaca pairing state secara aman.

Example response:

```json
{
  "deviceId": "dev_jember_main",
  "status": "PAIRING",
  "qr": "<short-lived-qr-payload>",
  "expiresAt": "2026-10-04T01:02:00.000Z"
}
```

Rules:
- protected endpoint;
- QR short-lived;
- jangan log full QR payload;
- tenant ownership wajib divalidasi.

---

## 7. GET /api/v1/devices/:deviceId/status

Example:

```json
{
  "deviceId": "dev_jember_main",
  "tenantId": "jember",
  "status": "CONNECTED",
  "phone": "628xxxxxxxxxx",
  "lastConnectedAt": "2026-10-04T01:00:00.000Z"
}
```

---

## 8. POST /api/v1/invitations

Purpose:
- membuat asynchronous invitation job.

### Request

```json
{
  "tenantId": "jember",
  "deviceId": "dev_jember_main",
  "meetingId": "MTG-2026-001",
  "memberId": "MBR-001",
  "invitationType": "MEETING",
  "phone": "628123456789",
  "recipientName": "Bambang Irawan",
  "agenda": "TEST UPACARA",
  "date": "Selasa, 13 Oktober 2026",
  "time": "13.00",
  "location": "PANTI",
  "pdfUrl": "https://redhub.example/files/invitations/MTG-2026-001.pdf",
  "pdfFilename": "Undangan_TEST_UPACARA_13_Oktober_2026.pdf",
  "organizationName": "Sekretariat DPC PDI Perjuangan Kabupaten Jember",
  "idempotencyKey": "jember:MTG-2026-001:MBR-001:MEETING"
}
```

`deviceId` dapat dibuat optional pada implementasi jika tenant hanya memakai default device, tetapi resolved device harus disimpan ke job.

### Validation Minimum

- tenant exists/active;
- device belongs to tenant;
- phone valid/normalized;
- recipientName non-empty;
- meetingId/memberId present;
- agenda/date/time/location present;
- PDF source accepted;
- PDF filename safe;
- idempotencyKey non-empty;
- payload size bounded.

### Accepted Response

```json
{
  "messageId": "wam_01...",
  "status": "PENDING",
  "duplicate": false,
  "idempotencyKey": "jember:MTG-2026-001:MBR-001:MEETING"
}
```

### Duplicate Response

Jika request dengan idempotency key sama sudah ada:

```json
{
  "messageId": "wam_01...",
  "status": "SENT",
  "duplicate": true,
  "idempotencyKey": "jember:MTG-2026-001:MBR-001:MEETING"
}
```

Gateway mengembalikan logical job existing dan tidak membuat pengiriman baru.

---

## 9. Rendered Invitation Baseline

Gateway harus menghasilkan baseline:

```text
*UNDANGAN RAPAT / KEGIATAN*

Yth. *Bpk/Ibu Bambang Irawan*,

*Merdeka...!!*

Dengan hormat, kami menyampaikan undangan untuk menghadiri agenda berikut:

*📌 Agenda: TEST UPACARA*
*📅 Waktu: Selasa, 13 Oktober 2026*
*⏰ Pukul: 13.00 WIB*
*📍 Tempat: PANTI*

Undangan resmi terlampir pada pesan ini.

Mohon hadir tepat waktu sesuai jadwal yang telah ditetapkan.

Terima kasih atas perhatian dan kehadirannya.

*Merdeka...!!*

*Sekretariat DPC PDI Perjuangan Kabupaten Jember*

_Pesan otomatis RedHub. Mohon tidak membalas pesan ini. Untuk informasi lebih lanjut, hubungi Sekretariat._
```

Renderer tidak boleh mengizinkan tenant A memakai organization identity tenant B.

---

## 10. PDF Delivery Contract

Expected provider behavior:
- download/read source PDF;
- verify file available;
- validate content/type/size;
- sanitize filename;
- send as WhatsApp document;
- include appropriate text/caption strategy based on provider capability;
- remove temporary file/buffer after completion.

Jika provider caption limitation membuat full template tidak stabil, gateway boleh mengirim:
1. invitation text;
2. PDF document immediately after;

tetapi keduanya tetap satu logical invitation job dan status akhir hanya SENT jika required delivery operations berhasil sesuai implementation policy.

---

## 11. GET /api/v1/messages/:messageId

Example:

```json
{
  "id": "wam_01...",
  "tenantId": "jember",
  "deviceId": "dev_jember_main",
  "meetingId": "MTG-2026-001",
  "memberId": "MBR-001",
  "status": "SENT",
  "attemptCount": 1,
  "providerMessageId": "provider-id",
  "queuedAt": "2026-10-04T01:00:00.000Z",
  "sentAt": "2026-10-04T01:00:04.000Z",
  "lastError": null
}
```

Sensitive provider/session data tidak ditampilkan.

---

## 12. GET /api/v1/messages

Filters baseline:
- `tenantId`
- `meetingId`
- `memberId`
- `status`
- pagination

Phone pada response admin dapat dimasking.

---

## 13. POST /api/v1/messages/:messageId/retry

Purpose:
- manual controlled retry untuk message yang eligible.

Rules:
- hanya status failure yang eligible;
- respect max attempt;
- tidak boleh retry SENT;
- attempt baru tercatat;
- authorization tenant wajib.

Example response:

```json
{
  "messageId": "wam_01...",
  "status": "RETRY_PENDING",
  "attemptCount": 1
}
```

---

## 14. GET /api/v1/queue/summary

Purpose:
- monitoring sederhana.

Example:

```json
{
  "tenantId": "jember",
  "pending": 12,
  "preparing": 0,
  "sending": 1,
  "sent": 87,
  "failed": 0,
  "retryPending": 0
}
```

---

## 15. POST /api/v1/test-send

Purpose:
- controlled admin/developer validation sebelum RedHub integration.

V1 test-send dapat menerima:
- tenant/device;
- destination phone;
- text;
- optional safe PDF source.

Endpoint:
- authenticated;
- disabled/restricted in production if no longer needed;
- audit logged.

Tidak boleh menjadi anonymous arbitrary-send endpoint.

---

## 16. Error Shape

Baseline:

```json
{
  "error": {
    "code": "INVALID_PHONE",
    "message": "Nomor tujuan tidak valid",
    "requestId": "req_01..."
  }
}
```

Suggested safe codes:
- `UNAUTHORIZED`
- `FORBIDDEN`
- `TENANT_NOT_FOUND`
- `DEVICE_NOT_FOUND`
- `DEVICE_NOT_CONNECTED`
- `INVALID_PHONE`
- `INVALID_PDF_SOURCE`
- `PDF_TOO_LARGE`
- `DUPLICATE_REQUEST` only if implementation chooses conflict instead of existing-job response
- `QUEUE_ERROR`
- `PROVIDER_ERROR`
- `RETRY_NOT_ALLOWED`

Raw credential/provider stack trace tidak dikirim ke client production.

---

## 17. Future RedHub Backend Mapping

Setelah WA-010 PASS/LOCKED:

```text
RedHub meeting
  + participant
  + tenant
  + official invitation PDF
        |
        v
RedHub backend constructs request
        |
        v
POST /api/v1/invitations
        |
        v
Gateway returns messageId/PENDING
        |
        v
RedHub stores/reads delivery reference
```

Frontend RedHub tidak memanggil gateway send endpoint langsung.

---

## 18. Non-Contract Internal Details

Hal berikut boleh berubah tanpa memutus client selama contract tetap kompatibel:
- internal folder layout;
- ORM/query builder;
- worker implementation;
- exact database indexes;
- provider library minor version;
- internal temp file strategy;
- logging library.

Perubahan breaking API harus:
1. dicatat di DECISIONS;
2. update contract;
3. memiliki migration/client plan;
4. tidak dilakukan diam-diam.
