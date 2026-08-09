// src/api/masterDataImportApi.js
import apiClient from './client';

export async function previewImport(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/master-data-import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data; // { sheet_used, summary, rows, ignored_columns }
}

export async function commitImport(rows) {
  const { data } = await apiClient.post('/master-data-import/commit', { rows });
  return data.data; // { lines_created, parts_created, parts_updated, mappings_created, mappings_skipped, rows_skipped, row_errors }
}
