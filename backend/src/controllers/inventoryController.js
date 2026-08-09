// src/controllers/inventoryController.js
const inventoryService = require('../services/inventoryService');
const {
  validateCreateItem,
  validateUpdateItem,
  validateAdjustStock,
} = require('../validators/inventoryValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const data = await inventoryService.listItems({ search, page, limit });
  res.status(200).json({ success: true, message: 'Success', data });
});

const detail = asyncHandler(async (req, res) => {
  const data = await inventoryService.getItem(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Success', data });
});

const movements = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const data = await inventoryService.listMovements(Number(req.params.id), { page, limit });
  res.status(200).json({ success: true, message: 'Success', data });
});

const allMovements = asyncHandler(async (req, res) => {
  const { item_id, movement_type, page, limit } = req.query;
  const data = await inventoryService.listAllMovements({
    item_id: item_id ? Number(item_id) : undefined,
    movement_type,
    page,
    limit,
  });
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const { valid, errors } = validateCreateItem(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await inventoryService.createItem(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

const update = asyncHandler(async (req, res) => {
  const { valid, errors } = validateUpdateItem(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await inventoryService.updateItem(Number(req.params.id), req.body, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const adjustStock = asyncHandler(async (req, res) => {
  const { valid, errors } = validateAdjustStock(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await inventoryService.adjustStock(
    Number(req.params.id),
    { movement_type: req.body.movement_type, qty: req.body.qty, note: req.body.note },
    req.user.id
  );
  res.status(200).json({ success: true, message: 'Success', data });
});

const remove = asyncHandler(async (req, res) => {
  await inventoryService.deleteItem(Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success' });
});

const linkPart = asyncHandler(async (req, res) => {
  const inventoryItemId = req.body.inventory_item_id === null ? null : Number(req.body.inventory_item_id);
  const data = await inventoryService.linkPartToItem(Number(req.params.partId), inventoryItemId, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const ropStatus = asyncHandler(async (req, res) => {
  const data = await inventoryService.getRopMetrics();
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { list, detail, movements, allMovements, create, update, adjustStock, remove, linkPart, ropStatus };