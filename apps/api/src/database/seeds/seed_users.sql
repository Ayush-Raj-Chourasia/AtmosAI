-- Seed Default User
-- This user is used by the frontend for the MVP (TIM_USER_ID)

INSERT INTO users (id, trust_score)
VALUES ('00000000-0000-0000-0000-000000000000', 1.0)
ON CONFLICT (id) DO NOTHING;
