const express = require('express');
const router = express.Router();
const db = require('../db');

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/', async (request, response, next) => {
  try {
    var results = await db.query('SELECT code, name FROM companies');
  } catch (error) {
    return next(error);
  }

  return response.json({ companies: results.rows });
});

router.use('/:code', async function checkIfCodeExists(request, response, next) {
  try {
    var results = await db.query(
      'SELECT code, name, description FROM companies WHERE code=$1',
      [request.params.code]
    );
  } catch (error) {
    return next(error);
  }
  if (results.rows.length === 0) {
    let error = new Error(`Company not found for ${request.params.code}`);
    error.status = 404;
    return next(error);
  }
  request.company = results.rows[0];
  return next();
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
  } catch (error) {
    return next(error);
  }
  return response.json(result.rows[0]);
});

router.delete('/:code', async (request, response, next) => {
  try {
    var result = await db.query(
      'DELETE FROM companies WHERE code=$1 RETURNING *',
      [request.params.code]
    );
  } catch (error) {
    next(error);
  }
  return response.json({ status: 'deleted', company: result.rows[0] });
});

router.post('/', async (request, response, next) => {
  let { code, name, description } = request.body;

  try {
    var results = await db.query(
      'INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING *',
      [code, name, description]
    );
  } catch (error) {
    return next(error);
  }

  return response.json({ company: results.rows[0] });
});

module.exports = router;
