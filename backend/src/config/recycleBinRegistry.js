// src/config/recycleBinRegistry.js
//
// Whitelist ENTITY -> tabel fisik + SQL listing, dipakai recycleBinService.
// SENGAJA whitelist ketat (bukan terima nama tabel dari request langsung) -
// entity key di URL (req.params.entity) divalidasi lewat getEntityConfig()
// sebelum table name dipakai di query string manapun, supaya gak ada celah
// SQL injection lewat parameter URL.
//
// `protectColumn` (opsional) - kolom boolean yang HARUS false/null supaya
// row boleh ikut bulk-delete generik (recycleBinService.bulkSoftDelete).
// Dipakai untuk roles.is_system - Admin/Operator gak boleh ke-checklist dan
// terhapus lewat aksi massal, meski jalur single-delete (roleManagementService)
// sudah blokir ini juga di layer lain.

const REGISTRY = {
  lines: {
    table: 'lines',
    label: 'Lines',
    listSql: `
      SELECT l.id, l.line_name AS label, NULL AS context, l.deleted_at, u.full_name AS deleted_by_name
      FROM lines l
      LEFT JOIN users u ON u.id = l.deleted_by
      WHERE l.deleted_at IS NOT NULL
      ORDER BY l.deleted_at DESC
    `,
  },
  parts: {
    table: 'parts',
    label: 'Parts',
    listSql: `
      SELECT p.id, (p.jig_name || ' - ' || p.drawing_no) AS label, l.line_name AS context,
             p.deleted_at, u.full_name AS deleted_by_name
      FROM parts p
      JOIN lines l ON l.id = p.line_id
      LEFT JOIN users u ON u.id = p.deleted_by
      WHERE p.deleted_at IS NOT NULL
      ORDER BY p.deleted_at DESC
    `,
  },
  suppliers: {
    table: 'suppliers',
    label: 'Suppliers',
    listSql: `
      SELECT s.id, s.supplier_name AS label, NULL AS context, s.deleted_at, u.full_name AS deleted_by_name
      FROM suppliers s
      LEFT JOIN users u ON u.id = s.deleted_by
      WHERE s.deleted_at IS NOT NULL
      ORDER BY s.deleted_at DESC
    `,
  },
  'inventory-items': {
    table: 'inventory_items',
    label: 'Inventory Items',
    listSql: `
      SELECT i.id, i.spare_part_number AS label, i.part_name AS context, i.deleted_at, u.full_name AS deleted_by_name
      FROM inventory_items i
      LEFT JOIN users u ON u.id = i.deleted_by
      WHERE i.deleted_at IS NOT NULL
      ORDER BY i.deleted_at DESC
    `,
  },
  roles: {
    table: 'roles',
    label: 'Roles',
    protectColumn: 'is_system',
    listSql: `
      SELECT r.id, r.name AS label, NULL AS context, r.deleted_at, u.full_name AS deleted_by_name
      FROM roles r
      LEFT JOIN users u ON u.id = r.deleted_by
      WHERE r.deleted_at IS NOT NULL
      ORDER BY r.deleted_at DESC
    `,
  },
  'cl-mapping': {
    table: 'part_cl_mapping',
    label: 'Part-CL Mapping',
    listSql: `
      SELECT m.id, m.cl_no AS label, p.drawing_no AS context, m.deleted_at, u.full_name AS deleted_by_name
      FROM part_cl_mapping m
      JOIN parts p ON p.id = m.part_id
      LEFT JOIN users u ON u.id = m.deleted_by
      WHERE m.deleted_at IS NOT NULL
      ORDER BY m.deleted_at DESC
    `,
  },
  'part-suppliers': {
    table: 'part_suppliers',
    label: 'Part-Supplier Links',
    listSql: `
      SELECT ps.id, s.supplier_name AS label, p.drawing_no AS context, ps.deleted_at, u.full_name AS deleted_by_name
      FROM part_suppliers ps
      JOIN suppliers s ON s.id = ps.supplier_id
      JOIN parts p ON p.id = ps.part_id
      LEFT JOIN users u ON u.id = ps.deleted_by
      WHERE ps.deleted_at IS NOT NULL
      ORDER BY ps.deleted_at DESC
    `,
  },
  // Empat entity di bawah ditambahkan lewat migration 1700000018000, atas
  // permintaan eksplisit - alat power Admin buat ngebersihin data hasil
  // PENGETESAN SISTEM (akun test_auth_*, history PM/Inventory hasil
  // percobaan) tanpa reset seluruh database. Sama seperti 7 entity di
  // atas: reversible lewat Restore selama belum di-Hapus Permanen.
  users: {
    table: 'users',
    label: 'Users',
    listSql: `
      SELECT u.id, u.username AS label, u.full_name AS context, u.deleted_at, du.full_name AS deleted_by_name
      FROM users u
      LEFT JOIN users du ON du.id = u.deleted_by
      WHERE u.deleted_at IS NOT NULL
      ORDER BY u.deleted_at DESC
    `,
  },
  'pm-line-history': {
    table: 'pm_monthly_history',
    label: 'History PM Monthly and Weekly',
    listSql: `
      SELECT h.id, (l.line_name || ' - ' || h.jenis_pm || ' - ' || to_char(h.tgl_input, 'DD/MM/YYYY')) AS label,
             h.keterangan AS context, h.deleted_at, u.full_name AS deleted_by_name
      FROM pm_monthly_history h
      JOIN lines l ON l.id = h.line_id
      LEFT JOIN users u ON u.id = h.deleted_by
      WHERE h.deleted_at IS NOT NULL
      ORDER BY h.deleted_at DESC
    `,
  },
  'pm-part-history': {
    table: 'pm_part_history',
    label: 'History PM Part',
    listSql: `
      SELECT h.id, (p.drawing_no || ' - ' || to_char(h.tgl_ganti, 'DD/MM/YYYY')) AS label,
             l.line_name AS context, h.deleted_at, u.full_name AS deleted_by_name
      FROM pm_part_history h
      JOIN parts p ON p.id = h.part_id
      JOIN lines l ON l.id = p.line_id
      LEFT JOIN users u ON u.id = h.deleted_by
      WHERE h.deleted_at IS NOT NULL
      ORDER BY h.deleted_at DESC
    `,
  },
  'inventory-movements': {
    table: 'inventory_stock_movements',
    label: 'History Inventory',
    listSql: `
      SELECT m.id, (i.spare_part_number || ' - ' || m.movement_type || ' ' || m.qty) AS label,
             i.part_name AS context, m.deleted_at, u.full_name AS deleted_by_name
      FROM inventory_stock_movements m
      JOIN inventory_items i ON i.id = m.inventory_item_id
      LEFT JOIN users u ON u.id = m.deleted_by
      WHERE m.deleted_at IS NOT NULL
      ORDER BY m.deleted_at DESC
    `,
  },
};

function getEntityConfig(entityKey) {
  return REGISTRY[entityKey] || null;
}

module.exports = { REGISTRY, getEntityConfig };
