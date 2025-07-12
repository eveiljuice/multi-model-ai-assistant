-- Insert initial agent pricing data
INSERT INTO agent_pricing (agent_id, credit_weight, description) VALUES
  ('1', 1, 'Prompt Polisher - Standard text optimization'),
  ('2', 3, 'Competitor Analyst - Complex analysis and research'),
  ('3', 1, 'FAQ Generator - Standard content generation'),
  ('4', 2, 'Problem → Insight - Strategic transformation'),
  ('5', 2, 'Launch Checklist - Detailed planning'),
  ('6', 1, 'WhatsApp Response - Quick messaging'),
  ('7', 1, 'AI → Human Rewriter - Text humanization'),
  ('8', 1, 'Humor Rewriter - Creative text enhancement')
ON CONFLICT (agent_id) DO UPDATE SET
  credit_weight = EXCLUDED.credit_weight,
  description = EXCLUDED.description,
  updated_at = now(); 