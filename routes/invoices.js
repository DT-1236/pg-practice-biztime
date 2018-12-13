const express = require('express');
const router = express.Router();
const db = require('../db');
const APIError = require('../errors');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/', async (request, response, next) => {
  try {
    var results = await db.query('SELECT id, comp_code FROM invoices');
    return response.json({ invoices: results.rows });
  } catch (error) {
    return next(error);
  }
});

router.use('/:id', async function checkIfidExists(request, response, next) {
  try {
    var results = await db.query(
      'SELECT i.id, i.amt, i.paid, i.add_date, i.paid_date, c.code, c.name, c.description FROM invoices i JOIN companies c ON i.comp_code = c.code WHERE i.id=$1',
      [request.params.id]
    );
    if (results.rows.length === 0) {
      throw new APIError(`Invoice not found for ${request.params.id}`, 404);
    }
    let { code, name, description, ...invoice } = results.rows[0];
    request.company = {
      code,
      name,
      description
    };
    invoice.company = request.company;
    request.invoice = invoice;
    return next();
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', (request, response, next) => {
  return response.json({ invoice: request.invoice });
});

router.put('/:id', async (request, response, next) => {
  try {
    let amt = request.body.amt || request.invoice.amt;
    var result = await db.query(
      `UPDATE invoices SET amt=$1 WHERE id=$2 RETURNING *`,
      [amt, request.invoice.id]
    );
    return response.json({ invoice: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (request, response, next) => {
  try {
    var result = await db.query(
      'DELETE FROM invoices WHERE id=$1 RETURNING *',
      [request.params.id]
    );
    return response.json({ status: 'deleted', invoice: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    var results = await db.query(
      'INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING *',
      [request.body.comp_code, request.body.amt]
    );
    return response.json({ invoice: results.rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
