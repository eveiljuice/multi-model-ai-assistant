/*
  # Insert default agent pricing

  1. Default pricing for existing agents
    - Set credit weights based on agent complexity
    - Standard agents: 1 credit
    - Complex agents: 2-3 credits
    - Premium agents: 5 credits

  2. Pricing logic
    - Text-based agents: 1 credit
    - Analysis agents: 2 credits
    - Creative/complex agents: 3 credits
    - Future video/advanced agents: 5 credits
*/

-- Insert default pricing for existing agents
INSERT INTO agent_pricing (agent_id, credit_weight, description) VALUES
  ('1', 1.0, 'Prompt Polisher - Standard text processing'),
  ('2', 2.0, 'Competitor Analysis - Research and analysis'),
  ('3', 1.0, 'FAQ Generator - Standard content generation'),
  ('4', 2.0, 'Problem → Insight - Analysis and transformation'),
  ('5', 1.0, 'Launch Checklist Generator - Standard planning'),
  ('6', 1.0, 'WhatsApp Response Writer - Standard messaging'),
  ('7', 2.0, 'AI → Human Rewriter - Advanced text processing'),
  ('8', 2.0, 'Humor Rewriter - Creative text processing')
ON CONFLICT (agent_id) DO NOTHING;

-- Insert default pricing for future agent types
INSERT INTO agent_pricing (agent_id, credit_weight, description) VALUES
  ('video_generator', 5.0, 'Video generation - High computational cost'),
  ('image_generator', 3.0, 'Image generation - Medium computational cost'),
  ('voice_synthesis', 2.0, 'Voice synthesis - Medium computational cost'),
  ('document_analysis', 3.0, 'Large document analysis - High token usage'),
  ('code_generator', 2.0, 'Code generation - Medium complexity'),
  ('data_analysis', 3.0, 'Data analysis - High computational cost')
ON CONFLICT (agent_id) DO NOTHING;