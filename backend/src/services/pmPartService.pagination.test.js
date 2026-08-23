const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../config/db');
const pmPartService = require('./pmPartService');
const pmPartSnapshotService = require('./pmPartSnapshotService');

const RUN_ID = Date.now();
const LINE_NAME = `TestLine_${RUN_ID}`;

describe('pmPartService.listPmPart — pagination (TECHNICAL_DEBT.md #1)', () => {
    let lineId;
    const partIds = [];

    before(async () => {
        const lineRes = await db.query(
            `INSERT INTO lines (line_name, is_active) VALUES ($1, TRUE) RETURNING id`,
            [LINE_NAME]
        );
        lineId = lineRes.rows[0].id;

        for (let i = 0; i < 5; i += 1) {
            const res = await db.query(
                `INSERT INTO parts (line_id, drawing_no, part_name, target_shot, jig_name, is_active)
         VALUES ($1, $2, $3, 100000, $4, TRUE) RETURNING id`,
                [lineId, `DWG-${RUN_ID}-${i}`, `Part ${i}`, `JIG-${RUN_ID}-${i}`]
            );
            partIds.push(res.rows[0].id);
        }

        const dangerRes = await db.query(
            `INSERT INTO parts (line_id, drawing_no, part_name, target_shot, jig_name, is_active)
       VALUES ($1, $2, $3, 100, $4, TRUE) RETURNING id`,
            [lineId, `DWG-${RUN_ID}-danger`, 'Part Danger', `JIG-${RUN_ID}-danger`]
        );
        const dangerPartId = dangerRes.rows[0].id;
        partIds.push(dangerPartId);

        const clNo = `CL-${RUN_ID}`;
        await db.query(
            `INSERT INTO part_cl_mapping (part_id, cl_no) VALUES ($1, $2)`,
            [dangerPartId, clNo]
        );
        await db.query(
            `INSERT INTO pm_part_history (part_id, tgl_ganti, shift, counter_saat_diganti, jenis_penggantian, user_id)
       VALUES ($1, CURRENT_DATE - INTERVAL '10 days', 1, 0, 'TERJADWAL',
               (SELECT id FROM users LIMIT 1))`,
            [dangerPartId]
        );
        // Output actual jauh melebihi target_shot (100) -> remaining_shot < 0 -> DANGER
        await db.query(
            `INSERT INTO production_cache (line_id, cl_no, tanggal, output_actual)
       VALUES ($1, $2, CURRENT_DATE, 500)`,
            [lineId, clNo]
        );

        // Filter status baca dari pm_part_status_snapshot (lihat migration
        // 1700000021000 & pmPartSnapshotService.js), bukan real-time lagi -
        // simulasikan scheduled job jalan sekali sebelum test yang butuh
        // filter status. Fixture "tanpa filter status" di bawah TIDAK
        // butuh ini karena jalur itu tetap real-time (findAllWithCounter).
        await pmPartSnapshotService.recomputeAll();
    });

    after(async () => {
        await db.query(`DELETE FROM pm_part_history WHERE part_id = ANY($1::int[])`, [partIds]);
        await db.query(`DELETE FROM production_cache WHERE line_id = $1`, [lineId]);
        await db.query(`DELETE FROM parts WHERE line_id = $1`, [lineId]);
        await db.query(`DELETE FROM lines WHERE id = $1`, [lineId]);
        await db.pool.end();
    });

    test('Tanpa filter status: pagination SQL-level — total benar, halaman tidak overlap', async () => {
        const page1 = await pmPartService.listPmPart({ lineId, page: 1, limit: 2 });
        const page2 = await pmPartService.listPmPart({ lineId, page: 2, limit: 2 });
        const page3 = await pmPartService.listPmPart({ lineId, page: 3, limit: 2 });

        assert.equal(page1.total, 6); // 5 OK + 1 DANGER, semua part di line ini
        assert.equal(page1.items.length, 2);
        assert.equal(page2.items.length, 2);
        assert.equal(page3.items.length, 2);

        const allIds = [...page1.items, ...page2.items, ...page3.items].map((i) => i.part_id);
        const uniqueIds = new Set(allIds);
        assert.equal(uniqueIds.size, 6, 'tidak boleh ada part yang muncul di 2 halaman sekaligus');
    });

    test('Dengan filter status=DANGER: baca dari snapshot (SQL-level pagination), hasil tetap benar', async () => {
        const res = await pmPartService.listPmPart({ lineId, status: 'DANGER', page: 1, limit: 10 });

        assert.equal(res.total, 1);
        assert.equal(res.items.length, 1);
        assert.equal(res.items[0].part_id, partIds[partIds.length - 1]);
        assert.equal(res.items[0].status, 'DANGER');
    });

    test('Dengan filter status=OK: hanya part yang OK yang muncul, DANGER tidak ikut', async () => {
        const res = await pmPartService.listPmPart({ lineId, status: 'OK', page: 1, limit: 10 });

        assert.equal(res.total, 5);
        assert.ok(res.items.every((i) => i.status === 'OK'));
    });
});