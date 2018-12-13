const express = require('express');
const router = express.Router();
const db = require('../db');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/', async (request, response, next) => {
  try {
    var results = await db.query('SELECT id, comp_code FROM invoices');
  } catch (error) {
    return next(error);
  }
  return response.json({ invoices: results.rows });
});

router.use('/:id', async function checkIfidExists(request, response, next) {
  try {
    var results = await db.query(
      'SELECT i.id, i.amt, i.paid, i.add_date, i.paid_date, c.code, c.name, c.description FROM invoices i JOIN companies c ON i.comp_code = c.code WHERE i.id=$1',
      [request.params.id]
    );
  } catch (error) {
    return next(error);
  }
  if (results.rows.length === 0) {
    let error = new Error(`Invoice not found for ${request.params.id}`);
    error.status = 404;
    return next(error);
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
});

router.get('/:id', (request, response, next) => {
  return response.json({ invoice: request.invoice });
});

router.put('/:id', async (request, response, next) => {
  try {
    let name = request.body.name || request.company.name;
    let description = request.body.description || request.company.description;
    var result = await db.query(
      `UPDATE companies SET name=$1, description=$2 WHERE id=$3 RETURNING *`,
      [name, description, request.company.id]
    );
  } catch (error) {
    return next(error);
  }
  return response.json(result.rows[0]);
});

router.delete('/:id', async (request, response, next) => {
  try {
    var result = await db.query(
      'DELETE FROM invoices WHERE id=$1 RETURNING *',
      [request.params.id]
    );
  } catch (error) {
    next(error);
  }
  return response.json({ status: 'deleted', company: result.rows[0] });
});

router.post('/', async (request, response, next) => {
  let { id, name, description } = request.body;

  try {
    var results = await db.query(
      'INSERT INTO invoices (id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [id, name, description]
    );
  } catch (error) {
    return next(error);
  }

  return response.json({ company: results.rows[0] });
});

module.exports = router;
