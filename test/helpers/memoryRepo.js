function createMemoryRepo() {
  const rows = new Map(); // id -> row

  function toStored(profile) {
    return {
      id: profile.id,
      name: profile.name,
      name_key: profile.name_key,
      gender: profile.gender,
      gender_probability: Number(profile.gender_probability),
      sample_size: Number(profile.sample_size),
      age: Number(profile.age),
      age_group: profile.age_group,
      country_id: profile.country_id,
      country_probability: Number(profile.country_probability),
      created_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };
  }

  function fullShape(row) {
    const { name_key, ...rest } = row;
    return rest;
  }

  function listShape(row) {
    return {
      id: row.id,
      name: row.name,
      gender: row.gender,
      age: row.age,
      age_group: row.age_group,
      country_id: row.country_id,
    };
  }

  return {
    _rows: rows,
    async insertOrGet(profile) {
      for (const r of rows.values()) {
        if (r.name_key === profile.name_key) {
          return { inserted: false, row: fullShape(r) };
        }
      }
      const stored = toStored(profile);
      rows.set(stored.id, stored);
      return { inserted: true, row: fullShape(stored) };
    },
    async findById(id) {
      const r = rows.get(id);
      return r ? fullShape(r) : null;
    },
    async deleteById(id) {
      return rows.delete(id);
    },
    async list({ gender, country_id, age_group } = {}) {
      const out = [];
      for (const r of rows.values()) {
        if (gender && r.gender.toLowerCase() !== String(gender).toLowerCase()) continue;
        if (country_id && r.country_id.toLowerCase() !== String(country_id).toLowerCase()) continue;
        if (age_group && r.age_group.toLowerCase() !== String(age_group).toLowerCase()) continue;
        out.push(listShape(r));
      }
      return out;
    },
    size() { return rows.size; },
  };
}

module.exports = { createMemoryRepo };
