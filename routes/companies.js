const express = require('express');
const router = express.Router();
const db = require('../db');
const APIError = require('../errors');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/', async (request, response, next) => {
  try {
    var results = await db.query('SELECT code, name FROM companies');
    return response.json({ companies: results.rows });
  } catch (error) {
    return next(error);
  }
});

router.use('/:code', async function checkIfCodeExists(request, response, next) {
  try {
    var results = await db.query(
      'SELECT * FROM companies c JOIN invoices i ON i.comp_code = c.code WHERE code=$1',
      [request.params.code]
    );
    if (results.rows.length === 0) {
      throw new APIError(`Company not found for ${request.params.code}`, 404);
    }
    let { name, description, code } = results.rows[0];
    request.company = {
      name,
      description,
      code
    };
    request.company.invoices = results.rows.map(item => {
      let { name, description, code, comp_code, id, ...invoice } = item;
      return invoice;
    });
    return next();
  } catch (error) {
    return next(error);
  }
});

router.get('/:code', (request, response, next) => {
  return response.json({ company: request.company });
});

router.put('/:code', async (request, response, next) => {
  try {
    let name = request.body.name || request.company.name;
    let description = request.body.description || request.company.description;
    var result = await db.query(
      `UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING *`,
      [name, description, request.company.code]
    );
    result.rows[0].invoices = request.company.invoices;
    return response.json({ company: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:code', async (request, response, next) => {
  try {
    var result = await db.query(
      'DELETE FROM companies WHERE code=$1 RETURNING *',
      [request.params.code]
    );
    return response.json({ status: 'deleted', company: request.company });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    let { code, name, description } = request.body;
    var results = await db.query(
      'INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING *',
      [code, name, description]
    );
    return response.json({ company: results.rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
