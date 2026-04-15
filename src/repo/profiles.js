const { query } = require('../db');

function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    gender_probability: Number(row.gender_probability),
    sample_size: Number(row.sample_size),
    age: Number(row.age),
    age_group: row.age_group,
    country_id: row.country_id,
    country_probability: Number(row.country_probability),
    created_at: new Date(row.created_at).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}

function serializeListItem(row) {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: Number(row.age),
    age_group: row.age_group,
    country_id: row.country_id,
  };
}

async function insertOrGet(profile) {
  const insertSql = `
    INSERT INTO profiles
      (id, name, name_key, gender, gender_probability, sample_size, age, age_group, country_id, country_probability)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (name_key) DO NOTHING
    RETURNING *
  `;
  const params = [
    profile.id,
    profile.name,
    profile.name_key,
    profile.gender,
    profile.gender_probability,
    profile.sample_size,
    profile.age,
    profile.age_group,
    profile.country_id,
    profile.country_probability,
  ];
  const insertResult = await query(insertSql, params);
  if (insertResult.rows.length > 0) {
    return { inserted: true, row: serialize(insertResult.rows[0]) };
  }
  const existing = await query('SELECT * FROM profiles WHERE name_key = $1', [profile.name_key]);
  return { inserted: false, row: serialize(existing.rows[0]) };
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM profiles WHERE id = $1', [id]);
  return rows[0] ? serialize(rows[0]) : null;
}

async function deleteById(id) {
  const { rowCount } = await query('DELETE FROM profiles WHERE id = $1', [id]);
  return rowCount > 0;
}

async function list({ gender, country_id, age_group }) {
  const conditions = [];
  const params = [];
  if (gender) {
    params.push(gender.toLowerCase());
    conditions.push(`LOWER(gender) = $${params.length}`);
  }
  if (country_id) {
    params.push(country_id.toLowerCase());
    conditions.push(`LOWER(country_id) = $${params.length}`);
  }
  if (age_group) {
    params.push(age_group.toLowerCase());
    conditions.push(`LOWER(age_group) = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM profiles ${where} ORDER BY created_at ASC`, params);
  return rows.map(serializeListItem);
}

module.exports = { insertOrGet, findById, deleteById, list, serialize, serializeListItem };
