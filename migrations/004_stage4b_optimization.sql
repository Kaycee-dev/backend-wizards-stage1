CREATE INDEX IF NOT EXISTS profiles_country_gender_age_idx
  ON profiles (country_id, gender, age);

CREATE INDEX IF NOT EXISTS profiles_gender_age_idx
  ON profiles (gender, age);

CREATE INDEX IF NOT EXISTS profiles_country_age_idx
  ON profiles (country_id, age);
