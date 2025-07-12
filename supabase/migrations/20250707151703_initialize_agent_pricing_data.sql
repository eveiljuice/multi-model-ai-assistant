-- Initialize agent pricing data for all agents
-- This migration ensures all agents have proper credit weights configured

INSERT INTO agent_pricing (agent_id, credit_weight, description, cost_basis) VALUES 
-- Content & Writing Agents
('humor-rewriter', 1.0, 'Standard humor and content rewriting', 0.014),
('humanizer', 1.0, 'AI text humanization', 0.014),
('prompt-optimizer', 1.0, 'Prompt engineering optimization', 0.014),
('value-prop-creator', 1.0, 'Value proposition development', 0.014),
('faq-generator', 1.5, 'FAQ generation and content creation', 0.021),
('product-launcher', 2.0, 'Comprehensive product launch planning', 0.028),

-- Analysis & Research Agents  
('competitor-analyst', 2.5, 'Deep competitor analysis and research', 0.035),
('market-researcher', 2.0, 'Market research and analysis', 0.028),
('content-analyzer', 1.5, 'Content analysis and optimization', 0.021),

-- Customer Support & Sales
('customer-responder', 1.0, 'Customer service response generation', 0.014),
('sales-messenger', 1.0, 'Sales messaging optimization', 0.014),
('support-specialist', 1.5, 'Customer support content creation', 0.021),

-- Specialized Agents
('seo-optimizer', 1.5, 'SEO content optimization', 0.021),
('email-marketer', 1.0, 'Email marketing content', 0.014),
('social-media-manager', 1.0, 'Social media content creation', 0.014),
('copywriter', 1.0, 'Professional copywriting', 0.014),
('brand-strategist', 2.0, 'Brand strategy development', 0.028),
('growth-hacker', 1.5, 'Growth strategy and tactics', 0.021),
('conversion-optimizer', 1.5, 'Conversion rate optimization', 0.021),
('content-planner', 1.0, 'Content planning and strategy', 0.014)

ON CONFLICT (agent_id) DO UPDATE SET
  credit_weight = EXCLUDED.credit_weight,
  description = EXCLUDED.description,
  cost_basis = EXCLUDED.cost_basis,
  last_updated = now();
